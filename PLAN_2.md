# Plan: PyQt6 GUI for auto-yt-dlp

## Context
The app currently runs as a headless CLI daemon. The user wants a desktop GUI to monitor active recordings, browse and play downloaded videos, manage watched accounts, and manage cookie authentication — all without breaking the existing CLI/Docker path (`main.py`).

---

## Architecture

- `gui.py` — new entry point (replaces `python main.py` for GUI use)
- `gui/` package — all Qt code isolated here so `main.py` never imports PyQt6
- `main.py`, `watcher.py` — no changes
- `downloader.py` — one backward-compatible change: add optional `line_callback` param

**Key constraint:** PyQt6 is imported only inside `gui/`. Running `python main.py` (CLI/Docker) never touches Qt.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `downloader.py` | Modify — add `line_callback` param to `start_download` and `_drain_output` |
| `requirements.txt` | Modify — add `PyQt6>=6.6.0` |
| `gui.py` | Create — QApplication bootstrap, loads config.json, launches MainWindow |
| `gui/__init__.py` | Create — empty |
| `gui/utils.py` | Create — `CONFIG_PATH`, `load_config()`, `save_config()` |
| `gui/models.py` | Create — `DownloadRecord` dataclass, `AppState` (thread-safe state bag) |
| `gui/daemon.py` | Create — `WatcherThread(QThread)` wrapping the polling loop |
| `gui/app.py` | Create — `MainWindow(QMainWindow)` wiring tabs + thread |
| `gui/tabs/__init__.py` | Create — empty |
| `gui/tabs/active_tab.py` | Create — Active Downloads tab |
| `gui/tabs/library_tab.py` | Create — Library tab |
| `gui/tabs/settings_tab.py` | Create — Accounts & Settings tab |

---

## downloader.py Change (the only modification to existing code)

Add optional `line_callback: Callable[[str, str], None] | None = None` to both `_drain_output` and `start_download`. The drain thread calls `line_callback(username, line)` after logging. Default is `None` so `main.py`'s existing call `start_download(username, output_dir, extra_args)` works unchanged.

```python
from collections.abc import Callable

def _drain_output(process, username, line_callback=None):
    for line in process.stdout:
        stripped = line.rstrip()
        logger.info("[yt-dlp:%s] %s", username, stripped)
        if line_callback:
            try:
                line_callback(username, stripped)
            except Exception:
                pass

def start_download(username, output_dir, extra_args, line_callback=None):
    ...
    threading.Thread(
        target=_drain_output,
        args=(process, username, line_callback),
        daemon=True,
    ).start()
    return process
```

---

## WatcherThread Signals (gui/daemon.py)

```python
class WatcherThread(QThread):
    download_started  = pyqtSignal(str, int, str)   # username, pid, iso_timestamp
    download_finished = pyqtSignal(str, int)         # username, exit_code
    progress_line     = pyqtSignal(str, str)         # username, yt-dlp stdout line
```

- Uses `threading.Event` for stop; `_stop_event.wait(poll_interval)` replaces `time.sleep`
- Config is reloaded each cycle (per the Docker hot-reload plan in PLAN.md)
- `stop()` calls `proc.terminate()` for all active Popen objects then `self.wait()`
- `reload_config(new_config: dict)` slot updates config under a lock; picked up next cycle
- The `line_callback` passed to `start_download` is a closure over `self.progress_line.emit`

---

## Tab 1: Active Downloads (gui/tabs/active_tab.py)

`QTableWidget` with 5 columns: **Username | Status | Started | PID | Progress**

Slots connected to `WatcherThread` signals:
- `on_download_started(username, pid, iso_time)` — inserts a new row, stores row index
- `on_download_finished(username, exit_code)` — updates Status cell ("Finished" / "Failed (N)"), greys/reddens the row
- `on_progress_line(username, line)` — updates Progress cell with latest yt-dlp stdout line

Color coding: green tint = Recording, grey = Finished, red = Failed.

---

## Tab 2: Library (gui/tabs/library_tab.py)

