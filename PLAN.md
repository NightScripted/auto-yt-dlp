# Plan: Dockerize auto-yt-dlp with WebUI

## Overview

Containerize the project and add a React/FastAPI WebUI, while keeping `python main.py` functional as a standalone headless daemon.

**Decisions:**
- Vite + React frontend, multi-stage Docker build (Node.js compiles JSX → static files served by FastAPI)
- Daemon polling loop runs as an in-process background thread inside the FastAPI server
- `python main.py` continues to work without the web server
- Port: **8787**

---

## Phase 1 — Shared State Module

**Create `state.py`**

Single source of truth shared between the daemon thread and FastAPI request handlers.

```python
import threading
from datetime import datetime

active: dict[str, dict] = {}  # username → session info (see shape below)
active_lock = threading.Lock()

daemon_running: bool = False
daemon_start_time: datetime | None = None
stop_event = threading.Event()

config: dict = {}
```

Each `active[username]` entry shape:
```python
{
    "user": str,
    "status": "recording" | "finished" | "failed",
    "started": datetime,
    "pid": int,
    "progress": str,  # last yt-dlp stdout line
    "log_path": str,
    "proc": Popen,  # excluded when serialising to JSON
}
```

---

## Phase 2 — Refactor `main.py`

Extract the polling loop into a `run_daemon(stop_event)` function so it can be called from both the CLI and the server.

**Changes:**
1. Add `import os`, `import state` at top
2. `CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", "config.json"))`
3. `LOG_PATH = Path(os.environ.get("LOG_PATH", "auto-yt-dlp.log"))`
4. New `run_daemon(stop_event: threading.Event) -> None`:
   - Uses `state.active` + `state.active_lock` instead of a local `active` dict
   - Loop condition: `not stop_event.is_set()`
   - Reloads config each iteration (live config changes without restart)
   - Respects `config.get("max_concurrent", 0)` — skips new downloads when at limit (0 = unlimited)
   - Calls `_in_quiet_hours(config)` — skips starting new downloads during configured quiet hours
5. `main()` sets up logging + signal handlers, then calls `run_daemon(threading.Event())`
6. `if __name__ == "__main__": main()` — CLI entry unchanged

---

## Phase 3 — Refactor `downloader.py`

**Changes:**
1. Import `state`
2. `LOG_DIR = Path(os.environ.get("LOG_DIR", "logs"))`
3. `start_download()` registers the session in `state.active[username]` (under `state.active_lock`)
4. `_drain_output()` thread:
   - Appends each line to `{LOG_DIR}/{username}.log`
   - Updates `state.active[username]["progress"]` with the latest line
5. On process exit, `_drain_output` sets `state.active[username]["status"]` to `"finished"` or `"failed"`

---

## Phase 4 — Extend `config.json` Schema

All new fields are optional and backward-compatible — existing configs continue to work.

```json
{
  "accounts": [
    {"name": "example_username", "quality": "best", "poll_interval_seconds": null},
    "another_example_username"
  ],
  "poll_interval_seconds": 60,
  "output_dir": "downloads",
  "yt_dlp_args": ["--no-part"],
  "max_concurrent": 4,
  "quiet_hours": {
    "enabled": false,
    "timezone": "America/Denver",
    "schedule": {}
  },
  "disk_warn_gb": 100,
  "disk_stop_gb": 20,
  "retention": {
    "enabled": false,
    "days": 30,
    "max_files_per_streamer": 10,
    "max_total_gb": 500
  }
}
```

Also update `extract_username()` in `watcher.py` to accept dict-style accounts:
```python
if isinstance(account, dict):
    return account["name"]
```

---

## Phase 5 — Create `server.py` (FastAPI backend)

New file. Starts the daemon thread on app startup, exposes REST + SSE endpoints, serves Vite static files.

**Startup (lifespan):**
```python
@asynccontextmanager
async def lifespan(app):
    t = threading.Thread(target=run_daemon, args=(state.stop_event,), daemon=True)
    t.start()
    yield
    state.stop_event.set()
```

Run with: `uvicorn server:app --host 0.0.0.0 --port 8787`

**API endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/daemon` | `{running, uptime_s, account_count, poll_interval}` |
| POST | `/api/daemon/start` | Clear stop_event, start daemon thread |
| POST | `/api/daemon/stop` | Set stop_event |
| GET | `/api/downloads` | Serialised `state.active` (proc key excluded) |
| POST | `/api/downloads/{user}/stop` | `proc.terminate()` |
| GET | `/api/accounts` | Accounts list from `state.config` |
| POST | `/api/accounts` | Append account, save config.json |
| DELETE | `/api/accounts/{name}` | Remove account, save config.json |
| GET | `/api/library` | Scan output_dir → mp4 list with size/mtime |
| GET | `/api/storage` | `shutil.disk_usage()` + per-user file breakdown |
| GET | `/api/settings` | Full config dict |
| POST | `/api/settings` | Validate + save config.json, update `state.config` |
| GET | `/api/logs/{username}` | Last 200 lines of `{LOG_DIR}/{username}.log` |
| GET | `/api/events` | SSE stream — 1 s tick with daemon + downloads summary |
| GET | `/api/storage/cleanup/preview` | Preview files that would be deleted |
| POST | `/api/storage/cleanup` | Execute retention cleanup |

Static serving (catch-all, after all `/api` routes):
```python
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
```

**New `requirements.txt` entries:**
```
fastapi>=0.115
uvicorn[standard]>=0.34
aiofiles>=24.1
psutil>=6.1
```

---

## Phase 6 — React Frontend (`frontend/`)

### Directory layout
```
frontend/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx              # ReactDOM.createRoot → <App />
    ├── App.jsx               # WebAppShell with tab routing + live data
    ├── api.js                # fetch helpers for every /api/* endpoint
    └── components/           # moved from project root components/
        ├── Window.jsx
        ├── ActiveDownloads.jsx
        ├── Library.jsx
        ├── AccountsSettings.jsx
        ├── Storage.jsx
        └── EmptyStates.jsx
