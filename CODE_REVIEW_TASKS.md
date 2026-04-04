# Code Review Tasks

## Critical

- [ ] **`readline()` blocks the poll loop** (`downloader.py:46`) — `readline()` is blocking; if yt-dlp is alive but silent, the entire poll loop freezes. Fix with a background thread draining into a `queue.Queue`, then use `queue.get_nowait()` in `poll_process_output`.

- [ ] **`extract_username` called twice per cycle** (`main.py:51` vs `67`) — `usernames` is pre-built but the loop re-extracts from `accounts`. Zip them together once instead.

- [ ] **`sys.exit()` in signal handler** (`main.py:46`) — Raises `SystemExit` mid-signal, bypassing `finally` blocks and skipping child process cleanup. Use a `threading.Event` flag and let the main loop exit gracefully.

## Warnings

- [ ] **No HTTP status differentiation** (`watcher.py:33`) — All HTTP errors log the same way; rate-limit responses are silently treated as "not live". Log the status code separately.

- [ ] **No error handling in `load_config`** (`main.py:27`) — A missing or broken `config.json` gives a raw traceback. Catch `FileNotFoundError` / `json.JSONDecodeError` and `sys.exit` with a clear message.

- [ ] **`config["accounts"]` raises `KeyError`** (`main.py:33`) — All other keys use `.get()` with defaults; `accounts` doesn't.

- [ ] **`os.path` mixed with `pathlib`** (`downloader.py:15`) — `main.py` uses `pathlib`; `downloader.py` uses `os.path`. Pick one.

- [ ] **Empty username not validated** (`watcher.py:21`) — A URL like `https://chaturbate.com/` yields `""`, which silently hits a broken API path.

## Suggestions

- [ ] **Use `shlex.join(cmd)` for log output** (`downloader.py:29`) — avoids ambiguity for args containing spaces.

- [ ] **Anchor log file to script directory** (`main.py:19`) — `FileHandler("auto-yt-dlp.log")` resolves relative to CWD; use `Path(__file__).parent` instead.

- [ ] **Pipe buffer exhaustion** (`downloader.py`) — background thread fix for the blocking `readline()` also prevents pipe buffer exhaustion for verbose yt-dlp output.

- [ ] **Missing type hints on signal handler** (`main.py:41`) — add `sig: int, frame: types.FrameType | None` for consistency with the rest of the codebase.

- [ ] **Real username in `config.json`** — replace with a placeholder before any public push.
