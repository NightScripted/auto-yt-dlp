// Window.jsx — shared desktop window chrome + design tokens for the Monitor app.
// Rendered at native size (1000x680). Designed to feel like a native dark
// desktop window on Windows/Linux. Not a browser.

const TOKENS = {
  bg:        '#1e1e1e',
  surface:   '#252526',
  surface2:  '#2d2d30',
  surface3:  '#333337',
  border:    '#3c3c3c',
  borderSoft:'#333333',
  text:      '#e8e8e8',
  textDim:   '#a0a0a0',
  textMute:  '#6e6e6e',
  accent:    '#0078d4',
  accentHover:'#1a88e0',
  green:     '#4ec9b0',
  greenBg:   '#1a2e1a',
  greenDim:  '#2d4a2d',
  red:       '#f48771',
  redBg:     '#2e1a1a',
  redDim:    '#4a2d2d',
  amber:     '#d7ba7d',
  greyRow:   '#2a2a2a',
  mono:      '"JetBrains Mono", "SF Mono", "Cascadia Mono", Consolas, "Courier New", monospace',
  sans:      '"Segoe UI", "Inter", -apple-system, system-ui, sans-serif',
};
window.TOKENS = TOKENS;

// Native-looking window chrome. Min/max/close are Windows-style on the right.
function DesktopWindow({ title, children, active = true }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: TOKENS.bg,
      color: TOKENS.text,
      fontFamily: TOKENS.sans,
      fontSize: 13,
      display: 'flex', flexDirection: 'column',
      border: `1px solid ${active ? '#0a0a0a' : '#2a2a2a'}`,
      boxSizing: 'border-box',
    }}>
      {/* Title bar */}
      <div style={{
        height: 30,
        background: '#1a1a1a',
        borderBottom: `1px solid ${TOKENS.borderSoft}`,
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        <div style={{ width: 10 }} />
        <div style={{
          fontSize: 12, color: TOKENS.textDim,
          letterSpacing: 0.1, fontWeight: 400,
        }}>{title}</div>
        <div style={{ flex: 1 }} />
        <WinBtn kind="min" />
        <WinBtn kind="max" />
        <WinBtn kind="close" />
      </div>

      {children}
    </div>
  );
}

function WinBtn({ kind }) {
  const s = { width: 46, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: TOKENS.textDim, cursor: 'default' };
  if (kind === 'close') {
    return <div style={{ ...s }} onMouseEnter={e=>e.currentTarget.style.background='#c42b1c'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1" fill="none">
        <path d="M1 1l8 8M9 1l-8 8"/></svg></div>;
  }
  if (kind === 'max') {
    return <div style={s}><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1" fill="none">
      <rect x="1" y="1" width="8" height="8"/></svg></div>;
  }
  return <div style={s}><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1">
    <path d="M1 9h8"/></svg></div>;
}

// Top daemon strip and bottom status bar
function DaemonStrip({ running = true, accountCount = 3, pollInterval = 60 }) {
  return (
    <div style={{
      height: 34, flexShrink: 0,
      background: TOKENS.surface,
      borderBottom: `1px solid ${TOKENS.borderSoft}`,
      display: 'flex', alignItems: 'center',
      padding: '0 14px',
      gap: 16,
      fontSize: 12,
      color: TOKENS.text,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: running ? '#3fb950' : '#f85149',
          boxShadow: running ? '0 0 6px #3fb95066' : '0 0 6px #f8514966',
        }} />
        <span style={{ color: TOKENS.text }}>
          Daemon {running ? 'running' : 'stopped'}
        </span>
      </div>
      <Sep />
      <div style={{ color: TOKENS.textDim }}>
        Watching <span style={{ color: TOKENS.text, fontWeight: 500 }}>{accountCount}</span> accounts
      </div>
      <Sep />
      <div style={{ color: TOKENS.textDim }}>
        Poll interval: <span style={{ color: TOKENS.text, fontFamily: TOKENS.mono, fontSize: 11.5 }}>{pollInterval}s</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ color: TOKENS.textMute, fontFamily: TOKENS.mono, fontSize: 11 }}>
        uptime 02:14:37
      </div>
    </div>
  );
}
function Sep() {
  return <div style={{ width: 1, height: 14, background: TOKENS.border }} />;
}

