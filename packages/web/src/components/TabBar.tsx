import type { Session } from '../lib/types';

interface TabBarProps {
  session: Session;
}

export function TabBar({ session }: TabBarProps) {
  return (
    <div
      style={{
        height: 36,
        background: '#141413',
        borderBottom: '1px solid #282725',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {/* Active tab */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: '0 12px',
          color: '#d97757',
          borderBottom: '2px solid #d97757',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        0 {session.name}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Remote indicator placeholder */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          paddingRight: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#28c840',
          }}
        />
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: '#78756f',
          }}
        >
          remote
        </span>
      </div>
    </div>
  );
}
