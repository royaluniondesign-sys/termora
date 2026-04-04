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
 * Dashboard nav bar — logo + termora + LIVE + settings
 */
function DashNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/termora-logo.svg" alt="termora" style={{ width: 28, height: 28 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: S.text1, letterSpacing: -0.3 }}>termora</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 9, fontWeight: 700, color: S.green,
          background: 'rgba(120,140,93,0.12)', padding: '2px 7px', borderRadius: 6,
        }}>
          <span style={{ width: 4, height: 4, background: S.green, borderRadius: '50%' }} />
          LIVE
        </span>
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
    { id: 'grid' as const, label: 'Dashboard' },
    { id: 'reconnect' as const, label: 'Reconnect' },
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
 * Reconnect view — spinner, progress, retry
 */
function ReconnectView() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 14, padding: '0 36px',
    }}>
      <div style={{
        width: 44, height: 44, border: `3px solid ${S.border}`,
        borderTopColor: S.orange, borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text1 }}>Reconnecting...</h3>
      <span style={{ fontSize: 12, color: S.text3 }}>Attempt 2 of 5</span>
      <div style={{ width: 160, height: 3, background: S.surface2, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: S.orange, borderRadius: 2,
          width: '40%', animation: 'prog 2s ease-in-out infinite',
        }} />
      </div>
      <span style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.green} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Sessions preserved. No data lost.
      </span>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" style={{
          minHeight: 44, padding: '0 16px', borderRadius: 8,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text3, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
        }}>
          Cancel
        </button>
        <button type="button" style={{
          minHeight: 44, padding: '0 16px', borderRadius: 8,
          border: 'none', background: S.orange, color: S.bg,
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}>
          Retry Now
        </button>
      </div>
    </div>
  );
}

export function App() {
  const { auth, authenticateWithBootstrap, handleUnauthorized } = useAuth();
  const { sessions, wsClient, messageBus, createSession, closeSession, getSessionOutput, setSessionSnapshot, renameSession } = useSessionManager(auth, handleUnauthorized);
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
      <DashNav onOpenSettings={handleOpenSettings} />

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
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: S.text3, fontSize: 13,
          }}>
            <span>No session selected</span>
            <button
              type="button"
              onClick={handleCreateSession}
              style={{
                minHeight: 44, padding: '0 20px', borderRadius: 8,
                border: 'none', background: S.orange, color: S.bg,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              New Session
            </button>
          </div>
        )}
        {view === 'reconnect' && <ReconnectView />}
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