function StatusBar({ line, time = '14:32:01' }) {
  return (
    <div style={{
      height: 24, flexShrink: 0,
      background: TOKENS.surface,
      borderTop: `1px solid ${TOKENS.borderSoft}`,
      display: 'flex', alignItems: 'center',
      padding: '0 10px',
      gap: 8,
      fontFamily: TOKENS.mono,
      fontSize: 11,
      color: TOKENS.textDim,
      overflow: 'hidden',
    }}>
      <span style={{ color: TOKENS.textMute }}>[{time}]</span>
      <span style={{
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flex: 1, color: TOKENS.text,
      }}>{line}</span>
      <span style={{ color: TOKENS.textMute, flexShrink: 0 }}>log.txt</span>
    </div>
  );
}

// QTabWidget-style tabs
function TabBar({ tabs, active }) {
  return (
    <div style={{
      height: 32, flexShrink: 0,
      background: TOKENS.bg,
      borderBottom: `1px solid ${TOKENS.border}`,
      display: 'flex', alignItems: 'flex-end',
      paddingLeft: 6,
    }}>
      {tabs.map((t, i) => {
        const isActive = i === active;
        return (
          <div key={t} style={{
            height: 28,
            padding: '0 14px',
            display: 'flex', alignItems: 'center',
            fontSize: 12,
            color: isActive ? TOKENS.text : TOKENS.textDim,
            background: isActive ? TOKENS.surface : 'transparent',
            border: `1px solid ${isActive ? TOKENS.border : 'transparent'}`,
            borderBottom: isActive ? `1px solid ${TOKENS.surface}` : 'none',
            marginBottom: -1,
            borderRadius: '3px 3px 0 0',
            marginRight: 2,
            cursor: 'default',
            userSelect: 'none',
          }}>{t}</div>
        );
      })}
      <div style={{ flex: 1 }} />
    </div>
  );
}

// Native pushbutton
function Btn({ children, primary, danger, disabled, icon, style }) {
  const bg = danger ? '#5a2d2d' : primary ? TOKENS.accent : TOKENS.surface3;
  const br = danger ? '#7a3d3d' : primary ? TOKENS.accent : TOKENS.border;
  const fg = disabled ? TOKENS.textMute : danger ? '#f48771' : primary ? '#fff' : TOKENS.text;
  return (
    <button disabled={disabled} style={{
      height: 26,
      padding: '0 14px',
      background: bg,
      color: fg,
      border: `1px solid ${br}`,
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}>
      {icon}
      {children}
    </button>
  );
}

// Pill-shaped status badge
function StatusBadge({ kind }) {
  const map = {
    recording: { bg: '#1f3a1f', fg: '#6ccb6c', dot: '#3fb950', label: 'Recording', pulse: true },
    finished:  { bg: '#2a2a2a', fg: '#a0a0a0', dot: '#6e6e6e', label: 'Finished' },
    failed:    { bg: '#3a1f1f', fg: '#f48771', dot: '#f85149', label: 'Failed (1)' },
  };
  const c = map[kind];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px 2px 7px',
      background: c.bg,
      color: c.fg,
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 10,
      lineHeight: 1,
      height: 18,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot,
        boxShadow: c.pulse ? `0 0 4px ${c.dot}` : 'none',
        animation: c.pulse ? 'dc-pulse 1.6s ease-in-out infinite' : 'none',
      }} />
      {c.label}
    </div>
  );
}

// Inject pulse keyframes once
if (typeof document !== 'undefined' && !document.getElementById('mon-kf')) {
  const s = document.createElement('style');
  s.id = 'mon-kf';
  s.textContent = `
    @keyframes dc-pulse { 0%,100%{opacity:1}50%{opacity:.45} }
    .mon-scroll::-webkit-scrollbar{width:12px;height:12px}
    .mon-scroll::-webkit-scrollbar-track{background:${TOKENS.bg}}
    .mon-scroll::-webkit-scrollbar-thumb{background:#3e3e42;border:2px solid ${TOKENS.bg}}
    .mon-scroll::-webkit-scrollbar-thumb:hover{background:#505054}
  `;
  document.head.appendChild(s);
}

Object.assign(window, { DesktopWindow, DaemonStrip, StatusBar, TabBar, Btn, StatusBadge });
