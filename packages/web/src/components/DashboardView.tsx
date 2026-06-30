import { useState, useCallback } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

const S = {
  bg: '#09090b',
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

interface DashboardViewProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
}

function DashHeader({ connectionStatus, latencyMs }: {
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
}) {
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusLabel = isConnected ? 'LIVE' : isReconnecting ? 'SYNC' : 'OFFLINE';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: `1px solid ${S.border}`,
      background: S.surface,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/termora-logo.svg" alt="" style={{ width: 24, height: 24 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: S.text1, letterSpacing: -0.5 }}>termora</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
          color: statusColor,
          background: `${statusColor}12`,
          border: `1px solid ${statusColor}28`,
          padding: '2px 7px', borderRadius: 5,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: statusColor,
            animation: isConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
          }} />
          {statusLabel}
        </span>
        {isConnected && latencyMs !== null && (
          <span style={{
            fontSize: 9, color: S.text3,
            fontFamily: "'Geist Mono', monospace",
            background: S.surface2, padding: '2px 6px', borderRadius: 4,
            border: `1px solid ${S.border}`,
          }}>
            {latencyMs}ms
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Wireless signal icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" stroke={isConnected ? S.success : S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.42 9a16 16 0 0 1 21.16 0M5 12.55a11 11 0 0 1 14.08 0M10.71 17.4a6 6 0 0 1 2.58 0" />
          <circle cx="12" cy="21" r="1" fill={isConnected ? S.success : S.text3} stroke="none" />
        </svg>
      </div>
    </div>
  );
}

