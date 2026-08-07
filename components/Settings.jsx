// Settings.jsx — Accounts & settings, with per-account drawer, quiet hours, and disk threshold.
// Accepts { selectedAccount, showAccountDrawer, openSection } to show different states across artboards.

function SettingsTab({ showAccountDrawer = false, openSection = 'main' }) {
  const T = window.TOKENS;
  const accounts = [
    { name: 'example_username',                 quality: '1080p60', format: 'mp4', status: 'watching' },
    { name: 'moonbeam_22',                   quality: '720p',    format: 'mp4', status: 'watching', selected: true, url: 'https://example.stream/moonbeam_22' },
    { name: 'velvetsky',                     quality: 'best',    format: 'mp4', status: 'paused' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
      <div className="mon-scroll" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        padding: 14, gap: 14,
        overflowY: 'auto',
      }}>
        {/* Accounts */}
        <GroupBox title="Watched Accounts">
          <div className="mon-scroll" style={{
            height: 132,
            background: T.bg,
            border: `1px solid ${T.border}`,
            overflowY: 'auto',
          }}>
            {accounts.map((a, i) => (
              <AccountRow key={i} account={a} selected={a.selected} />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`e${i}`} style={{ height: 24, borderBottom: `1px solid ${T.borderSoft}` }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <TextInput placeholder="username or full room URL" style={{ flex: 1 }} />
            <Btn>Add</Btn>
          </div>
          <div style={{ display: 'flex', marginTop: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textMute, fontStyle: 'italic' }}>
              Click any account to customize per-account settings
            </span>
            <div style={{ flex: 1 }} />
            <Btn>Remove Selected</Btn>
          </div>
        </GroupBox>

        {/* Schedule / Quiet Hours */}
        <GroupBox title="Schedule · Quiet Hours">
          <QuietHoursGrid />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 10, paddingTop: 10,
            borderTop: `1px solid ${T.borderSoft}`,
          }}>
            <Checkbox checked />
            <span style={{ fontSize: 12, color: T.text }}>Enable quiet hours</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
              During quiet hours: poll paused · in-progress recordings continue
            </span>
          </div>
        </GroupBox>

        {/* Defaults */}
        <GroupBox title="Defaults">
          <FormRow label="Poll Interval">
            <SpinBox value={60} suffix=" seconds" />
          </FormRow>
          <FormRow label="Output Directory">
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              <TextInput value="/mnt/recordings/auto-yt-dlp" style={{ flex: 1 }} />
              <Btn>Browse…</Btn>
            </div>
          </FormRow>
          <FormRow label="Max Concurrent">
            <SpinBox value={4} suffix="" width={80} />
          </FormRow>
          <FormRow label="Default Quality">
            <Select value="best (auto)" width={180} />
          </FormRow>
        </GroupBox>

        {/* Disk guardrails */}
        <GroupBox title="Disk Guardrails">
          <FormRow label="Warn below">
            <SpinBox value={100} suffix=" GB free" width={170} />
          </FormRow>
          <FormRow label="Stop recording below">
            <SpinBox value={20} suffix=" GB free" width={170} />
          </FormRow>
          <div style={{
            marginTop: 6, padding: '8px 10px',
            background: '#1a2e1a',
            border: `1px solid #2d4a2d`,
            borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 11, fontFamily: T.mono,
          }}>
            <span style={{ color: '#6ccb6c' }}>✓</span>
            <span style={{ color: T.textDim }}>
              Current: <span style={{ color: T.text }}>1.73 TB free</span> of 4.00 TB
              · well above thresholds
            </span>
          </div>
        </GroupBox>

        {/* Cookie Auth */}
        <GroupBox title="Cookie Authentication">
          <Radio label="No cookies (default)" />
          <Radio label="Use browser cookies (Firefox)" />
          <Radio label="Use cookie file" checked />
          <div style={{ display: 'flex', gap: 6, marginLeft: 22, marginTop: 4 }}>
            <TextInput value="/config/cookies.txt" style={{ flex: 1 }} mono />
            <Btn>Browse…</Btn>
          </div>
        </GroupBox>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 11, color: T.textMute, fontStyle: 'italic' }}>
            Changes take effect on the next poll cycle
          </span>
          <div style={{ flex: 1 }} />
          <Btn>Revert</Btn>
          <div style={{ width: 6 }} />
          <Btn primary>Save</Btn>
        </div>
      </div>

      {showAccountDrawer && <AccountDrawer account={accounts[1]} />}
    </div>
  );
}

