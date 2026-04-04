import React from 'react';

interface TouchActionsBarProps {
  onAction: (action: 'select' | 'cut' | 'copy' | 'paste' | 'tab' | 'history') => void;
}

type ActionItem = {
  readonly id: 'select' | 'cut' | 'copy' | 'paste' | 'tab' | 'history';
  readonly label: string;
  readonly highlighted: boolean;
  readonly icon: React.ReactNode;
};

const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const SelectIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const CutIcon = () => (
  <svg {...iconProps}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = () => (
  <svg {...iconProps}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const TabIcon = () => (
  <svg {...iconProps}>
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </svg>
);

const HistoryIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const actions: readonly ActionItem[] = [
  { id: 'select', label: 'Select', highlighted: true, icon: <SelectIcon /> },
  { id: 'cut', label: 'Cut', highlighted: false, icon: <CutIcon /> },
  { id: 'copy', label: 'Copy', highlighted: true, icon: <CopyIcon /> },
  { id: 'paste', label: 'Paste', highlighted: true, icon: <PasteIcon /> },
  { id: 'tab', label: 'Tab', highlighted: false, icon: <TabIcon /> },
  { id: 'history', label: 'History', highlighted: false, icon: <HistoryIcon /> },
];

const containerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 3,
  padding: '5px 6px',
  background: '#1e1d1b',
  borderTop: '1px solid #3a3835',
  fontFamily: 'inherit',
};

const baseButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  minHeight: 44,
  padding: '6px 4px',
  border: '1px solid #3a3835',
  borderRadius: 4,
  background: 'transparent',
  color: '#b0aea5',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
  touchAction: 'manipulation',
  transition: 'transform 0.1s, background 0.1s',
  WebkitTapHighlightColor: 'transparent',
};

const highlightedOverride: React.CSSProperties = {
  color: '#d97757',
  borderColor: 'rgba(217, 119, 87, 0.3)',
};

export const TouchActionsBar = React.memo(function TouchActionsBar({
  onAction,
}: TouchActionsBarProps) {
  return (
    <div style={containerStyle}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          style={
            action.highlighted
              ? { ...baseButtonStyle, ...highlightedOverride }
              : baseButtonStyle
          }
          onPointerDown={(e) => {
            const target = e.currentTarget;
            target.style.transform = 'scale(0.95)';
            target.style.background = 'rgba(217, 119, 87, 0.15)';
          }}
          onPointerUp={(e) => {
            const target = e.currentTarget;
            target.style.transform = '';
            target.style.background = '';
          }}
          onPointerLeave={(e) => {
            const target = e.currentTarget;
            target.style.transform = '';
            target.style.background = '';
          }}
          onClick={() => onAction(action.id)}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
});
