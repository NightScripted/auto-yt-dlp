# auto-yt-dlp: Unified Implementation Plan

## Context

`auto-yt-dlp` is a working Python daemon (main.py / watcher.py / downloader.py) paired with a full-featured React design mockup in `components/` — complete UI panels for Active Downloads, Library, Storage, and Settings, but all wired to hardcoded data via `window.*` globals. The goal of this plan is to:

1. Fix all open code quality issues from CODE_REVIEW_TASKS.md
2. Add thread-safe shared state (`state.py`) and a FastAPI server (`server.py`) with SSE and REST
3. Convert the design components from `window.*` globals to a proper Vite + ES module React app
4. Wire the live API data into the existing UI panels
5. Extend `config.json` with daemon control fields (max_concurrent, quiet_hours, disk guardrails, retention) and enforce them in the backend
6. Add Docker deployment artifacts (Dockerfile, docker-compose.yml, DOCKER.md)

---

## Phase 0: Code Quality Fixes

Apply to existing files before any new code is added.

**main.py**
- Fix signal handler: replace `sys.exit()` with a `threading.Event` flag; let the main loop check `stop_event.is_set()` and exit cleanly (preserves `finally` blocks and child-process teardown)
- Deduplicate `extract_username()` calls: build `usernames = [extract_username(a) for a in accounts]` once at the top of the loop, then zip with `accounts`
- Wrap `load_config()` body in `try/except (FileNotFoundError, json.JSONDecodeError)` — print a clear message and `sys.exit(1)`
- Change `config["accounts"]` to `config.get("accounts", [])` to match other keys
- Anchor the `FileHandler` path: `Path(__file__).parent / "auto-yt-dlp.log"`
- Add type hints to signal handler: `def _handle_signal(sig: int, frame: types.FrameType | None) -> None`

**watcher.py**
- Log HTTP status code separately when a request fails (not just the exception message)
- Add empty-username guard in `extract_username()`: raise `ValueError` (or return `None`) if the result is `""`

**downloader.py**
- Replace `except Exception: pass` in `_drain_output()` with `except Exception as exc: logging.warning("[drain:%s] %s", username, exc)`
- Use `shlex.join(cmd)` when logging the command before spawning
- Standardize on `pathlib.Path` (remove `os.path` usage)

**config.json**
- Replace real account usernames/URLs with placeholder values (e.g., `"example_user"`) before any public push

---

## Phase 1: `state.py` — Thread-Safe Shared State

**New file:** `state.py`

Single source of truth for the daemon and API server running in the same process.

```python
# Key structure
_state = {
    "daemon": {"running": False, "start_time": None},
    "downloads": {},  # username → session dict
    "logs": {},  # username → collections.deque(maxlen=500)
    "config": {},  # live copy of current config
}
```

Session dict shape:
```python
{
    "user": str,
    "status": "recording" | "finished" | "failed",
    "started": float,  # time.time()
    "pid": int | None,
    "progress": str,  # last yt-dlp output line
    "log_path": str,
}
```

Public API (all protected by `threading.Lock`):
- `set_daemon_running(v: bool)` / `set_config(cfg: dict)`
- `start_download(username, pid, log_path)`
- `finish_download(username, status: "finished"|"failed")`
- `update_progress(username, line: str)`
- `append_log(username, line: str)`
- `clear_finished()`
- `get_snapshot() -> dict`  — returns a deep copy safe for JSON serialisation

---

## Phase 2: Refactor `main.py`

Extract the polling loop into `run_daemon(stop_event: threading.Event)` so it can be called from both the CLI entrypoint and FastAPI's lifespan startup.

Key changes:
- Call `state.set_daemon_running(True)` on entry, `False` on exit
- Reload `config.json` on every iteration (live config changes without restart)
- Enforce `config.get("max_concurrent", 0)`: if `> 0` and `len(active) >= max_concurrent`, skip starting new downloads that cycle
- Call `_in_quiet_hours(config)` before starting any new download; skip if True
- Call `_check_disk(config)` each cycle; if below `disk_stop_gb`, skip all new starts and log a warning
- Call `_apply_retention(config)` once per cycle (delete files exceeding age/count/space rules)
- Use `threading.Event` stop flag from Phase 0 as the `stop_event` parameter
- Keep `if __name__ == "__main__"` CLI entrypoint — starts daemon directly without FastAPI

**New helpers in main.py:**
- `_in_quiet_hours(config) -> bool` — check current local time against `config["quiet_hours"]`
- `_check_disk(config) -> tuple[float, bool]` — return `(free_gb, below_stop_threshold)`
- `_apply_retention(config)` — scan `output_dir`, delete files per retention rules using `pathlib`

