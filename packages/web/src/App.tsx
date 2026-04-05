import { useState, useCallback, useEffect, useRef } from 'react';
import { GridView } from './components/GridView';
import { TerminalView } from './components/TerminalView';
import SkinStudio from './components/SkinStudio';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { useSkin } from './hooks/useSkin';
import type { View } from './lib/types';
import type { ConnectionStatus } from './lib/ws-client';
import type { TerminalWSClient } from './lib/ws-client';

/** Anthropic palette inline styles */
const S = {
  bg: '#141413',
  surface: '#1e1d1b',
  surface2: '#282725',
  border: '#3a3835',
  orange: '#d97757',
  orangeDim: '#c46a4d',
  green: '#788c5d',
  text1: '#faf9f5',
  text2: '#b0aea5',
  text3: '#78756f',
} as const;

/**
 * Dashboard nav bar — logo + termora + connection status + settings
 */
function DashNav({ onOpenSettings, connectionStatus, onShowStatus }: {
  onOpenSettings: () => void;
  connectionStatus: import('./lib/ws-client').ConnectionStatus;
  onShowStatus: () => void;
}) {
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const statusColor = isConnected ? S.green : isReconnecting ? S.orange : '#e87c6a';
  const statusBg = isConnected ? 'rgba(120,140,93,0.12)' : isReconnecting ? 'rgba(217,119,87,0.12)' : 'rgba(232,124,106,0.12)';
  const statusLabel = isConnected ? 'LIVE' : isReconnecting ? 'RECONNECTING' : 'OFFLINE';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/termora-logo.svg" alt="termora" style={{ width: 28, height: 28 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: S.text1, letterSpacing: -0.3 }}>termora</span>
        {/* Clickable status badge — opens the Status/Reconnect view */}
        <button
          type="button"
          onClick={onShowStatus}
          title={isConnected ? 'Connection healthy — click for details' : 'Click to reconnect'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 700, color: statusColor,
            background: statusBg, padding: '3px 8px', borderRadius: 6,
            border: 'none', cursor: 'pointer', touchAction: 'manipulation',
            transition: 'all 180ms ease-out',
          }}
        >
          <span style={{
            width: 5, height: 5, background: statusColor, borderRadius: '50%',
            animation: isReconnecting ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          {statusLabel}
        </button>
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
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * View switcher — Terminal / Dashboard / Reconnect
 */
function ViewSwitcher({ current, onChange }: { current: 'terminal' | 'grid' | 'reconnect'; onChange: (v: 'terminal' | 'grid' | 'reconnect') => void }) {
  const views = [
    { id: 'terminal' as const, label: 'Terminal' },
    { id: 'grid' as const, label: 'Sessions' },
    { id: 'reconnect' as const, label: 'Status' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 2, justifyContent: 'center',
      padding: '8px 14px', flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', gap: 2, background: S.surface,
        borderRadius: 8, padding: 3, border: `1px solid ${S.border}`,
      }}>
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            style={{
              minHeight: 36, padding: '0 16px', borderRadius: 6,
              border: 'none', cursor: 'pointer',
              background: current === v.id ? S.orange : 'transparent',
              color: current === v.id ? S.bg : S.text3,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              transition: 'all 200ms ease-out',
              touchAction: 'manipulation',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Reconnect view — real connection status, retry, disconnect.
 * Connected to actual WebSocket client state.
 */
function ReconnectView({ status, wsClient, onSwitchToTerminal }: {
  status: ConnectionStatus;
  wsClient: TerminalWSClient | null;
  onSwitchToTerminal: () => void;
}) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isDisconnected = status === 'disconnected';

  const handleRetry = useCallback(() => {
    wsClient?.forceReconnect();
  }, [wsClient]);

  const handleDisconnect = useCallback(() => {
    wsClient?.disconnect();
  }, [wsClient]);

  const statusColor = isConnected ? S.green : isReconnecting ? S.orange : '#e87c6a';
  const statusLabel = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected';
  const statusIcon = isConnected ? 'M22 11.08V12a10 10 0 1 1-5.93-9.14' : isReconnecting ? 'M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10' : 'M18.36 5.64a9 9 0 0 1 .55 12.58M1 1l22 22';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: '0 36px',
    }}>
      {/* Status icon */}
      {isReconnecting ? (
        <div style={{
          width: 48, height: 48, border: `3px solid ${S.border}`,
          borderTopColor: S.orange, borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${statusColor}15`, border: `2px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" stroke={statusColor} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={statusIcon} />
            {isConnected && <polyline points="16 8 22 2" />}
          </svg>
        </div>
      )}

      {/* Status text */}
      <h3 style={{ fontSize: 18, fontWeight: 700, color: S.text1 }}>{statusLabel}</h3>

      {/* Progress bar for reconnecting */}
      {isReconnecting && (
        <div style={{ width: 180, height: 3, background: S.surface2, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: S.orange, borderRadius: 2,
            width: '40%', animation: 'prog 2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Connected state */}
      {isConnected && (
        <>
          <span style={{ fontSize: 12, color: S.text3 }}>WebSocket connection is healthy</span>
          <span style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.green} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Sessions preserved. Tunnel active.
          </span>
          <button type="button" onClick={onSwitchToTerminal} style={{
            minHeight: 44, padding: '0 20px', borderRadius: 8,
            border: 'none', background: S.orange, color: S.bg,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', touchAction: 'manipulation', marginTop: 4,
          }}>
            Back to Terminal
          </button>
        </>
      )}

      {/* Reconnecting state */}
      {isReconnecting && (
        <>
          <span style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.green} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Sessions preserved. No data lost.
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={handleDisconnect} style={{
              minHeight: 44, padding: '0 16px', borderRadius: 8,
              border: `1px solid ${S.border}`, background: 'transparent',
              color: S.text3, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
              Stop
            </button>
            <button type="button" onClick={handleRetry} style={{
              minHeight: 44, padding: '0 16px', borderRadius: 8,
              border: 'none', background: S.orange, color: S.bg,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
              Retry Now
            </button>
          </div>
        </>
      )}

      {/* Disconnected state */}
      {isDisconnected && (
        <>
          <span style={{ fontSize: 12, color: S.text3 }}>Connection lost. Sessions may still be alive on the server.</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={handleRetry} style={{
              minHeight: 44, padding: '0 20px', borderRadius: 8,
              border: 'none', background: S.orange, color: S.bg,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
              Reconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* SVG icon helper */
const Icon = ({ d, color = 'currentColor', size = 16 }: { d: string; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * Terminal welcome — shown when Terminal tab is active but no session selected.
 * Quick actions, useful commands, session info cards, and help links.
 */
function TerminalWelcome({ onNewSession, onOpenSettings, onOpenSkinStudio, sessionCount }: {
  onNewSession: () => void;
  onOpenSettings: () => void;
  onOpenSkinStudio: () => void;
  sessionCount: number;
}) {
  const cardStyle = {
    background: S.surface2, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: '14px 14px', cursor: 'pointer',
    transition: 'all 200ms ease-out', touchAction: 'manipulation' as const,
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px 14px' }}>
      {/* Logo + welcome */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img src="/termora-logo.svg" alt="termora" style={{ width: 48, height: 48, margin: '0 auto 10px', display: 'block' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: S.text1, letterSpacing: -0.5 }}>Welcome to termora</h2>
        <p style={{ fontSize: 12, color: S.text3, marginTop: 4 }}>Your machine, in your hands</p>
      </div>

      {/* New session CTA */}
      <button
        type="button"
        onClick={onNewSession}
        style={{
          width: '100%', minHeight: 48, borderRadius: 10,
          border: 'none', background: S.orange, color: S.bg,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', touchAction: 'manipulation',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 16,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" stroke={S.bg} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        New Terminal Session
      </button>

      {/* Quick access cards */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Quick Access
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={cardStyle} onClick={onOpenSkinStudio}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke={S.orange} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill={S.orange} /><circle cx="17.5" cy="10.5" r=".5" fill={S.orange} />
            <circle cx="8.5" cy="7.5" r=".5" fill={S.orange} /><circle cx="6.5" cy="12" r=".5" fill={S.orange} />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginTop: 8 }}>Keyboard Skins</div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>6 themes available</div>
        </div>
        <div style={cardStyle} onClick={onOpenSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#6a9bcc" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginTop: 8 }}>Connection</div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>URL, tunnel, add machines</div>
        </div>
      </div>

      {/* Useful commands */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Useful Commands
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {[
          { cmd: 'claude', desc: 'Start Claude Code AI agent', color: S.orange },
          { cmd: 'git status', desc: 'Check repo state', color: S.green },
          { cmd: 'npm run dev', desc: 'Start dev server', color: '#6a9bcc' },
          { cmd: 'htop', desc: 'System monitor', color: S.text2 },
        ].map((item) => (
          <div key={item.cmd} style={{
            ...cardStyle, padding: '10px 12px', cursor: 'default',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <code style={{
              fontFamily: "'Fira Code', 'Anthropic Mono', monospace",
              fontSize: 11, color: item.color, fontWeight: 500,
              background: S.surface, padding: '2px 6px', borderRadius: 4,
              border: `1px solid ${S.border}`,
            }}>
              {item.cmd}
            </code>
            <span style={{ fontSize: 11, color: S.text3 }}>{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Session info */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Session Info
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ ...cardStyle, textAlign: 'center', cursor: 'default' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.orange }}>{sessionCount}</div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 2, letterSpacing: 1 }}>ACTIVE</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, background: S.green, borderRadius: '50%' }} />
          </div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 4, letterSpacing: 1 }}>CONNECTED</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', cursor: 'default' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.text1 }}>v0.1</div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 2, letterSpacing: 1 }}>VERSION</div>
        </div>
      </div>

      {/* Help links */}
      <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Help & Resources
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {[
          { label: 'GitHub Repository', url: 'https://github.com/royaluniondesign-sys/termora', icon: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22' },
          { label: 'Security Policy', url: 'https://github.com/royaluniondesign-sys/termora/blob/main/SECURITY.md', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
          { label: 'Contributing Guide', url: 'https://github.com/royaluniondesign-sys/termora/blob/main/CONTRIBUTING.md', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
          { label: 'Support (Ko-fi)', url: 'https://ko-fi.com/rudlab', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
        ].map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...cardStyle, padding: '10px 12px', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <Icon d={link.icon} color={S.text2} size={16} />
            <span style={{ fontSize: 12, color: S.text1, fontWeight: 500 }}>{link.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 16 }}>
        <img src="/termora-logo.svg" alt="" style={{ width: 16, height: 16, margin: '0 auto 4px', display: 'block', opacity: 0.4 }} />
        <span style={{ fontSize: 9, color: S.text3 }}>termora v0.1.0 — by RUD</span>
      </div>
    </div>
  );
}

export function App() {
  const { auth, authenticateWithBootstrap, handleUnauthorized } = useAuth();
  const { sessions, wsClient, messageBus, createSession, closeSession, getSessionOutput, setSessionSnapshot, renameSession, status: connectionStatus } = useSessionManager(auth, handleUnauthorized);
  const { skin, setSkin, perKeyColors, setPerKeyColors } = useSkin();

  const [view, setView] = useState<View>('grid');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const awaitingNewSession = useRef(false);
  const sessionCountAtCreate = useRef(0);

  useEffect(() => {
    if (!awaitingNewSession.current) return;
    if (sessions.length > sessionCountAtCreate.current) {
      const newest = sessions[sessions.length - 1];
      setActiveSessionId(newest.id);
      setView('terminal');
      awaitingNewSession.current = false;
    }
  }, [sessions]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('terminal');
  }, []);

  const handleCreateSession = useCallback(() => {
    sessionCountAtCreate.current = sessions.length;
    awaitingNewSession.current = true;
    createSession();
  }, [createSession, sessions.length]);

  const handleBack = useCallback((snapshot: string) => {
    if (snapshot && activeSessionId) {
      setSessionSnapshot(activeSessionId, snapshot);
    }
    setView('grid');
  }, [activeSessionId, setSessionSnapshot]);

  const handleOpenSkinStudio = useCallback(() => {
    setSettingsOpen(false);
    setView('skin-studio');
  }, []);

  const handleCloseSkinStudio = useCallback(() => {
    setView('terminal');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleViewChange = useCallback((v: 'terminal' | 'grid' | 'reconnect') => {
    setView(v);
  }, []);

  // Auth gate
  if (!auth.isAuthenticated) {
    return (
      <AuthScreen
        auth={auth}
        onBootstrapSubmit={authenticateWithBootstrap}
      />
    );
  }

  // Skin studio is a full-screen overlay
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

  // Full-screen terminal when a session is selected and view is terminal
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
        />
        {settingsOpen && (
          <SettingsPanel
            onClose={handleCloseSettings}
            onOpenSkinStudio={handleOpenSkinStudio}
            sessionCount={sessions.length}
          />
        )}
      </>
    );
  }

  // Main layout: nav + switcher + content area
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: S.bg, overflow: 'hidden',
    }}>
      {/* Dashboard nav */}
      <DashNav
        onOpenSettings={handleOpenSettings}
        connectionStatus={connectionStatus}
        onShowStatus={() => setView('reconnect')}
      />

      {/* View switcher: Terminal / Dashboard / Reconnect */}
      <ViewSwitcher
        current={view === 'reconnect' ? 'reconnect' : view === 'terminal' ? 'terminal' : 'grid'}
        onChange={handleViewChange}
      />

      {/* Content area */}
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
          />
        )}
        {view === 'reconnect' && (
          <ReconnectView
            status={connectionStatus}
            wsClient={wsClient}
            onSwitchToTerminal={() => setView('terminal')}
          />
        )}
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <SettingsPanel
          onClose={handleCloseSettings}
          onOpenSkinStudio={handleOpenSkinStudio}
          sessionCount={sessions.length}
        />
      )}
    </div>
  );
}
