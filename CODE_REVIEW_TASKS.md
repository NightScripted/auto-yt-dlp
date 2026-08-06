# Code Review Tasks

## Critical

- [x] **`readline()` blocks the poll loop** (`downloader.py:46`) — `readline()` is blocking; if yt-dlp is alive but silent, the entire poll loop freezes. Fix with a background thread draining into a `queue.Queue`, then use `queue.get_nowait()` in `poll_process_output`.
  **Fixed in `14b93e6` (2026-04-09)** — `poll_process_output` was replaced by the `_drain_output` daemon thread, which logs directly rather than via a queue. Regression-covered by `tests/test_downloader.py::TestDrainOutput`.

- [ ] **`extract_username` called twice per cycle** (`main.py:51` vs `67`) — `usernames` is pre-built but the loop re-extracts from `accounts`. Zip them together once instead.

- [ ] **`sys.exit()` in signal handler** (`main.py:46`) — Raises `SystemExit` mid-signal, bypassing `finally` blocks and skipping child process cleanup. Use a `threading.Event` flag and let the main loop exit gracefully.

## Warnings

- [ ] **No HTTP status differentiation** (`watcher.py:33`) — All HTTP errors log the same way; rate-limit responses are silently treated as "not live". Log the status code separately.

- [x] **No error handling in `load_config`** (`main.py:27`) — A missing or broken `config.json` gives a raw traceback. Catch `FileNotFoundError` / `json.JSONDecodeError` and `sys.exit` with a clear message.
  **Fixed** — `load_config` raises `ConfigError` with an actionable message; `main()` logs it and exits 1. Covered by `tests/test_main.py::TestLoadConfig` and `::TestMainStartupGuards`.

- [x] **`config["accounts"]` raises `KeyError`** (`main.py:33`) — All other keys use `.get()` with defaults; `accounts` doesn't.
  **Fixed** — now `config.get("accounts", [])` with an explicit empty-list guard that exits 1.

- [ ] **`os.path` mixed with `pathlib`** (`downloader.py:15`) — `main.py` uses `pathlib`; `downloader.py` uses `os.path`. Pick one.

- [x] **Empty username not validated** (`watcher.py:21`) — A URL like `https://chaturbate.com/` yields `""`, which silently hits a broken API path.
  **Fixed** — `extract_username` now raises `ValueError` naming the offending entry, and `main()` validates every account at startup so a bad entry fails immediately rather than mid-cycle. While adding tests, a second defect surfaced in the same function: the `startswith("http")` guard was case-sensitive, so `HTTPS://chaturbate.com/x/` returned the whole URL as a username. Both the scheme check and whitespace handling are fixed. Covered by `tests/test_watcher.py::TestExtractUsername`.

## Suggestions

- [ ] **Use `shlex.join(cmd)` for log output** (`downloader.py:29`) — avoids ambiguity for args containing spaces.

- [ ] **Anchor log file to script directory** (`main.py:19`) — `FileHandler("auto-yt-dlp.log")` resolves relative to CWD; use `Path(__file__).parent` instead.

- [x] **Pipe buffer exhaustion** (`downloader.py`) — background thread fix for the blocking `readline()` also prevents pipe buffer exhaustion for verbose yt-dlp output.
  **Fixed in `14b93e6` (2026-04-09)**, same change as the Critical item above.

- [ ] **Missing type hints on signal handler** (`main.py:41`) — add `sig: int, frame: types.FrameType | None` for consistency with the rest of the codebase.

- [x] **Real username in `config.json`** — replace with a placeholder before any public push.
  **Fixed** — `config.example.json` ships placeholders, `config.json` is gitignored and untracked, and README documents `cp config.example.json config.json`. Note this does **not** remove the previously committed names from git history (`af816d0`, `14b93e6`); purging those requires a history rewrite and force-push, which is the repository owner's decision.
