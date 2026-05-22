# Plan: Wire auto-yt-dlp Design Files into a Full Working Web App

## Context

The project has two disconnected halves: a working Python polling-and-recording backend (`main.py`, `watcher.py`, `downloader.py`) and a rich React UI design in `components/` (Active Downloads, Library, Storage, Settings, empty states, window chrome). The design components have hardcoded mock data and use `window.*` globals — they've never been connected to live data.

The goal is to make a fully working app: add a FastAPI web server to the Python side that exposes real-time state via REST and WebSocket, set up a Vite build toolchain for the React frontend, refactor the design components to accept props instead of hardcoded data, and wire everything together so the UI reflects what the daemon is actually doing.

---

## Architecture

```
main.py (polling loop thread)
    └─ writes to ─→ state.py (thread-safe shared state)
                          ↑
server.py (FastAPI, uvicorn thread)
    ├─ GET /api/status, /api/downloads, /api/library, /api/storage, /api/settings
    ├─ POST /api/downloads/{user}/stop, /api/downloads/clear-finished
    ├─ PUT /api/settings
    ├─ WebSocket /ws/events  ──pushes download progress + log lines──→ React
    └─ GET /  (serves Vite-built index.html + assets)

src/App.jsx
    ├─ polls REST endpoints per-tab
    ├─ holds WebSocket connection for live updates
    └─ passes data as props into design components
```

---

## Files to Create

### Backend

**`state.py`** — thread-safe shared state between polling loop and API server
- `threading.Lock` protecting a single dict
- Keys: `daemon` (running, start_time, uptime), `downloads` (list of entries), `logs` (dict of username → deque of 500 lines), `config`
- Methods: `update_download()`, `append_log()`, `get_snapshot()`

**`server.py`** — FastAPI application
- `GET /api/status` → daemon running, uptime, accounts count, poll interval
- `GET /api/downloads` → list from state (user, status, started, pid, progress)
- `POST /api/downloads/{username}/stop` → `proc.terminate()` via state reference
- `POST /api/downloads/clear-finished` → removes finished/failed entries from state
- `GET /api/library` → `os.scandir(output_dir)` for .mp4/.mkv files with size + mtime (duration via `ffprobe -v error -show_entries format=duration` if available, else null)
- `GET /api/storage` → `shutil.disk_usage(output_dir)`, per-username breakdown by scanning filenames
- `GET /api/settings` → read `config.json`
- `PUT /api/settings` → write `config.json`, trigger config reload in polling loop
- `WebSocket /ws/events` → broadcast loop: push state snapshot every 2 s + push log lines as they arrive
- `StaticFiles` mount at `/assets`, `FileResponse` for `/` → serve `dist/index.html`

### Frontend build setup

**`package.json`** — React 18, Vite 5, no TypeScript (matches existing JSX)
```json
{
  "name": "auto-yt-dlp-ui",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "react": "^18", "react-dom": "^18" },
  "devDependencies": { "vite": "^5", "@vitejs/plugin-react": "^4" }
}
```

**`vite.config.js`** — proxy `/api` and `/ws` to `http://localhost:8787` in dev mode, build output to `dist/`

**`index.html`** — single `<div id="root">`, loads `src/main.jsx`

**`src/main.jsx`** — `ReactDOM.createRoot` entry point

**`src/App.jsx`** — main app: manages active tab state, polls API, maintains WebSocket connection, renders `WebAppShell` wrapping the active tab component

**`src/api.js`** — thin fetch wrappers: `getStatus()`, `getDownloads()`, `getLibrary()`, `getStorage()`, `getSettings()`, `updateSettings()`, `stopDownload()`, `clearFinished()`

---

## Files to Modify

### Backend

**`main.py`**
- Import `state` module; call `state.set_daemon_running(True)` on start
- Start FastAPI server: `threading.Thread(target=uvicorn.run, args=(app,), kwargs={host, port, log_level}, daemon=True).start()` before polling loop
- In the reap loop: call `state.finish_download(username, exit_code)` when a process exits
- In the live check: call `state.start_download(username, proc)` when recording starts
- On shutdown: call `state.set_daemon_running(False)`
- Add `reload_config` event so `PUT /api/settings` can signal a config refresh

**`downloader.py`**
- In `_drain_output`: also call `state.append_log(username, line)` and `state.update_progress(username, line)` for lines starting with `[download]`
- `start_download` returns `(proc, started_time)` tuple (or state writes the time)

