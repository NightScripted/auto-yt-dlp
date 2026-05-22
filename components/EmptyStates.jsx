// EmptyStates.jsx — Error and empty-state screens for the Monitor.

// No accounts configured yet
function EmptyAccounts() {
  const T = window.TOKENS;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      alignItems: 'center', justifyContent: 'center',
      padding: 40, gap: 18, minHeight: 0,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(0,120,212,0.12)',
        border: `1px solid ${T.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.accent,
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="14" cy="10" r="5"/><path d="M4 24c0-5 4-8 10-8s10 3 10 8"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 17, color: T.text, fontWeight: 500, marginBottom: 6 }}>
          No accounts being watched
        </div>
        <div style={{ fontSize: 12.5, color: T.textDim, lineHeight: 1.5 }}>
          Add a streamer username or full room URL to start recording
          when they go live. The daemon polls every {' '}
          <span style={{ color: T.text, fontFamily: T.mono }}>60s</span>.
        </div>
      </div>

      {/* Inline quick-add */}
      <div style={{
        display: 'flex', gap: 6,
        width: 460,
      }}>
        <div style={{
          flex: 1, height: 32,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 3, padding: '0 10px',
          display: 'flex', alignItems: 'center',
          fontSize: 12, fontFamily: T.mono,
          color: T.textMute,
        }}>username or https://example.stream/user</div>
        <Btn primary style={{ height: 32, padding: '0 18px' }}>Add Account</Btn>
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 4, fontSize: 11, color: T.textMute }}>
        <LinkRow icon="📄">Import from config.json</LinkRow>
        <LinkRow icon="📋">Paste a list</LinkRow>
        <LinkRow icon="?">Read the setup guide</LinkRow>
      </div>
    </div>
  );
}

function LinkRow({ icon, children }) {
  const T = window.TOKENS;
  return (
    <span style={{ color: T.accent, cursor: 'pointer', fontSize: 11.5 }}>
      {children}
    </span>
  );
}

// Daemon stopped — red banner takeover, rest of UI dimmed
function DaemonStoppedBanner() {
  const T = window.TOKENS;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      minHeight: 0,
    }}>
      {/* Red alert bar */}
      <div style={{
        background: '#3a1f1f',
        borderBottom: `1px solid #5a2d2d`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#f48771',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#3a1f1f', fontWeight: 700, fontSize: 16,
          flexShrink: 0,
        }}>!</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f48771' }}>
            Daemon is not running
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(244,135,113,0.75)', fontFamily: T.mono, marginTop: 2 }}>
            Last exit: 14:18:42 · code 143 (SIGTERM received) · 3 accounts waiting
          </div>
        </div>
        <Btn primary style={{ background: '#f48771', height: 30, padding: '0 18px' }}>
          Start Daemon
        </Btn>
        <Btn style={{ height: 30 }}>View Log</Btn>
      </div>

      {/* Dimmed table placeholder */}
      <div style={{
        flex: 1, background: T.surface,
        display: 'flex', flexDirection: 'column',
        opacity: 0.35, pointerEvents: 'none',
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            height: 26,
            display: 'flex', alignItems: 'center',
            padding: '0 12px', gap: 12,
            borderBottom: `1px solid ${T.borderSoft}`,
            fontFamily: T.mono, fontSize: 11, color: T.textMute,
          }}>
            <div style={{ width: 120, height: 10, background: T.border, borderRadius: 1 }} />
            <div style={{ width: 70, height: 10, background: T.border, borderRadius: 1 }} />
            <div style={{ width: 100, height: 10, background: T.border, borderRadius: 1 }} />
            <div style={{ flex: 1, height: 10, background: T.border, borderRadius: 1, maxWidth: 400 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Disk full — blocks the page, recordings paused
function DiskFullBlocker() {
  const T = window.TOKENS;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      minHeight: 0,
    }}>
      {/* Top alert */}
      <div style={{
        background: '#3a1f1f',
        borderBottom: `1px solid #5a2d2d`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ color: '#f48771', fontSize: 18 }}>■</span>
        <span style={{ fontSize: 12.5, color: '#f48771', fontWeight: 500 }}>
          Disk below stop threshold — all recordings paused
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(244,135,113,0.7)', fontFamily: T.mono }}>
          18 GB free / 20 GB threshold · 2 recordings queued
        </span>
      </div>

      {/* Hero content */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, gap: 22,
      }}>
        <div style={{ width: 520, maxWidth: '90%' }}>
          <div style={{
            fontSize: 11, color: T.textMute, letterSpacing: 0.4,
            textTransform: 'uppercase', marginBottom: 8,
          }}>Output Volume</div>
          <div style={{
            fontSize: 13, fontFamily: T.mono, color: T.text, marginBottom: 14,
          }}>/mnt/recordings/auto-yt-dlp</div>

          {/* Disk meter */}
          <div style={{
            height: 22,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
          }}>
            <div style={{ flex: 97, background: '#f48771' }} />
            <div style={{ flex: 3, background: T.surface3 }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.textMute,
          }}>
            <span>3.98 TB used of 4.00 TB</span>
            <span style={{ color: '#f48771' }}>18 GB free</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', maxWidth: 440, marginTop: 8 }}>
          <div style={{ fontSize: 16, color: T.text, fontWeight: 500, marginBottom: 6 }}>
            Free up space to resume recording
          </div>
          <div style={{ fontSize: 12.5, color: T.textDim, lineHeight: 1.5 }}>
            Recordings stay paused until free space is above the stop threshold.
            Run retention cleanup, delete old files, or raise the threshold in Settings.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn primary style={{ height: 30, padding: '0 16px' }}>Run Cleanup Now</Btn>
          <Btn style={{ height: 30 }}>Open Storage</Btn>
          <Btn style={{ height: 30 }}>Adjust Threshold</Btn>
        </div>

        <div style={{
          display: 'flex', gap: 20, marginTop: 8,
          fontSize: 11, fontFamily: T.mono, color: T.textMute,
        }}>
          <span>Next auto-cleanup: <span style={{ color: T.textDim }}>15:00:00</span></span>
          <span>Will free: <span style={{ color: T.textDim }}>≈1.2 GB</span></span>
        </div>
      </div>
    </div>
  );
}

window.EmptyAccounts = EmptyAccounts;
window.DaemonStoppedBanner = DaemonStoppedBanner;
window.DiskFullBlocker = DiskFullBlocker;