// ─── Per-account drawer ─────────────────────────────────────────

function AccountDrawer({ account }) {
  const T = window.TOKENS;
  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: '#252528',
      borderLeft: `1px solid ${T.border}`,
      borderTop: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      fontSize: 12,
    }}>
      {/* Drawer header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${T.borderSoft}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `hsl(280, 40%, 32%)`,
          color: '#fff', fontWeight: 600, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.name}
          </div>
          <div style={{ fontSize: 10.5, color: T.textMute, fontFamily: T.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.url || account.name}
          </div>
        </div>
        <div style={{
          width: 20, height: 20, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.textDim, cursor: 'pointer',
        }}>×</div>
      </div>

      <div className="mon-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <DrawerLabel>Quality override</DrawerLabel>
        <Select value="720p" width="100%" />

        <DrawerLabel>Format</DrawerLabel>
        <Select value="mp4 (h264 + aac)" width="100%" />

        <DrawerLabel>Output subfolder</DrawerLabel>
        <TextInput value="{user}/{year}-{month}" style={{ width: '100%' }} mono />
        <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 4, fontFamily: T.mono, lineHeight: 1.4 }}>
          → /mnt/recordings/auto-yt-dlp/moonbeam_22/2026-04/
        </div>

        <DrawerLabel>Poll interval</DrawerLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Checkbox />
          <span style={{ fontSize: 12, color: T.textDim }}>Override default</span>
          <div style={{ flex: 1 }} />
          <SpinBox value={60} suffix="s" width={90} />
        </div>

        <DrawerLabel>Notifications</DrawerLabel>
        <Checkbox checked inline label="On recording start" />
        <Checkbox checked inline label="On recording finish" />
        <Checkbox inline label="On failure only" />

        <DrawerLabel>Status</DrawerLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn primary style={{ flex: 1 }}>Watching</Btn>
          <Btn style={{ flex: 1 }}>Pause</Btn>
        </div>

        <div style={{
          marginTop: 16, paddingTop: 12,
          borderTop: `1px solid ${T.borderSoft}`,
          fontSize: 10.5, fontFamily: T.mono, color: T.textMute,
          lineHeight: 1.6,
        }}>
          <div>Added: <span style={{ color: T.textDim }}>2026-03-14</span></div>
          <div>Last live: <span style={{ color: T.textDim }}>2026-04-21 13:04</span></div>
          <div>Recorded: <span style={{ color: T.textDim }}>24 files · 18.4 GB</span></div>
        </div>
      </div>
    </div>
  );
}

function DrawerLabel({ children }) {
  const T = window.TOKENS;
  return (
    <div style={{
      fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase',
      color: T.textMute, fontWeight: 500,
      marginTop: 14, marginBottom: 6,
    }}>{children}</div>
  );
}

// ─── Quiet hours grid ───────────────────────────────────────────

function QuietHoursGrid() {
  const T = window.TOKENS;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Mask: 24 slots per day, 1 = quiet
  // Weekday nights: 00-08 and 22-24 quiet (typical work hours free).
  // Weekends: only 02-07 quiet.
  const mask = (day) => Array.from({ length: 24 }, (_, h) => {
    if (day === 0 || day === 6) return h < 7 && h >= 2 ? 1 : 0;
    return (h < 8 || h >= 22) ? 1 : 0;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Hour header */}
      <div style={{ display: 'flex', gap: 2, paddingLeft: 34 }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} style={{
            flex: 1, textAlign: 'center',
            fontSize: 9, fontFamily: T.mono, color: T.textMute,
          }}>{h % 6 === 0 ? String(h).padStart(2, '0') : ''}</div>
        ))}
      </div>
      {days.map((d, i) => (
        <div key={d} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <div style={{ width: 32, fontSize: 10.5, fontFamily: T.mono, color: T.textDim }}>{d}</div>
          {mask(i).map((q, h) => (
            <div key={h} style={{
              flex: 1, height: 16,
              background: q ? T.accent : '#2d2d30',
              opacity: q ? 0.85 : 1,
              borderRadius: 1.5,
              cursor: 'pointer',
            }} />
          ))}
        </div>
      ))}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginTop: 6, fontSize: 10.5, fontFamily: T.mono, color: T.textMute,
      }}>
        <span>Drag to paint</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, background: '#2d2d30', borderRadius: 1.5 }} />
          <span>Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, background: T.accent, borderRadius: 1.5 }} />
          <span>Quiet</span>
        </div>
        <div style={{ flex: 1 }} />
        <span>Timezone: <span style={{ color: T.textDim }}>America/Denver</span></span>
      </div>
    </div>
  );
}

