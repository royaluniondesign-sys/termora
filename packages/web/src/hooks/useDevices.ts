import { useState, useCallback, useEffect } from 'react';

export interface Device {
  id: string;
  deviceName: string;
  createdAt: string;
  lastSeen: string;
  current: boolean;
}

interface DevicesReturn {
  devices: Device[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revoke: (id: string) => Promise<boolean>;
  revokeAll: () => Promise<boolean>;
}

/**
 * Lists and revokes device sessions from Settings > Security.
 *
 * Revoking a device deletes its session row on the agent; the next time
 * that device's WebSocket reconnects (or its next ping), the agent closes
 * it with code 4001 and the app falls back to the auth screen there — this
 * hook only manages the list, it does not force-disconnect other devices.
 */
export function useDevices(token: string | null): DevicesReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to load devices (${String(response.status)})`);
      const data = (await response.json()) as { devices: Device[] };
      setDevices(data.devices);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const revoke = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;
      try {
        const response = await fetch(`/api/devices/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return false;
        setDevices((prev) => prev.filter((d) => d.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [token],
  );

  const revokeAll = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await fetch('/api/devices', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return false;
      setDevices([]);
      return true;
    } catch {
      return false;
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { devices, loading, error, refresh, revoke, revokeAll };
}
