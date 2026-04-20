import { describe, it, expect } from 'vitest';
import { detectLanguage } from './language-detector.js';

describe('detectLanguage', () => {
  it('detects Spanish', () => {
    const result = detectLanguage('Hola, ¿cómo estás?', 'en');
    expect(result).toBe('es');
  });

  it('detects English', () => {
    const result = detectLanguage('Hello, how are you today?', 'es');
    expect(result).toBe('en');
  });

  it('falls back to previous language on ambiguous text', () => {
    const ambiguous = '123 xyz abc';
    const result1 = detectLanguage(ambiguous, 'en');
    const result2 = detectLanguage(ambiguous, 'es');
    expect(result1).toBe('en');
    expect(result2).toBe('es');
  });

  it('detects Spanish stop words', () => {
    const result = detectLanguage('el la de que es', 'en');
    expect(result).toBe('es');
  });

  it('detects English stop words', () => {
    const result = detectLanguage('the and is that with', 'es');
    expect(result).toBe('en');
  });

  it('prefers detected language over previous', () => {
    const result = detectLanguage('buenos días', 'en');
    expect(result).toBe('es');
  });
});
