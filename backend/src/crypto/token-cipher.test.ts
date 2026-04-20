import { describe, it, expect } from 'vitest';
import { TokenCipher } from './token-cipher.js';

describe('TokenCipher', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const cipher = new TokenCipher(key);

  it('round-trips plaintext', () => {
    const pt = 'ya29.refresh-token';
    const enc = cipher.encrypt(pt);
    expect(cipher.decrypt(enc)).toBe(pt);
  });

  it('produces different ciphertexts for same input', () => {
    const a = cipher.encrypt('same');
    const b = cipher.encrypt('same');
    expect(a).not.toBe(b);
  });

  it('rejects tampered ciphertext', () => {
    const enc = cipher.encrypt('secret');
    const bytes = Buffer.from(enc, 'base64');
    bytes[bytes.length - 1] ^= 0xff;
    expect(() => cipher.decrypt(bytes.toString('base64'))).toThrow();
  });
});
