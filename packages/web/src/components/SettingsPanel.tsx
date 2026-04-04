import { useState, useCallback } from 'react';

interface SettingsPanelProps {
  onClose: () => void;
  onOpenSkinStudio: () => void;
  sessionCount: number;
}

/** Inline SVG icons (Lucide-style, no emojis) */
const IconPalette = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#d97757" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="#d97757"/><circle cx="17.5" cy="10.5" r=".5" fill="#d97757"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="#d97757"/><circle cx="6.5" cy="12" r=".5" fill="#d97757"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z"/>
  </svg>
);
const IconLink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#6a9bcc" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#788c5d" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export function SettingsPanel({ onClose, onOpenSkinStudio, sessionCount }: SettingsPanelProps) {
  const [showShareQR, setShowShareQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const commands = [
    { label: 'Keyboard Skins', desc: 'Customize your keyboard look', icon: <IconPalette />, action: () => { onClose(); onOpenSkinStudio(); } },
    { label: 'Share Access', desc: 'Copy URL for another device', icon: <IconLink />, action: () => setShowShareQR(true) },
    { label: 'Screenshot Tip', desc: 'Power + Volume Up to capture', icon: <IconCamera />, action: () => {} },
  ];

  const cardStyle = {
    background: '#282725',
    border: '1px solid #3a3835',
    borderRadius: 10,
    padding: '8px 12px',
    textAlign: 'center' as const,
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#1e1d1b',
          borderTop: '1px solid #3a3835',
          borderRadius: '16px 16px 0 0',
          padding: '16px 16px 32px',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center" style={{ marginBottom: 12 }}>
          <div style={{ width: 36, height: 4, background: '#4a4845', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#d97757', letterSpacing: 1 }}>
            SETTINGS
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#78756f', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#d97757' }}>{sessionCount}</div>
            <div style={{ fontSize: 9, color: '#78756f', marginTop: 2, letterSpacing: 1 }}>SESSIONS</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, background: '#788c5d', borderRadius: '50%', display: 'inline-block' }} />
            </div>
            <div style={{ fontSize: 9, color: '#78756f', marginTop: 2, letterSpacing: 1 }}>CONNECTED</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e6dc' }}>v0.1</div>
            <div style={{ fontSize: 9, color: '#78756f', marginTop: 2, letterSpacing: 1 }}>VERSION</div>
          </div>
        </div>

        {/* Commands */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {commands.map((cmd) => (
            <button
              key={cmd.label}
              type="button"
              onClick={cmd.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 12px', minHeight: 44,
                background: '#282725', border: '1px solid #3a3835',
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                touchAction: 'manipulation',
              }}
            >
              {cmd.icon}
              <div>
                <div style={{ fontSize: 13, color: '#faf9f5', fontWeight: 600 }}>{cmd.label}</div>
                <div style={{ fontSize: 10, color: '#78756f', marginTop: 1 }}>{cmd.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Share QR overlay */}
        {showShareQR && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}
            onClick={() => setShowShareQR(false)}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e1d1b', border: '1px solid #3a3835', borderRadius: 14, padding: 24, textAlign: 'center', maxWidth: 300 }}>
              <div style={{ fontSize: 12, color: '#e8e6dc', marginBottom: 12 }}>Share this URL to connect:</div>
              <div style={{ background: '#141413', border: '1px solid #3a3835', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#d97757', wordBreak: 'break-all', marginBottom: 12, fontFamily: "'Fira Code', monospace" }}>
                {window.location.href}
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                style={{
                  background: copied ? 'rgba(120,140,93,0.15)' : 'rgba(217,119,87,0.12)',
                  border: `1px solid ${copied ? '#788c5d' : '#d97757'}`,
                  borderRadius: 8, color: copied ? '#788c5d' : '#d97757',
                  fontSize: 12, fontFamily: "'Fira Code', monospace",
                  padding: '8px 20px', cursor: 'pointer', width: '100%', minHeight: 44,
                }}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src="/termora-logo.svg" alt="termora" style={{ width: 20, height: 20, opacity: 0.5 }} />
          <span style={{ fontSize: 9, color: '#4a4845' }}>
            termora v0.1.0 — your machine, in your hands
          </span>
        </div>
      </div>
    </div>
  );
}
