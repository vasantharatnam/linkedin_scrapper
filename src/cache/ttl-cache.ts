interface CacheEntry<TValue> {
  expiresAt: number;
  value: TValue;
}

interface TtlCacheOptions {
  maxEntries: number;
  ttlMs: number;
  now?: () => number;
}

export class TtlCache<TKey, TValue> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly entries = new Map<TKey, CacheEntry<TValue>>();

  constructor(options: TtlCacheOptions) {
    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? Date.now;
  }

  get(key: TKey): TValue | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);

      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);

    return structuredClone(entry.value);
  }

  set(key: TKey, value: TValue): void {
    if (this.ttlMs === 0) {
      return;
    }

    this.entries.set(key, {
      expiresAt: this.now() + this.ttlMs,
      value: structuredClone(value),
    });

    this.prune();
  }

  clear(): void {
    this.entries.clear();
  }

  private prune(): void {
    const currentTime = this.now();

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= currentTime) {
        this.entries.delete(key);
      }
    }

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      this.entries.delete(oldestKey);
    }
  }
}