function KPIRow() {
  // Mock system stats — replace with real data when agent exposes /stats endpoint
  const kpis = [
    { label: 'CPU LOAD', value: '12', unit: '%', color: S.success, bar: 12 },
    { label: 'MEMORY', value: '4.2', unit: 'GB', color: S.primary, bar: 52 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
      {kpis.map((k) => (
        <div key={k.label} style={{
          background: S.surface2,
          border: `1px solid ${S.border}`,
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: S.text3, letterSpacing: 0.8, marginBottom: 5 }}>
            {k.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 7 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: k.color, letterSpacing: -1, fontFamily: "'Geist Mono', monospace" }}>
              {k.value}
            </span>
            <span style={{ fontSize: 10, color: S.text3, fontWeight: 500 }}>{k.unit}</span>
          </div>
          <div style={{ height: 3, background: S.surface3, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${k.bar}%`, background: k.color,
              borderRadius: 2, transition: 'width 600ms ease-out',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionCardFull({ session, isActive, onSelect, onClose }: {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const [confirmClose, setConfirmClose] = useState(false);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmClose(true);
  }, []);

  const handleConfirm = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(session.id);
    setConfirmClose(false);
  }, [onClose, session.id]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmClose(false);
  }, []);

  const isRunning = session.status === 'run';
  const dotColor = isRunning ? S.success : S.text3;
  const shellBadge = session.shell === 'claude' ? 'AI ENABLED' : session.shell === 'tmux' ? 'TMUX' : 'ZSH';
  const shellColor = session.shell === 'claude' ? S.primary : session.shell === 'tmux' ? '#60a5fa' : S.text3;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(session.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
      style={{
        background: isActive ? `${S.primary}08` : S.surface2,
        border: `1px solid ${isActive ? `${S.primary}55` : S.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 150ms ease-out',
        position: 'relative',
      }}
    >
      {/* Card header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        borderBottom: `1px solid ${S.border}`,
      }}>
        {/* Status dot */}
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: dotColor,
          flexShrink: 0,
          animation: isRunning ? 'pulse-dot 3s ease-in-out infinite' : 'none',
        }} />

        {/* Session name */}
        <span style={{
          fontSize: 12, fontWeight: 600, color: S.text1,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: -0.2,
        }}>
          {session.name}
        </span>

        {/* PID/TTY */}
        <span style={{
          fontSize: 9, color: S.text3, fontFamily: "'Geist Mono', monospace",
          background: S.surface3, padding: '1px 6px', borderRadius: 4,
          border: `1px solid ${S.border}`, flexShrink: 0,
        }}>
          pid:{session.pid}
        </span>

        {/* Close */}
        <button
          type="button"
          onClick={handleCloseClick}
          style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'transparent', border: `1px solid transparent`,
            color: S.text3, fontSize: 9, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, padding: 0,
            transition: 'all 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${S.error}55`;
            e.currentTarget.style.color = S.error;
            e.currentTarget.style.background = `${S.error}10`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = S.text3;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Terminal preview */}
      <div style={{
        background: S.bg, height: 72, overflow: 'hidden',
        padding: '5px 10px', position: 'relative',
      }}>
        <pre
          dangerouslySetInnerHTML={{
            __html: session.snapshot || `<span style="color:${S.primary}">$ </span><span style="color:${S.text3}">_</span>`,
          }}
          style={{
            fontSize: 7.5, lineHeight: 1.45,
            fontFamily: "'Geist Mono', monospace",
            color: S.text2, whiteSpace: 'pre', margin: 0,
            overflow: 'hidden',
          }}
        />
        {/* Fade bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 20, background: `linear-gradient(transparent, ${S.bg})`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Footer badges */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px',
        borderTop: `1px solid ${S.border}`,
      }}>
        <span style={{
          fontSize: 8, fontWeight: 600, letterSpacing: 0.4,
          color: isRunning ? S.success : S.text3,
          background: isRunning ? `${S.success}12` : `${S.text3}12`,
          border: `1px solid ${isRunning ? `${S.success}30` : `${S.text3}30`}`,
          padding: '1px 6px', borderRadius: 4,
        }}>
          {isRunning ? 'LIVE' : 'IDLE'}
        </span>
        <span style={{
          fontSize: 8, fontWeight: 600, letterSpacing: 0.4,
          color: shellColor,
          background: `${shellColor}12`,
          border: `1px solid ${shellColor}30`,
          padding: '1px 6px', borderRadius: 4,
        }}>
          {shellBadge}
        </span>
        <span style={{
          fontSize: 8, color: S.text3,
          background: S.surface3, border: `1px solid ${S.border}`,
          padding: '1px 6px', borderRadius: 4,
        }}>
          UTF-8
        </span>
        <span style={{
          fontSize: 8, color: S.text3, marginLeft: 'auto',
          fontFamily: "'Geist Mono', monospace",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {session.cwd.split('/').slice(-2).join('/')}
        </span>
      </div>

      {/* Close confirmation overlay */}
      {confirmClose && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(9,9,11,0.94)', borderRadius: 10, zIndex: 10, gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: S.text2, fontFamily: "'Geist Mono', monospace" }}>
            Close <span style={{ color: S.primary }}>{session.name}</span>?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleConfirm} style={{
              background: `${S.error}15`, border: `1px solid ${S.error}55`,
              borderRadius: 6, color: S.error, fontSize: 11, fontWeight: 600,
              fontFamily: 'inherit', padding: '5px 14px', cursor: 'pointer', minHeight: 32,
            }}>
              Close
            </button>
            <button type="button" onClick={handleCancel} style={{
              background: S.surface3, border: `1px solid ${S.border}`,
              borderRadius: 6, color: S.text2, fontSize: 11,
              fontFamily: 'inherit', padding: '5px 14px', cursor: 'pointer', minHeight: 32,
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardView({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateSession,
  onCloseSession,
  connectionStatus,
  latencyMs,
}: DashboardViewProps) {
  const [autoSync, setAutoSync] = useState(true);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DashHeader connectionStatus={connectionStatus} latencyMs={latencyMs} />

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 80px' }}>
        {/* KPI row */}
        <KPIRow />

        {/* Sessions section header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: S.text3,
            letterSpacing: 0.8, textTransform: 'uppercase', flex: 1,
          }}>
            Active Sessions
          </span>
          {sessions.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: `${S.primary}18`,
              color: S.primary,
              border: `1px solid ${S.primary}35`,
              padding: '1px 7px', borderRadius: 8,
              marginRight: 10,
            }}>
              {sessions.length}
            </span>
          )}
          {/* Auto-sync toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: S.text3, letterSpacing: 0.3 }}>AUTO-SYNC</span>
            <button
              type="button"
              onClick={() => setAutoSync((v) => !v)}
              style={{
                width: 30, height: 17, borderRadius: 9,
                background: autoSync ? S.primary : S.surface3,
                border: `1px solid ${autoSync ? S.primary : S.border}`,
                padding: 0, cursor: 'pointer', position: 'relative',
                transition: 'all 200ms ease-out',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 1, left: autoSync ? 14 : 1,
                width: 13, height: 13, borderRadius: '50%',
                background: S.text1,
                transition: 'left 200ms ease-out',
              }} />
            </button>
          </div>
        </div>

        {/* Session cards */}
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: S.surface2, border: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <p style={{ fontSize: 12, color: S.text3, margin: '0 0 14px' }}>No active sessions</p>
            <button
              type="button"
              onClick={onCreateSession}
              style={{
                height: 38, padding: '0 18px', borderRadius: 8,
                border: 'none', background: S.primary, color: S.bg,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              New Session
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map((session) => (
              <SessionCardFull
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={onSessionSelect}
                onClose={onCloseSession}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
