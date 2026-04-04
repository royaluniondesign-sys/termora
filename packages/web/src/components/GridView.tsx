import type { GridViewProps } from '../lib/types';
import { SessionCard } from './SessionCard';
import { NewSessionCard } from './NewSessionCard';

/**
 * Session grid — shows active sessions as cards.
 * Nav and switcher are in App.tsx, this is just the content.
 */
export function GridView({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateSession,
  onCloseSession,
}: GridViewProps) {
  return (
    <div style={{ padding: 12, userSelect: 'none' }}>
      {/* Section label */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
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

      {/* Card grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
      }}>
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
  );
}
