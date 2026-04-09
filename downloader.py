import subprocess
import logging
import os
import threading
from datetime import datetime

logger = logging.getLogger(__name__)

STREAM_URL_TEMPLATE = "https://chaturbate.com/{}/"


def build_output_template(username: str, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{username}_{timestamp}.%(ext)s"
    return os.path.join(output_dir, filename)


def _drain_output(process: subprocess.Popen, username: str) -> None:
    """Background thread: continuously reads and logs yt-dlp output until the pipe closes."""
    try:
        for line in process.stdout:
            logger.info("[yt-dlp:%s] %s", username, line.rstrip())
    except Exception:
        pass


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

    threading.Thread(
        target=_drain_output,
        args=(process, username),
        daemon=True,
        name=f"drain-{username}",
    ).start()

    return process