---

## Phase 3: Refactor `downloader.py`

- Import `state`; call `state.start_download(username, proc.pid, log_path)` after spawning
- In `_drain_output()`: call `state.update_progress(username, line)` and `state.append_log(username, line)` for each line; also write to `{LOG_DIR}/{username}.log` (append mode)
- After process exits in the drain thread, call `state.finish_download(username, "finished" if rc == 0 else "failed")`
- Respect `LOG_DIR` env var for per-user log file location

---

## Phase 4: `server.py` — FastAPI Backend

**New file:** `server.py`

Startup lifespan starts `run_daemon` in a background `threading.Thread`; shutdown sets the stop event.

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | `{running, uptime_s, account_count, poll_interval}` |
| GET | `/api/downloads` | All sessions from `state.get_snapshot()["downloads"]` |
| POST | `/api/downloads/{username}/stop` | `SIGTERM` the process via pid |
| POST | `/api/downloads/clear-finished` | `state.clear_finished()` |
| GET | `/api/accounts` | Account list from current config |
| POST | `/api/accounts` | Append account, write config.json |
| DELETE | `/api/accounts/{name}` | Remove account, write config.json |
| GET | `/api/library` | Scan `output_dir` for .mp4/.mkv; include size, mtime, duration (ffprobe if available) |
| GET | `/api/storage` | Disk stats + per-streamer breakdown |
| POST | `/api/storage/cleanup` | Run retention immediately |
| GET | `/api/storage/cleanup/preview` | Dry-run: list files that would be deleted |
| GET | `/api/settings` | Full config |
| PUT | `/api/settings` | Validate and write config.json |
| GET | `/api/logs/{username}` | Last 200 lines from `state` |

### SSE Endpoint

`GET /api/events` — streams a JSON tick every 2 seconds:
```json
{
  "daemon": { "running": true, "uptime_s": 3612 },
  "downloads": [ ... ],
  "storage": { "free_gb": 1765, "warn": false, "stop": false }
}
```

Uses FastAPI `StreamingResponse` with `text/event-stream` content type. Respects `stop_event` so the generator exits cleanly on shutdown.

### Static Serving

Mount Vite `dist/` at `/` via `StaticFiles`. Fall through to `dist/index.html` for all non-API routes (SPA routing).

Port: **8787** (configurable via `PORT` env var).

---

## Phase 5: Extended `config.json` Schema + Backend Enforcement

Add these optional fields (all have safe defaults so existing configs continue to work):

```json
{
  "accounts": ["example_user"],
  "poll_interval_seconds": 60,
  "output_dir": "downloads",
  "yt_dlp_args": ["--no-part", "--merge-output-format", "mp4"],

  "max_concurrent": 0,
  "quiet_hours": {
    "enabled": false,
    "timezone": "America/New_York",
    "schedule": [
      { "days": ["mon","tue","wed","thu","fri"], "start": "23:00", "end": "07:00" }
    ]
  },
  "disk_warn_gb": 100,
  "disk_stop_gb": 20,
  "retention": {
    "enabled": false,
    "days": 30,
    "max_files_per_streamer": 0,
    "max_total_gb": 0
  }
}
```

Backend enforcement is in `main.py` helpers (see Phase 2). `quiet_hours` timezone parsing uses the stdlib `zoneinfo` module (Python 3.9+, no extra dependency).

---

## Phase 6: Frontend — Vite + React

### Toolchain Setup

New files at project root:
- `package.json` — React 18, Vite, no TypeScript
- `vite.config.js` — proxy `/api` to `localhost:8787` in dev; output to `dist/`
- `index.html` — single entry point importing `src/main.jsx`

### File Layout

```
frontend/
  src/
    main.jsx       ← React root, mounts <App />
    App.jsx        ← tab state, SSE hook, passes props down
    api.js         ← fetch wrappers for all REST endpoints
    tokens.js      ← design tokens (extracted from Window.jsx)
    components/
      Window.jsx
      WebShell.jsx
      ActiveDownloads.jsx
      Library.jsx
      Storage.jsx
      Settings.jsx
      EmptyStates.jsx
```

The existing `components/` files at the project root are the source of truth for layout/styling. They stay as reference; the refactored versions live under `frontend/src/components/`.

### Component Refactor Rules

For each component:
1. Remove `window.TOKENS` → `import { TOKENS } from '../tokens.js'`
2. Remove `window.ComponentName = ...` → `export default function ComponentName`
3. Replace all hardcoded mock data with props
4. Keep all existing styles, layout, SVG icons, and visual logic intact

**Props mapping (summary):**

