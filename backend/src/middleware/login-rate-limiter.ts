import { Request, Response, NextFunction } from 'express';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RETRY_AFTER_SECONDS = 900;

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

// Key: "ip:username" for specificity; falls back to IP only if no username
const attempts = new Map<string, AttemptRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now - record.firstAttemptAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, WINDOW_MS);

export function recordFailedLogin(ip: string, username: string): void {
  const key = `${ip}:${username.toLowerCase()}`;
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    record.count++;
  }
}

export function clearLoginAttempts(ip: string, username: string): void {
  attempts.delete(`${ip}:${username.toLowerCase()}`);
}

export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const username = (req.body?.username || '').toLowerCase();
  const key = `${ip}:${username}`;
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now - record.firstAttemptAt <= WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: 'too_many_attempts', retry_after_seconds: RETRY_AFTER_SECONDS });
    return;
  }

  next();
}
