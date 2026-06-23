import Redis from "ioredis";
import { logger } from "./logger";

class RedisService {
  private client: Redis | null = null;
  private isFallback = false;
  
  // In-memory cache fallback for local development if Redis is not configured
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private memoryLocks = new Map<string, number>(); // key -> expiresAt

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        logger.info("Initializing Redis client...");
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
        });

        this.client.on("error", (err) => {
          logger.warn("Redis client connection error. Falling back to in-memory store.", { error: err.message });
          this.isFallback = true;
        });

        this.client.on("connect", () => {
          logger.info("Redis client connected successfully.");
          this.isFallback = false;
        });
      } catch (err: any) {
        logger.warn("Failed to create Redis client. Falling back to in-memory store.", { error: err.message });
        this.isFallback = true;
      }
    } else {
      logger.warn("REDIS_URL environment variable is missing. Using in-memory fallback.");
      this.isFallback = true;
    }
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, record] of this.memoryCache.entries()) {
      if (record.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
    for (const [key, expiresAt] of this.memoryLocks.entries()) {
      if (expiresAt < now) {
        this.memoryLocks.delete(key);
      }
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const now = Date.now();
    this.cleanExpired();

    if (this.isFallback || !this.client) {
      // In-memory locking logic
      const activeLockExpiry = this.memoryLocks.get(lockKey);
      if (activeLockExpiry && activeLockExpiry > now) {
        return false; // Lock already held
      }
      this.memoryLocks.set(lockKey, now + (ttlSeconds * 1000));
      return true;
    }

    try {
      // Redis locking logic: SET lock:key value NX PX ttl
      // PX sets expiry in milliseconds, NX sets only if it does not exist
      const res = await this.client.set(lockKey, "locked", "PX", ttlSeconds * 1000, "NX");
      return res === "OK";
    } catch (err: any) {
      logger.error("Redis acquireLock failure, falling back to memory lock", { key, error: err.message });
      // Fallback
      const activeLockExpiry = this.memoryLocks.get(lockKey);
      if (activeLockExpiry && activeLockExpiry > now) {
        return false;
      }
      this.memoryLocks.set(lockKey, now + (ttlSeconds * 1000));
      return true;
    }
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    this.cleanExpired();

    if (this.isFallback || !this.client) {
      this.memoryLocks.delete(lockKey);
      return;
    }

    try {
      await this.client.del(lockKey);
    } catch (err: any) {
      logger.error("Redis releaseLock failure", { key, error: err.message });
      this.memoryLocks.delete(lockKey);
    }
  }

  async getIdempotencyRecord(key: string): Promise<any | null> {
    const rKey = `idempotency:${key}`;
    this.cleanExpired();

    if (this.isFallback || !this.client) {
      const record = this.memoryCache.get(rKey);
      if (record && record.expiresAt >= Date.now()) {
        return JSON.parse(record.value);
      }
      return null;
    }

    try {
      const val = await this.client.get(rKey);
      return val ? JSON.parse(val) : null;
    } catch (err: any) {
      logger.error("Redis getIdempotencyRecord failure", { key, error: err.message });
      const record = this.memoryCache.get(rKey);
      if (record && record.expiresAt >= Date.now()) {
        return JSON.parse(record.value);
      }
      return null;
    }
  }

  async setIdempotencyRecord(key: string, value: any, ttlSeconds: number): Promise<void> {
    const rKey = `idempotency:${key}`;
    const serialized = JSON.stringify(value);
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cleanExpired();

    if (this.isFallback || !this.client) {
      this.memoryCache.set(rKey, { value: serialized, expiresAt });
      return;
    }

    try {
      await this.client.set(rKey, serialized, "EX", ttlSeconds);
    } catch (err: any) {
      logger.error("Redis setIdempotencyRecord failure", { key, error: err.message });
      this.memoryCache.set(rKey, { value: serialized, expiresAt });
    }
  }
}

export const redisService = new RedisService();