- `QListWidget` listing `*.mp4` files from `output_dir`, sorted by mtime descending
- Status bar below shows file size + modification date of selected item
- Double-click → `QDesktopServices.openUrl(QUrl.fromLocalFile(path))` (system default player)
- "Refresh" button + auto-refresh on `download_finished` signal
- `update_output_dir(new_dir)` slot re-scans when settings change

---

## Tab 3: Accounts & Settings (gui/tabs/settings_tab.py)

Custom signal: `config_saved = pyqtSignal(dict)`

**Accounts section:**
- `QListWidget` showing current accounts (bare usernames or full URLs)
- `QLineEdit` + "Add" button + "Remove Selected" button

**Settings section (QFormLayout):**
- Poll interval: `QSpinBox` (min=10, max=3600, suffix=" seconds")
- Output directory: `QLineEdit` + "Browse..." (`QFileDialog.getExistingDirectory`)

**Cookie Authentication section:**
- Three `QRadioButton`s: "No cookies" / "Browser (Firefox)" / "Cookie file"
- When "Cookie file" selected: `QLineEdit` (path) + "Browse..." (`QFileDialog.getOpenFileName`)
- Parses existing `yt_dlp_args` on load to pre-select the correct radio button

**Save button:** rebuilds `yt_dlp_args` from scratch (always includes `--no-part --merge-output-format mp4`, appends cookie args conditionally), writes `config.json`, emits `config_saved`.

**Cookie path stored inside `yt_dlp_args`** — no separate config key needed. Keeps CLI and GUI configs identical in shape.

---

## Signal Wiring (gui/app.py MainWindow)

```
WatcherThread.download_started  → ActiveDownloadsTab.on_download_started
WatcherThread.download_finished → ActiveDownloadsTab.on_download_finished
WatcherThread.download_finished → LibraryTab.refresh
WatcherThread.progress_line     → ActiveDownloadsTab.on_progress_line
SettingsTab.config_saved        → MainWindow._on_config_saved
                                → WatcherThread.reload_config
                                → LibraryTab.update_output_dir
```

Cross-thread signal delivery is automatic in PyQt6 (queued connection); no manual `invokeMethod` needed.

---

## gui.py Entry Point

```python
# python gui.py  ← starts the GUI
config = json.load(open(CONFIG_PATH))
app = QApplication(sys.argv)
window = MainWindow(config, AppState())
window.show()
sys.exit(app.exec())
```

`main.py` is completely unchanged and remains the CLI/Docker entry point.

---

## Implementation Order

1. `downloader.py` — add `line_callback` (backward-compatible, test CLI still works)
2. `gui/utils.py`, `gui/models.py` — no dependencies
3. `gui/daemon.py` — depends on modified downloader + watcher + models
4. `gui/tabs/active_tab.py` — depends on daemon signal signatures
5. `gui/tabs/library_tab.py` — standalone
6. `gui/tabs/settings_tab.py` — depends on utils
7. `gui/app.py` — wires everything together
8. `gui/__init__.py`, `gui/tabs/__init__.py` — empty files
9. `gui.py` — entry point
10. `requirements.txt` — add PyQt6

---

## Verification

1. **CLI still works**: `python main.py` — no import errors, runs identically to before
2. **GUI launches**: `python gui.py` — window opens with 3 tabs, no errors
3. **Active downloads**: When an account goes live, a row appears in the Active Downloads tab with green status; progress column updates with yt-dlp output lines
4. **Finished downloads**: Row turns grey/red when recording stops; Library tab auto-refreshes and the new .mp4 appears
5. **Play video**: Double-click a file in Library tab — opens in system media player
6. **Add account**: Type a username in Settings tab, click Add, click Save — config.json updates and daemon picks it up next cycle
7. **Remove account**: Select an account, click Remove, click Save — daemon stops watching it
8. **Cookie file**: Select "Cookie file" radio, browse to a `cookies.txt`, save — `--cookies-from-file /path` appears in `yt_dlp_args` in config.json; new downloads use it
9. **No Qt in Docker path**: `grep -r "PyQt6\|from gui" main.py downloader.py watcher.py` → no matches