| Component | Props added |
|-----------|-------------|
| `WebShell` | `activeTab`, `onTabChange`, `daemonStatus`, `diskWarn`, `cpuPct`, `memPct` |
| `ActiveDownloads` | `rows`, `onStop`, `onClearFinished`, `expandedRow`, `onRowClick`, `logLines` |
| `Library` | `files`, `onRefresh`, `onDelete` |
| `Storage` | `storageData`, `streamers`, `onRunCleanup`, `onPreviewCleanup` |
| `Settings` | `settings`, `accounts`, `onSave`, `onAddAccount`, `onDeleteAccount` |
| `EmptyStates` | `daemonRunning`, `accountCount`, `diskStatus` |

### `App.jsx` Responsibilities

- Manage `activeTab` state
- Open `EventSource('/api/events')` on mount; update state on each tick
- Poll `/api/library` on Library tab focus
- Pass all data and callbacks as props to `WebShell` and the active tab component

### `api.js` Exports

```js
export const getDownloads = () => fetch('/api/downloads').then(r => r.json())
export const stopDownload = (user) => fetch(`/api/downloads/${user}/stop`, {method:'POST'})
export const clearFinished = () => fetch('/api/downloads/clear-finished', {method:'POST'})
export const getLibrary = () => fetch('/api/library').then(r => r.json())
export const getStorage = () => fetch('/api/storage').then(r => r.json())
export const getSettings = () => fetch('/api/settings').then(r => r.json())
export const putSettings = (body) => fetch('/api/settings', {method:'PUT', body: JSON.stringify(body), headers:{'Content-Type':'application/json'}})
export const addAccount = (name) => fetch('/api/accounts', {method:'POST', ...})
export const deleteAccount = (name) => fetch(`/api/accounts/${name}`, {method:'DELETE'})
export const runCleanup = () => fetch('/api/storage/cleanup', {method:'POST'})
export const previewCleanup = () => fetch('/api/storage/cleanup/preview').then(r => r.json())
```

---

## Phase 7: Docker Artifacts

**`Dockerfile`** — multi-stage build:
- Stage 1 (`node:20-slim`): `npm ci && npm run build` → produces `dist/`
- Stage 2 (`python:3.12-slim`): install ffmpeg, copy `dist/`, install Python deps, `CMD ["python", "main.py"]`

**`docker-compose.yml`:**
```yaml
services:
  app:
    build: .
    ports: ["8787:8787"]
    volumes:
      - ./config:/app/config
      - ./downloads:/app/downloads
    environment:
      - CONFIG_PATH=/app/config/config.json
      - LOG_PATH=/app/config/auto-yt-dlp.log
```

**`.dockerignore`:** node_modules, dist, .venv, downloads, *.log, .idea

**`DOCKER.md`:** prerequisites, cookie export instructions, example config, build/run steps, volume layout, env var table, NAS deployment notes (Unraid, TrueNAS SCALE)

**`config/.gitkeep`:** ensure Docker volume mount target exists; add `config/` to `.gitignore` (except `.gitkeep`)

---

## Implementation Order

1. **Phase 0** — Code quality fixes across main.py, watcher.py, downloader.py
2. **Phase 1** — Create state.py
3. **Phase 2** — Refactor main.py (threading.Event, run_daemon, helpers)
4. **Phase 3** — Refactor downloader.py (state integration, log drain)
5. **Phase 4** — Create server.py (REST + SSE, static serving)
6. **Phase 5** — Extend config.json + backend enforcement helpers
7. **Phase 6a** — Toolchain: package.json, vite.config.js, index.html, main.jsx, api.js, tokens.js
8. **Phase 6b** — Refactor components (each component one at a time)
9. **Phase 6c** — Create App.jsx, wire SSE + REST data
10. **Phase 7** — Dockerfile, docker-compose.yml, .dockerignore, DOCKER.md

**Updated requirements.txt:** add `fastapi`, `uvicorn[standard]`, `aiofiles`, `psutil`

---

## Verification

| Check | Command |
|-------|---------|
| Standalone daemon still works | `python main.py` |
| API responds | `curl http://localhost:8787/api/status` |
| Downloads list | `curl http://localhost:8787/api/downloads` |
| SSE stream | `curl -N http://localhost:8787/api/events` |
| Dev UI | `cd frontend && npm run dev` → localhost:5173 |
| Prod build served | `npm run build && python main.py` → localhost:8787 |
| Docker build | `docker compose build` |
| Docker run | `docker compose up -d` → localhost:8787 |
| Config reload | Edit config.json while running, confirm next poll picks it up |
| Quiet hours | Set quiet_hours to current time range, confirm no new downloads start |
| Disk stop | Set disk_stop_gb to a very high value, confirm downloads are skipped |
