import React from 'react';
import type { KeyboardMode } from '../lib/types';

interface TouchActionsBarProps {
  onAction: (action: 'select' | 'cut' | 'copy' | 'paste' | 'tab' | 'history') => void;
  keyboardMode: KeyboardMode;
  onKeyboardModeChange: (mode: KeyboardMode) => void;
}

const S = {
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#34d399',
  blue: '#60a5fa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

const iconProps = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

type ActionItem = {
  id: 'select' | 'cut' | 'copy' | 'paste' | 'tab' | 'history';
  label: string;
  highlighted: boolean;
  icon: React.ReactNode;
};

const actions: readonly ActionItem[] = [
  {
    id: 'select',
    label: 'Select',
    highlighted: false,
    icon: <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    id: 'cut',
    label: 'Cut',
    highlighted: false,
    icon: <svg {...iconProps}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>,
  },
  {
    id: 'copy',
    label: 'Copy',
    highlighted: true,
    icon: <svg {...iconProps}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  },
  {
    id: 'paste',
    label: 'Paste',
    highlighted: true,
    icon: <svg {...iconProps}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
  },
  {
    id: 'tab',
    label: 'Tab',
    highlighted: false,
    icon: <svg {...iconProps}><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>,
  },
  {
    id: 'history',
    label: 'Hist',
    highlighted: false,
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  },
];

export const TouchActionsBar = React.memo(function TouchActionsBar({
  onAction,
  keyboardMode,
  onKeyboardModeChange,
}: TouchActionsBarProps) {
  const nextMode: KeyboardMode =
    keyboardMode === 'custom' ? 'system' : keyboardMode === 'system' ? 'physical' : 'custom';

  const modeColor = keyboardMode === 'custom' ? S.primary
    : keyboardMode === 'system' ? S.success
    : S.blue;

  const btnBase: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
    minHeight: 44,
    padding: '5px 4px',
    border: `1px solid ${S.border}`,
    borderRadius: 5,
    background: 'transparent',
    color: S.text3,
    fontSize: 9,
    fontFamily: 'inherit',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transition: 'all 100ms ease-out',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: '5px 6px',
      background: S.surface,
      borderTop: `1px solid ${S.border}`,
    }}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          style={{
            ...btnBase,
            color: action.highlighted ? S.primary : S.text3,
            borderColor: action.highlighted ? `${S.primary}33` : S.border,
          }}
          onPointerDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.93)';
            e.currentTarget.style.background = `${S.primary}10`;
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.background = 'transparent';
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.background = 'transparent';
          }}
          onClick={() => onAction(action.id)}
        >
          {action.icon}
          {action.label}
        </button>
      ))}

      {/* Keyboard mode toggle */}
      <button
        type="button"
        style={{
          ...btnBase,
          color: modeColor,
          borderColor: `${modeColor}33`,
        }}
        onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
        onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}
        onClick={() => onKeyboardModeChange(nextMode)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="8" x2="6" y2="8" strokeWidth="3" />
          <line x1="10" y1="8" x2="10" y2="8" strokeWidth="3" />
          <line x1="14" y1="8" x2="14" y2="8" strokeWidth="3" />
          <line x1="18" y1="8" x2="18" y2="8" strokeWidth="3" />
          <line x1="8" y1="12" x2="16" y2="12" strokeWidth="3" />
        </svg>
        {keyboardMode === 'custom' ? 'Virtual' : keyboardMode === 'system' ? 'Native' : 'HW'}
      </button>
    </div>
  );
});
