// Library.jsx — Tab 2: recorded .mp4 browser
// List + grid views, search, filter chips, bulk-select with checkboxes.

function LibraryTab({ view = 'list', search = '', activeFilters = [], bulkCount = 0 }) {
  const T = window.TOKENS;
  const files = [
    { name: 'butterflylips_2026-04-21_14-32-01.mp4', size: '1.24 GB', mod: '2026-04-21 14:55:03', dur: '00:28:14', checked: bulkCount > 0, hue: 210 },
    { name: 'moonbeam_22_2026-04-21_13-04-22.mp4',   size: '876 MB',  mod: '2026-04-21 13:52:10', dur: '00:19:42', checked: bulkCount > 1, hue: 280 },
    { name: 'velvetsky_2026-04-21_10-18-44.mp4',     size: '2.41 GB', mod: '2026-04-21 11:00:06', dur: '00:41:22', checked: bulkCount > 2, hue: 340 },
    { name: 'butterflylips_2026-04-20_22-11-07.mp4', size: '3.02 GB', mod: '2026-04-20 23:47:31', dur: '01:12:06', checked: bulkCount > 3, hue: 180 },
    { name: 'moonbeam_22_2026-04-20_19-55-12.mp4',   size: '1.88 GB', mod: '2026-04-20 20:44:09', dur: '00:48:51', checked: bulkCount > 4, hue: 30  },
    { name: 'indigo_rose_2026-04-19_21-02-50.mp4',   size: '612 MB',  mod: '2026-04-19 21:32:15', dur: '00:14:05', checked: bulkCount > 5, hue: 250 },
  ];
  const selected = files[0];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      padding: 10, gap: 8,
      minHeight: 0,
    }}>
      {/* Search + path + view toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '2px 2px',
      }}>
        <SearchInput value={search} />
        <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
          /mnt/recordings/auto-yt-dlp/
        </span>
        <div style={{ flex: 1 }} />
        <ViewToggle view={view} />
      </div>

      {/* Filter chip row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 2px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10.5, color: T.textMute, letterSpacing: 0.4, textTransform: 'uppercase', marginRight: 4 }}>
          Filter
        </span>
        <FilterChip label="Streamer" value={activeFilters.find(f => f.k === 'streamer')?.v} hasValue={activeFilters.some(f => f.k === 'streamer')} />
        <FilterChip label="Date" value={activeFilters.find(f => f.k === 'date')?.v} hasValue={activeFilters.some(f => f.k === 'date')} />
        <FilterChip label="Size" value={activeFilters.find(f => f.k === 'size')?.v} hasValue={activeFilters.some(f => f.k === 'size')} />
        <FilterChip label="Duration" />
        {activeFilters.length > 0 && (
          <span style={{ fontSize: 11, color: T.accent, cursor: 'pointer', marginLeft: 4 }}>
            Clear all
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
          {files.length} files · 10.03 GB total
        </span>
      </div>

      {/* Main pane */}
      {view === 'list'
        ? <ListView files={files} bulk={bulkCount > 0} />
        : <GridView files={files} bulk={bulkCount > 0} />}

      {/* Info / bulk bar */}
      {bulkCount > 0 ? (
        <div style={{
          height: 30, flexShrink: 0,
          background: '#0c3a5c',
          border: `1px solid ${T.accent}`,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 12,
          fontSize: 12, color: '#fff',
        }}>
          <Checkbox checked />
          <span><b>{bulkCount}</b> selected</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: T.mono, fontSize: 11 }}>
            ({bulkSize(bulkCount)} total)
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: T.mono }}>
            Shift-click to range select · ⌘A to select all
          </span>
          <Btn>Select all</Btn>
          <Btn>Clear</Btn>
        </div>
      ) : (
        <div style={{
          height: 30, flexShrink: 0,
          background: '#2d2d30',
          border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 14,
          fontSize: 11, fontFamily: T.mono,
          color: T.textDim,
        }}>
          <InfoItem label="Size" value={selected.size} />
          <span style={{ color: T.textMute }}>│</span>
          <InfoItem label="Modified" value={selected.mod} />
          <span style={{ color: T.textMute }}>│</span>
          <InfoItem label="Duration" value={selected.dur} />
          <span style={{ color: T.textMute }}>│</span>
          <InfoItem label="Codec" value="h264 / aac" />
          <div style={{ flex: 1 }} />
          <span style={{ color: T.textMute }}>1 highlighted</span>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, height: 28 }}>
        <Btn primary icon={<PlayIcon />}>Open</Btn>
        <Btn icon={<RefreshIcon />}>Refresh</Btn>
        <Btn>Reveal in Files</Btn>
        <Btn danger={bulkCount > 0}>Delete{bulkCount > 0 ? ` (${bulkCount})` : ''}</Btn>
        <div style={{ flex: 1 }} />
        <div style={{ alignSelf: 'center', fontSize: 11, color: T.textMute, fontFamily: T.mono }}>
          auto-refreshes on new recording
        </div>
      </div>
    </div>
  );
}

