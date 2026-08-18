import { describe, it, expect } from 'vitest';
import { deriveDeviceName } from '../device-name.js';

describe('deriveDeviceName', () => {
  it('labels an iPhone Safari user agent', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    expect(deriveDeviceName(ua)).toBe('iPhone · Safari');
  });

  it('labels an Android Chrome user agent', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
    expect(deriveDeviceName(ua)).toBe('Android · Chrome');
  });

  it('labels a Mac Safari user agent', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    expect(deriveDeviceName(ua)).toBe('Mac · Safari');
  });

  it('falls back to a generic label for a missing user agent', () => {
    expect(deriveDeviceName(undefined)).toBe('Unknown device');
  });

  it('falls back to a generic label for an unrecognized user agent', () => {
    expect(deriveDeviceName('curl/8.4.0')).toBe('Unknown device');
  });
});
