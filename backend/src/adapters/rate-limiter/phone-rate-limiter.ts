interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  firstRequestAt: number;
}

export class PhoneRateLimiter {
  private config: RateLimiterConfig;
  private requests: Map<string, RequestRecord> = new Map();

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  isAllowed(phone: string): boolean {
    const now = Date.now();
    const record = this.requests.get(phone);

    if (!record) {
      this.requests.set(phone, { count: 1, firstRequestAt: now });
      return true;
    }

    const windowAge = now - record.firstRequestAt;
    if (windowAge > this.config.windowMs) {
      this.requests.set(phone, { count: 1, firstRequestAt: now });
      return true;
    }

    if (record.count < this.config.maxRequests) {
      record.count++;
      return true;
    }

    return false;
  }

  getRemainingRequests(phone: string): number {
    const now = Date.now();
    const record = this.requests.get(phone);

    if (!record) {
      return this.config.maxRequests;
    }

    const windowAge = now - record.firstRequestAt;
    if (windowAge > this.config.windowMs) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - record.count);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [phone, record] of this.requests.entries()) {
        if (now - record.firstRequestAt > this.config.windowMs) {
          this.requests.delete(phone);
        }
      }
    }, this.config.windowMs);
  }
}
