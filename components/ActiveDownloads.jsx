// ActiveDownloads.jsx — Tab 1: live table of recordings
// Supports sortable columns and an inline log panel for the selected row.

function ActiveDownloadsTab({ sortBy = 'started', sortDir = 'desc', expandedRow = null }) {
  const T = window.TOKENS;
  const rows = [
    { user: 'example_username', status: 'recording', started: '2026-04-21 14:32:01', pid: 48213,
      progress: '[download]  412.8MiB at 1.82MiB/s (00:03:49)  frag 229/∞' },
    { user: 'moonbeam_22',   status: 'recording', started: '2026-04-21 14:28:44', pid: 48197,
      progress: '[hls @ 0x7f2a] Opening segment 847.ts for reading · 1080p60' },
    { user: 'velvetsky',     status: 'finished',  started: '2026-04-21 13:50:12', pid: 47902,
      progress: '[download] 100% of 2.41GiB in 00:41:22 — merged to velvetsky_2026-04-21.mp4' },
    { user: 'indigo_rose',   status: 'failed',    started: '2026-04-21 13:12:05', pid: 47604,
      progress: 'ERROR: Unable to download webpage: HTTP Error 403: Forbidden — room offline or private' },
  ];

  const cols = [
    { key: 'user',     label: 'Username', width: '160px' },
    { key: 'status',   label: 'Status',   width: '110px' },
    { key: 'started',  label: 'Started',  width: '140px' },
    { key: 'pid',      label: 'PID',      width: '70px' },
    { key: 'progress', label: 'Progress', width: '1fr' },
  ];
  const gridCols = cols.map(c => c.width).join(' ');

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
    }}>
      {/* Sortable header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        background: '#2d2d30',
        borderBottom: `1px solid ${T.border}`,
        fontSize: 11, color: T.textDim, fontWeight: 500,
        height: 26, alignItems: 'center',
      }}>
        {cols.map((c, i) => (
          <HeaderCell key={c.key} first={i === 0}
            active={sortBy === c.key} dir={sortDir}>
            {c.label}
          </HeaderCell>
        ))}
      </div>

      {/* Rows */}
      <div className="mon-scroll" style={{ flex: 1, overflowY: 'auto', background: T.surface }}>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <Row row={r} gridCols={gridCols}
              selected={expandedRow === r.user}
              expanded={expandedRow === r.user} />
            {expandedRow === r.user && <LogPanel row={r} />}
          </React.Fragment>
        ))}
        {Array.from({ length: expandedRow ? 6 : 10 }).map((_, i) => (
          <div key={`e${i}`} style={{
            height: 26,
            borderBottom: `1px solid ${T.borderSoft}`,
            background: T.surface,
          }} />
        ))}
      </div>

      {/* Controls */}
      <div style={{
        height: 44, flexShrink: 0,
        borderTop: `1px solid ${T.border}`,
        background: '#252526',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8,
      }}>
        <Btn>Stop Selected</Btn>
        <Btn>Clear Finished</Btn>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
          Sorted by {sortBy} {sortDir === 'asc' ? '↑' : '↓'} · 4 rows · 2 active · 1 finished · 1 failed
        </div>
      </div>
    </div>
  );
}

function HeaderCell({ children, first, active, dir }) {
  const T = window.TOKENS;
  return (
    <div style={{
      padding: '0 10px',
      borderLeft: first ? 'none' : `1px solid ${T.border}`,
      height: '100%',
      display: 'flex', alignItems: 'center', gap: 6,
      cursor: 'pointer',
      color: active ? T.text : T.textDim,
      background: active ? '#343437' : 'transparent',
    }}>
      <span>{children}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', opacity: active ? 1 : 0.35 }}>
        <svg width="7" height="4" viewBox="0 0 7 4" fill={active && dir === 'asc' ? T.accent : 'currentColor'}>
          <path d="M0 4l3.5-4L7 4z"/>
        </svg>
        <svg width="7" height="4" viewBox="0 0 7 4" fill={active && dir === 'desc' ? T.accent : 'currentColor'} style={{ marginTop: 1 }}>
          <path d="M0 0l3.5 4L7 0z"/>
        </svg>
      </span>
    </div>
  );
}

function Row({ row, gridCols, selected, expanded }) {
  const T = window.TOKENS;
  const bg = {
    recording: '#1a2e1a',
    finished:  '#2a2a2a',
    failed:    '#2e1a1a',
  }[row.status];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      height: 26,
      background: selected ? '#094771' : bg,
      borderBottom: expanded ? 'none' : `1px solid ${T.borderSoft}`,
      outline: selected ? `1px solid ${T.accent}` : 'none',
      outlineOffset: -1,
      alignItems: 'center',
      fontSize: 12, color: T.text,
      cursor: 'pointer',
    }}>
      <Cell first>
        <span style={{ display: 'inline-block', width: 10, color: T.textMute, fontFamily: T.mono }}>
          {expanded ? '▾' : '▸'}
        </span>
        {' '}{row.user}
      </Cell>
      <Cell><StatusBadge kind={row.status} /></Cell>
      <Cell mono>{row.started}</Cell>
      <Cell mono dim>{row.pid}</Cell>
      <Cell mono clip>{row.progress}</Cell>
    </div>
  );
}