```

### `frontend/package.json`
```json
{
  "name": "auto-yt-dlp-ui",
  "private": true,
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":     "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "vite":                 "^6.3.0",
    "@vitejs/plugin-react": "^4.4.0"
  }
}
```

### `frontend/vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8787' }
  }
})
```

### `api.js` functions
`fetchDownloads`, `fetchAccounts`, `fetchLibrary`, `fetchStorage`, `fetchSettings`, `saveSettings`, `addAccount`, `removeAccount`, `stopDownload`, `fetchLogs`, `openEventStream(onMessage)`.

Replace static mock data in each component with `useEffect` + `useState` + the matching `api.js` call.

### Files to relocate
| From | To |
|------|----|
| `components/*.jsx` | `frontend/src/components/*.jsx` |
| `browser-window.jsx` | `frontend/src/components/BrowserWindow.jsx` (design reference, not deployed) |
| `design-canvas.jsx` | `frontend/src/components/DesignCanvas.jsx` (design reference, not deployed) |

---

## Phase 7 — Docker Artifacts

### `Dockerfile`
```dockerfile
# Stage 1: build frontend
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json .
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

# ffmpeg required by yt-dlp to mux streams into mp4
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py .
COPY --from=frontend /frontend/dist ./frontend/dist

VOLUME ["/config", "/downloads"]
EXPOSE 8787

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8787"]
```

### `docker-compose.yml`
```yaml
services:
  auto-yt-dlp:
    build: .
    image: auto-yt-dlp:latest
    container_name: auto-yt-dlp
    restart: unless-stopped
    ports:
      - "8787:8787"
    volumes:
      - ./config:/config
      - ./downloads:/downloads
    environment:
      - CONFIG_PATH=/config/config.json
      - LOG_PATH=/config/auto-yt-dlp.log
      - LOG_DIR=/config/logs
      - OUTPUT_DIR=/downloads
```

### `.dockerignore`
```
__pycache__/
*.pyc
*.log
.git/
.venv/
.idea/
downloads/
config/
frontend/node_modules/
frontend/dist/
*.md
browser-window.jsx
design-canvas.jsx
```

### `config/` directory
- Create `config/.gitkeep` (so the Docker Compose mount target exists)
- Add `config/config.json` and `config/cookies.txt` to `.gitignore`
- Keep a copy of `config.json` at `config/config.json` as the Docker-mode template (with `output_dir: /downloads` and `--cookies-from-file /config/cookies.txt`)

---

## Phase 8 — `DOCKER.md`

Cover:
- Prerequisites (Docker, Docker Compose)
- Cookie export (one-time, on host): `yt-dlp --cookies-from-browser firefox --cookies ./config/cookies.txt`
- Example `config/config.json` with `output_dir: /downloads` and `--cookies-from-file /config/cookies.txt`
- Build & run: `docker compose up -d --build`
- Accessing the WebUI at `http://localhost:8787`
- Volume layout table (`./config` → `/config`, `./downloads` → `/downloads`)
- Env vars table
- NAS paths: Unraid (`/mnt/user/appdata/auto-yt-dlp/` → `/config`) and TrueNAS SCALE dataset paths

---

## File Change Summary

| File | Action |
|------|--------|
| `state.py` | CREATE |
| `server.py` | CREATE |
| `main.py` | MODIFY — extract `run_daemon()`, env-var paths, use `state` |
| `downloader.py` | MODIFY — update `state.active`, per-user log files |
| `watcher.py` | MODIFY — handle dict-style accounts |
| `config.json` | MODIFY — add optional new fields |
| `requirements.txt` | MODIFY — add fastapi, uvicorn, aiofiles, psutil |
| `frontend/` | CREATE — entire Vite + React project |
| `Dockerfile` | CREATE |
| `docker-compose.yml` | CREATE |
| `.dockerignore` | CREATE |
| `DOCKER.md` | CREATE |
| `config/.gitkeep` | CREATE |
| `.gitignore` | MODIFY — add config/config.json, config/cookies.txt |

---

## Verification Checklist

- [ ] `python main.py` — polls accounts without starting a web server
- [ ] `uvicorn server:app --port 8787` — daemon starts as background thread; `GET /api/daemon` returns `{running: true, ...}`
- [ ] `cd frontend && npm run dev` — UI loads at `localhost:5173`, `/api` proxied to `localhost:8787`
- [ ] `docker compose build` — both build stages complete without errors
- [ ] `docker compose up -d` — UI accessible at `localhost:8787`, all four tabs functional
- [ ] `curl localhost:8787/api/downloads` — returns JSON array
- [ ] `curl -N localhost:8787/api/events` — streams SSE events every second
- [ ] Edit `config/config.json` while container runs — next poll cycle picks up changes without restart
- [ ] Recordings appear in `./downloads/` after a stream is captured
