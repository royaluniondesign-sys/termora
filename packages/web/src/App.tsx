import { useState, useCallback, useEffect, useRef } from 'react';
import { GridView } from './components/GridView';
import { TerminalView } from './components/TerminalView';
import SkinStudio from './components/SkinStudio';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthScreen } from './components/AuthScreen';
import { TunnelsView } from './components/TunnelsView';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { useSkin } from './hooks/useSkin';
import { useLatency } from './hooks/useLatency';
import type { View } from './lib/types';
import type { ConnectionStatus } from './lib/ws-client';
import type { TerminalWSClient } from './lib/ws-client';

/** Obsidian palette */
const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  primary: '#a78bfa',
  primaryDim: '#8b5cf6',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

function DashNav({ onOpenSettings, connectionStatus, onShowStatus, latencyMs }: {
  onOpenSettings: () => void;
  connectionStatus: ConnectionStatus;
  onShowStatus: () => void;
  latencyMs: number | null;
}) {
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusBg = isConnected ? 'rgba(52,211,153,0.1)' : isReconnecting ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)';
  const statusLabel = isConnected ? 'LIVE' : isReconnecting ? 'SYNC' : 'OFFLINE';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
      background: S.surface,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/termora-logo.svg" alt="termora" style={{ width: 26, height: 26 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: S.text1, letterSpacing: -0.4 }}>termora</span>
        <button
          type="button"
          onClick={onShowStatus}
          title={isConnected ? 'Connection healthy' : 'Click to reconnect'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 9, fontWeight: 700, color: statusColor,
            background: statusBg, padding: '3px 8px', borderRadius: 6,
            border: `1px solid ${statusColor}22`, cursor: 'pointer',
            touchAction: 'manipulation', letterSpacing: 0.5,
          }}
        >
          <span style={{
            width: 5, height: 5, background: statusColor, borderRadius: '50%',
            animation: isConnected ? 'pulse-dot 2s ease-in-out infinite' : isReconnecting ? 'pulse-dot 0.8s ease-in-out infinite' : 'none',
          }} />
          {statusLabel}
        </button>
        {/* Latency pill — only when connected */}
        {isConnected && latencyMs !== null && (
          <span style={{
            fontSize: 9, color: S.text3, fontFamily: "'Geist Mono', monospace",
            background: S.surface2, padding: '2px 6px', borderRadius: 4,
            border: `1px solid ${S.border}`,
          }}>
            {latencyMs}ms
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          style={{
            width: 32, height: 32, minHeight: 44, minWidth: 44,
            borderRadius: 8, background: S.surface2, border: `1px solid ${S.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: S.text2, cursor: 'pointer', padding: 0,
            transition: 'all 180ms ease-out',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ViewSwitcher({ current, onChange }: { current: 'terminal' | 'grid' | 'tunnels' | 'reconnect'; onChange: (v: 'terminal' | 'grid' | 'tunnels' | 'reconnect') => void }) {
  const views = [
    { id: 'terminal' as const, label: 'Terminal', icon: 'M4 17l6-6-6-6M12 19h8' },
    { id: 'grid' as const, label: 'Sessions', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
    { id: 'tunnels' as const, label: 'Tunnels', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  ];
  return (
    <div style={{ display: 'flex', padding: '8px 12px', flexShrink: 0, background: S.surface }}>
      <div style={{
        display: 'flex', gap: 2, background: S.surface2,
        borderRadius: 9, padding: 3, border: `1px solid ${S.border}`, width: '100%',
      }}>
        {views.map((v) => {
          const active = current === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              style={{
                flex: 1, minHeight: 34, padding: '0 8px', borderRadius: 7,
                border: 'none', cursor: 'pointer',
                background: active ? S.primary : 'transparent',
                color: active ? S.bg : S.text3,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                transition: 'all 200ms ease-out', touchAction: 'manipulation',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={v.icon} />
              </svg>
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReconnectView({ status, wsClient, onSwitchToTerminal }: {
  status: ConnectionStatus;
  wsClient: TerminalWSClient | null;
  onSwitchToTerminal: () => void;
}) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isDisconnected = status === 'disconnected';

  const handleRetry = useCallback(() => { wsClient?.forceReconnect(); }, [wsClient]);
  const handleDisconnect = useCallback(() => { wsClient?.disconnect(); }, [wsClient]);

  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusLabel = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: '0 36px',
      animation: 'fade-in-up 300ms ease-out',
    }}>
      {isReconnecting ? (
        <div style={{
          width: 48, height: 48, border: `3px solid ${S.surface3}`,
          borderTopColor: S.primary, borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${statusColor}15`, border: `2px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" stroke={statusColor} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isConnected
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              : <><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A10 10 0 0 1 22.56 9M1.42 9a9.91 9.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" /></>
            }
          </svg>
        </div>
      )}

      <h3 style={{ fontSize: 17, fontWeight: 700, color: S.text1, letterSpacing: -0.3 }}>{statusLabel}</h3>

      {isReconnecting && (
        <div style={{ width: 180, height: 2, background: S.surface2, borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: S.primary, borderRadius: 1, width: '40%', animation: 'prog 2s ease-in-out infinite' }} />
        </div>
      )}

      {isConnected && (
        <>
          <span style={{ fontSize: 12, color: S.text3 }}>WebSocket connection is healthy</span>
          <span style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" stroke={S.success} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Sessions preserved. Tunnel active.
          </span>
          <button type="button" onClick={onSwitchToTerminal} style={{
            minHeight: 44, padding: '0 20px', borderRadius: 9,
            border: 'none', background: S.primary, color: S.bg,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', touchAction: 'manipulation', marginTop: 4,
          }}>
            Back to Terminal
          </button>
        </>
      )}

      {isReconnecting && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button type="button" onClick={handleDisconnect} style={{
            minHeight: 44, padding: '0 16px', borderRadius: 9,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text3, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>Stop</button>
          <button type="button" onClick={handleRetry} style={{
            minHeight: 44, padding: '0 16px', borderRadius: 9,
            border: 'none', background: S.primary, color: S.bg,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Retry Now</button>
        </div>
      )}

      {isDisconnected && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button type="button" onClick={handleRetry} style={{
            minHeight: 44, padding: '0 20px', borderRadius: 9,
            border: 'none', background: S.primary, color: S.bg,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Reconnect</button>
        </div>
      )}
    </div>
  );
}

function TerminalWelcome({ onNewSession, onOpenSettings, onOpenSkinStudio, sessionCount, onRunCommand }: {
  onNewSession: () => void;
  onOpenSettings: () => void;
  onOpenSkinStudio: () => void;
  sessionCount: number;
  onRunCommand: (cmd: string) => void;
}) {
  const card = {
    background: S.surface2, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '14px', cursor: 'pointer' as const,
    transition: 'all 200ms ease-out', touchAction: 'manipulation' as const,
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px 14px', animation: 'fade-in-up 250ms ease-out' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <img src="/termora-logo.svg" alt="termora" style={{ width: 52, height: 52, margin: '0 auto 12px', display: 'block' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: S.text1, letterSpacing: -0.5, margin: 0 }}>termora</h2>
        <p style={{ fontSize: 12, color: S.text3, marginTop: 4 }}>Real terminal access from your pocket</p>
      </div>

      {/* New session CTA */}
      <button type="button" onClick={onNewSession} style={{
        width: '100%', minHeight: 48, borderRadius: 10,
        border: 'none', background: S.primary, color: S.bg,
        fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', touchAction: 'manipulation',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 18, letterSpacing: -0.2,
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" stroke={S.bg} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        New Terminal Session
      </button>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        <div style={{ ...card, textAlign: 'center', cursor: 'default' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: S.primary }}>{sessionCount}</div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 2, letterSpacing: 1 }}>ACTIVE</div>
        </div>
        <div style={{ ...card, textAlign: 'center', cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, background: S.success, borderRadius: '50%', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 4, letterSpacing: 1 }}>LIVE</div>
        </div>
        <div style={{ ...card, textAlign: 'center', cursor: 'default' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.text1 }}>v0.1</div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 2, letterSpacing: 1 }}>VERSION</div>
        </div>
      </div>

      {/* Quick access */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Quick Access
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        <div style={card} onClick={onOpenSkinStudio}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill={S.primary} />
            <circle cx="17.5" cy="10.5" r=".5" fill={S.primary} />
            <circle cx="8.5" cy="7.5" r=".5" fill={S.primary} />
            <circle cx="6.5" cy="12" r=".5" fill={S.primary} />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginTop: 8 }}>Keyboard Skins</div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>6 themes</div>
        </div>
        <div style={card} onClick={onOpenSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#60a5fa" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginTop: 8 }}>Connection</div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>URL + tunnel</div>
        </div>
      </div>

      {/* Run commands */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Run Command
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
        {[
          { cmd: 'claude', desc: 'Start Claude Code AI agent', color: S.primary },
          { cmd: 'claude --dangerously-skip-permissions', desc: 'Claude Code (auto-approve)', color: S.primary },
          { cmd: 'git status', desc: 'Check repo state', color: S.success },
          { cmd: 'git log --oneline -20', desc: 'Last 20 commits', color: S.success },
          { cmd: 'npm run dev', desc: 'Start dev server', color: '#60a5fa' },
          { cmd: 'htop', desc: 'System monitor', color: S.text2 },
        ].map((item) => (
          <div
            key={item.cmd}
            role="button"
            tabIndex={0}
            onClick={() => onRunCommand(item.cmd)}
            onKeyDown={(e) => e.key === 'Enter' && onRunCommand(item.cmd)}
            style={{ ...card, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill={item.color} stroke="none" style={{ flexShrink: 0 }}>
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <code style={{
              fontFamily: "'Geist Mono', 'Anthropic Mono', monospace",
              fontSize: 10, color: item.color, fontWeight: 500,
              background: S.surface3, padding: '2px 6px', borderRadius: 4,
              border: `1px solid ${S.border}`, flexShrink: 0,
              maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {item.cmd}
            </code>
            <span style={{ fontSize: 10, color: S.text3, minWidth: 0 }}>{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 16 }}>
        <span style={{ fontSize: 9, color: S.text3 }}>termora v0.1.0 — by RUD Lab</span>
      </div>
    </div>
  );
}

export function App() {
  const { auth, authenticateWithBootstrap, handleUnauthorized } = useAuth();
  const { sessions, wsClient, messageBus, createSession, closeSession, getSessionOutput, setSessionSnapshot, renameSession, status: connectionStatus } = useSessionManager(auth, handleUnauthorized);
  const { skin, setSkin, perKeyColors, setPerKeyColors, keyboardMode, setKeyboardMode } = useSkin();
  const latencyMs = useLatency(wsClient, connectionStatus);

  const [view, setView] = useState<View>('grid');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const awaitingNewSession = useRef(false);
  const sessionCountAtCreate = useRef(0);
  const pendingCommand = useRef<string | null>(null);

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
    setView('grid');
  }, [activeSessionId, setSessionSnapshot]);

  const handleOpenSkinStudio = useCallback(() => { setSettingsOpen(false); setView('skin-studio'); }, []);
  const handleCloseSkinStudio = useCallback(() => { setView('terminal'); }, []);
  const handleOpenSettings = useCallback(() => { setSettingsOpen(true); }, []);
  const handleCloseSettings = useCallback(() => { setSettingsOpen(false); }, []);

  const handleViewChange = useCallback((v: 'terminal' | 'grid' | 'tunnels' | 'reconnect') => {
    setView(v);
  }, []);

  if (!auth.isAuthenticated) {
    return <AuthScreen auth={auth} onBootstrapSubmit={authenticateWithBootstrap} />;
  }

  if (view === 'skin-studio') {
    return (
      <SkinStudio
        currentSkin={skin}
        onSkinChange={setSkin}
        perKeyColors={perKeyColors}
        onPerKeyColorChange={setPerKeyColors}
        onClose={handleCloseSkinStudio}
      />
    );
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  if (view === 'terminal' && activeSession) {
    return (
      <>
        <TerminalView
          session={activeSession}
          wsClient={wsClient}
          messageBus={messageBus}
          getSessionOutput={getSessionOutput}
          onBack={handleBack}
          onOpenSkinStudio={handleOpenSkinStudio}
          onOpenSettings={handleOpenSettings}
          onRenameSession={renameSession}
          skin={skin}
          perKeyColors={perKeyColors}
          keyboardMode={keyboardMode}
          onKeyboardModeChange={setKeyboardMode}
          latencyMs={latencyMs}
        />
        {settingsOpen && (
          <SettingsPanel
            onClose={handleCloseSettings}
            onOpenSkinStudio={handleOpenSkinStudio}
            sessionCount={sessions.length}
            keyboardMode={keyboardMode}
            onKeyboardModeChange={setKeyboardMode}
          />
        )}
      </>
    );
  }

  const currentTab = view === 'tunnels' ? 'tunnels' : view === 'reconnect' ? 'reconnect' : view === 'terminal' ? 'terminal' : 'grid';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, overflow: 'hidden' }}>
      <DashNav
        onOpenSettings={handleOpenSettings}
        connectionStatus={connectionStatus}
        onShowStatus={() => setView('reconnect')}
        latencyMs={latencyMs}
      />
      <ViewSwitcher current={currentTab} onChange={handleViewChange} />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {view === 'grid' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <GridView
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSessionSelect={handleSessionSelect}
              onCreateSession={handleCreateSession}
              onCloseSession={closeSession}
              onOpenSettings={handleOpenSettings}
            />
          </div>
        )}
        {view === 'terminal' && !activeSession && (
          <TerminalWelcome
            onNewSession={handleCreateSession}
            onOpenSettings={handleOpenSettings}
            onOpenSkinStudio={handleOpenSkinStudio}
            sessionCount={sessions.length}
            onRunCommand={handleRunCommand}
          />
        )}
        {view === 'tunnels' && (
          <TunnelsView wsClient={wsClient} connectionStatus={connectionStatus} />
        )}
        {view === 'reconnect' && (
          <ReconnectView status={connectionStatus} wsClient={wsClient} onSwitchToTerminal={() => setView('terminal')} />
        )}
      </div>

      {settingsOpen && (
        <SettingsPanel
          onClose={handleCloseSettings}
          onOpenSkinStudio={handleOpenSkinStudio}
          sessionCount={sessions.length}
          keyboardMode={keyboardMode}
          onKeyboardModeChange={setKeyboardMode}
        />
      )}
    </div>
  );
}
