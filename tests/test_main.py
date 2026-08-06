import json

import pytest

import main
from main import ConfigError, load_config


class TestLoadConfig:
    def test_reads_a_valid_config(self, tmp_path, monkeypatch):
        cfg = tmp_path / "config.json"
        cfg.write_text(
            json.dumps({"accounts": ["someuser"], "poll_interval_seconds": 30}),
            encoding="utf-8",
        )
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)

        loaded = load_config()

        assert loaded["accounts"] == ["someuser"]
        assert loaded["poll_interval_seconds"] == 30

    def test_missing_file_raises_actionable_error(self, tmp_path, monkeypatch):
        monkeypatch.setattr(main, "CONFIG_PATH", tmp_path / "absent.json")

        # Previously a bare FileNotFoundError traceback.
        with pytest.raises(ConfigError, match="config.example.json"):
            load_config()

    def test_malformed_json_raises_actionable_error(self, tmp_path, monkeypatch):
        cfg = tmp_path / "config.json"
        cfg.write_text("{ not valid json", encoding="utf-8")
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)

        # Previously a bare json.JSONDecodeError traceback.
        with pytest.raises(ConfigError, match="not valid JSON"):
            load_config()

    def test_unreadable_file_raises_actionable_error(self, tmp_path, monkeypatch):
        cfg = tmp_path / "config.json"
        cfg.write_text("{}", encoding="utf-8")
        cfg.chmod(0o000)
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)

        try:
            # PermissionError is an OSError, not FileNotFoundError — previously
            # it escaped the ConfigError contract as a raw traceback.
            with pytest.raises(ConfigError, match="Could not read"):
                load_config()
        finally:
            cfg.chmod(0o644)

    def test_directory_in_place_of_file_raises_actionable_error(self, tmp_path, monkeypatch):
        target = tmp_path / "config.json"
        target.mkdir()
        monkeypatch.setattr(main, "CONFIG_PATH", target)

        with pytest.raises(ConfigError, match="Could not read"):
            load_config()

    def test_invalid_utf8_raises_actionable_error(self, tmp_path, monkeypatch):
        cfg = tmp_path / "config.json"
        cfg.write_bytes(b'{"accounts": ["\xff\xfe invalid utf-8"]}')
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)

        with pytest.raises(ConfigError, match="not valid UTF-8"):
            load_config()

    def test_reads_utf8_content(self, tmp_path, monkeypatch):
        cfg = tmp_path / "config.json"
        cfg.write_text(json.dumps({"accounts": ["ünicøde"]}), encoding="utf-8")
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)

        assert load_config()["accounts"] == ["ünicøde"]


class TestMainStartupGuards:
    """main() exits cleanly on bad input instead of raising a traceback.

    These all bail out before the poll loop, so main() can be called directly.
    """

    def _write_config(self, tmp_path, monkeypatch, payload):
        cfg = tmp_path / "config.json"
        cfg.write_text(payload, encoding="utf-8")
        monkeypatch.setattr(main, "CONFIG_PATH", cfg)
        return cfg

    def test_missing_config_exits_1_with_a_message(self, tmp_path, monkeypatch, caplog):
        monkeypatch.setattr(main, "CONFIG_PATH", tmp_path / "absent.json")

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "config.example.json" in caplog.text

    def test_malformed_config_exits_1_with_a_message(self, tmp_path, monkeypatch, caplog):
        self._write_config(tmp_path, monkeypatch, "{ broken")

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "not valid JSON" in caplog.text

    def test_absent_accounts_key_exits_instead_of_raising_keyerror(
        self, tmp_path, monkeypatch, caplog
    ):
        self._write_config(tmp_path, monkeypatch, json.dumps({"poll_interval_seconds": 60}))

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "No accounts configured" in caplog.text

    def test_empty_accounts_list_exits(self, tmp_path, monkeypatch, caplog):
        self._write_config(tmp_path, monkeypatch, json.dumps({"accounts": []}))

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1

    def test_non_object_root_exits_instead_of_attributeerror(self, tmp_path, monkeypatch, caplog):
        # "[1, 2]" is valid JSON, but config.get() would raise AttributeError.
        self._write_config(tmp_path, monkeypatch, json.dumps([1, 2]))

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "JSON object at the top level" in caplog.text

    def test_non_list_accounts_exits(self, tmp_path, monkeypatch, caplog):
        self._write_config(tmp_path, monkeypatch, json.dumps({"accounts": "alice"}))

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "must be a list" in caplog.text

    def test_null_account_entry_exits_instead_of_attributeerror(
        self, tmp_path, monkeypatch, caplog
    ):
        self._write_config(tmp_path, monkeypatch, json.dumps({"accounts": [None]}))

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "must be strings" in caplog.text

    def test_non_chaturbate_url_exits(self, tmp_path, monkeypatch, caplog):
        self._write_config(
            tmp_path, monkeypatch, json.dumps({"accounts": ["https://example.test/alice"]})
        )

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "must point at chaturbate.com" in caplog.text

    def test_unresolvable_account_exits_before_polling(self, tmp_path, monkeypatch, caplog):
        self._write_config(
            tmp_path, monkeypatch, json.dumps({"accounts": ["https://chaturbate.com/"]})
        )

        with caplog.at_level("ERROR"), pytest.raises(SystemExit) as exc:
            main.main()

        assert exc.value.code == 1
        assert "Could not extract a username" in caplog.text


class TestConfigExample:
    """The shipped example must stay loadable — it is the documented starting point."""

    def test_example_config_is_valid_json_with_expected_keys(self):
        from pathlib import Path

        example = Path(__file__).parent.parent / "config.example.json"
        data = json.loads(example.read_text(encoding="utf-8"))

        assert isinstance(data["accounts"], list)
        assert isinstance(data["poll_interval_seconds"], int)
        assert isinstance(data["output_dir"], str)
        assert isinstance(data["yt_dlp_args"], list)

    def test_example_config_carries_no_real_accounts(self):
        from pathlib import Path

        example = Path(__file__).parent.parent / "config.example.json"
        data = json.loads(example.read_text(encoding="utf-8"))

        # Guards against a real username being pasted back in and committed.
        assert all("example" in a or "username" in a for a in data["accounts"])
