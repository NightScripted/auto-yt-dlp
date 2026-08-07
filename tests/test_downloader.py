import os
import re
import subprocess

import downloader
from downloader import build_output_template, start_download


class TestBuildOutputTemplate:
    def test_creates_the_output_directory(self, tmp_path):
        target = tmp_path / "recordings"
        assert not target.exists()

        build_output_template("someuser", str(target))

        assert target.is_dir()

    def test_is_idempotent_when_directory_exists(self, tmp_path):
        target = tmp_path / "recordings"
        target.mkdir()

        # exist_ok=True: a second poll cycle must not raise.
        build_output_template("someuser", str(target))

        assert target.is_dir()

    def test_filename_carries_username_timestamp_and_ext_placeholder(self, tmp_path):
        template = build_output_template("someuser", str(tmp_path))

        assert os.path.dirname(template) == str(tmp_path)
        assert re.fullmatch(r"someuser_\d{8}_\d{6}\.%\(ext\)s", os.path.basename(template))

    def test_distinct_usernames_do_not_collide(self, tmp_path):
        a = build_output_template("alice", str(tmp_path))
        b = build_output_template("bob", str(tmp_path))

        assert os.path.basename(a).startswith("alice_")
        assert os.path.basename(b).startswith("bob_")


class _FakePopen:
    """Stands in for subprocess.Popen so no yt-dlp process is ever spawned."""

    def __init__(self, cmd, **kwargs):
        self.cmd = cmd
        self.kwargs = kwargs
        self.pid = 4242
        self.stdout = []

    def poll(self):
        return None


class TestStartDownload:
    def _capture(self, monkeypatch):
        captured = {}

        def fake_popen(cmd, **kwargs):
            proc = _FakePopen(cmd, **kwargs)
            captured["proc"] = proc
            return proc

        monkeypatch.setattr(subprocess, "Popen", fake_popen)
        return captured

    def test_invokes_yt_dlp_with_the_account_url(self, monkeypatch, tmp_path):
        captured = self._capture(monkeypatch)

        start_download("someuser", str(tmp_path), [])

        cmd = captured["proc"].cmd
        assert cmd[0] == "yt-dlp"
        assert "https://chaturbate.com/someuser/" in cmd

    def test_passes_the_output_template_after_dash_o(self, monkeypatch, tmp_path):
        captured = self._capture(monkeypatch)

        start_download("someuser", str(tmp_path), [])

        cmd = captured["proc"].cmd
        assert cmd[cmd.index("-o") + 1].endswith(".%(ext)s")

    def test_appends_extra_args_in_order(self, monkeypatch, tmp_path):
        captured = self._capture(monkeypatch)
        extra = ["--no-part", "--merge-output-format", "mp4"]

        start_download("someuser", str(tmp_path), extra)

        cmd = captured["proc"].cmd
        assert cmd[-len(extra) :] == extra

    def test_captures_output_for_the_drain_thread(self, monkeypatch, tmp_path):
        captured = self._capture(monkeypatch)

        start_download("someuser", str(tmp_path), [])

        kwargs = captured["proc"].kwargs
        assert kwargs["stdout"] is subprocess.PIPE
        assert kwargs["stderr"] is subprocess.STDOUT
        assert kwargs["text"] is True

    def test_returns_the_process_handle(self, monkeypatch, tmp_path):
        captured = self._capture(monkeypatch)

        proc = start_download("someuser", str(tmp_path), [])

        assert proc is captured["proc"]


class TestDrainOutput:
    def test_logs_each_line_until_the_pipe_closes(self, caplog):
        proc = _FakePopen(["yt-dlp"])
        proc.stdout = ["downloading 1%\n", "downloading 2%\n"]

        with caplog.at_level("INFO"):
            downloader._drain_output(proc, "someuser")

        assert "downloading 1%" in caplog.text
        assert "downloading 2%" in caplog.text

    def test_survives_a_broken_pipe(self):
        class Exploding:
            stdout = property(lambda self: (_ for _ in ()).throw(ValueError("closed")))

        # A dead pipe must not kill the daemon thread and take the loop with it.
        downloader._drain_output(Exploding(), "someuser")
