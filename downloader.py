import subprocess
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

STREAM_URL_TEMPLATE = "https://chaturbate.com/{}/"


def build_output_template(username: str, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{username}_{timestamp}.%(ext)s"
    return os.path.join(output_dir, filename)


def start_download(username: str, output_dir: str, extra_args: list[str]) -> subprocess.Popen:
    url = STREAM_URL_TEMPLATE.format(username)
    output_template = build_output_template(username, output_dir)

    cmd = [
        "yt-dlp",
        url,
        "-o", output_template,
        *extra_args,
    ]

    logger.info("Starting download for %s: %s", username, " ".join(cmd))

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return process


def poll_process_output(process: subprocess.Popen, username: str) -> None:
    """Read and log any pending output lines from the process (non-blocking)."""
    if process.stdout is None:
        return
    try:
        while True:
            line = process.stdout.readline()
            if not line:
                break
            logger.debug("[yt-dlp:%s] %s", username, line.rstrip())
    except OSError:
        pass  # pipe closed; process likely terminated
    except Exception:
        logger.warning("Unexpected error reading output for %s", username, exc_info=True)
