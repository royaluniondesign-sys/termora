import { useState, useCallback } from 'react';
import { useConnectionInfo } from '../hooks/useConnectionInfo';

interface SettingsPanelProps {
  onClose: () => void;
  onOpenSkinStudio: () => void;
  sessionCount: number;
}

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#141413',
  surface: '#1e1d1b',
  surface2: '#282725',
  surface3: '#33312f',
  border: '#3a3835',
  borderLight: '#4a4845',
  orange: '#d97757',
  orangeDim: 'rgba(217,119,87,0.12)',
  green: '#788c5d',
  greenDim: 'rgba(120,140,93,0.12)',
  blue: '#6a9bcc',
  blueDim: 'rgba(106,155,204,0.12)',
  text1: '#faf9f5',
  text2: '#b0aea5',
  text3: '#78756f',
} as const;

// ── Icon primitives ──────────────────────────────────────────────────────────
function Ico({ d, color = C.text2, size = 16, strokeWidth = 2 }: { d: string; color?: string; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.text3, textTransform: 'uppercase', marginBottom: 6, marginTop: 16, paddingLeft: 2 }}>
      {label}
    </div>
  );
}

// ── Tunnel method badge ──────────────────────────────────────────────────────
function TunnelBadge({ method }: { method: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ngrok: { label: 'ngrok — permanent URL', color: C.green, bg: C.greenDim },
    ssh: { label: 'SSH tunnel — remote', color: C.blue, bg: C.blueDim },
    local: { label: 'Local Wi-Fi only', color: '#d4a844', bg: 'rgba(212,168,68,0.12)' },
  };
  const m = method ? map[method] : null;
  if (!m) return <span style={{ fontSize: 11, color: C.text3 }}>Detecting...</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, color: m.color,
      background: m.bg, padding: '3px 9px', borderRadius: 6,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ── Copy button with feedback ────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [text]);
  return (
    <button
      type="button"
      onClick={doCopy}
      style={{
        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', touchAction: 'manipulation', whiteSpace: 'nowrap',
        border: `1px solid ${copied ? C.green : C.orange}`,
        background: copied ? C.greenDim : C.orangeDim,
        color: copied ? C.green : C.orange,
        transition: 'all 180ms ease-out', minHeight: 32,
      }}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Connection section ───────────────────────────────────────────────────────
function ConnectionSection() {
  const { info, refresh } = useConnectionInfo();
  const [showNgrokGuide, setShowNgrokGuide] = useState(false);

  const needsNgrok = info.tunnelMethod === 'ssh' || info.tunnelMethod === 'local' || info.tunnelMethod === null;

  return (
    <div>
      {/* Machine + mode */}
      <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Ico d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" color={C.orange} size={15} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>
              {info.machineName ?? 'This machine'}
            </span>
          </div>
          <button
            type="button"
            onClick={refresh}
            title="Refresh connection info"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4, display: 'flex' }}
          >
            <Ico d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" color={C.text3} size={13} />
          </button>
        </div>
        <TunnelBadge method={info.tunnelMethod} />
      </div>

      {/* Auth URL — the one-click link to share with any device */}
      {info.authUrl ? (
        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '11px 14px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            One-click access URL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              flex: 1, fontFamily: "'Fira Code', monospace", fontSize: 10,
              color: C.orange, background: C.bg, padding: '6px 8px',
              borderRadius: 6, border: `1px solid ${C.border}`,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {info.authUrl}
            </code>
            <CopyButton text={info.authUrl} label="Copy link" />
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 6 }}>
            Open on any device to connect instantly — token embedded, no scanning needed.
          </div>
        </div>
      ) : (
        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '11px 14px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 11, color: C.text3 }}>
            Tunnel starting... run <code style={{ color: C.orange, fontFamily: 'monospace' }}>npm run dev</code> on your Mac.
          </div>
        </div>
      )}

      {/* Base URL (without token) */}
      {info.tunnelUrl && (
        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '11px 14px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Base URL (no token)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              flex: 1, fontFamily: "'Fira Code', monospace", fontSize: 10,
              color: C.blue, background: C.bg, padding: '6px 8px',
              borderRadius: 6, border: `1px solid ${C.border}`,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {info.tunnelUrl}
            </code>
            <CopyButton text={info.tunnelUrl} label="Copy" />
          </div>
        </div>
      )}

      {/* Ngrok upgrade prompt for SSH/local modes */}
      {needsNgrok && (
        <div style={{
          background: 'rgba(212,168,68,0.06)', border: '1px solid rgba(212,168,68,0.2)',
          borderRadius: 10, padding: '11px 14px', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d4a844' }}>
              {info.tunnelMethod === 'local' ? 'Local Wi-Fi — phone must be nearby' : 'SSH tunnel — URL changes on restart'}
            </span>
            <button
              type="button"
              onClick={() => setShowNgrokGuide((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d4a844', fontSize: 11, fontWeight: 600, padding: 0 }}
            >
              {showNgrokGuide ? 'Hide' : 'Go permanent →'}
            </button>
          </div>
          {showNgrokGuide && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>
                ngrok gives you a <strong style={{ color: C.text1 }}>permanent HTTPS URL</strong> that works from anywhere, survives restarts, and is perfect for a home screen PWA.
              </div>
              {[
                { n: 1, cmd: 'brew install ngrok', desc: 'Install ngrok via Homebrew' },
                { n: 2, cmd: 'ngrok config add-authtoken TOKEN', desc: 'Free account at ngrok.com → Your Authtoken' },
                { n: 3, cmd: 'ngrok config add-authtoken TOKEN && ngrok domain new', desc: '' },
              ].slice(0, 2).map((step) => (
                <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.orangeDim, border: `1px solid ${C.orange}`, color: C.orange, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{step.n}</span>
                  <div>
                    <code style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: C.orange, background: C.bg, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.border}` }}>
                      {step.cmd}
                    </code>
                    {step.desc && <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{step.desc}</div>}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <a href="https://ngrok.com/signup" target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 36, borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: 'rgba(212,168,68,0.12)', border: '1px solid rgba(212,168,68,0.3)',
                  color: '#d4a844', textDecoration: 'none', gap: 5,
                }}>
                  <Ico d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" color="#d4a844" size={12} />
                  Get free account
                </a>
                {info.authUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.text3 }}>
                    Then add to .env:
                    <CopyButton text={'NGROK_AUTHTOKEN=your_token\nNGROK_STATIC_DOMAIN=your-name.ngrok-free.app'} label="Copy .env" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Multi-machine section ────────────────────────────────────────────────────
function MultiMachineSection() {
  const [copied, setCopied] = useState(false);
  const setupCmd = 'git clone https://github.com/royaluniondesign-sys/termora.git && cd termora && npm install && npm run dev';

  const doCopy = useCallback(() => {
    navigator.clipboard.writeText(setupCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [setupCmd]);

  return (
    <div>
      <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      }}>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>
          Each machine runs its own termora agent. Connect from any device — browser, phone, tablet — by opening that machine&apos;s URL.
        </div>

        {/* Steps */}
        {[
          {
            n: 1,
            title: 'Install termora on the other machine',
            content: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <code style={{ flex: 1, fontFamily: "'Fira Code', monospace", fontSize: 10, color: C.orange, background: C.bg, padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}>
                  {setupCmd.split('&&')[0].trim()}
                </code>
                <button type="button" onClick={doCopy} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${copied ? C.green : C.orange}`, background: copied ? C.greenDim : C.orangeDim, color: copied ? C.green : C.orange, transition: 'all 180ms ease-out', whiteSpace: 'nowrap', minHeight: 30 }}>
                  {copied ? 'Copied!' : 'Copy all'}
                </button>
              </div>
            ),
          },
          {
            n: 2,
            title: 'Start the agent',
            content: <code style={{ display: 'block', marginTop: 6, fontFamily: "'Fira Code', monospace", fontSize: 10, color: C.green, background: C.bg, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}` }}>npm run dev</code>,
          },
          {
            n: 3,
            title: 'Scan QR or open the URL shown in that terminal',
            content: <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>Each machine gets its own URL. Bookmark or add both to your home screen.</div>,
          },
        ].map((step) => (
          <div key={step.n} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.orangeDim, border: `1px solid ${C.orange}`, color: C.orange, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{step.n}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{step.title}</div>
              {step.content}
            </div>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 10, color: C.text3, lineHeight: 1.6 }}>
          Tip: use ngrok static domains so each machine has a memorable, permanent URL — e.g. <code style={{ color: C.orange, fontFamily: 'monospace' }}>mac-mini.ngrok-free.app</code> and <code style={{ color: C.orange, fontFamily: 'monospace' }}>macbook.ngrok-free.app</code>.
        </div>
      </div>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────
type Tab = 'connection' | 'machines' | 'customize';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'connection', label: 'Connection', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { id: 'machines', label: 'Machines', icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' },
  { id: 'customize', label: 'Skins', icon: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.83-.67-1.5-1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z' },
];

// ── Main component ───────────────────────────────────────────────────────────
export function SettingsPanel({ onClose, onOpenSkinStudio, sessionCount }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('connection');

  return (
    <div
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: C.surface, borderTop: `1px solid ${C.border}`,
          borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: C.borderLight, borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 8px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>Settings</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''} active
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 6, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ico d="M18 6 6 18M6 6l12 12" color={C.text3} size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, padding: '0 12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'customize') {
                  onClose();
                  onOpenSkinStudio();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              style={{
                flex: 1, padding: '7px 4px', minHeight: 40, borderRadius: 8,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: activeTab === tab.id && tab.id !== 'customize' ? C.orangeDim : 'transparent',
                color: activeTab === tab.id && tab.id !== 'customize' ? C.orange : C.text3,
                fontSize: 11, fontWeight: 600, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, touchAction: 'manipulation',
                transition: 'all 180ms ease-out',
              }}
            >
              <Ico
                d={tab.icon}
                color={activeTab === tab.id && tab.id !== 'customize' ? C.orange : C.text3}
                size={15}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 32px' }}>
          {activeTab === 'connection' && (
            <>
              <SectionLabel label="Tunnel & Access" />
              <ConnectionSection />
              <SectionLabel label="How to stop" />
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px' }}>
                <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.6 }}>
                  Press <code style={{ color: C.orange, fontFamily: 'monospace', background: C.bg, padding: '1px 5px', borderRadius: 3, border: `1px solid ${C.border}` }}>Ctrl+C</code> in the terminal running <code style={{ color: C.green, fontFamily: 'monospace' }}>npm run dev</code> to stop the agent. Sessions are preserved in tmux and will resume on restart.
                </div>
              </div>
            </>
          )}

          {activeTab === 'machines' && (
            <>
              <SectionLabel label="Connect another machine" />
              <MultiMachineSection />
              <SectionLabel label="How it works" />
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px' }}>
                <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: C.text3, lineHeight: 1.8 }}>
                  <div><span style={{ color: C.blue }}>phone</span> → <span style={{ color: C.orange }}>ngrok/SSH</span> → <span style={{ color: C.green }}>termora agent</span> → <span style={{ color: C.text1 }}>PTY</span></div>
                  <div style={{ marginTop: 4 }}>Each machine = independent agent + URL.</div>
                  <div>Switch between machines by opening different URLs.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
