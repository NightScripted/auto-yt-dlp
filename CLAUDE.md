# CLAUDE.md

## Project overview

`auto-yt-dlp` is a Python script that polls Chaturbate accounts and automatically records streams using `yt-dlp` when they go live.

## File structure

- `main.py` — entry point; main polling loop, process lifecycle management, signal handling
- `watcher.py` — checks stream status via the Chaturbate API (`/api/chatvideocontext/{username}/`)
- `downloader.py` — builds and spawns `yt-dlp` subprocesses; handles output logging
- `config.json` — user configuration (accounts, poll interval, output dir, yt-dlp args)
- `requirements.txt` — `requests`, `yt-dlp`

## Key behaviours

- Accounts in `config.json` can be bare usernames or full Chaturbate URLs — `extract_username()` in `watcher.py` normalises both
- Stream status is considered live only when `room_status == "public"`; other statuses (`private`, `away`, `offline`, `hidden`, `password protected`) are treated as not live
- One `yt-dlp` process per username; re-entry is prevented by the `active` dict in `main.py`
- Finished processes are reaped at the top of each poll cycle, allowing a new download to start if the stream restarts
- `--live-from-start` is NOT supported by Chaturbate — do not add it to `yt_dlp_args`

## Python version

Requires Python 3.10+ (uses `str | None` union syntax).
