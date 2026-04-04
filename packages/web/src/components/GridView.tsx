import type { GridViewProps } from '../lib/types';
import { SessionCard } from './SessionCard';
import { NewSessionCard } from './NewSessionCard';
import { WorkspaceBar } from './WorkspaceBar';

/**
 * Phone home screen: dashboard grid of session cards.
 * Anthropic warm palette: bg #141413, surfaces #1e1d1b, borders #3a3835.
 */
export function GridView({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateSession,
  onCloseSession,
  onOpenSettings,
}: GridViewProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        height: '100%',
        background: '#141413',
        fontFamily: "'Styrene A', -apple-system, system-ui, sans-serif",
        userSelect: 'none',
      }}
    >
      {/* Dashboard Nav */}
      <div
        className="flex items-center justify-between px-3"
        style={{ height: 48, flexShrink: 0, borderBottom: '1px solid #3a3835' }}
      >
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(145deg, #d97757, #c46a4d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" stroke="#141413" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#faf9f5', letterSpacing: -0.3 }}>
            termora
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 700, color: '#788c5d',
            background: 'rgba(120,140,93,0.12)',
            padding: '2px 7px', borderRadius: 6,
          }}>
            <span style={{ width: 4, height: 4, background: '#788c5d', borderRadius: '50%' }} />
            LIVE
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32, minHeight: 44, minWidth: 44,
              background: '#1e1d1b', border: '1px solid #3a3835',
              borderRadius: 8, color: '#b0aea5', cursor: 'pointer',
            }}
            aria-label="Grid"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32, minHeight: 44, minWidth: 44,
              background: '#1e1d1b', border: '1px solid #3a3835',
              borderRadius: 8, color: '#b0aea5', cursor: 'pointer',
            }}
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className="px-3 pt-3 pb-2" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: '#78756f', textTransform: 'uppercase' as const,
          }}>
            Active Sessions
          </span>
          <span style={{
            background: '#d97757', color: '#141413',
            fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8,
          }}>
            {sessions.length}
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ minHeight: 0 }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={onSessionSelect}
              onClose={onCloseSession}
            />
          ))}
          <NewSessionCard onCreateSession={onCreateSession} />
        </div>
      </div>

      {/* Workspace bar */}
      <WorkspaceBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={onSessionSelect}
      />
    </div>
  );
}
