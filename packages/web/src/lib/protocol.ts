/**
 * Shared WebSocket message type definitions for termora client-server protocol.
 */

export type ClientMessage =
  | { type: 'stdin'; sessionId: string; data: string }
  | { type: 'resize'; sessionId: string; cols: number; rows: number }
  | { type: 'session_create'; shell: 'zsh' | 'tmux' | 'claude' }
  | { type: 'session_close'; sessionId: string }
  | { type: 'session_rename'; sessionId: string; name: string }
  | { type: 'session_subscribe'; sessionId: string }
  | { type: 'session_list' }
  | { type: 'ping' }
  | { type: 'worktree_fanout'; sessionId: string; prompt: string; agentCommand: string; count: number }
  | { type: 'worktree_cleanup'; sessionId: string };

export type ServerMessage =
  | { type: 'stdout'; sessionId: string; data: string }
  | { type: 'stderr'; sessionId: string; data: string }
  | { type: 'exit'; sessionId: string; exitCode: number; signal?: number }
  | { type: 'session'; sessionId: string; shell: string; pid: number; name: string; cwd: string; status: 'run' | 'idle' }
  | {
      type: 'session_list';
      sessions: Array<{ id: string; shell: string; pid: number; name: string; cwd: string; status: 'run' | 'idle' }>;
    }
  | { type: 'session_update'; sessionId: string; name: string; cwd: string; status: 'run' | 'idle' }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: 'worktree_fanout_started'; count: number; branches: string[] }
  | { type: 'worktree_cleanup_done'; removed: number };