**`requirements.txt`**
- Add: `fastapi>=0.110`, `uvicorn[standard]>=0.29`, `aiofiles>=23`

### Frontend (refactor design components from globals to ES modules)

Each component in `components/` currently:
- Exports nothing (uses `window.ComponentName = ...`)
- Reads `window.TOKENS` for styling
- Has hardcoded mock data inside the function body

**`components/Window.jsx`**
- Replace `window.TOKENS = TOKENS` with `export const TOKENS = ...`
- Replace `Object.assign(window, {...})` with named `export function` declarations
- Keep all styling exactly as-is

**`components/WebShell.jsx`**
- Replace `const WTOK = window.TOKENS` with `import { TOKENS as WTOK } from './Window'`
- Add `activeTab`, `onTabChange`, `daemonStatus` as props (currently hardcoded strings)
- Replace `window.WebAppShell = WebAppShell` with `export { WebAppShell }`

**`components/ActiveDownloads.jsx`**
- Add `rows` prop (remove hardcoded mock array)
- Add `onStop`, `onClearFinished`, `onRowClick`, `expandedRow`, `logLines` props
- Replace `window.ActiveDownloadsTab = ...` with `export { ActiveDownloadsTab }`

**`components/Library.jsx`**
- Add `files`, `onRefresh`, `onDelete`, `onReveal` props

**`components/Storage.jsx`**
- Add `storageData` prop

**`components/Settings.jsx`**
- Add `settings`, `onSave` props

**`components/EmptyStates.jsx`**
- Add `daemonRunning`, `accountCount`, `diskStatus` props

---

## Implementation Order

1. **`state.py`** — foundation; everything else depends on it
2. **`server.py`** — basic endpoints (status, downloads, settings); no WebSocket yet
3. **`main.py`** — thread startup, state writes in polling loop
4. **`downloader.py`** — log capture to state
5. Verify Python backend works: `python main.py`, hit `http://localhost:8787/api/status`
6. **Frontend toolchain** — `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`
7. **Refactor `Window.jsx`** → ES module (must come first, others import from it)
8. **Refactor remaining components** one at a time: WebShell → ActiveDownloads → Library → Storage → Settings → EmptyStates
9. **`src/App.jsx`** + **`src/api.js`** — wire data to components
10. **WebSocket** — add `/ws/events` to server and `useWebSocket` hook in frontend
11. Build (`npm run build`) and verify FastAPI serves `dist/`

---

## Critical Files (reference during implementation)

| File | Role |
|------|------|
| `main.py:31-81` | Polling loop — add state writes + server thread start here |
| `downloader.py:19-25` | `_drain_output` — add `state.append_log()` + `state.update_progress()` here |
| `components/Window.jsx:1-28` | TOKENS definition — becomes the shared design-token export |
| `components/WebShell.jsx:9` | `WebAppShell` props — add `activeTab`, `onTabChange`, `daemonStatus` |
| `components/ActiveDownloads.jsx:4-15` | Hardcoded rows array — replace with `rows` prop |
| `config.json` | Settings schema — `PUT /api/settings` validates against this structure |

---

## Notes on Scope

- **Retention policy & quiet hours** (visible in Settings and Storage tabs in the design) don't exist in the Python backend yet. These UI panels will render with data from an extended config.json schema (`retention`, `quiet_hours` keys) defaulting to `{}` — the UI will show them but they won't drive any backend behavior until a follow-up task.
- **File duration** in the Library tab requires `ffprobe` on PATH. The API will attempt it and return `null` if unavailable; the UI shows "—" for unknown duration.
- **CPU/mem stats** in the WebShell sidebar require `psutil`. Add to `requirements.txt` if desired; otherwise return `null` and omit from display.
- The files `design-canvas.jsx` and `browser-window.jsx` at the project root are design-tool artifacts (pan/zoom canvas, Chrome browser mockup). They are not production app components and will not be imported by the Vite build.

---

## Verification

1. `python main.py` — server starts on `:8787`, polling loop runs
2. `curl http://localhost:8787/api/status` → JSON with daemon status
3. `curl http://localhost:8787/api/downloads` → JSON array (empty or active)
4. `npm run dev` (with proxy to `:8787`) → `http://localhost:5173` loads the app
5. Add a real account; confirm it appears in Active Downloads tab when live
6. Check Library tab shows `.mp4` files from `downloads/` directory
7. Edit an account in Settings, save, confirm `config.json` is updated on disk
8. `npm run build && python main.py` → `http://localhost:8787/` serves the built app