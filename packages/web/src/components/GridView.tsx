import type { GridViewProps } from '../lib/types';
import { SessionCard } from './SessionCard';
import { NewSessionCard } from './NewSessionCard';

const S = {
  primary: '#a78bfa',
  text3: '#71717a',
  bg: '#09090b',
} as const;

export function GridView({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateSession,
  onCloseSession,
}: GridViewProps) {
  return (
    <div style={{ padding: 12, userSelect: 'none', animation: 'fade-in-up 200ms ease-out' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 1,
          color: S.text3, textTransform: 'uppercase' as const,
        }}>
          Active Sessions
        </span>
        <span style={{
          background: `${S.primary}20`, color: S.primary,
          border: `1px solid ${S.primary}44`,
          fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 6,
        }}>
          {sessions.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
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
