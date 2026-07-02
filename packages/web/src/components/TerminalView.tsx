import { useState, useRef, useEffect, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { MacBookKeyboard } from './MacBookKeyboard';
import { IOSKeyboard } from './IOSKeyboard';
import type { TerminalViewProps, KeyboardMode } from '../lib/types';

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

// ── Compact header (36px) ────────────────────────────────────────────────────

function CompactHeader({ sessionName, latencyMs, onBack, onOpenSettings, onCopyScreen }: {
  sessionName: string;
  latencyMs: number | null | undefined;
  onBack: () => void;
  onOpenSettings: () => void;
  onCopyScreen: () => void;
}) {
  const latencyColor = latencyMs == null ? S.text3
    : latencyMs < 30 ? S.success
    : latencyMs < 100 ? S.warning
    : S.error;

  return (
    <div style={{
      height: 38, display: 'flex', alignItems: 'center', gap: 0,
      paddingLeft: 4, paddingRight: 10,
      background: S.surface, borderBottom: `1px solid ${S.border}`,
      flexShrink: 0,
    }}>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          height: 38, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent',
          color: S.primary, cursor: 'pointer', padding: '0 6px',
          touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 5,
        overflow: 'hidden', minWidth: 0,
      }}>
        <span style={{ fontSize: 9, color: S.text3, flexShrink: 0 }}>sessions</span>
        <svg width="9" height="9" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{
          fontSize: 11, fontWeight: 600, color: S.text1,
          letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "'Geist Mono', monospace",
        }}>
          {sessionName}
        </span>
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Latency */}
        {latencyMs !== null && latencyMs !== undefined && (
          <span style={{
            fontSize: 9, color: latencyColor,
            fontFamily: "'Geist Mono', monospace",
            padding: '2px 5px', borderRadius: 4,
          }}>
            {latencyMs}ms
          </span>
        )}
        {/* Copy screen */}
        <button
          type="button"
          onClick={onCopyScreen}
          title="Copy screen content"
          style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'transparent', color: S.text3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width: 28, height: 28, borderRadius: 6, border: 'none',
            background: 'transparent', color: S.text3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Git action bar ──────────────────────────────────────────────────────────

function ActionBar({ onSend, onPaste }: {
  onSend: (data: string) => void;
  onPaste: () => void;
}) {
  const actions = [
    { label: 'Plan', data: '/plan ', accent: false },
    { label: 'Diff', data: 'git diff\r', accent: false },
    { label: 'Commit', data: 'git commit\r', accent: true },
    { label: 'Reset', data: 'git reset\r', accent: false },
  ];

  const btnBase: React.CSSProperties = {
    height: 26, padding: '0 10px', borderRadius: 6,
    border: `1px solid ${S.border}`,
    background: 'transparent',
    fontSize: 10, fontWeight: 500,
    cursor: 'pointer', touchAction: 'manipulation',
    fontFamily: 'inherit', letterSpacing: -0.1,
    transition: 'all 120ms ease-out',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  };

  return (
    <div style={{
      height: 38, display: 'flex', alignItems: 'center',
      gap: 5, padding: '0 10px',
      background: S.surface, borderTop: `1px solid ${S.border}`,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onSend(a.data);
            e.currentTarget.style.transform = 'scale(0.92)';
          }}
          onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
          onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}
          style={{
            ...btnBase,
            color: a.accent ? S.bg : S.text2,
            background: a.accent ? S.primary : 'transparent',
            border: `1px solid ${a.accent ? S.primary : S.border}`,
            fontWeight: a.accent ? 600 : 500,
          }}
        >
          {a.label}
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Paste */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); onPaste(); }}
        style={{
          ...btnBase,
          color: S.text3,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
        Paste
      </button>
    </div>
  );
}

// ── Key strip ───────────────────────────────────────────────────────────────

