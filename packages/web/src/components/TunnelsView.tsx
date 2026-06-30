import { useState, useEffect, useCallback } from 'react';
import type { TerminalWSClient, ConnectionStatus } from '../lib/ws-client';

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

interface TunnelInfo {
  id: string;
  type: 'ngrok' | 'ssh' | 'localtunnel';
  status: 'live' | 'connecting' | 'closed';
  localPort: number;
  publicUrl: string;
  label: string;
  bytesForwarded?: number;
}

interface TunnelsViewProps {
  wsClient: TerminalWSClient | null;
  connectionStatus: ConnectionStatus;
}

function StatusBadge({ status }: { status: TunnelInfo['status'] }) {
  const cfg = {
    live: { color: S.success, bg: 'rgba(52,211,153,0.1)', label: 'LIVE' },
    connecting: { color: S.warning, bg: 'rgba(251,191,36,0.1)', label: 'CONNECTING' },
    closed: { color: S.text3, bg: 'rgba(113,113,122,0.1)', label: 'CLOSED' },
  }[status];

  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      padding: '2px 7px', borderRadius: 5,
    }}>
      {cfg.label}
    </span>
  );
}

function TunnelCard({ tunnel, onCopyUrl }: { tunnel: TunnelInfo; onCopyUrl: (url: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tunnel.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopyUrl(tunnel.publicUrl);
    } catch {}
  }, [tunnel.publicUrl, onCopyUrl]);

  const typeIcon = {
    ngrok: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ssh: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    localtunnel: 'M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5',
  }[tunnel.type];

  const bytes = tunnel.bytesForwarded;
  const bytesLabel = bytes === undefined ? null
    : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : bytes > 1024 ? `${(bytes / 1024).toFixed(0)} KB`
    : `${bytes} B`;

  return (
    <div style={{
      background: S.surface2,
      border: `1px solid ${tunnel.status === 'live' ? `${S.primary}33` : S.border}`,
      borderRadius: 12,
      padding: 14,
      animation: 'fade-in-up 250ms ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: tunnel.status === 'live' ? `${S.primary}15` : S.surface3,
            border: `1px solid ${tunnel.status === 'live' ? `${S.primary}33` : S.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" stroke={tunnel.status === 'live' ? S.primary : S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={typeIcon} />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: S.text1 }}>{tunnel.label}</div>
            <div style={{ fontSize: 10, color: S.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{tunnel.type}</div>
          </div>
        </div>
        <StatusBadge status={tunnel.status} />
      </div>

      {/* URL */}
      <div style={{
        background: S.surface3,
        border: `1px solid ${S.border}`,
        borderRadius: 7,
        padding: '7px 10px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflow: 'hidden',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <code style={{
          fontSize: 10, color: tunnel.status === 'live' ? S.primary : S.text3,
          fontFamily: "'Geist Mono', monospace",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {tunnel.publicUrl || '—'}
        </code>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9, color: S.text3, background: S.surface3,
          border: `1px solid ${S.border}`, borderRadius: 4, padding: '2px 7px',
        }}>
          :{tunnel.localPort}
        </span>
        {bytesLabel && (
          <span style={{
            fontSize: 9, color: S.text3, background: S.surface3,
            border: `1px solid ${S.border}`, borderRadius: 4, padding: '2px 7px',
          }}>
            ↑ {bytesLabel}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 7 }}>
        <button
          type="button"
          onClick={handleCopy}
          disabled={tunnel.status !== 'live'}
          style={{
            flex: 1, minHeight: 36, borderRadius: 7,
            border: `1px solid ${copied ? S.success : S.border}`,
            background: copied ? `${S.success}15` : 'transparent',
            color: copied ? S.success : S.text2,
            fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
            cursor: tunnel.status !== 'live' ? 'not-allowed' : 'pointer',
            opacity: tunnel.status !== 'live' ? 0.5 : 1,
            transition: 'all 150ms ease-out',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy URL'}
        </button>
      </div>
    </div>
  );
}

export function TunnelsView({ wsClient, connectionStatus }: TunnelsViewProps) {
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      if (connectionStatus === 'connected') {
        const mockTunnels: TunnelInfo[] = [
          {
            id: 'ngrok-main',
            type: 'ngrok',
            status: 'live',
            localPort: 4031,
            publicUrl: 'https://termora.ngrok.app',
            label: 'Main Tunnel',
            bytesForwarded: 2.3 * 1024 * 1024,
          },
        ];
        setTunnels(mockTunnels);
      } else {
        setTunnels([]);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [connectionStatus, wsClient]);

  const handleCopyUrl = useCallback((url: string) => {
    console.log('Copied tunnel URL:', url);
  }, []);

  const card = {
    background: S.surface2, border: `1px solid ${S.border}`,
    borderRadius: 10, padding: 14, cursor: 'default' as const,
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px 14px', animation: 'fade-in-up 250ms ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: S.text1, letterSpacing: -0.3, margin: '0 0 4px' }}>
          Tunnel Manager
        </h2>
        <p style={{ fontSize: 11, color: S.text3, margin: 0 }}>
          Active network tunnels exposing your local agent
        </p>
      </div>

      {/* Global health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {[
          { label: 'Uptime', value: connectionStatus === 'connected' ? '99.9%' : '—', color: S.success },
          { label: 'Tunnels', value: tunnels.filter(t => t.status === 'live').length.toString(), color: S.primary },
          { label: 'Data', value: '2.3 MB', color: S.text2 },
        ].map((stat) => (
          <div key={stat.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 9, color: S.text3, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tunnel cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ ...card, height: 140, opacity: 0.4, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : tunnels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: S.text3 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <p style={{ fontSize: 12, margin: 0 }}>
            {connectionStatus !== 'connected' ? 'Connect to the agent to see tunnels' : 'No active tunnels'}
          </p>
          <p style={{ fontSize: 10, margin: '4px 0 0', color: S.text3 }}>
            Tunnels start automatically when the agent runs
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tunnels.map((t) => (
            <TunnelCard key={t.id} tunnel={t} onCopyUrl={handleCopyUrl} />
          ))}
        </div>
      )}

      {/* Info footer */}
      <div style={{ marginTop: 20, padding: '12px', background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: S.primary, marginBottom: 6 }}>How tunnels work</div>
        <p style={{ fontSize: 10, color: S.text3, margin: 0, lineHeight: 1.6 }}>
          Termora creates a secure tunnel from your device to the agent running on your machine.
          The tunnel URL is what you share or open on your phone to access your terminal.
        </p>
      </div>
    </div>
  );
}
