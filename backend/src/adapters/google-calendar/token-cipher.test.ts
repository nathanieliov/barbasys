import { describe, it, expect } from 'vitest';
import { TokenCipher } from './token-cipher.js';

describe('TokenCipher', () => {
  const validKey = 'a'.repeat(64);
  const plaintext = 'my_refresh_token_from_google';

  it('encrypts and decrypts text correctly', () => {
    const cipher = new TokenCipher(validKey);
    const encrypted = cipher.encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = cipher.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for same plaintext due to random IV', () => {
    const cipher = new TokenCipher(validKey);
    const encrypted1 = cipher.encrypt(plaintext);
    const encrypted2 = cipher.encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);

    expect(cipher.decrypt(encrypted1)).toBe(plaintext);
    expect(cipher.decrypt(encrypted2)).toBe(plaintext);
  });

  it('throws error for invalid ciphertext format', () => {
    const cipher = new TokenCipher(validKey);

    expect(() => cipher.decrypt('invalid')).toThrow();
    expect(() => cipher.decrypt('a:b')).toThrow();
  });

  it('throws error for invalid key length', () => {
    expect(() => new TokenCipher('too_short')).toThrow('Key must be 32 bytes');
  });
});
