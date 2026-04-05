import { useState, useEffect, useCallback } from 'react';

export type TunnelMethod = 'ngrok' | 'ssh' | 'local' | null;

export interface ConnectionInfo {
  tunnelUrl: string | null;
  tunnelMethod: TunnelMethod;
  authUrl: string | null;
  machineName: string | null;
  version: string | null;
}

const EMPTY: ConnectionInfo = {
  tunnelUrl: null,
  tunnelMethod: null,
  authUrl: null,
  machineName: null,
  version: null,
};

/**
 * Fetches /api/info to get current tunnel URL, method, and one-click auth URL.
 * Auto-refreshes every 10s so tunnel changes (e.g. sleep/wake recovery) are reflected.
 */
export function useConnectionInfo(): { info: ConnectionInfo; refresh: () => void } {
  const [info, setInfo] = useState<ConnectionInfo>(EMPTY);

  const fetch_ = useCallback(() => {
    fetch('/api/info')
      .then((r) => r.json() as Promise<ConnectionInfo>)
      .then((data) => setInfo(data))
      .catch(() => { /* server not reachable — keep previous value */ });
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { info, refresh: fetch_ };
}
