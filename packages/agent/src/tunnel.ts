import { spawn, type ChildProcess } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import ngrok from '@ngrok/ngrok';
// @ts-expect-error -- qrcode-terminal has no type declarations
import qrcode from 'qrcode-terminal';

export type TunnelMethod = 'cloudflared' | 'ngrok' | 'ssh' | 'local';

export interface TunnelResult {
  url: string;
  method: TunnelMethod;
}

let activeNgrokListener: ngrok.Listener | null = null;
let activeSSHProcess: ChildProcess | null = null;
let activeCloudflaredProcess: ChildProcess | null = null;

// Tunnel state for monitoring and recovery
interface TunnelConfig {
  port: number;
  ngrokAuthtoken?: string;
  ngrokStaticDomain?: string;
  forcedMethod?: TunnelMethod;
}
let savedConfig: TunnelConfig | null = null;
let currentTunnel: TunnelResult | null = null;
/** Set to true when an SSH process dies after a tunnel was established. */
let tunnelDead = false;

/**
 * Returns the first non-internal IPv4 address for this machine.
 * Used so phones on the same Wi-Fi can connect without any tunnel.
 */
function getLocalIP(): string | null {
  const nets = networkInterfaces();
  for (const interfaces of Object.values(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

/**
 * Creates a public tunnel via cloudflared quick tunnel.
 * No account, no bandwidth limits, no auth token required.
 * Requires cloudflared to be installed (brew install cloudflared).
 */
function createCloudflaredTunnel(localPort: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const cf = spawn('/opt/homebrew/bin/cloudflared', [
      'tunnel', '--url', `http://localhost:${localPort}`, '--no-autoupdate',
    ]);

    activeCloudflaredProcess = cf;

    const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    let resolved = false;

    const tryResolve = (data: Buffer) => {
      if (resolved) return;
      const match = urlPattern.exec(data.toString());
      if (match) {
        resolved = true;
        resolve(match[0]);
      }
    };

    cf.stderr.on('data', tryResolve);
    cf.stdout.on('data', tryResolve);

    cf.on('error', (err) => {
      if (!resolved) reject(err);
    });

    cf.on('close', (code) => {
      activeCloudflaredProcess = null;
      if (!resolved) {
        reject(new Error(`cloudflared exited with code ${String(code)}`));
      } else {
        tunnelDead = true;
      }
    });

    setTimeout(() => {
      if (!resolved) {
        cf.kill();
        reject(new Error('cloudflared tunnel timed out after 20s'));
      }
    }, 20_000);
  });
}

/**
 * Creates a public tunnel via localhost.run using SSH.
 * SSH is pre-installed on macOS — no account, no binary download required.
 * Resolves with the public HTTPS URL once the tunnel is established.
 */
function createSSHTunnel(localPort: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const ssh = spawn('ssh', [
      '-R', `80:localhost:${localPort}`,
      'nokey@localhost.run',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
    ]);

    activeSSHProcess = ssh;

    const urlPattern = /https:\/\/[a-zA-Z0-9-]+\.(?:localhost\.run|lhr\.life)/;
    let resolved = false;

    const tryResolve = (data: Buffer) => {
      if (resolved) return;
      const match = urlPattern.exec(data.toString());
      if (match) {
        resolved = true;
        resolve(match[0]);
      }
    };

    ssh.stdout.on('data', tryResolve);
    ssh.stderr.on('data', tryResolve);

    ssh.on('error', (err) => {
      if (!resolved) reject(err);
    });

    ssh.on('close', (code) => {
      activeSSHProcess = null;
      if (!resolved) {
        reject(new Error(`SSH exited with code ${String(code)}`));
      } else {
        // Tunnel was established but SSH process died (network drop, sleep, etc.)
        tunnelDead = true;
      }
    });

    setTimeout(() => {
      if (!resolved) {
        ssh.kill();
        reject(new Error('localhost.run tunnel timed out after 12s'));
      }
    }, 12_000);
  });
}

/**
 * Creates a public tunnel to expose the local server.
 *
 * Priority order:
 *  1. ngrok    — if NGROK_AUTHTOKEN is set (most reliable, needs free account)
 *  2. SSH      — localhost.run via SSH, zero install, no account needed
 *  3. local    — local network IP, works when phone is on the same Wi-Fi
 */
