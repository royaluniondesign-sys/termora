import { useState } from 'react';

const S = {
  primary: '#a78bfa',
  text3: '#71717a',
  border: '#27272a',
} as const;

interface NewSessionCardProps {
  onCreateSession: () => void;
}

export function NewSessionCard({ onCreateSession }: NewSessionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onCreateSession}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1 / 1.18',
        background: hovered ? `${S.primary}08` : 'transparent',
        borderRadius: 10,
        border: `1px dashed ${hovered ? S.primary : S.border}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease-out',
        width: '100%',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" stroke={hovered ? S.primary : S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, transition: 'stroke 200ms' }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: hovered ? S.primary : S.text3,
        fontFamily: "'Geist Mono', monospace",
        letterSpacing: 0.3,
        transition: 'color 200ms',
      }}>
        new session
      </span>
    </button>
  );
}
