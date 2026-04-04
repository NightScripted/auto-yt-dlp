# auto-yt-dlp

Watches Chaturbate accounts and automatically starts recording with `yt-dlp` when they go live.

## Requirements

- Python 3.10+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available on your PATH

```bash
pip install -r requirements.txt
```

## Setup

Edit `config.json` to add the accounts you want to watch:

```json
{
  "accounts": [
    "someusername",
    "https://chaturbate.com/anotherusername/"
  ],
  "poll_interval_seconds": 60,
  "output_dir": "downloads",
  "yt_dlp_args": [
    "--no-part",
    "--merge-output-format", "mp4"
  ]
}
```

Accounts can be specified as either a bare username (`"someusername"`) or a full Chaturbate URL (`"https://chaturbate.com/someusername/"`).

## Usage

```bash
python main.py
```

The script polls each account every `poll_interval_seconds`. When an account goes live, it spawns a `yt-dlp` process to record the stream. Recordings are saved to `output_dir` with filenames in the format `username_YYYYMMDD_HHMMSS.mp4`.

Press `Ctrl+C` to stop. Any active downloads will be terminated cleanly.

## Logging

Activity is logged to both stdout and `auto-yt-dlp.log` in the project directory.

## Config reference

| Key | Default | Description |
|-----|---------|-------------|
| `accounts` | `[]` | Usernames or Chaturbate URLs to watch |
| `poll_interval_seconds` | `60` | How often to check each account (seconds) |
| `output_dir` | `"downloads"` | Directory where recordings are saved |
| `yt_dlp_args` | `[]` | Extra arguments passed to `yt-dlp` |
