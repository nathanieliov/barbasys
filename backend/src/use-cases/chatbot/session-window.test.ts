import { describe, it, expect, vi } from 'vitest';
import { isInSessionWindow } from './session-window.js';

describe('isInSessionWindow', () => {
  it('returns false for null', () => {
    expect(isInSessionWindow(null)).toBe(false);
  });

  it('returns true within 24 hours', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(isInSessionWindow(oneHourAgo.toISOString())).toBe(true);
  });

  it('returns true at exactly 24 hours', () => {
    const now = new Date();
    const exactly24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(isInSessionWindow(exactly24HoursAgo.toISOString())).toBe(true);
  });

  it('returns false after 24 hours', () => {
    const now = new Date();
    const moreThan24HoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(isInSessionWindow(moreThan24HoursAgo.toISOString())).toBe(false);
  });

  it('returns true for recent message', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(isInSessionWindow(fiveMinutesAgo.toISOString())).toBe(true);
  });
});
