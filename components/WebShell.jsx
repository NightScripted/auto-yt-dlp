// WebShell.jsx — browser-based shell for the Monitor (Docker/UNRAID/TrueNAS deploy)
// Keeps the dark utility aesthetic of the desktop app but adapts the layout
// for a browser: left sidebar for tab navigation (more horizontal room for
// tables), a proper header with daemon state + user/deploy info, and web-style
// affordances (keyboard shortcut hints, breadcrumbs, toast region).

const WTOK = window.TOKENS;

function WebAppShell({ activeTab, children, statusLine, statusTime, hostname = 'truenas.local', diskWarn = false }) {
  const tabs = [
    { id: 0, label: 'Active Downloads', icon: <IcRec />, badge: '2' },
    { id: 1, label: 'Library',          icon: <IcLib /> },
    { id: 2, label: 'Storage',          icon: <IcDisk />, badge: diskWarn ? '!' : null, warn: diskWarn },
    { id: 3, label: 'Accounts & Settings', icon: <IcCog /> },
  ];
  return (
    <div style={{
      width: '100%', height: '100%',
      background: WTOK.bg,
      color: WTOK.text,
      fontFamily: WTOK.sans,
      fontSize: 13,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top header */}
      <div style={{
        height: 48, flexShrink: 0,
        background: '#18181a',
        borderBottom: `1px solid ${WTOK.borderSoft}`,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: `linear-gradient(135deg, ${WTOK.accent} 0%, #005ea8 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: WTOK.mono,
          }}>Y</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>auto-yt-dlp</span>
            <span style={{ fontSize: 10.5, color: WTOK.textMute, fontFamily: WTOK.mono }}>v0.4.2 · docker</span>
          </div>
        </div>

        <div style={{ width: 1, height: 22, background: WTOK.border, marginLeft: 4 }} />

        {/* Daemon status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#3fb950', boxShadow: '0 0 6px #3fb95066',
          }} />
          <span style={{ fontSize: 12 }}>Daemon running</span>
        </div>
        <Sep2 />
        <span style={{ fontSize: 12, color: WTOK.textDim }}>
          Watching <span style={{ color: WTOK.text, fontWeight: 500 }}>3</span> accounts
        </span>
        <Sep2 />
        <span style={{ fontSize: 12, color: WTOK.textDim }}>
          Poll <span style={{ color: WTOK.text, fontFamily: WTOK.mono, fontSize: 11.5 }}>60s</span>
        </span>
        <Sep2 />
        <span style={{ fontSize: 11, color: WTOK.textMute, fontFamily: WTOK.mono }}>uptime 02:14:37</span>

        <div style={{ flex: 1 }} />

        {/* Hostname pill */}
        <div style={{
          height: 26, padding: '0 10px',
          background: WTOK.surface2,
          border: `1px solid ${WTOK.border}`,
          borderRadius: 13,
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11.5, fontFamily: WTOK.mono,
          color: WTOK.textDim,
        }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1" y="1" width="9" height="5"/><rect x="1" y="6.5" width="9" height="3.5"/>
            <circle cx="3" cy="3.5" r=".8" fill="#3fb950" stroke="none"/>
          </svg>
          <span>{hostname}:8787</span>
        </div>

        {/* Dark/system toggle + menu */}
        <HdrIcon><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M10 7a4 4 0 0 1-5-5 4.5 4.5 0 1 0 5 5z"/></svg></HdrIcon>
        <HdrIcon><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="6.5" cy="6.5" r="2"/><path d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.5 2.5l1 1M9.5 9.5l1 1M2.5 10.5l1-1M9.5 3.5l1-1"/></svg></HdrIcon>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#4a3c7c', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
        }}>ZW</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: 188, flexShrink: 0,
          background: '#1a1a1c',
          borderRight: `1px solid ${WTOK.borderSoft}`,
          display: 'flex', flexDirection: 'column',
          padding: '10px 8px',
        }}>
          <div style={{
            fontSize: 10, color: WTOK.textMute, letterSpacing: 0.6,
            padding: '4px 8px 8px', textTransform: 'uppercase', fontWeight: 500,
          }}>Navigation</div>

          {tabs.map(t => (
            <SideItem key={t.id} active={t.id === activeTab} label={t.label} icon={t.icon} badge={t.badge} />
          ))}

          <div style={{ flex: 1 }} />

          {/* Footer: quick health */}
          <div style={{
            padding: 10, borderTop: `1px solid ${WTOK.borderSoft}`,
            fontSize: 10.5, color: WTOK.textMute, fontFamily: WTOK.mono,
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>cpu</span><span style={{ color: WTOK.text }}>12%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>mem</span><span style={{ color: WTOK.text }}>214 MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>disk free</span>
              <span style={{ color: diskWarn ? '#f48771' : WTOK.text }}>
                {diskWarn ? '18 GB' : '1.7 TB'}
              </span>
            </div>
            <div style={{
              height: 3, background: WTOK.border, borderRadius: 2, marginTop: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                width: diskWarn ? '97%' : '57%', height: '100%',
                background: diskWarn ? '#f48771' : WTOK.accent,
              }} />
            </div>
            {diskWarn && (
              <div style={{
                marginTop: 6, padding: '5px 7px',
                background: '#3a1f1f', border: '1px solid #4a2d2d',
                borderRadius: 2, color: '#f48771',
                fontSize: 10, lineHeight: 1.3,
              }}>
                Below stop threshold — new recordings paused
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {children}
        </div>
      </div>

      {/* Bottom log strip */}
      <div style={{
        height: 26, flexShrink: 0,
        background: '#18181a',
        borderTop: `1px solid ${WTOK.borderSoft}`,
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        fontFamily: WTOK.mono, fontSize: 11,
        color: WTOK.textDim,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#3fb950',
        }} />
        <span style={{ color: WTOK.textMute }}>[{statusTime}]</span>
        <span style={{
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, color: WTOK.text,
        }}>{statusLine}</span>
        <span style={{ color: WTOK.textMute }}>·</span>
        <span style={{ color: WTOK.textMute }}>Streaming from /api/events</span>
      </div>
    </div>
  );
}

function Sep2() {
  return <div style={{ width: 1, height: 16, background: WTOK.border }} />;
}

function HdrIcon({ children }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: WTOK.textDim, cursor: 'pointer',
    }}>{children}</div>
  );
}

function SideItem({ active, label, icon, badge, warn }) {
  return (
    <div style={{
      height: 32,
      padding: '0 9px',
      display: 'flex', alignItems: 'center',
      gap: 10,
      borderRadius: 4,
      background: active ? 'rgba(0,120,212,0.16)' : 'transparent',
      color: active ? WTOK.text : WTOK.textDim,
      fontSize: 12.5,
      fontWeight: active ? 500 : 400,
      marginBottom: 1,
      position: 'relative',
      cursor: 'pointer',
    }}>
      {active && <div style={{
        position: 'absolute', left: -8, top: 6, bottom: 6, width: 2.5,
        background: WTOK.accent, borderRadius: 2,
      }} />}
      <span style={{ color: warn ? '#f48771' : (active ? WTOK.accent : WTOK.textMute), display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          minWidth: 18, height: 16, padding: '0 5px',
          background: warn ? '#f48771' : (active ? WTOK.accent : WTOK.surface3),
          color: warn ? '#fff' : (active ? '#fff' : WTOK.textDim),
          borderRadius: 8, fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: WTOK.mono,
        }}>{badge}</span>
      )}
    </div>
  );
}

function IcDisk() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <ellipse cx="7" cy="3.5" rx="5" ry="1.8"/>
    <path d="M2 3.5v7c0 1 2.2 1.8 5 1.8s5-.8 5-1.8v-7"/>
    <path d="M2 7c0 1 2.2 1.8 5 1.8s5-.8 5-1.8"/></svg>;
}

function IcRec() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <circle cx="7" cy="7" r="5"/><circle cx="7" cy="7" r="2" fill="currentColor"/></svg>;
}
function IcLib() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <rect x="1.5" y="3" width="11" height="8.5" rx="1"/><path d="M5 3V1.5h4V3"/><path d="M5.5 7l3 1.5-3 1.5z" fill="currentColor" stroke="none"/></svg>;
}
function IcCog() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <circle cx="7" cy="7" r="2"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1"/></svg>;
}

window.WebAppShell = WebAppShell;