function bulkSize(n) {
  const sizes = [1.24, 0.876, 2.41, 3.02, 1.88, 0.612];
  const total = sizes.slice(0, n).reduce((s, x) => s + x, 0);
  return total.toFixed(2) + ' GB';
}

// ─── Search + filter ────────────────────────────────────────────

function SearchInput({ value }) {
  const T = window.TOKENS;
  return (
    <div style={{
      height: 26, width: 280,
      background: T.bg,
      border: `1px solid ${value ? T.accent : T.border}`,
      borderRadius: 3,
      display: 'flex', alignItems: 'center',
      padding: '0 8px', gap: 7,
    }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={T.textMute} strokeWidth="1.4">
        <circle cx="4.5" cy="4.5" r="3"/><path d="M6.8 6.8L9.5 9.5"/>
      </svg>
      <span style={{
        flex: 1, fontSize: 12, fontFamily: T.mono,
        color: value ? T.text : T.textMute,
      }}>{value || 'Search filename, streamer…'}</span>
      {value && (
        <span style={{ color: T.textMute, fontSize: 11, cursor: 'pointer' }}>×</span>
      )}
      <span style={{
        fontSize: 9.5, color: T.textMute, fontFamily: T.mono,
        padding: '1px 4px', border: `1px solid ${T.border}`, borderRadius: 2,
      }}>⌘F</span>
    </div>
  );
}

function FilterChip({ label, value, hasValue }) {
  const T = window.TOKENS;
  if (hasValue) {
    return (
      <span style={{
        height: 22, padding: '0 4px 0 9px',
        background: 'rgba(0,120,212,0.18)',
        border: `1px solid ${T.accent}`,
        borderRadius: 11,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: T.text,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}:</span>
        <span style={{ fontFamily: T.mono, fontSize: 10.5 }}>{value}</span>
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
        }}>×</span>
      </span>
    );
  }
  return (
    <span style={{
      height: 22, padding: '0 9px',
      background: T.bg,
      border: `1px dashed ${T.border}`,
      borderRadius: 11,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: T.textDim, cursor: 'pointer',
    }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>+</span>{label}
    </span>
  );
}

// ─── View toggle ────────────────────────────────────────────────

function ViewToggle({ view }) {
  const T = window.TOKENS;
  return (
    <div style={{
      display: 'flex',
      border: `1px solid ${T.border}`,
      borderRadius: 3,
      height: 22, overflow: 'hidden',
      background: T.bg,
    }}>
      <div style={{
        width: 30, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: view === 'list' ? T.surface3 : 'transparent',
        color: view === 'list' ? T.text : T.textMute,
        borderRight: `1px solid ${T.border}`,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1" y="2" width="2" height="1.6"/><rect x="4" y="2" width="7" height="1.6"/>
          <rect x="1" y="5.2" width="2" height="1.6"/><rect x="4" y="5.2" width="7" height="1.6"/>
          <rect x="1" y="8.4" width="2" height="1.6"/><rect x="4" y="8.4" width="7" height="1.6"/>
        </svg>
      </div>
      <div style={{
        width: 30, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: view === 'grid' ? T.surface3 : 'transparent',
        color: view === 'grid' ? T.text : T.textMute,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1" y="1" width="4.5" height="4.5"/><rect x="6.5" y="1" width="4.5" height="4.5"/>
          <rect x="1" y="6.5" width="4.5" height="4.5"/><rect x="6.5" y="6.5" width="4.5" height="4.5"/>
        </svg>
      </div>
    </div>
  );
}

// ─── List view ──────────────────────────────────────────────────

function ListView({ files, bulk }) {
  const T = window.TOKENS;
  return (
    <div className="mon-scroll" style={{
      flex: 1,
      background: T.bg,
      border: `1px solid ${T.border}`,
      overflowY: 'auto',
      minHeight: 0,
    }}>
      {/* Column headers (with bulk-select master) */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 10px', gap: 8, height: 24,
        background: '#2d2d30',
        borderBottom: `1px solid ${T.border}`,
        fontSize: 10.5, color: T.textMute, letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}>
        <Checkbox indeterminate={bulk} />
        <span style={{ flex: 1, marginLeft: 4 }}>Name</span>
        <span style={{ width: 60, textAlign: 'right' }}>Duration ↓</span>
        <span style={{ width: 72, textAlign: 'right' }}>Size</span>
        <span style={{ width: 140, textAlign: 'right' }}>Modified</span>
      </div>
      {files.map((f, i) => (<FileRow key={i} file={f} bulk={bulk} />))}
    </div>
  );
}

function FileRow({ file, bulk }) {
  const T = window.TOKENS;
  const selected = file.checked;
  return (
    <div style={{
      height: 26,
      display: 'flex', alignItems: 'center',
      padding: '0 10px', gap: 8,
      fontSize: 12,
      borderBottom: `1px solid ${T.borderSoft}`,
      background: selected ? '#0c3a5c' : 'transparent',
      color: selected ? '#fff' : T.text,
    }}>
      <Checkbox checked={selected} />
      <FileIcon selected={selected} />
      <span style={{
        fontFamily: T.mono, fontSize: 11.5,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flex: 1,
      }}>{file.name}</span>
      <span style={{
        fontFamily: T.mono, fontSize: 11,
        color: selected ? 'rgba(255,255,255,.8)' : T.textMute,
        width: 60, textAlign: 'right', flexShrink: 0,
      }}>{file.dur}</span>
      <span style={{
        fontFamily: T.mono, fontSize: 11,
        color: selected ? 'rgba(255,255,255,.8)' : T.textMute,
        width: 72, textAlign: 'right', flexShrink: 0,
      }}>{file.size}</span>
      <span style={{
        fontFamily: T.mono, fontSize: 11,
        color: selected ? 'rgba(255,255,255,.8)' : T.textMute,
        width: 140, textAlign: 'right', flexShrink: 0,
      }}>{file.mod}</span>
    </div>
  );
}

// ─── Grid view ──────────────────────────────────────────────────

function GridView({ files, bulk }) {
  const T = window.TOKENS;
  return (
    <div className="mon-scroll" style={{
      flex: 1,
      background: T.bg,
      border: `1px solid ${T.border}`,
      overflowY: 'auto',
      padding: 14,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))',
      gap: 14, alignContent: 'start',
      minHeight: 0,
    }}>
      {files.map((f, i) => (<ThumbCard key={i} file={f} bulk={bulk} />))}
    </div>
  );
}

function ThumbCard({ file, bulk }) {
  const T = window.TOKENS;
  const selected = file.checked;
  const user = file.name.split('_')[0];
  const shortName = file.name.replace(/\.mp4$/, '').replace(user + '_', '');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: selected ? '#0c3a5c' : '#242428',
      border: `1px solid ${selected ? T.accent : T.border}`,
      borderRadius: 3, overflow: 'hidden',
      position: 'relative',
    }}>
      {bulk && (
        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}>
          <Checkbox checked={selected} />
        </div>
      )}
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
        <FakeFrame hue={file.hue} />
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          padding: '1px 6px',
          background: 'rgba(0,0,0,0.78)',
          color: '#fff', fontFamily: T.mono, fontSize: 10,
          borderRadius: 2, fontWeight: 500,
        }}>{file.dur}</div>
      </div>
      <div style={{ padding: '7px 9px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: selected ? '#fff' : T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user}</div>
        <div style={{ fontFamily: T.mono, fontSize: 10,
          color: selected ? 'rgba(255,255,255,0.75)' : T.textMute,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          fontFamily: T.mono, fontSize: 10,
          color: selected ? 'rgba(255,255,255,0.75)' : T.textDim, marginTop: 2 }}>
          <span>{file.size}</span><span>{file.mod.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
}

function FakeFrame({ hue }) {
  const bg1 = `hsl(${hue}, 30%, 14%)`;
  const bg2 = `hsl(${(hue + 40) % 360}, 45%, 8%)`;
  const glow = `hsl(${hue}, 60%, 55%)`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`g${hue}`} cx="30%" cy="40%" r="70%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={bg2} stopOpacity="1"/>
        </radialGradient>
      </defs>
      <rect width="160" height="90" fill={bg1}/>
      <rect width="160" height="90" fill={`url(#g${hue})`}/>
      <rect y="62" width="160" height="28" fill={bg2} opacity="0.7"/>
      <ellipse cx="80" cy="50" rx="14" ry="14" fill="rgba(0,0,0,0.45)"/>
      <path d="M58 90 Q58 65 80 65 Q102 65 102 90 Z" fill="rgba(0,0,0,0.55)"/>
    </svg>
  );
}

