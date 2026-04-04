import json
import logging
import signal
import subprocess
import sys
import time
from pathlib import Path

from downloader import poll_process_output, start_download
from watcher import extract_username, is_live

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("auto-yt-dlp.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).parent / "config.json"


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    config = load_config()
    accounts: list[str] = config["accounts"]
    poll_interval: int = config.get("poll_interval_seconds", 60)
    output_dir: str = config.get("output_dir", "downloads")
    extra_args: list[str] = config.get("yt_dlp_args", [])

    # Maps username -> active Popen process
    active: dict[str, subprocess.Popen] = {}

    def shutdown(sig, frame):
        logger.info("Shutting down — terminating active downloads...")
        for username, proc in active.items():
            logger.info("Terminating download for %s (pid %d)", username, proc.pid)
            proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    usernames = [extract_username(a) for a in accounts]
    logger.info("Watching %d account(s): %s", len(usernames), ", ".join(usernames))
    logger.info("Poll interval: %ds | Output dir: %s", poll_interval, output_dir)

    while True:
        # Reap finished downloads
        for username in list(active.keys()):
            proc = active[username]
            ret = proc.poll()
            if ret is not None:
                poll_process_output(proc, username)
                logger.info("Download for %s finished (exit code %d)", username, ret)
                del active[username]

        # Check each account
        for account in accounts:
            username = extract_username(account)
            if username in active:
                poll_process_output(active[username], username)
                continue

            if is_live(account):
                logger.info("%s is LIVE — starting download", username)
                proc = start_download(username, output_dir, extra_args)
                active[username] = proc
            else:
                logger.debug("%s is not live", username)

        time.sleep(poll_interval)


if __name__ == "__main__":
    main()