function KeyStrip({ onKey, keyboardMode, onKeyboardModeChange }: {
  onKey: (data: string) => void;
  keyboardMode: KeyboardMode;
  onKeyboardModeChange: (mode: KeyboardMode) => void;
}) {
  const [ctrlLock, setCtrlLock] = useState(false);
  const [altLock, setAltLock] = useState(false);

  const sendWithModifiers = useCallback((data: string) => {
    if (ctrlLock) {
      const code = data.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        onKey(String.fromCharCode(code - 96));
      } else if (data === '\r') {
        onKey('\n');
      } else {
        onKey(data);
      }
      setCtrlLock(false);
    } else if (altLock) {
      onKey('\x1b' + data);
      setAltLock(false);
    } else {
      onKey(data);
    }
  }, [ctrlLock, altLock, onKey]);

  const nextMode: KeyboardMode = keyboardMode === 'custom' ? 'system' : keyboardMode === 'system' ? 'physical' : 'custom';
  const modeLabel = keyboardMode === 'custom' ? 'Virtual' : keyboardMode === 'system' ? 'Native' : 'HW';

  const keys = [
    { label: 'ESC', action: () => sendWithModifiers('\x1b') },
    { label: 'TAB', action: () => sendWithModifiers('\t') },
    { label: 'CTRL', action: () => { setCtrlLock((v) => !v); setAltLock(false); }, modifier: true, active: ctrlLock },
    { label: 'ALT', action: () => { setAltLock((v) => !v); setCtrlLock(false); }, modifier: true, active: altLock },
    { label: '↑', action: () => sendWithModifiers('\x1b[A') },
    { label: 'DEL', action: () => sendWithModifiers('\x7f') },
  ];

  const keyBase: React.CSSProperties = {
    height: 28, minWidth: 36, padding: '0 7px', borderRadius: 5,
    border: `1px solid ${S.border}`,
    background: S.surface2,
    color: S.text2, fontSize: 9, fontWeight: 600,
    cursor: 'pointer', touchAction: 'manipulation',
    fontFamily: "'Geist Mono', monospace",
    transition: 'all 100ms ease-out',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0, letterSpacing: 0.3,
  };

  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'center',
      gap: 5, padding: '0 10px',
      background: S.surface, borderTop: `1px solid ${S.border}`,
      flexShrink: 0, overflowX: 'auto', overflowY: 'hidden',
    }}>
      {keys.map((k) => (
        <button
          key={k.label}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            k.action();
            if (!k.modifier) {
              e.currentTarget.style.background = S.surface3;
              e.currentTarget.style.transform = 'scale(0.93)';
            }
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.background = k.modifier && (k.active ? S.primary : S.surface2) || S.surface2;
            e.currentTarget.style.transform = '';
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.background = S.surface2;
            e.currentTarget.style.transform = '';
          }}
          style={{
            ...keyBase,
            background: k.modifier && k.active ? `${S.primary}20` : S.surface2,
            borderColor: k.modifier && k.active ? S.primary : S.border,
            color: k.modifier && k.active ? S.primary : S.text2,
          }}
        >
          {k.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Keyboard mode toggle */}
      <button
        type="button"
        onClick={() => onKeyboardModeChange(nextMode)}
        style={{
          ...keyBase,
          display: 'flex', alignItems: 'center', gap: 4,
          color: keyboardMode === 'physical' ? '#60a5fa' : keyboardMode === 'system' ? S.success : S.primary,
          borderColor: keyboardMode === 'physical' ? '#60a5fa33' : keyboardMode === 'system' ? `${S.success}33` : `${S.primary}33`,
          background: 'transparent',
          padding: '0 8px',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="8" x2="6" y2="8" strokeWidth="3" />
          <line x1="10" y1="8" x2="10" y2="8" strokeWidth="3" />
          <line x1="14" y1="8" x2="14" y2="8" strokeWidth="3" />
          <line x1="18" y1="8" x2="18" y2="8" strokeWidth="3" />
          <line x1="8" y1="12" x2="16" y2="12" strokeWidth="3" />
        </svg>
        {modeLabel}
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function TerminalView({
  session,
  wsClient,
  messageBus,
  getSessionOutput,
  onBack,
  onOpenSettings,
  onRenameSession,
  skin,
  perKeyColors,
  keyboardMode,
  onKeyboardModeChange,
  latencyMs,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { terminal, write, getDimensions, captureScreen, scrollToBottom } = useTerminal(containerRef);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Replay history then subscribe to new output
  useEffect(() => {
    if (!terminal) return;
    const history = getSessionOutput(session.id);
    for (const chunk of history) write(chunk);
    const unsubscribe = messageBus.subscribe((msg) => {
      if ((msg.type === 'stdout' || msg.type === 'stderr') && msg.sessionId === session.id) {
        write(msg.data);
      }
    });
    return unsubscribe;
  }, [terminal, messageBus, session.id, write, getSessionOutput]);

  // Wire resize and input
  useEffect(() => {
    if (!terminal || !wsClient) return;

    const onResizeDisposable = terminal.onResize((size: { cols: number; rows: number }) => {
      wsClient.send({ type: 'resize', sessionId: session.id, cols: size.cols, rows: size.rows });
    });

    const onDataDisposable = terminal.onData((data) => {
      scrollToBottom();
      wsClient.send({ type: 'stdin', sessionId: session.id, data });
    });

    const current = getDimensions();
    if (current) {
      wsClient.send({ type: 'resize', sessionId: session.id, cols: current.cols, rows: current.rows });
    }

    return () => {
      onResizeDisposable.dispose();
      onDataDisposable.dispose();
    };
  }, [terminal, wsClient, session.id, getDimensions, scrollToBottom]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.name) onRenameSession(session.id, trimmed);
    setRenaming(false);
  }, [renameValue, session.name, session.id, onRenameSession]);

  const cancelRename = useCallback(() => setRenaming(false), []);

  const handleKey = useCallback((data: string) => {
    if (renaming) {
      if (data === '\r') { commitRename(); return; }
      if (data === '\x1b') { cancelRename(); return; }
      if (data === '\x7f') { setRenameValue((v) => v.slice(0, -1)); return; }
      if (data.length === 1 && data.charCodeAt(0) >= 32) { setRenameValue((v) => v + data); return; }
      return;
    }
    scrollToBottom();
    wsClient?.send({ type: 'stdin', sessionId: session.id, data });
  }, [renaming, commitRename, cancelRename, wsClient, session.id, scrollToBottom]);

  const handleBack = useCallback(() => onBack(captureScreen()), [onBack, captureScreen]);

  const handleCopyScreen = useCallback(() => {
    const content = captureScreen();
    if (content) void navigator.clipboard.writeText(content.replace(/<[^>]+>/g, ''));
  }, [captureScreen]);

  const handlePaste = useCallback(() => {
    void navigator.clipboard.readText().then((text) => {
      if (text) wsClient?.send({ type: 'stdin', sessionId: session.id, data: text });
    });
  }, [wsClient, session.id]);

  const handleSend = useCallback((data: string) => {
    wsClient?.send({ type: 'stdin', sessionId: session.id, data });
  }, [wsClient, session.id]);

  const displayName = renaming ? renameValue : session.name;

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, overflow: 'hidden' }}
      data-skin={skin}
    >
      <CompactHeader
        sessionName={displayName}
        latencyMs={latencyMs}
        onBack={handleBack}
        onOpenSettings={onOpenSettings}
        onCopyScreen={handleCopyScreen}
      />

      {/* xterm.js terminal */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />

      {/* Bottom: action bar + key strip + optional keyboard */}
      <ActionBar onSend={handleSend} onPaste={handlePaste} />

      {keyboardMode !== 'physical' && (
        <KeyStrip
          onKey={handleKey}
          keyboardMode={keyboardMode}
          onKeyboardModeChange={onKeyboardModeChange}
        />
      )}

      {keyboardMode === 'physical' && (
        <div style={{
          height: 38, display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 5,
          background: S.surface, borderTop: `1px solid ${S.border}`,
          flexShrink: 0,
        }}>
          {/* Minimal strip for physical keyboard mode */}
          {[
            { label: 'ESC', data: '\x1b' },
            { label: 'TAB', data: '\t' },
            { label: '↑', data: '\x1b[A' },
            { label: '↓', data: '\x1b[B' },
          ].map((k) => (
            <button
              key={k.label}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleSend(k.data); }}
              style={{
                height: 24, minWidth: 36, padding: '0 8px', borderRadius: 5,
                border: `1px solid ${S.border}`, background: S.surface2,
                color: S.text3, fontSize: 9, fontWeight: 600,
                cursor: 'pointer', touchAction: 'manipulation',
                fontFamily: "'Geist Mono', monospace",
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {k.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => onKeyboardModeChange('custom')}
            style={{
              height: 24, padding: '0 8px', borderRadius: 5,
              border: `1px solid ${S.primary}44`, background: 'transparent',
              color: S.primary, fontSize: 9, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Geist Mono', monospace",
            }}
          >
            Virtual
          </button>
        </div>
      )}

      {keyboardMode === 'custom' && (
        skin === 'ios-terminal' ? (
          <IOSKeyboard onKey={handleKey} skin={skin} perKeyColors={perKeyColors} />
        ) : (
          <MacBookKeyboard onKey={handleKey} skin={skin} perKeyColors={perKeyColors} />
        )
      )}
    </div>
  );
}
