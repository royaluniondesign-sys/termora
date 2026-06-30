import { useState, useCallback } from 'react';
import type { Session } from '../lib/types';

const S = {
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
  bg: '#09090b',
} as const;

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
}

function statusBadgeConfig(status: Session['status']) {
  return status === 'run'
    ? { bg: `${S.success}20`, color: S.success, label: 'LIVE' }
    : { bg: `${S.text3}20`, color: S.text3, label: 'IDLE' };
}

export function SessionCard({ session, isActive, onSelect, onClose }: SessionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const badge = statusBadgeConfig(session.status);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(true);
  }, []);

  const handleConfirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(session.id);
    setConfirmDelete(false);
  }, [onClose, session.id]);

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  }, []);

  return (
    <button
      type="button"
      onClick={() => onSelect(session.id)}
      className="relative w-full text-left"
      style={{
        aspectRatio: '1 / 1.18',
        background: isActive
          ? `linear-gradient(135deg, ${S.primary}08, ${S.surface2})`
          : S.surface2,
        borderRadius: 10,
        border: isActive ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
        boxShadow: isActive ? `0 0 0 1px ${S.primary}33` : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 180ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px',
        height: 28, flexShrink: 0, borderBottom: `1px solid ${S.border}`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
        <span style={{
          fontSize: 9, color: S.text3,
          fontFamily: "'Geist Mono', monospace",
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {session.name}
        </span>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
          background: badge.bg, color: badge.color,
          border: `1px solid ${badge.color}44`,
          padding: '1px 5px', borderRadius: 4, flexShrink: 0,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Preview body */}
      <div style={{
        position: 'relative', flex: 1, overflow: 'hidden',
        padding: '6px 10px 4px', minHeight: 0, background: S.bg,
      }}>
        <pre
          dangerouslySetInnerHTML={{
            __html: session.snapshot || `<span style="color:${S.primary}">$ </span><span style="color:${S.text3}">_</span>`,
          }}
          style={{
            fontSize: 7.5, lineHeight: 1.4,
            fontFamily: "'Geist Mono', monospace",
            color: S.text2, whiteSpace: 'pre', margin: 0, overflow: 'hidden',
          }}
        />
        {/* Fade */}
        <div style={{
          position: 'absolute', inset: '0 0 0 0', top: 'auto',
          height: 22, pointerEvents: 'none',
          background: `linear-gradient(transparent, ${S.bg})`,
        }} />
      </div>

      {/* Delete button */}
      <div
        onClick={handleDeleteClick}
        style={{
          position: 'absolute', bottom: 6, right: 6,
          width: 16, height: 16,
          background: `${S.error}20`, border: `1px solid ${S.error}55`,
          borderRadius: 4, fontSize: 9, color: S.error,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        ✕
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(9,9,11,0.93)', borderRadius: 10, zIndex: 10,
            gap: 10,
          }}
        >
          <span style={{
            fontSize: 10, color: S.text2, fontFamily: "'Geist Mono', monospace",
            textAlign: 'center', padding: '0 12px',
          }}>
            Close <span style={{ color: S.primary }}>{session.name}</span>?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleConfirmDelete} style={{
              background: `${S.error}20`, border: `1px solid ${S.error}`,
              borderRadius: 5, color: S.error, fontSize: 10,
              fontFamily: 'inherit', padding: '5px 12px', cursor: 'pointer',
            }}>
              Close
            </button>
            <button type="button" onClick={handleCancelDelete} style={{
              background: S.surface3, border: `1px solid ${S.border}`,
              borderRadius: 5, color: S.text2, fontSize: 10,
              fontFamily: 'inherit', padding: '5px 12px', cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </button>
  );
}
