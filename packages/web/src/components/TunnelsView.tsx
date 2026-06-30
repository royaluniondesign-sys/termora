import { useState, useEffect, useCallback } from 'react';
import type { TerminalWSClient, ConnectionStatus } from '../lib/ws-client';

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

interface TunnelInfo {
  id: string;
  type: 'ngrok' | 'ssh' | 'localtunnel';
  status: 'live' | 'connecting' | 'closed';
  localPort: number;
  publicUrl: string;
  label: string;
  os?: string;
  bytesForwarded?: number;
}

interface TunnelsViewProps {
  wsClient: TerminalWSClient | null;
  connectionStatus: ConnectionStatus;
}

function StatusBadge({ status }: { status: TunnelInfo['status'] }) {
  const cfg = {
    live: { color: S.success, bg: `${S.success}12`, label: 'LIVE' },
    connecting: { color: S.warning, bg: `${S.warning}12`, label: 'CONNECTING' },
    closed: { color: S.text3, bg: `${S.text3}10`, label: 'CLOSED' },
  }[status];

  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      padding: '2px 7px', borderRadius: 5,
      animation: status === 'connecting' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
    }}>
      {cfg.label}
    </span>
  );
}

function TunnelCard({ tunnel, onCopyUrl, onReconnect }: {
  tunnel: TunnelInfo;
  onCopyUrl: (url: string) => void;
  onReconnect: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tunnel.publicUrl);
      setCopied(true);
      onCopyUrl(tunnel.publicUrl);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard denied */ }
  }, [tunnel.publicUrl, onCopyUrl]);

  const isLive = tunnel.status === 'live';
  const typeIconPath = {
    ngrok: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ssh: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    localtunnel: 'M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5',
  }[tunnel.type];

  const bytesLabel = tunnel.bytesForwarded == null ? null
    : tunnel.bytesForwarded > 1024 * 1024 ? `${(tunnel.bytesForwarded / 1024 / 1024).toFixed(1)} MB`
    : tunnel.bytesForwarded > 1024 ? `${(tunnel.bytesForwarded / 1024).toFixed(0)} KB`
    : `${tunnel.bytesForwarded} B`;

  const btnBase: React.CSSProperties = {
    flex: 1, height: 30, borderRadius: 6, fontFamily: 'inherit',
    fontSize: 10, fontWeight: 600, cursor: isLive ? 'pointer' : 'default',
    touchAction: 'manipulation', transition: 'all 120ms ease-out',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  };

  return (
    <div style={{
      background: S.surface2,
      border: `1px solid ${isLive ? `${S.primary}33` : S.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: isLive ? `${S.primary}14` : S.surface3,
          border: `1px solid ${isLive ? `${S.primary}30` : S.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" stroke={isLive ? S.primary : S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={typeIconPath} />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, letterSpacing: -0.2 }}>
            {tunnel.label}
          </div>
          <div style={{ fontSize: 9, color: S.text3, marginTop: 1 }}>
            {tunnel.type.toUpperCase()}{tunnel.os ? ` — ${tunnel.os}` : ''}
          </div>
        </div>

        <StatusBadge status={tunnel.status} />
      </div>

      {/* Detail rows */}
      <div style={{ padding: '0 12px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { key: 'Type', value: tunnel.type },
          { key: 'Local', value: `localhost:${tunnel.localPort}` },
          { key: 'Public', value: tunnel.publicUrl || '—', mono: true, accent: isLive },
        ].map((row) => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: S.text3, width: 36, flexShrink: 0 }}>{row.key}</span>
            <span style={{
              fontSize: 9, color: row.accent ? S.primary : S.text2,
              fontFamily: row.mono ? "'Geist Mono', monospace" : 'inherit',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {row.value}
            </span>
            {bytesLabel && row.key === 'Public' && (
              <span style={{ fontSize: 8, color: S.text3, flexShrink: 0 }}>↑{bytesLabel}</span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px' }}>
        {isLive ? (
          <>
            {/* QR placeholder */}
            <button type="button" style={{
              ...btnBase,
              border: `1px solid ${S.border}`, background: 'transparent',
              color: S.text2, flex: '0 0 auto', padding: '0 12px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
              </svg>
              QR
            </button>
            {/* Copy URL */}
            <button
              type="button"
              onClick={handleCopy}
              style={{
                ...btnBase,
                border: `1px solid ${copied ? S.success : S.border}`,
                background: copied ? `${S.success}12` : 'transparent',
                color: copied ? S.success : S.text2,
              }}
            >
              {copied ? (
                <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onReconnect(tunnel.id)}
            style={{
              ...btnBase,
              border: `1px solid ${S.primary}44`,
              background: `${S.primary}10`,
              color: S.primary,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Reconnect Tunnel
          </button>
        )}
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
        setTunnels([
          {
            id: 'ngrok-main',
            type: 'ngrok',
            status: 'live',
            localPort: 4031,
            publicUrl: 'https://termora.ngrok.app',
            label: 'MacBook Main',
            os: 'macOS 14',
            bytesForwarded: 2.3 * 1024 * 1024,
          },
          {
            id: 'db-gateway',
            type: 'ssh',
            status: 'closed',
            localPort: 5432,
            publicUrl: '',
            label: 'DB Gateway',
            os: 'Ubuntu 22',
          },
        ]);
      } else {
        setTunnels([]);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [connectionStatus, wsClient]);

  const handleCopyUrl = useCallback((url: string) => {
    console.log('Copied:', url);
  }, []);

  const handleReconnect = useCallback((id: string) => {
    console.log('Reconnect tunnel:', id);
  }, []);

  const liveTunnels = tunnels.filter((t) => t.status === 'live');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${S.border}`,
        background: S.surface,
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Tunnels</h2>
        <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
          {connectionStatus === 'connected'
            ? `${liveTunnels.length} active, ${tunnels.length - liveTunnels.length} offline`
            : 'Connect to agent to view tunnels'}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Stats row */}
        {connectionStatus === 'connected' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'UPTIME', value: '99.9%', color: S.success },
              { label: 'LIVE', value: liveTunnels.length.toString(), color: S.primary },
              { label: 'FORWARDED', value: '2.3 MB', color: S.text2 },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: S.surface2, border: `1px solid ${S.border}`,
                borderRadius: 9, padding: '8px 10px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: stat.color, letterSpacing: -0.5, fontFamily: "'Geist Mono', monospace" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 8, color: S.text3, marginTop: 2, letterSpacing: 0.6 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                height: 120, background: S.surface2,
                border: `1px solid ${S.border}`, borderRadius: 10,
                opacity: 0.4,
              }} />
            ))}
          </div>
        ) : tunnels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <p style={{ fontSize: 12, color: S.text3, margin: 0 }}>
              {connectionStatus !== 'connected' ? 'Connect to agent to view tunnels' : 'No tunnels configured'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tunnels.map((t) => (
              <TunnelCard
                key={t.id}
                tunnel={t}
                onCopyUrl={handleCopyUrl}
                onReconnect={handleReconnect}
              />
            ))}
          </div>
        )}

        {/* Global status footer */}
        {tunnels.length > 0 && (
          <div style={{
            marginTop: 14, padding: '10px 12px',
            background: S.surface2, border: `1px solid ${S.border}`,
            borderRadius: 9,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.text3, letterSpacing: 0.8, marginBottom: 5 }}>
              GLOBAL STATUS
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.success }}>99.9%</div>
                <div style={{ fontSize: 8, color: S.text3, marginTop: 1 }}>Uptime today</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.text1, fontFamily: "'Geist Mono', monospace" }}>1.2 GB</div>
                <div style={{ fontSize: 8, color: S.text3, marginTop: 1 }}>Total forwarded</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.primary }}>{tunnels.length}</div>
                <div style={{ fontSize: 8, color: S.text3, marginTop: 1 }}>Configured</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
