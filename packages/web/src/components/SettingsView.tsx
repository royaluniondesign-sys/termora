import { useState, useCallback } from 'react';
import { useConnectionInfo } from '../hooks/useConnectionInfo';
import { useDevices } from '../hooks/useDevices';
import { formatRelativeTime } from '../lib/format-relative-time';
import type { SkinId, KeyboardMode, PerKeyColors } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

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

interface SettingsViewProps {
  skin: SkinId;
  onSkinChange: (skin: SkinId) => void;
  perKeyColors: PerKeyColors;
  onPerKeyColorChange: (colors: PerKeyColors) => void;
  keyboardMode: KeyboardMode;
  onKeyboardModeChange: (mode: KeyboardMode) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
  authToken: string | null;
}

// ── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.9,
      color: S.text3, textTransform: 'uppercase',
      marginBottom: 7, marginTop: 18, paddingLeft: 1,
    }}>
      {label}
    </div>
  );
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: S.surface2, border: `1px solid ${S.border}`,
      borderRadius: 10, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: value ? S.primary : S.surface3,
        border: `1px solid ${value ? S.primary : S.border}`,
        padding: 0, cursor: 'pointer', position: 'relative',
        transition: 'all 200ms ease-out',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 17 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: S.text1, transition: 'left 200ms ease-out',
      }} />
    </button>
  );
}

// ── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({ label, desc, children, last }: {
  label: string;
  desc?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 12px',
      borderBottom: last ? 'none' : `1px solid ${S.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: S.text1, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 10, color: S.text3, marginTop: 1 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Keyboard mode selector ───────────────────────────────────────────────────

function KeyboardModeSelector({ mode, onChange }: {
  mode: KeyboardMode;
  onChange: (m: KeyboardMode) => void;
}) {
  const modes: { id: KeyboardMode; label: string; desc: string }[] = [
    { id: 'custom', label: 'Virtual', desc: 'Custom keyboard skins' },
    { id: 'system', label: 'Native', desc: 'Device OS keyboard' },
    { id: 'physical', label: 'Hardware', desc: 'External / Bluetooth only' },
  ];

  return (
    <Card style={{ marginBottom: 0 }}>
      {modes.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderBottom: i < modes.length - 1 ? `1px solid ${S.border}` : 'none',
            background: mode === m.id ? `${S.primary}10` : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            transition: 'background 120ms',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${mode === m.id ? S.primary : S.border}`,
            background: mode === m.id ? S.primary : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {mode === m.id && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.bg }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: mode === m.id ? 600 : 400, color: mode === m.id ? S.text1 : S.text2 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 10, color: S.text3, marginTop: 1 }}>{m.desc}</div>
          </div>
        </button>
      ))}
    </Card>
  );
}

// ── Skin gallery ─────────────────────────────────────────────────────────────

const SKINS: { id: SkinId; name: string; subtitle: string; preview: string }[] = [
  { id: 'macbook-silver', name: 'MacBook Silver', subtitle: 'Clean aluminum finish', preview: '#27272a' },
  { id: 'ios-terminal', name: 'iOS Terminal', subtitle: 'Dark glass feel', preview: '#27272a' },
  { id: 'gamer-rgb', name: 'Hyperion Gamer', subtitle: 'RGB rainbow backlit', preview: '#0d001a' },
  { id: 'custom-painted', name: 'Custom Painted', subtitle: 'Violet-accent labels', preview: '#18181b' },
  { id: 'amber-retro', name: 'Retro PTY', subtitle: 'Amber terminal nostalgia', preview: '#09090b' },
  { id: 'ice-white', name: 'Ice White', subtitle: 'Bright, clean keys', preview: '#e4e4e7' },
];

