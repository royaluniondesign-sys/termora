import { useState, useCallback } from 'react';

const S = {
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface ControlStripProps {
  sessionId: string;
  latencyMs: number | null;
  cols: number;
  rows: number;
  onPaste: () => void;
  onClear: () => void;
}

export function ControlStrip({ latencyMs, cols, rows, onPaste, onClear }: ControlStripProps) {
  const [pasteToast, setPasteToast] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      await navigator.clipboard.readText();
      onPaste();
      setPasteToast(true);
      setTimeout(() => setPasteToast(false), 1500);
    } catch {
      onPaste();
    }
  }, [onPaste]);

  const latencyColor = latencyMs === null ? S.text3
    : latencyMs < 30 ? S.success
    : latencyMs < 100 ? S.warning
    : S.error;

  const pill = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    background: S.surface2,
    border: `1px solid ${S.border}`,
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10,
    color: S.text3,
    fontFamily: "'Geist Mono', monospace",
    fontWeight: 500,
    flexShrink: 0 as const,
  };

  const btn = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    background: S.surface2,
    border: `1px solid ${S.border}`,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 10,
    color: S.text2,
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer' as const,
    touchAction: 'manipulation' as const,
    transition: 'all 150ms ease-out',
    flexShrink: 0 as const,
    minHeight: 30,
  };

  return (
    <div style={{
      height: 38,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 10px',
      background: S.surface,
      borderBottom: `1px solid ${S.border}`,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Left: KPI pills */}
      <div style={{ display: 'flex', gap: 5, flex: 1, overflow: 'hidden' }}>
        {/* Latency */}
        <div style={pill}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: latencyColor, flexShrink: 0,
            animation: latencyMs !== null ? 'pulse-dot 3s ease-in-out infinite' : 'none',
          }} />
          <span style={{ color: latencyColor }}>{latencyMs !== null ? `${latencyMs}ms` : '—'}</span>
        </div>

        {/* Dimensions */}
        <div style={pill}>
          <svg width="9" height="9" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>{cols}×{rows}</span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {/* Universal Paste */}
        <button
          type="button"
          style={{
            ...btn,
            background: pasteToast ? `${S.primary}20` : S.surface2,
            borderColor: pasteToast ? S.primary : S.border,
            color: pasteToast ? S.primary : S.text2,
          }}
          onClick={handlePaste}
          title="Universal Paste — injects clipboard into PTY"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          {pasteToast ? 'Pasted!' : 'Paste'}
        </button>

        {/* Clear */}
        <button
          type="button"
          style={btn}
          onClick={onClear}
          title="Clear terminal buffer (Ctrl+L)"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Clear
        </button>
      </div>

    </div>
  );
}
