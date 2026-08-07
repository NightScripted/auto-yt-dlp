import json
import logging
import signal
import subprocess
import sys
import time
from pathlib import Path

from downloader import start_download
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


class ConfigError(Exception):
    """Raised when config.json is missing, unreadable, or malformed."""


def load_config() -> dict:
    """Load config.json.

    Raises:
        ConfigError: with an actionable message instead of a raw traceback.
    """
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise ConfigError(
            f"No config file at {CONFIG_PATH}. Copy config.example.json to config.json and edit it."
        ) from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"{CONFIG_PATH} is not valid JSON: {exc}") from exc
    # FileNotFoundError is itself an OSError, so it must stay above this one.
    # Covers permission denied, a directory in place of the file, and any other
    # read failure the ConfigError contract promises to report cleanly.
    except OSError as exc:
        raise ConfigError(f"Could not read {CONFIG_PATH}: {exc}") from exc
    except UnicodeDecodeError as exc:
        raise ConfigError(f"{CONFIG_PATH} is not valid UTF-8: {exc}") from exc


def main() -> None:
    try:
        config = load_config()
    except ConfigError as exc:
        logger.error("%s", exc)
        sys.exit(1)

    # A valid JSON document need not be an object: "[1, 2]" parses fine and
    # would make the .get() calls below raise AttributeError.
    if not isinstance(config, dict):
        logger.error(
            "%s must contain a JSON object at the top level, found %s.",
            CONFIG_PATH,
            type(config).__name__,
        )
        sys.exit(1)

    # Every other key uses .get() with a default; accounts did not, so a config
    # without it raised a bare KeyError.
    accounts = config.get("accounts", [])
    if not isinstance(accounts, list):
        logger.error(
            "'accounts' in %s must be a list, found %s.", CONFIG_PATH, type(accounts).__name__
        )
        sys.exit(1)
    if not accounts:
        logger.error("No accounts configured in %s — nothing to watch.", CONFIG_PATH)
        sys.exit(1)

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

    # Resolve every account up front so a malformed entry is reported here,
    # with the offending value, rather than partway through a poll cycle.
    try:
        usernames = [extract_username(a) for a in accounts]
    except ValueError as exc:
        logger.error("%s", exc)
        sys.exit(1)

    logger.info("Watching %d account(s): %s", len(usernames), ", ".join(usernames))
    logger.info("Poll interval: %ds | Output dir: %s", poll_interval, output_dir)

    # Not covered by tests: an unbounded poll loop with no exit condition cannot
    # be driven from pytest without restructuring it. The logic it calls —
    # extract_username, is_live, start_download — is covered directly.
    while True:  # pragma: no cover
        # Reap finished downloads
        for username in list(active.keys()):
            proc = active[username]
            ret = proc.poll()
            if ret is not None:
                logger.info("Download for %s finished (exit code %d)", username, ret)
                del active[username]

        # Check each account
        for account in accounts:
            username = extract_username(account)
            if username in active:
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