export async function createTunnel(
  port: number,
  ngrokAuthtoken?: string,
  ngrokStaticDomain?: string,
  forcedMethod?: 'cloudflared' | 'ngrok' | 'ssh' | 'local',
): Promise<TunnelResult> {
  // Store config for recreation on tunnel death
  savedConfig = { port, ngrokAuthtoken, ngrokStaticDomain, forcedMethod };
  tunnelDead = false;

  // Shortcut: forced local
  if (forcedMethod === 'local') {
    const localIp = getLocalIP();
    const url = localIp ? `http://${localIp}:${port}` : `http://localhost:${port}`;
    currentTunnel = { url, method: 'local' };
    return currentTunnel;
  }

  // 1. cloudflared — free, no account, no bandwidth limits
  if (forcedMethod !== 'ngrok' && forcedMethod !== 'ssh') {
    try {
      const url = await createCloudflaredTunnel(port);
      currentTunnel = { url, method: 'cloudflared' };
      return currentTunnel;
    } catch {
      // cloudflared not installed or failed — try ngrok
    }
  }

  // 2. ngrok — needs NGROK_AUTHTOKEN, has bandwidth limits on free tier
  if (forcedMethod !== 'ssh' && ngrokAuthtoken) {
    try {
      const ngrokOpts: Parameters<typeof ngrok.forward>[0] = {
        addr: port,
        authtoken: ngrokAuthtoken,
      };
      if (ngrokStaticDomain) ngrokOpts.domain = ngrokStaticDomain;
      const listener = await ngrok.forward(ngrokOpts);
      activeNgrokListener = listener;
      const url = listener.url();
      if (url) {
        currentTunnel = { url, method: 'ngrok' };
        return currentTunnel;
      }
    } catch {
      // ngrok failed — try SSH
    }
  }

  // 3. localhost.run via SSH (pre-installed on macOS, no account needed)
  try {
    const url = await createSSHTunnel(port);
    currentTunnel = { url, method: 'ssh' };
    return currentTunnel;
  } catch {
    // SSH failed — fall back to local
  }

  // 4. Local network — works on same Wi-Fi, no internet required
  const localIp = getLocalIP();
  const url = localIp ? `http://${localIp}:${port}` : `http://localhost:${port}`;
  currentTunnel = { url, method: 'local' };
  return currentTunnel;
}

/**
 * Returns the current tunnel URL, or null if no tunnel is active.
 */
export function getTunnelUrl(): string | null {
  return currentTunnel?.url ?? null;
}

/**
 * Returns the full current tunnel result (url + method), or null if inactive.
 */
export function getTunnelInfo(): TunnelResult | null {
  return currentTunnel;
}

/**
 * Prints a clean startup banner with QR code and access info.
 */
export function printAccessInfo(
  publicUrl: string,
  bootstrapToken: string,
  method: TunnelMethod,
): void {
  const authUrl = `${publicUrl}/?token=${bootstrapToken}`;

  // ANSI orange (256-color: 208)
  const o = '\x1b[38;5;208m';
  const dim = '\x1b[2m';
  const r = '\x1b[0m';

  console.log('');
  console.log(`${o}   ████████╗███████╗██████╗ ███╗   ███╗ ██████╗ ██████╗  █████╗${r}`);
  console.log(`${o}   ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██╔══██╗${r}`);
  console.log(`${o}      ██║   █████╗  ██████╔╝██╔████╔██║██║   ██║██████╔╝███████║${r}`);
  console.log(`${o}      ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║   ██║██╔══██╗██╔══██║${r}`);
  console.log(`${o}      ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╔╝██║  ██║██║  ██║${r}`);
  console.log(`${o}      ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝${r}`);
  console.log(`${dim}                    Your machine, in your hands.${r}`);
  console.log('');

  qrcode.generate(authUrl, { small: true }, (code: string) => {
    // Print QR in default terminal colors (high contrast in both light & dark terminals)
    console.log(code);
    console.log(`${o}  Scan to connect ${dim}(token embedded in QR)${r}`);
    console.log('');
    console.log(`${o}  URL:   ${r}${publicUrl}`);
    console.log(`${o}  Token: ${r}${bootstrapToken}`);
    const modeLabel = method === 'cloudflared' ? 'remote (cloudflared)'
      : method === 'ngrok' ? 'remote (ngrok)'
      : method === 'ssh' ? 'remote (ssh)'
      : 'local Wi-Fi only';
    console.log(`${o}  Mode:  ${r}${modeLabel}`);
    if (method === 'local') {
      console.log('');
      console.log(`${o}  ⚠  Local mode — phone must be on same Wi-Fi.${r}`);
      console.log(`${dim}     Set NGROK_AUTHTOKEN in .env for remote access.${r}`);
    }
    console.log('');
  });
}

