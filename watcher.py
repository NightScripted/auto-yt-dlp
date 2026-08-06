import logging
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)

CHATURBATE_API = "https://chaturbate.com/api/chatvideocontext/{}/"

# Status is always queried against chaturbate.com, so a URL pointing anywhere
# else cannot mean what it appears to: its path would be read as a Chaturbate
# username and a different account would be monitored.
ALLOWED_HOSTS = {"chaturbate.com", "www.chaturbate.com"}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def extract_username(account: str) -> str:
    """Accept either a bare username or a full Chaturbate URL.

    Raises:
        ValueError: if the entry is not a string, targets a host other than
            Chaturbate, or yields no username. Returning an empty string here
            would send a request to a malformed API path and be reported as
            "not live", hiding the bad config entry.
    """
    if not isinstance(account, str):
        raise ValueError(
            f"Account entries must be strings, got {type(account).__name__}: {account!r}"
        )

    account = account.strip()

    # Case-insensitive: "HTTPS://..." is a valid URL, and treating it as a bare
    # username would send the whole URL into the API path.
    if account.lower().startswith("http"):
        parsed = urlparse(account)
        host = (parsed.hostname or "").lower()
        if host not in ALLOWED_HOSTS:
            raise ValueError(
                f"Account URL must point at chaturbate.com, got host {host!r}: {account!r}"
            )
        username = parsed.path.strip("/").split("/")[0]
    else:
        username = account.strip("/")

    if not username:
        raise ValueError(f"Could not extract a username from account entry: {account!r}")

    return username


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