function Cell({ children, first, mono, dim }) {
  const T = window.TOKENS;
  return (
    <div style={{
      padding: '0 10px',
      borderLeft: first ? 'none' : `1px solid ${T.borderSoft}`,
      height: '100%',
      display: 'flex', alignItems: 'center',
      fontFamily: mono ? T.mono : 'inherit',
      fontSize: mono ? 11 : 12,
      color: dim ? T.textDim : 'inherit',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </div>
  );
}

// Inline log panel, expands below a row. Shows real yt-dlp-ish stderr.
function LogPanel({ row }) {
  const T = window.TOKENS;
  const failed = row.status === 'failed';
  const logLines = failed ? [
    ['14:12:05', 'INFO',  `auto-yt-dlp: polling ${row.user}`],
    ['14:12:05', 'INFO',  `yt-dlp v2024.12.13 · python 3.11.7`],
    ['14:12:05', 'DEBUG', `resolving https://example.stream/${row.user}`],
    ['14:12:06', 'DEBUG', `cookie jar: /config/cookies.txt (84 entries)`],
    ['14:12:06', 'INFO',  `[generic] Extracting URL`],
    ['14:12:06', 'WARN',  `[generic] Falling back on generic extractor`],
    ['14:12:07', 'ERROR', `unable to download webpage: <urlopen error HTTP Error 403: Forbidden>`],
    ['14:12:07', 'ERROR', `  at yt_dlp/extractor/common.py:838 in _request_webpage`],
    ['14:12:07', 'ERROR', `Traceback (most recent call last):`],
    ['14:12:07', 'ERROR', `  File "/app/yt_dlp/YoutubeDL.py", line 1627, in wrapper`],
    ['14:12:07', 'ERROR', `    return func(self, *args, **kwargs)`],
    ['14:12:07', 'INFO',  `auto-yt-dlp: backoff 30s before retry (attempt 1/3)`],
    ['14:12:37', 'ERROR', `retry failed: HTTP 403 — room may be offline or private`],
    ['14:12:37', 'INFO',  `giving up, marking download as failed`],
  ] : [
    ['14:32:01', 'INFO',  `auto-yt-dlp: ${row.user} is LIVE`],
    ['14:32:01', 'INFO',  `spawning yt-dlp (pid ${row.pid})`],
    ['14:32:02', 'INFO',  `[hls] Downloading m3u8 manifest`],
    ['14:32:02', 'INFO',  `[hls] 1080p60 selected (3 formats available)`],
    ['14:32:03', 'INFO',  `[download] Destination: ${row.user}_2026-04-21_14-32-01.part`],
    ['14:35:50', 'INFO',  `[download] 412.8MiB at 1.82MiB/s  frag 229/∞`],
  ];

  return (
    <div style={{
      background: '#0d0d0e',
      borderBottom: `1px solid ${T.border}`,
      padding: 0,
    }}>
      {/* Log header */}
      <div style={{
        height: 26,
        padding: '0 12px',
        display: 'flex', alignItems: 'center',
        background: '#1a1a1c',
        borderBottom: `1px solid ${T.border}`,
        fontFamily: T.mono, fontSize: 11,
        color: T.textDim,
      }}>
        <span style={{ color: failed ? '#f48771' : '#3fb950', marginRight: 8 }}>●</span>
        <span>/config/logs/{row.user}.log</span>
        <span style={{ color: T.textMute, margin: '0 8px' }}>·</span>
        <span>{logLines.length} lines</span>
        <span style={{ color: T.textMute, margin: '0 8px' }}>·</span>
        <span>following</span>
        <div style={{ flex: 1 }} />
        <LogLink>Copy</LogLink>
        <LogLink>Download</LogLink>
        <LogLink>Retry Download</LogLink>
      </div>
      {/* Log body */}
      <div className="mon-scroll" style={{
        maxHeight: 172, overflowY: 'auto',
        padding: '6px 0',
        fontFamily: T.mono, fontSize: 11, lineHeight: 1.55,
      }}>
        {logLines.map(([t, lvl, msg], i) => <LogLine key={i} t={t} lvl={lvl} msg={msg} />)}
      </div>
    </div>
  );
}

function LogLine({ t, lvl, msg }) {
  const T = window.TOKENS;
  const color = { INFO: T.text, DEBUG: T.textMute, WARN: '#d7ba7d', ERROR: '#f48771' }[lvl];
  const bg = lvl === 'ERROR' ? 'rgba(248,81,73,0.07)' : 'transparent';
  return (
    <div style={{
      padding: '1px 12px',
      display: 'grid',
      gridTemplateColumns: '68px 56px 1fr',
      gap: 10, background: bg,
    }}>
      <span style={{ color: T.textMute }}>{t}</span>
      <span style={{ color, fontWeight: 500 }}>{lvl}</span>
      <span style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{msg}</span>
    </div>
  );
}

function LogLink({ children }) {
  const T = window.TOKENS;
  return (
    <span style={{
      color: T.accent, marginLeft: 14, cursor: 'pointer', fontSize: 11,
    }}>{children}</span>
  );
}

window.ActiveDownloadsTab = ActiveDownloadsTab;