// ─── Primitives ─────────────────────────────────────────────────

function Checkbox({ checked, indeterminate }) {
  const T = window.TOKENS;
  return (
    <div style={{
      width: 14, height: 14, borderRadius: 2,
      border: `1px solid ${checked || indeterminate ? T.accent : T.border}`,
      background: checked || indeterminate ? T.accent : T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {checked && <svg width="10" height="10" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.7" fill="none"><path d="M2 5.2l2.2 2L8 3.2"/></svg>}
      {indeterminate && !checked && <div style={{ width: 7, height: 1.8, background: '#fff' }} />}
    </div>
  );
}

function InfoItem({ label, value }) {
  const T = window.TOKENS;
  return (
    <span>
      <span style={{ color: T.textMute }}>{label}: </span>
      <span style={{ color: T.text }}>{value}</span>
    </span>
  );
}

function FileIcon({ selected }) {
  const T = window.TOKENS;
  const c = selected ? '#fff' : T.textDim;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 1.5h6L11.5 4.5v8H2.5z" stroke={c} strokeWidth="1" fill="#1e1e1e"/>
      <path d="M8.5 1.5V4.5h3" stroke={c} strokeWidth="1" fill="none"/>
      <path d="M5 7.5l3.5 2-3.5 2z" fill={c}/>
    </svg>
  );
}

function PlayIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5v7l6-3.5z"/></svg>;
}
function RefreshIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M9.5 5.5a4 4 0 1 1-1.2-2.9"/><path d="M9.5 1v2.8H6.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

window.LibraryTab = LibraryTab;
