// Storage.jsx — Tab 4: storage breakdown + retention rules

function StorageTab() {
  const T = window.TOKENS;

  const totalGB = 4096;
  const usedGB = 2331;
  const freeGB = totalGB - usedGB;
  const usedPct = usedGB / totalGB;

  const streamers = [
    { name: 'example_username', files: 38, size: 89.4,  color: 'hsl(210, 55%, 55%)', retention: '30 days' },
    { name: 'velvetsky',     files: 24, size: 64.1,  color: 'hsl(340, 55%, 55%)', retention: '14 days' },
    { name: 'moonbeam_22',   files: 19, size: 41.8,  color: 'hsl(280, 55%, 60%)', retention: '30 days' },
    { name: 'indigo_rose',   files: 12, size: 18.2,  color: 'hsl(250, 50%, 60%)', retention: 'keep all' },
  ];
  const totalUsed = streamers.reduce((s, x) => s + x.size, 0);

  return (
    <div className="mon-scroll" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      padding: 14, gap: 14,
      overflowY: 'auto',
    }}>
      {/* Disk usage overview */}
      <div style={{
        padding: 14,
        border: `1px solid ${T.border}`,
        background: '#252526',
        borderRadius: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10, gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: T.textMute, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Output Volume
            </div>
            <div style={{ fontSize: 13, color: T.text, fontFamily: T.mono, marginTop: 2 }}>
              /mnt/recordings/auto-yt-dlp
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right', fontFamily: T.mono }}>
            <span style={{ fontSize: 18, color: T.text, fontWeight: 500 }}>{freeGB.toLocaleString()} GB</span>
            <span style={{ fontSize: 12, color: T.textMute, marginLeft: 6 }}>free</span>
            <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
              of {totalGB.toLocaleString()} GB total · {usedGB.toLocaleString()} GB used
            </div>
          </div>
        </div>

        {/* Segmented bar */}
        <div style={{
          height: 16, background: T.bg, borderRadius: 2, overflow: 'hidden',
          display: 'flex', border: `1px solid ${T.border}`,
        }}>
          {streamers.map((s, i) => (
            <div key={s.name} style={{
              width: `${(s.size / totalGB) * 100}%`,
              background: s.color,
              borderRight: i < streamers.length - 1 ? '1px solid rgba(0,0,0,0.4)' : 'none',
            }} />
          ))}
          <div style={{
            width: `${((usedGB - totalUsed) / totalGB) * 100}%`,
            background: T.surface3,
          }} />
        </div>

        {/* Legend + thresholds */}
        <div style={{
          display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap',
          fontSize: 11, fontFamily: T.mono,
        }}>
          {streamers.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 9, height: 9, background: s.color, borderRadius: 1.5 }} />
              <span style={{ color: T.textDim }}>{s.name}</span>
              <span style={{ color: T.textMute }}>{s.size.toFixed(1)} GB</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 9, height: 9, background: T.surface3, borderRadius: 1.5 }} />
            <span style={{ color: T.textDim }}>other</span>
          </div>
        </div>

        {/* Threshold markers */}
        <div style={{
          display: 'flex', gap: 18, marginTop: 12, paddingTop: 10,
          borderTop: `1px solid ${T.borderSoft}`,
          fontSize: 11, fontFamily: T.mono,
        }}>
          <ThresholdLabel dot="#d7ba7d" label="Warn" value="100 GB free" />
          <ThresholdLabel dot="#f85149" label="Stop" value="20 GB free" />
          <div style={{ flex: 1 }} />
          <span style={{ color: T.textMute }}>Updated 14:55:03 · refresh every 60s</span>
        </div>
      </div>

      {/* Per-streamer breakdown */}
      <div style={{
        border: `1px solid ${T.border}`,
        background: T.bg,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 100px 140px 120px',
          background: '#2d2d30',
          borderBottom: `1px solid ${T.border}`,
          fontSize: 11, color: T.textDim, fontWeight: 500,
          height: 26, alignItems: 'center',
        }}>
          <HdrCell first>Streamer</HdrCell>
          <HdrCell>Files</HdrCell>
          <HdrCell>Size</HdrCell>
          <HdrCell>Retention</HdrCell>
          <HdrCell>Actions</HdrCell>
        </div>
        {streamers.map((s, i) => (
          <StreamerRow key={s.name} s={s} />
        ))}
      </div>

      {/* Retention rules */}
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
        }}>Retention Policy</div>

        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10 }}>
          When a recording completes, auto-cleanup runs. Oldest files are deleted first.
        </div>

        <RetentionRow mode="age" value="30" unit="days" scope="Default (new accounts)" />
        <RetentionRow mode="count" value="10" unit="files per streamer" scope="Per-streamer fallback" />
        <RetentionRow mode="space" value="500" unit="GB total cap" scope="Global cap" checked />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${T.borderSoft}`,
        }}>
          <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono, flex: 1 }}>
            Next cleanup pass: 15:00:00 · will delete 3 files (1.2 GB)
          </span>
          <Btn>Preview Cleanup</Btn>
          <Btn>Run Now</Btn>
        </div>
      </div>
    </div>
  );
}

function ThresholdLabel({ dot, label, value }) {
  const T = window.TOKENS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      <span style={{ color: T.textDim }}>{label} at</span>
      <span style={{ color: T.text }}>{value}</span>
    </div>
  );
}

function HdrCell({ children, first }) {
  const T = window.TOKENS;
  return (
    <div style={{
      padding: '0 10px',
      borderLeft: first ? 'none' : `1px solid ${T.border}`,
      height: '100%',
      display: 'flex', alignItems: 'center',
    }}>{children}</div>
  );
}

function StreamerRow({ s }) {
  const T = window.TOKENS;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 90px 100px 140px 120px',
      height: 32,
      borderBottom: `1px solid ${T.borderSoft}`,
      alignItems: 'center',
      fontSize: 12, color: T.text,
    }}>
      <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
        <span style={{ fontFamily: T.mono, fontSize: 11.5 }}>{s.name}</span>
      </div>
      <div style={{ padding: '0 10px', borderLeft: `1px solid ${T.borderSoft}`, height: '100%', display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 11, color: T.textDim }}>
        {s.files}
      </div>
      <div style={{ padding: '0 10px', borderLeft: `1px solid ${T.borderSoft}`, height: '100%', display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 11 }}>
        {s.size.toFixed(1)} GB
      </div>
      <div style={{ padding: '0 10px', borderLeft: `1px solid ${T.borderSoft}`, height: '100%', display: 'flex', alignItems: 'center', fontFamily: T.mono, fontSize: 11, color: T.textDim }}>
        {s.retention}
      </div>
      <div style={{ padding: '0 10px', borderLeft: `1px solid ${T.borderSoft}`, height: '100%', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.accent }}>
        <span style={{ cursor: 'pointer' }}>Edit</span>
        <span style={{ color: T.textMute }}>·</span>
        <span style={{ cursor: 'pointer' }}>Purge</span>
      </div>
    </div>
  );
}

function RetentionRow({ mode, value, unit, scope, checked }) {
  const T = window.TOKENS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
      <div style={{
        width: 14, height: 14, borderRadius: 2,
        border: `1px solid ${checked ? T.accent : T.border}`,
        background: checked ? T.accent : T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <svg width="10" height="10" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.7" fill="none"><path d="M2 5.2l2.2 2L8 3.2"/></svg>}
      </div>
      <span style={{ color: T.text, width: 96 }}>
        {mode === 'age' && 'Keep for'}
        {mode === 'count' && 'Keep last'}
        {mode === 'space' && 'Max total'}
      </span>
      <div style={{
        height: 22, padding: '0 8px',
        background: T.bg, border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        fontFamily: T.mono, fontSize: 11.5,
        color: T.text, width: 70,
      }}>{value}</div>
      <span style={{ color: T.textDim }}>{unit}</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: T.textMute, fontFamily: T.mono }}>{scope}</span>
    </div>
  );
}

window.StorageTab = StorageTab;
