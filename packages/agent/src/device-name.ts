/**
 * Derives a short, human-readable device label from a User-Agent string,
 * for display in the Settings > Devices list. Best-effort — falls back to
 * a generic label rather than failing on an unrecognized or missing UA.
 */
export function deriveDeviceName(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown device';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /CriOS\//.test(userAgent)
          ? 'Chrome'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : undefined;

  if (/iPhone/.test(userAgent)) return join('iPhone', browser);
  if (/iPad/.test(userAgent)) return join('iPad', browser);
  if (/Android/.test(userAgent)) return join('Android', browser);
  if (/Macintosh/.test(userAgent)) return join('Mac', browser);
  if (/Windows/.test(userAgent)) return join('Windows', browser);
  if (/Linux/.test(userAgent)) return join('Linux', browser);

  return 'Unknown device';
}

function join(platform: string, browser: string | undefined): string {
  return browser ? `${platform} · ${browser}` : platform;
}
