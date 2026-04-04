import requests
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

CHATURBATE_API = "https://chaturbate.com/api/chatvideocontext/{}/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def extract_username(account: str) -> str:
    """Accept either a bare username or a full Chaturbate URL."""
    if account.startswith("http"):
        path = urlparse(account).path
        return path.strip("/").split("/")[0]
    return account.strip("/")


def get_room_status(username: str) -> str | None:
    """
    Returns the room status string for a Chaturbate username, or None on error.
    Known statuses: 'public', 'private', 'away', 'offline', 'hidden', 'password protected'
    """
    url = CHATURBATE_API.format(username)
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data.get("room_status")
    except requests.RequestException as exc:
        logger.warning("Failed to fetch status for %s: %s", username, exc)
        return None


def is_live(account: str) -> bool:
    username = extract_username(account)
    status = get_room_status(username)
    logger.debug("%s status: %s", username, status)
    return status == "public"
