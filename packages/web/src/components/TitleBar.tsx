import type { Session } from '../lib/types';

const S = {
  surface: '#0c0c0f',
  surface2: '#18181b',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface TitleBarProps {
  session: Session;
  onBack: () => void;
  onOpenSettings?: () => void;
  editing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
}

export function TitleBar({
  session,
  onBack,
  onOpenSettings,
  editing,
  editValue,
  onEditStart,
  onEditCommit,
  onEditCancel,
}: TitleBarProps) {
  return (
    <div style={{
      height: 44,
      background: S.surface,
      borderBottom: `1px solid ${S.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      flexShrink: 0,
    }}>
      {/* Traffic lights — Obsidian style */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
      </div>

      {/* Session name */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontFamily: "'Geist Mono', 'Anthropic Mono', monospace",
              fontSize: 12,
              color: S.text1,
              background: S.surface2,
              border: `1px solid ${S.primary}`,
              borderRadius: 4,
              padding: '2px 6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
              display: 'inline-block',
              outline: `0px solid ${S.primary}22`,
            }}>
              {editValue}
              <span style={{
                display: 'inline-block', width: 1, height: 13,
                background: S.primary, marginLeft: 1, verticalAlign: 'middle',
                animation: 'blink 1s step-end infinite',
              }} />
            </span>
            <button onClick={onEditCommit} style={{ background: 'none', border: 'none', color: S.success, cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }} aria-label="Confirm">✓</button>
            <button onClick={onEditCancel} style={{ background: 'none', border: 'none', color: S.error, cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }} aria-label="Cancel">✕</button>
          </div>
        ) : (
          <>
            <span
              onClick={onEditStart}
              style={{
                fontFamily: "'Geist Mono', 'Anthropic Mono', monospace",
                fontSize: 12, color: S.text1, cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {session.name}
            </span>
            <button onClick={onEditStart} style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1, flexShrink: 0 }} aria-label="Rename">✎</button>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, background: S.surface2,
            border: `1px solid ${S.border}`, borderRadius: 7,
            color: S.text2, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Back to grid"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            style={{
              width: 32, height: 32, background: S.surface2,
              border: `1px solid ${S.border}`, borderRadius: 7,
              color: S.text2, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
