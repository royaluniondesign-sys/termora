import { useState, useRef, useEffect, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { TitleBar } from './TitleBar';
import { ControlStrip } from './ControlStrip';
import { TouchActionsBar } from './TouchActionsBar';
import { ContextStrip } from './ContextStrip';
import { MacBookKeyboard } from './MacBookKeyboard';
import { IOSKeyboard } from './IOSKeyboard';
import type { TerminalViewProps } from '../lib/types';

/**
 * Full-screen terminal view.
 *
 * Layout (top to bottom, 100dvh):
 *   TitleBar (44px) → ControlStrip (38px) → xterm.js (flex:1) → ContextStrip (48px) → Keyboard
 */
export function TerminalView({
  session,
  wsClient,
  messageBus,
  getSessionOutput,
  onBack,
  onRenameSession,
  onOpenSettings,
  skin,
  perKeyColors,
  keyboardMode,
  onKeyboardModeChange,
  latencyMs,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { terminal, write, getDimensions, captureScreen, scrollToBottom } = useTerminal(containerRef, keyboardMode);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [dims, setDims] = useState({ cols: 80, rows: 24 });

  // Replay stored history then subscribe to new output
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

  // Wire resize and input to WebSocket
  useEffect(() => {
    if (!terminal || !wsClient) return;

    const onResizeDisposable = terminal.onResize((size: { cols: number; rows: number }) => {
      setDims({ cols: size.cols, rows: size.rows });
      wsClient.send({ type: 'resize', sessionId: session.id, cols: size.cols, rows: size.rows });
    });

    const onDataDisposable = terminal.onData((data) => {
      scrollToBottom();
      wsClient.send({ type: 'stdin', sessionId: session.id, data });
    });

    const current = getDimensions();
    if (current) {
      setDims({ cols: current.cols, rows: current.rows });
      wsClient.send({ type: 'resize', sessionId: session.id, cols: current.cols, rows: current.rows });
    }

    return () => {
      onResizeDisposable.dispose();
      onDataDisposable.dispose();
    };
  }, [terminal, wsClient, session.id, getDimensions, scrollToBottom]);

  const startRename = useCallback(() => {
    setRenameValue(session.name);
    setRenaming(true);
  }, [session.name]);

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

  const handleTouchAction = useCallback((action: 'select' | 'cut' | 'copy' | 'paste' | 'tab' | 'history') => {
    switch (action) {
      case 'select': terminal?.selectAll(); break;
      case 'copy':
        if (terminal?.hasSelection()) void navigator.clipboard.writeText(terminal.getSelection());
        break;
      case 'cut':
        if (terminal?.hasSelection()) {
          void navigator.clipboard.writeText(terminal.getSelection());
          terminal.clearSelection();
        }
        break;
      case 'paste':
        void navigator.clipboard.readText().then((text) => {
          if (text) wsClient?.send({ type: 'stdin', sessionId: session.id, data: text });
        });
        break;
      case 'tab':
        wsClient?.send({ type: 'stdin', sessionId: session.id, data: '\t' });
        break;
      case 'history':
        wsClient?.send({ type: 'stdin', sessionId: session.id, data: '\x1b[A' });
        break;
    }
  }, [terminal, wsClient, session.id]);

  const handlePaste = useCallback(() => {
    void navigator.clipboard.readText().then((text) => {
      if (text) wsClient?.send({ type: 'stdin', sessionId: session.id, data: text });
    });
  }, [wsClient, session.id]);

  const handleClear = useCallback(() => {
    wsClient?.send({ type: 'stdin', sessionId: session.id, data: '\x0c' }); // Ctrl+L
  }, [wsClient, session.id]);

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#09090b', overflow: 'hidden' }}
      data-skin={skin}
    >
      <TitleBar
        session={session}
        onBack={handleBack}
        onOpenSettings={onOpenSettings}
        editing={renaming}
        editValue={renameValue}
        onEditStart={startRename}
        onEditCommit={commitRename}
        onEditCancel={cancelRename}
      />

      {/* Control strip — latency + dimensions + paste/clear */}
      <ControlStrip
        sessionId={session.id}
        latencyMs={latencyMs ?? null}
        cols={dims.cols}
        rows={dims.rows}
        onPaste={handlePaste}
        onClear={handleClear}
      />

      {/* Terminal area */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />

      <TouchActionsBar onAction={handleTouchAction} keyboardMode={keyboardMode} onKeyboardModeChange={onKeyboardModeChange} />
      {keyboardMode !== 'physical' && <ContextStrip onKey={handleKey} />}
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
