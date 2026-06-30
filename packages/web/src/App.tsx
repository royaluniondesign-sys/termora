import { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardView } from './components/DashboardView';
import { TerminalView } from './components/TerminalView';
import { TunnelsView } from './components/TunnelsView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { useSkin } from './hooks/useSkin';
import { useLatency } from './hooks/useLatency';
import type { View } from './lib/types';
import type { ConnectionStatus, TerminalWSClient } from './lib/ws-client';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

const TAB_CONFIG = [
  {
    id: 'dashboard' as const,
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: 'terminal' as const,
    label: 'Terminals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: 'tunnels' as const,
    label: 'Tunnels',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: 'settings' as const,
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function BottomTabBar({ current, onChange, sessionCount }: {
  current: View;
  onChange: (v: View) => void;
  sessionCount: number;
}) {
  return (
    <div style={{
      display: 'flex',
      borderTop: `1px solid ${S.border}`,
      background: S.surface,
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
    }}>
      {TAB_CONFIG.map((tab) => {
        const active = current === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 54,
              padding: '7px 4px',
              border: 'none',
              background: 'transparent',
              color: active ? S.primary : S.text3,
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'color 120ms ease-out',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: 0.1 }}>
              {tab.label}
            </span>
            {tab.id === 'terminal' && sessionCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: '50%',
                transform: 'translateX(10px)',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: S.primary,
                color: S.bg,
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {sessionCount > 9 ? '9+' : sessionCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FABButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute',
        bottom: 70,
        right: 16,
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: S.primary,
        border: 'none',
        color: S.bg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        zIndex: 20,
        boxShadow: `0 3px 12px ${S.primary}55`,
        transition: 'transform 120ms ease-out',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.90)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}

function DesktopSidebar({ current, onChange, onNewSession, sessionCount, connectionStatus }: {
  current: View;
  onChange: (v: View) => void;
  onNewSession: () => void;
  sessionCount: number;
  connectionStatus: ConnectionStatus;
}) {
  const isConnected = connectionStatus === 'connected';
  const statusColor = isConnected ? S.success : connectionStatus === 'reconnecting' ? S.warning : S.error;

  return (
    <div style={{
      width: 200,
      background: S.surface,
      borderRight: `1px solid ${S.border}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '18px 14px 14px', borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <img src="/termora-logo.svg" alt="" style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: S.text1, letterSpacing: -0.4, flex: 1 }}>termora</span>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: statusColor,
            animation: isConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
          }} />
        </div>
        <button
          type="button"
          onClick={onNewSession}
          style={{
            width: '100%', height: 32, borderRadius: 7,
            border: 'none', background: S.primary, color: S.bg,
            fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer', touchAction: 'manipulation', letterSpacing: -0.1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Session
        </button>
      </div>

      <nav style={{ padding: '6px 6px', flex: 1 }}>
        {TAB_CONFIG.map((tab) => {
          const active = current === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                width: '100%', height: 34, display: 'flex',
                alignItems: 'center', gap: 8, padding: '0 8px',
                borderRadius: 7, border: 'none', marginBottom: 1,
                background: active ? `${S.primary}14` : 'transparent',
                color: active ? S.primary : S.text2,
                fontSize: 12, fontWeight: active ? 600 : 400,
                fontFamily: 'inherit',
                cursor: 'pointer', touchAction: 'manipulation',
                transition: 'all 120ms ease-out',
                textAlign: 'left',
              }}
            >
              {tab.icon}
              <span style={{ flex: 1 }}>{tab.label}</span>
              {tab.id === 'terminal' && sessionCount > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: active ? `${S.primary}25` : S.surface3,
                  color: active ? S.primary : S.text3,
                  padding: '1px 6px', borderRadius: 8,
                }}>
                  {sessionCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '10px 14px', borderTop: `1px solid ${S.border}` }}>
        <span style={{ fontSize: 9, color: S.text3 }}>v0.1.0 — RUD Lab</span>
      </div>
    </div>
  );
}

function TerminalEmpty({ onNewSession, onRunCommand, sessionCount }: {
  onNewSession: () => void;
  onRunCommand: (cmd: string) => void;
  sessionCount: number;
}) {
  const quickCmds = [
    { cmd: 'claude', desc: 'Start Claude Code agent', color: S.primary },
    { cmd: 'claude --dangerously-skip-permissions', desc: 'Auto-approve mode', color: S.primary },
    { cmd: 'git status', desc: 'Check repo state', color: S.success },
    { cmd: 'git log --oneline -20', desc: 'Last 20 commits', color: S.success },
    { cmd: 'npm run dev', desc: 'Start dev server', color: '#60a5fa' },
    { cmd: 'htop', desc: 'System monitor', color: S.text2 },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        background: S.surface,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Terminals</h2>
        <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
          {sessionCount > 0
            ? `${sessionCount} session${sessionCount > 1 ? 's' : ''} running — select from Dashboard`
            : 'No active sessions'}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
        {sessionCount === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: S.surface2, border: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <p style={{ fontSize: 12, color: S.text3, margin: '0 0 14px' }}>No active sessions</p>
            <button type="button" onClick={onNewSession} style={{
              height: 38, padding: '0 18px', borderRadius: 8,
              border: 'none', background: S.primary, color: S.bg,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              New Terminal
            </button>
          </div>
        )}

        <div style={{
          fontSize: 10, fontWeight: 600, color: S.text3,
          letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
        }}>
          Quick Run
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {quickCmds.map((item) => (
            <button
              key={item.cmd}
              type="button"
              onClick={() => onRunCommand(item.cmd)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: S.surface2,
                border: `1px solid ${S.border}`, borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                textAlign: 'left', transition: 'border-color 120ms',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill={item.color} stroke="none" style={{ flexShrink: 0 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <code style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10, color: item.color, fontWeight: 500,
                background: S.surface3, padding: '2px 6px', borderRadius: 4,
                border: `1px solid ${S.border}`, flexShrink: 0,
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.cmd}
              </code>
              <span style={{ fontSize: 10, color: S.text3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReconnectView({ status, wsClient, onBack }: {
  status: ConnectionStatus;
  wsClient: TerminalWSClient | null;
  onBack: () => void;
}) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 14, padding: '0 32px',
    }}>
      {isReconnecting ? (
        <div style={{
          width: 40, height: 40,
          border: `2px solid ${S.surface3}`, borderTopColor: S.primary,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${statusColor}15`, border: `1px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke={statusColor} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isConnected
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              : <><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /></>
            }
          </svg>
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: S.text1, marginBottom: 4 }}>
          {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
        </div>
        <div style={{ fontSize: 11, color: S.text3 }}>
          {isConnected ? 'WebSocket healthy — sessions preserved' : 'Attempting to restore connection'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!isConnected && (
          <button
            type="button"
            onClick={() => wsClient?.forceReconnect()}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              border: 'none', background: S.primary, color: S.bg,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          style={{
            height: 36, padding: '0 16px', borderRadius: 8,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {isConnected ? 'Back to Dashboard' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

export function App() {
  const { auth, authenticateWithBootstrap, handleUnauthorized } = useAuth();
  const {
    sessions, wsClient, messageBus, createSession, closeSession,
    getSessionOutput, setSessionSnapshot, renameSession, status: connectionStatus,
  } = useSessionManager(auth, handleUnauthorized);
  const { skin, setSkin, perKeyColors, setPerKeyColors, keyboardMode, setKeyboardMode } = useSkin();
  const latencyMs = useLatency(wsClient, connectionStatus);

  const [view, setView] = useState<View>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  const awaitingNewSession = useRef(false);
  const sessionCountAtCreate = useRef(0);
  const pendingCommand = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!awaitingNewSession.current) return;
    if (sessions.length > sessionCountAtCreate.current) {
      const newest = sessions[sessions.length - 1];
      setActiveSessionId(newest.id);
      setView('terminal');
      awaitingNewSession.current = false;
      if (pendingCommand.current !== null) {
        const cmd = pendingCommand.current;
        pendingCommand.current = null;
        setTimeout(() => {
          wsClient?.send({ type: 'stdin', sessionId: newest.id, data: cmd + '\n' });
        }, 300);
      }
    }
  }, [sessions, wsClient]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('terminal');
  }, []);

  const handleCreateSession = useCallback(() => {
    sessionCountAtCreate.current = sessions.length;
    awaitingNewSession.current = true;
    createSession();
  }, [createSession, sessions.length]);

  const handleRunCommand = useCallback((cmd: string) => {
    if (activeSessionId) {
      wsClient?.send({ type: 'stdin', sessionId: activeSessionId, data: cmd + '\n' });
      setView('terminal');
    } else {
      pendingCommand.current = cmd;
      sessionCountAtCreate.current = sessions.length;
      awaitingNewSession.current = true;
      createSession();
    }
  }, [activeSessionId, wsClient, sessions.length, createSession]);

  const handleBack = useCallback((snapshot: string) => {
    if (snapshot && activeSessionId) setSessionSnapshot(activeSessionId, snapshot);
    setView('dashboard');
  }, [activeSessionId, setSessionSnapshot]);

  const handleTabChange = useCallback((v: View) => {
    if (v === 'terminal' && activeSessionId && sessions.find((s) => s.id === activeSessionId)) {
      setView('terminal');
    } else {
      setView(v);
    }
  }, [activeSessionId, sessions]);

  if (!auth.isAuthenticated) {
    return <AuthScreen auth={auth} onBootstrapSubmit={authenticateWithBootstrap} />;
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // Terminal with active session — full-screen, no tab bar
  if (view === 'terminal' && activeSession) {
    return (
      <TerminalView
        session={activeSession}
        wsClient={wsClient}
        messageBus={messageBus}
        getSessionOutput={getSessionOutput}
        onBack={handleBack}
        onOpenSettings={() => setView('settings')}
        onRenameSession={renameSession}
        skin={skin}
        perKeyColors={perKeyColors}
        keyboardMode={keyboardMode}
        onKeyboardModeChange={setKeyboardMode}
        latencyMs={latencyMs}
      />
    );
  }

  const showFAB = (view === 'dashboard' || view === 'terminal') && connectionStatus === 'connected';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      background: S.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {isDesktop && (
        <DesktopSidebar
          current={view}
          onChange={handleTabChange}
          onNewSession={handleCreateSession}
          sessionCount={sessions.length}
          connectionStatus={connectionStatus}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'dashboard' && (
            <DashboardView
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSessionSelect={handleSessionSelect}
              onCreateSession={handleCreateSession}
              onCloseSession={closeSession}
              connectionStatus={connectionStatus}
              latencyMs={latencyMs}
            />
          )}
          {view === 'terminal' && !activeSession && (
            <TerminalEmpty
              onNewSession={handleCreateSession}
              onRunCommand={handleRunCommand}
              sessionCount={sessions.length}
            />
          )}
          {view === 'tunnels' && (
            <TunnelsView wsClient={wsClient} connectionStatus={connectionStatus} />
          )}
          {view === 'settings' && (
            <SettingsView
              skin={skin}
              onSkinChange={setSkin}
              perKeyColors={perKeyColors}
              onPerKeyColorChange={setPerKeyColors}
              keyboardMode={keyboardMode}
              onKeyboardModeChange={setKeyboardMode}
              connectionStatus={connectionStatus}
              latencyMs={latencyMs}
            />
          )}
          {view === 'reconnect' && (
            <ReconnectView
              status={connectionStatus}
              wsClient={wsClient}
              onBack={() => setView('dashboard')}
            />
          )}
        </div>

        {!isDesktop && (
          <BottomTabBar
            current={view}
            onChange={handleTabChange}
            sessionCount={sessions.length}
          />
        )}
      </div>

      {showFAB && !isDesktop && <FABButton onClick={handleCreateSession} />}
    </div>
  );
}
