import pytest
import requests

from watcher import extract_username, get_room_status, is_live


class TestExtractUsername:
    @pytest.mark.parametrize(
        ("account", "expected"),
        [
            ("someuser", "someuser"),
            ("https://chaturbate.com/foo/", "foo"),
            ("https://chaturbate.com/foo", "foo"),
            ("http://chaturbate.com/foo/", "foo"),
            ("foo/", "foo"),
            ("/foo/", "foo"),
            # Only the first path segment is the username.
            ("https://chaturbate.com/bar/baz/", "bar"),
            # Scheme casing must not change the result.
            ("HTTPS://chaturbate.com/upper/", "upper"),
            ("HtTpS://chaturbate.com/mixed/", "mixed"),
            # Surrounding whitespace in a hand-edited config entry.
            ("  spaced  ", "spaced"),
            ("  https://chaturbate.com/padded/  ", "padded"),
        ],
    )
    def test_resolves_username(self, account, expected):
        assert extract_username(account) == expected

    @pytest.mark.parametrize(
        "account",
        [
            "https://chaturbate.com/",  # URL with no username path
            "https://chaturbate.com",
            "",
            "   ",
            "/",
            "///",
        ],
    )
    def test_rejects_entries_with_no_username(self, account):
        # Returning "" here would build a malformed API URL whose failure is
        # indistinguishable from the account simply being offline.
        with pytest.raises(ValueError, match="Could not extract a username"):
            extract_username(account)

    def test_error_names_the_offending_entry(self):
        with pytest.raises(ValueError, match="chaturbate.com"):
            extract_username("https://chaturbate.com/")

    @pytest.mark.parametrize(
        "account",
        [
            "https://example.test/alice",
            "https://chaturbate.com.evil.test/alice",
            "https://notchaturbate.com/alice",
            "http://localhost:8080/alice",
        ],
    )
    def test_rejects_urls_for_other_hosts(self, account):
        # Status is always queried against chaturbate.com. Accepting another
        # host would silently monitor the Chaturbate account of the same name.
        with pytest.raises(ValueError, match="must point at chaturbate.com"):
            extract_username(account)

    @pytest.mark.parametrize(
        "account",
        ["https://www.chaturbate.com/alice/", "HTTPS://WWW.CHATURBATE.COM/alice/"],
    )
    def test_accepts_the_www_host(self, account):
        assert extract_username(account) == "alice"

    @pytest.mark.parametrize("account", [None, 42, ["alice"], {"name": "alice"}])
    def test_rejects_non_string_entries(self, account):
        # A JSON null or number in the accounts list previously raised a bare
        # AttributeError from .strip().
        with pytest.raises(ValueError, match="must be strings"):
            extract_username(account)


class _FakeResponse:
    def __init__(self, payload=None, exc=None):
        self._payload = payload
        self._exc = exc

    def raise_for_status(self):
        if self._exc is not None:
            raise self._exc

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class TestGetRoomStatus:
    def test_returns_status_from_payload(self, monkeypatch):
        monkeypatch.setattr(
            requests, "get", lambda *a, **k: _FakeResponse({"room_status": "public"})
        )
        assert get_room_status("someuser") == "public"

    def test_requests_the_documented_api_path(self, monkeypatch):
        seen = {}

        def fake_get(url, **kwargs):
            seen["url"] = url
            seen["timeout"] = kwargs.get("timeout")
            seen["headers"] = kwargs.get("headers")
            return _FakeResponse({"room_status": "away"})

        monkeypatch.setattr(requests, "get", fake_get)
        get_room_status("someuser")

        assert seen["url"] == "https://chaturbate.com/api/chatvideocontext/someuser/"
        # A missing timeout would let a hung endpoint stall the poll loop.
        assert seen["timeout"] is not None
        assert "User-Agent" in seen["headers"]

    def test_returns_none_when_payload_lacks_room_status(self, monkeypatch):
        monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse({"other": 1}))
        assert get_room_status("someuser") is None

    @pytest.mark.parametrize(
        "exc",
        [
            requests.HTTPError("404 Not Found"),
            requests.ConnectionError("refused"),
            requests.Timeout("timed out"),
        ],
    )
    def test_returns_none_on_request_failure(self, monkeypatch, exc):
        monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse(exc=exc))
        # Network trouble must not escape into the poll loop.
        assert get_room_status("someuser") is None

    def test_returns_none_when_get_itself_raises(self, monkeypatch):
        def boom(*a, **k):
            raise requests.ConnectionError("dns failure")

        monkeypatch.setattr(requests, "get", boom)
        assert get_room_status("someuser") is None


class TestIsLive:
    def test_public_is_live(self, monkeypatch):
        monkeypatch.setattr("watcher.get_room_status", lambda u: "public")
        assert is_live("someuser") is True

    @pytest.mark.parametrize(
        "status",
        ["private", "away", "offline", "hidden", "password protected", "", None],
    )
    def test_every_other_status_is_not_live(self, monkeypatch, status):
        monkeypatch.setattr("watcher.get_room_status", lambda u: status)
        assert is_live("someuser") is False

    def test_accepts_a_full_url(self, monkeypatch):
        seen = {}

        def fake_status(username):
            seen["username"] = username
            return "public"

        monkeypatch.setattr("watcher.get_room_status", fake_status)
        assert is_live("https://chaturbate.com/someuser/") is True
        assert seen["username"] == "someuser"
