import { useCallback } from 'react';
import type { ContextStripProps } from '../lib/types';

const S = {
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  error: '#ef4444',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface StripKey {
  label: string;
  widthMultiplier: number;
  data: string;
  accent?: boolean;
}

const STRIP_KEYS: StripKey[] = [
  { label: 'esc', widthMultiplier: 1.4, data: '\x1b', accent: true },
  { label: 'F1', widthMultiplier: 1, data: '\x1bOP' },
  { label: 'F2', widthMultiplier: 1, data: '\x1bOQ' },
  { label: 'F3', widthMultiplier: 1, data: '\x1bOR' },
  { label: 'F5', widthMultiplier: 1, data: '\x1b[15~' },
  { label: 'commit', widthMultiplier: 1.5, data: 'git commit\r' },
  { label: 'diff', widthMultiplier: 1.4, data: 'git diff\r' },
  { label: 'plan', widthMultiplier: 1.4, data: '/plan ' },
  { label: '⌃C', widthMultiplier: 1.3, data: '\x03', accent: true },
];

const BASE_WIDTH = 34;

export function ContextStrip({ onKey }: ContextStripProps) {
  const handleTouch = useCallback(
    (data: string) => (e: React.TouchEvent) => {
      e.preventDefault();
      onKey(data);
    },
    [onKey],
  );

  return (
    <div style={{
      height: 44,
      background: S.surface,
      borderTop: `1px solid ${S.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '0 8px',
      flexShrink: 0,
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
    }}>
      {STRIP_KEYS.map((key) => (
        <button
          key={key.label}
          onTouchStart={handleTouch(key.data)}
          onMouseDown={(e) => {
            e.preventDefault();
            onKey(key.data);
          }}
          style={{
            height: 26,
            width: BASE_WIDTH * key.widthMultiplier,
            flexShrink: 0,
            background: key.accent ? `${S.primary}15` : S.surface2,
            border: `1px solid ${key.accent ? `${S.primary}44` : S.border}`,
            borderRadius: 5,
            color: key.accent ? S.primary : S.text3,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 80ms ease-out',
          }}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
