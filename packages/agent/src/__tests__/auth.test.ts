import { describe, it, expect } from 'vitest';
import { generateBootstrapToken, hashToken, verifyStaticToken } from '../auth.js';

describe('generateBootstrapToken', () => {
  it('returns a base64url string of ~43 characters', () => {
    const token = generateBootstrapToken();
    // 32 random bytes → base64url → 43 chars (no padding)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBe(43);
  });

  it('generates unique tokens on each call', () => {
    const a = generateBootstrapToken();
    const b = generateBootstrapToken();
    expect(a).not.toBe(b);
  });
});

describe('hashToken', () => {
  it('returns a consistent SHA-256 hex string of 64 characters', () => {
    const hash = hashToken('test-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Same input → same output
    expect(hashToken('test-token')).toBe(hash);
  });

  it('produces different hashes for different inputs', () => {
    const hashA = hashToken('token-a');
    const hashB = hashToken('token-b');
    expect(hashA).not.toBe(hashB);
  });
});

describe('verifyStaticToken', () => {
  it('returns true when candidate matches the static token', () => {
    const token = 'my-secret-token';
    expect(verifyStaticToken(token, token)).toBe(true);
  });

  it('returns false when candidate does not match', () => {
    expect(verifyStaticToken('wrong-token', 'correct-token')).toBe(false);
  });
});