function SkinGallery({ currentSkin, onSkinChange }: {
  currentSkin: SkinId;
  onSkinChange: (s: SkinId) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {SKINS.map((skin) => {
        const active = currentSkin === skin.id;
        return (
          <button
            key={skin.id}
            type="button"
            onClick={() => onSkinChange(skin.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              background: active ? `${S.primary}10` : S.surface2,
              border: `1px solid ${active ? S.primary : S.border}`,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 150ms ease-out',
            }}
          >
            {/* Skin color preview */}
            <div style={{
              width: 36, height: 24, borderRadius: 5, flexShrink: 0,
              background: skin.preview,
              border: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 2,
            }}>
              {['#ef4444', '#fbbf24', '#34d399'].map((c) => (
                <div key={c} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
              ))}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? S.text1 : S.text2, letterSpacing: -0.1 }}>
                {skin.name}
              </div>
              <div style={{ fontSize: 10, color: S.text3 }}>{skin.subtitle}</div>
            </div>

            {active && (
              <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: S.text1, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: S.primary, fontFamily: "'Geist Mono', monospace" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: 4, appearance: 'none',
          background: `linear-gradient(to right, ${S.primary} ${((value - min) / (max - min)) * 100}%, ${S.surface3} ${((value - min) / (max - min)) * 100}%)`,
          borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none',
        }}
      />
    </div>
  );
}

// ── Connection section ───────────────────────────────────────────────────────

function ConnectionSection({ connectionStatus, latencyMs }: {
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
}) {
  const { info, refresh } = useConnectionInfo();
  // Local binding so the narrowing below survives into the copy handler's closure.
  const authUrl = info.authUrl;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }, []);

  const isConnected = connectionStatus === 'connected';
  const statusColor = isConnected ? S.success : connectionStatus === 'reconnecting' ? S.warning : S.error;
  const statusLabel = isConnected ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline';

  return (
    <>
      {/* Status card */}
      <Card>
        <SettingRow label="Agent Status" desc={info.machineName ?? 'This machine'} last>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
            color: statusColor, background: `${statusColor}12`,
            border: `1px solid ${statusColor}30`,
            padding: '2px 8px', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
            {statusLabel}
          </span>
        </SettingRow>
      </Card>

      {/* Auth URL */}
      {authUrl && (
        <Card style={{ marginTop: 8 }}>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: S.text3, letterSpacing: 0.7, marginBottom: 7 }}>
              ONE-CLICK ACCESS URL
            </div>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <code style={{
                flex: 1, fontSize: 10, color: S.primary,
                fontFamily: "'Geist Mono', monospace",
                background: S.bg, padding: '6px 8px', borderRadius: 6,
                border: `1px solid ${S.border}`,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
              }}>
                {authUrl}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(authUrl)}
                style={{
                  height: 30, padding: '0 10px', borderRadius: 6, flexShrink: 0,
                  border: `1px solid ${copied ? S.success : S.primary}`,
                  background: copied ? `${S.success}12` : `${S.primary}12`,
                  color: copied ? S.success : S.primary,
                  fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: S.text3, marginTop: 6, lineHeight: 1.5 }}>
              Open on any device — auth token embedded.
            </div>
          </div>
        </Card>
      )}

      {/* Latency / refresh */}
      <Card style={{ marginTop: 8 }}>
        <SettingRow
          label="Latency"
          desc="WebSocket round-trip time"
          last
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: latencyMs == null ? S.text3 : latencyMs < 30 ? S.success : latencyMs < 100 ? S.warning : S.error,
              fontFamily: "'Geist Mono', monospace",
            }}>
              {latencyMs !== null ? `${latencyMs}ms` : '—'}
            </span>
            <button
              type="button"
              onClick={refresh}
              style={{
                width: 26, height: 26, borderRadius: 5,
                border: `1px solid ${S.border}`, background: 'transparent',
                color: S.text3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </SettingRow>
      </Card>
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

type SettingsSection = 'connection' | 'keyboard' | 'appearance' | 'security';

const SECTION_TABS: { id: SettingsSection; label: string }[] = [
  { id: 'connection', label: 'Connection' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'security', label: 'Security' },
];

export function SettingsView({
  skin,
  onSkinChange,
  keyboardMode,
  onKeyboardModeChange,
  connectionStatus,
  latencyMs,
  authToken,
}: SettingsViewProps) {
  const [section, setSection] = useState<SettingsSection>('connection');
  const [haptic, setHaptic] = useState(70);
  const [repeatDelay, setRepeatDelay] = useState(350);
  const [notifications, setNotifications] = useState(false);
  const [sound, setSound] = useState(false);
  const devicesState = useDevices(authToken);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 0',
        borderBottom: `1px solid ${S.border}`,
        background: S.surface,
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: '0 0 10px', letterSpacing: -0.3 }}>
          Settings
        </h2>

        {/* Section tabs (scroll horizontal) */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: -1 }}>
          {SECTION_TABS.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                style={{
                  padding: '6px 12px 10px',
                  border: 'none', background: 'transparent',
                  color: active ? S.primary : S.text3,
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                  borderBottom: `2px solid ${active ? S.primary : 'transparent'}`,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'color 120ms ease-out',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px 32px' }}>

        {/* ── Connection ── */}
        {section === 'connection' && (
          <>
            <SectionLabel label="Agent" />
            <ConnectionSection connectionStatus={connectionStatus} latencyMs={latencyMs} />

            <SectionLabel label="How to stop agent" />
            <Card>
              <div style={{ padding: '10px 12px', fontSize: 11, color: S.text2, lineHeight: 1.6 }}>
                Press{' '}
                <code style={{ color: S.primary, fontFamily: "'Geist Mono', monospace", background: S.bg, padding: '1px 5px', borderRadius: 3, border: `1px solid ${S.border}` }}>
                  Ctrl+C
                </code>{' '}
                in the terminal running{' '}
                <code style={{ color: S.success, fontFamily: "'Geist Mono', monospace" }}>
                  npm run dev
                </code>{' '}
                to stop the agent. Sessions are preserved in tmux.
              </div>
            </Card>
          </>
        )}

        {/* ── Keyboard ── */}
        {section === 'keyboard' && (
          <>
            <SectionLabel label="Input Mode" />
            <KeyboardModeSelector mode={keyboardMode} onChange={onKeyboardModeChange} />

            <SectionLabel label="Keyboard Skin" />
            <SkinGallery currentSkin={skin} onSkinChange={onSkinChange} />

            <SectionLabel label="Haptics & Timing" />
            <Card>
              <Slider
                label="Haptic Intensity"
                value={haptic}
                min={0}
                max={100}
                unit="%"
                onChange={setHaptic}
              />
              <Slider
                label="Key Repeat Delay"
                value={repeatDelay}
                min={100}
                max={800}
                unit="ms"
                onChange={setRepeatDelay}
              />
              <SettingRow label="Key click sound" last>
                <Toggle value={sound} onChange={setSound} />
              </SettingRow>
            </Card>

            <button
              type="button"
              style={{
                width: '100%', height: 40, marginTop: 14, borderRadius: 9,
                border: 'none', background: S.primary, color: S.bg,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: -0.1,
              }}
            >
              Save Keyboard Settings
            </button>
          </>
        )}

        {/* ── Appearance ── */}
        {section === 'appearance' && (
          <>
            <SectionLabel label="Theme" />
            <Card>
              <SettingRow label="Color theme" desc="Obsidian dark — only option for now" last>
                <span style={{
                  fontSize: 10, color: S.primary,
                  background: `${S.primary}12`,
                  border: `1px solid ${S.primary}30`,
                  padding: '2px 7px', borderRadius: 5,
                }}>
                  Obsidian
                </span>
              </SettingRow>
            </Card>

            <SectionLabel label="Terminal" />
            <Card>
              <SettingRow label="Cursor style" desc="Block cursor">
                <span style={{ fontSize: 11, color: S.text3 }}>Block</span>
              </SettingRow>
              <SettingRow label="Font size" desc="Terminal character size" last>
                <span style={{ fontSize: 11, color: S.text2, fontFamily: "'Geist Mono', monospace" }}>13px</span>
              </SettingRow>
            </Card>

            <SectionLabel label="Notifications" />
            <Card>
              <SettingRow label="In-app notifications" last>
                <Toggle value={notifications} onChange={setNotifications} />
              </SettingRow>
            </Card>
          </>
        )}

        {/* ── Security ── */}
        {section === 'security' && (
          <>
            <SectionLabel label="Authentication" />
            <Card>
              <SettingRow label="Auth method" desc="Static token (never expires)">
                <span style={{
                  fontSize: 10, color: S.success,
                  background: `${S.success}12`,
                  border: `1px solid ${S.success}30`,
                  padding: '2px 7px', borderRadius: 5,
                }}>
                  Active
                </span>
              </SettingRow>
              <SettingRow label="Token scope" desc="Full PTY access" last>
                <span style={{ fontSize: 10, color: S.text3 }}>PTY + WS</span>
              </SettingRow>
            </Card>

            <SectionLabel label="Limits" />
            <Card>
              <SettingRow label="Rate limiting" desc="Auth endpoints: 10 req / 15 min">
                <span style={{ fontSize: 10, color: S.success }}>On</span>
              </SettingRow>
              <SettingRow label="Payload cap" desc="WebSocket messages" last>
                <span style={{ fontSize: 10, color: S.text3, fontFamily: "'Geist Mono', monospace" }}>1 MB</span>
              </SettingRow>
            </Card>

            <SectionLabel label="Devices" />
            <Card>
              {devicesState.devices.length === 0 && !devicesState.loading && (
                <div style={{ padding: '14px 12px', fontSize: 11, color: S.text3, textAlign: 'center' }}>
                  No devices signed in
                </div>
              )}
              {devicesState.devices.map((device, i) => (
                <SettingRow
                  key={device.id}
                  label={device.deviceName || 'Unknown device'}
                  desc={`${device.current ? 'This device · ' : ''}Last seen ${formatRelativeTime(device.lastSeen)}`}
                  last={i === devicesState.devices.length - 1}
                >
                  <button
                    type="button"
                    onClick={() => void devicesState.revoke(device.id)}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 6,
                      border: `1px solid ${S.error}44`, background: `${S.error}10`,
                      color: S.error, fontSize: 10, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {device.current ? 'Sign out' : 'Revoke'}
                  </button>
                </SettingRow>
              ))}
            </Card>

            <SectionLabel label="Info" />
            <Card>
              <div style={{ padding: '10px 12px', fontSize: 10, color: S.text3, lineHeight: 1.7 }}>
                Scanning the QR (or opening the one-click URL) mints a separate,
                individually revocable session per device — revoking one above
                does not sign out the others.
                The agent uses JWT rotation with 7-day expiry for session-based auth.
              </div>
            </Card>

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => void devicesState.revokeAll()}
                style={{
                  width: '100%', height: 38, borderRadius: 8,
                  border: `1px solid ${S.error}44`, background: `${S.error}10`,
                  color: S.error, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sign Out All Devices
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28, paddingBottom: 4 }}>
          <span style={{ fontSize: 9, color: S.text3 }}>termora v{__APP_VERSION__} — by RUD Lab</span>
        </div>
      </div>
    </div>
  );
}
