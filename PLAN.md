# Plan: Dockerize auto-yt-dlp

## Context
The user wants to deploy this stream-recording app on Unraid and TrueNAS (both run Docker), while keeping the ability to run it locally with `python main.py`. The app is a long-running daemon that polls Chaturbate and spawns yt-dlp subprocesses — a good fit for a containerized deployment.

---

## Changes Required

### 1. Modify `main.py` (only Python file that needs changes)

**Add `import os`** to the imports block (line 7 area, alongside other stdlib imports).

**Replace line 18** (hardcoded log path):
```python
# Before:
logging.FileHandler("auto-yt-dlp.log", encoding="utf-8"),

# After:
logging.FileHandler(
    os.environ.get("LOG_PATH", Path(__file__).parent / "auto-yt-dlp.log"),
    encoding="utf-8"
),
```

**Replace line 23** (hardcoded config path):
```python
# Before:
CONFIG_PATH = Path(__file__).parent / "config.json"

# After:
CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", Path(__file__).parent / "config.json"))
```

Both changes use `os.environ.get()` with a fallback — local runs continue to work unchanged. Docker sets the env vars to point into `/config`.

**Hot-reload `config.json` on every poll cycle:**

Move config loading inside the `while True` loop so changes take effect within one poll interval — no container restart needed. Wrap it in try/except so a mid-save or malformed file logs a warning and retains the previous config rather than crashing.

```python
# At top of main(), before the while loop — establish initial config:
config = load_config()
accounts = config["accounts"]
poll_interval = config.get("poll_interval_seconds", 60)
output_dir = config.get("output_dir", "downloads")
extra_args = config.get("yt_dlp_args", [])

# Inside while True, at the top of each cycle — reload:
try:
    config = load_config()
    accounts = config["accounts"]
    poll_interval = config.get("poll_interval_seconds", 60)
    output_dir = config.get("output_dir", "downloads")
    extra_args = config.get("yt_dlp_args", [])
except Exception as e:
    logger.warning("Failed to reload config.json, using previous values: %s", e)
```

Behavior on config changes:
- **Add account** — picked up on next cycle, starts watching immediately
- **Remove account** — any active download for that account runs to completion; no new download starts after it finishes
- **Change `poll_interval_seconds`** — takes effect on the next `time.sleep()` call
- **Change `yt_dlp_args` or `output_dir`** — takes effect on the next new download

No new dependencies required. Works identically for local runs and Docker.

---

### 2. Create `Dockerfile`

```dockerfile
FROM python:3.12-slim

# ffmpeg required by yt-dlp to mux streams into mp4
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py downloader.py watcher.py ./

VOLUME ["/config", "/downloads"]

ENV CONFIG_PATH=/config/config.json
ENV LOG_PATH=/config/auto-yt-dlp.log

CMD ["python", "main.py"]
```

Notes:
- `python:3.12-slim` — minimal Debian base, fully compatible with Python 3.10+ syntax used here
- `ffmpeg` is required for `--merge-output-format mp4`; omitting it causes silent mux failures
- `config.json` is NOT copied into the image — it is always mounted
- `requirements.txt` is copied separately so pip layer is cached on rebuilds

---

### 3. Create `docker-compose.yml`

```yaml
services:
  auto-yt-dlp:
    build: .
    image: auto-yt-dlp:latest
    container_name: auto-yt-dlp
    restart: unless-stopped
    volumes:
      - ./config:/config
      - ./downloads:/downloads
    environment:
      - CONFIG_PATH=/config/config.json
      - LOG_PATH=/config/auto-yt-dlp.log
```

Notes:
- `restart: unless-stopped` — recovers from crashes, respects `docker stop`
- Relative volume paths (`./config`, `./downloads`) for local Compose use; Unraid/TrueNAS users replace with absolute NAS paths
- No port mappings — this app makes outbound requests only

---

### 4. Create `.dockerignore`

```
__pycache__/
*.pyc
*.log
downloads/
.git/
.gitignore
config.json
*.md
.venv/
.idea/
```

---

### 5. Create `DOCKER.md`

Deployment guide covering:
- Cookie export (one-time, on host): `yt-dlp --cookies-from-browser firefox --cookies ./config/cookies.txt`
- Example Docker `config.json` (with `output_dir: /downloads` and `--cookies-from-file /config/cookies.txt`)
- Unraid paths: `/mnt/user/appdata/auto-yt-dlp/` → `/config`, `/mnt/user/data/recordings/auto-yt-dlp/` → `/downloads`
- TrueNAS SCALE: dataset host paths mapped to `/config` and `/downloads` in the app config
- Build & run: `docker compose up -d --build`

---

### 6. Create `config/` directory structure

- Add `config/` directory (gitignored) for local Docker Compose use
- Add `config/.gitkeep` so the directory is tracked but empty
- Update `.gitignore` to exclude `config/config.json` and `config/cookies.txt`

---

### 7. Update `README.md`

Add a "Docker" section pointing to `DOCKER.md` and showing the quick-start commands.

---

## Cookie Migration (important user note)

Current `config.json` uses `--cookies-from-browser firefox` which does NOT work in Docker. For Docker, the user must:
1. Run once on host: `yt-dlp --cookies-from-browser firefox --cookies ./config/cookies.txt`
2. Change `config.json` inside the `config/` dir to use `"--cookies-from-file", "/config/cookies.txt"` and `"output_dir": "/downloads"`

The local `config.json` at the repo root is unchanged and continues to use `--cookies-from-browser firefox`.

---

## Critical Files

| File | Action |
|------|--------|
| `main.py` | Modify — add `import os`, update lines 18 and 23, move config loading inside poll loop |
| `Dockerfile` | Create new |
| `docker-compose.yml` | Create new |
| `.dockerignore` | Create new |
| `DOCKER.md` | Create new |
| `config/.gitkeep` | Create new |
| `.gitignore` | Modify — add `config/config.json`, `config/cookies.txt` |
| `README.md` | Modify — add Docker section |

---

## Verification

1. **Local run still works**: `python main.py` with `config.json` in project root — no behavior change
2. **Build succeeds**: `docker compose build` completes without errors
3. **Container starts**: `docker compose up` shows the "Watching N account(s)" log line
4. **Hot-reload works**: Edit `config/config.json` while the container is running — the next poll cycle picks up changes without restart
5. **Downloads persist**: Files appear in `./downloads/` (or NAS path) after a stream is recorded
6. **Log persists**: `config/auto-yt-dlp.log` is written and survives container restarts