// ─── Primitives ─────────────────────────────────────────────────

function GroupBox({ title, children }) {
  const T = window.TOKENS;
  return (
    <div style={{
      position: 'relative',
      border: `1px solid ${T.border}`,
      borderRadius: 2,
      padding: '16px 12px 12px',
      background: '#252526',
    }}>
      <div style={{
        position: 'absolute', top: -7, left: 10,
        background: T.surface,
        padding: '0 6px',
        fontSize: 11, fontWeight: 500,
        color: T.textDim, letterSpacing: 0.2,
      }}>{title}</div>
      {children}
    </div>
  );
}

function AccountRow({ account, selected }) {
  const T = window.TOKENS;
  const stateColor = account.status === 'paused' ? T.amber : '#3fb950';
  return (
    <div style={{
      height: 28,
      display: 'flex', alignItems: 'center',
      padding: '0 10px',
      gap: 8,
      fontSize: 12,
      borderBottom: `1px solid ${T.borderSoft}`,
      background: selected ? '#094771' : 'transparent',
      color: selected ? '#fff' : T.text,
      cursor: 'pointer',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: stateColor,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: T.mono, flex: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{account.name}</span>
      <span style={{
        fontSize: 10, fontFamily: T.mono,
        color: selected ? 'rgba(255,255,255,0.8)' : T.textMute,
      }}>{account.quality}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4"
        style={{ opacity: 0.55 }}>
        <path d="M3.5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function FormRow({ label, children }) {
  const T = window.TOKENS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 160, fontSize: 12, color: T.textDim, textAlign: 'right' }}>{label}:</div>
      <div style={{ flex: 1, display: 'flex' }}>{children}</div>
    </div>
  );
}

function TextInput({ value, placeholder, style, mono }) {
  const T = window.TOKENS;
  return (
    <div style={{
      height: 24,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 2,
      padding: '0 8px',
      display: 'flex', alignItems: 'center',
      fontSize: mono ? 11 : 12,
      fontFamily: mono ? T.mono : 'inherit',
      color: value ? T.text : T.textMute,
      ...style,
    }}>
      {value || placeholder}
    </div>
  );
}

function SpinBox({ value, suffix, width = 150 }) {
  const T = window.TOKENS;
  return (
    <div style={{
      height: 24, width,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 2,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ flex: 1, padding: '0 8px', fontSize: 12, fontFamily: T.mono, color: T.text }}>{value}{suffix}</div>
      <div style={{ width: 16, height: '100%', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${T.border}` }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${T.border}`, color: T.textDim }}>
          <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 4l3.5-4L7 4z" fill="currentColor"/></svg>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim }}>
          <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 0l3.5 4L7 0z" fill="currentColor"/></svg>
        </div>
      </div>
    </div>
  );
}

function Select({ value, width }) {
  const T = window.TOKENS;
  return (
    <div style={{
      height: 24, width,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 2,
      display: 'flex', alignItems: 'center',
      padding: '0 8px',
      fontSize: 12, color: T.text,
    }}>
      <span style={{ flex: 1 }}>{value}</span>
      <svg width="9" height="5" viewBox="0 0 9 5" fill={T.textDim}><path d="M0 0l4.5 5L9 0z"/></svg>
    </div>
  );
}

function Radio({ label, checked }) {
  const T = window.TOKENS;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: T.text,
      marginBottom: 6, height: 18,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        border: `1px solid ${checked ? T.accent : T.border}`,
        background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />}
      </div>
      {label}
    </div>
  );
}

function Checkbox({ checked, inline, label }) {
  const T = window.TOKENS;
  const box = (
    <div style={{
      width: 14, height: 14, borderRadius: 2,
      border: `1px solid ${checked ? T.accent : T.border}`,
      background: checked ? T.accent : T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {checked && <svg width="10" height="10" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.7" fill="none"><path d="M2 5.2l2.2 2L8 3.2"/></svg>}
    </div>
  );
  if (!inline) return box;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text, marginBottom: 5 }}>
      {box}{label}
    </div>
  );
}

window.SettingsTab = SettingsTab;