// --------------- Tunnel monitoring and recovery ---------------

/**
 * Checks if the tunnel is alive by hitting our own health endpoint through it.
 * Verifies the full path: server → tunnel → internet → back.
 */
async function isTunnelAlive(): Promise<boolean> {
  if (tunnelDead || !currentTunnel) return false;
  if (currentTunnel.method === 'local') return true;
  try {
    const res = await fetch(`${currentTunnel.url}/api/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Closes the current tunnel and creates a new one using the saved config.
 */
async function recreate(): Promise<TunnelResult | null> {
  if (!savedConfig) return null;
  await closeTunnel();
  return createTunnel(
    savedConfig.port,
    savedConfig.ngrokAuthtoken,
    savedConfig.ngrokStaticDomain,
    savedConfig.forcedMethod,
  );
}

/**
 * Starts a background monitor that detects system sleep/wake and SSH tunnel
 * death, then automatically recreates the tunnel.
 *
 * Uses a "time drift" detector: if the interval timer fires after a gap much
 * larger than expected, the system was sleeping. On wake, it waits for the
 * network to stabilize, checks tunnel health, and recreates if necessary.
 *
 * @param onRecovered — called when the tunnel is recreated with a new URL
 * @returns cleanup function to stop the monitor
 */
export function startTunnelMonitor(
  onRecovered: (url: string, method: TunnelMethod) => void,
): () => void {
  const INTERVAL_MS = 5_000;
  const WAKE_THRESHOLD_MS = 15_000;
  let lastTick = Date.now();
  let recovering = false;

  const check = async () => {
    if (recovering) return;

    const now = Date.now();
    const gap = now - lastTick - INTERVAL_MS;
    lastTick = now;

    const woke = gap > WAKE_THRESHOLD_MS;
    if (!woke && !tunnelDead) return;

    recovering = true;

    try {
      if (woke) {
        console.log(`  Wake detected (${Math.round((gap + INTERVAL_MS) / 1000)}s gap), checking tunnel...`);
        // Give the network interface a moment to come back up
        await new Promise<void>((r) => setTimeout(r, 3_000));
      } else {
        console.log('  Tunnel process died, restarting...');
        await new Promise<void>((r) => setTimeout(r, 2_000));
      }

      const alive = tunnelDead ? false : await isTunnelAlive();

      if (alive) {
        console.log('  Tunnel OK');
      } else {
        console.log('  Tunnel down, recreating...');
        const result = await recreate();
        if (result) {
          console.log(`  Tunnel recovered: ${result.url} (${result.method})`);
          onRecovered(result.url, result.method);
        }
      }
    } catch (err) {
      console.error('  Tunnel recovery failed:', err);
    }

    recovering = false;
  };

  const timer = setInterval(() => void check(), INTERVAL_MS);
  return () => clearInterval(timer);
}

/**
 * Closes any active tunnels (ngrok listener and/or SSH process).
 */
export async function closeTunnel(): Promise<void> {
  if (activeCloudflaredProcess) {
    activeCloudflaredProcess.kill();
    activeCloudflaredProcess = null;
  }
  if (activeNgrokListener) {
    try { await ngrok.disconnect(); } catch { /* ignore */ }
    activeNgrokListener = null;
  }
  if (activeSSHProcess) {
    activeSSHProcess.kill();
    activeSSHProcess = null;
  }
  tunnelDead = false;
}

/**
 * Registers SIGINT/SIGTERM handlers for graceful shutdown.
 */
export function registerShutdownHandlers(cleanup: () => void | Promise<void>): void {
  const shutdown = async (signal: string) => {
    console.log(`\n  Received ${signal}, shutting down...`);
    try {
      await cleanup();
      await closeTunnel();
    } catch (err) {
      console.error('  Error during shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
