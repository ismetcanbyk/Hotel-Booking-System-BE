import { redis } from "../config/redis";

export interface LockOptions {
  ttl?: number; // Lock TTL in seconds (default: 30)
  retryDelay?: number; // Retry delay in milliseconds (default: 100)
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

export class RedisLock {
  private lockKey: string;
  private lockValue: string;
  private options: Required<LockOptions>;

  constructor(lockKey: string, options: LockOptions = {}) {
    this.lockKey = `lock:${lockKey}`;
    this.lockValue = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.options = {
      ttl: options.ttl || 30,
      retryDelay: options.retryDelay || 100,
      maxRetries: options.maxRetries || 3,
    };
  }

  /**
   * Acquire distributed lock
   */
  async acquire(): Promise<boolean> {
    if (!redis.isConnectionActive()) {
      throw new Error("Redis connection not active for locking");
    }

    const client = redis.getClient();

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await client.set(this.lockKey, this.lockValue, {
          NX: true,
          EX: this.options.ttl,
        });

        if (result === "OK") {
          console.log(
            `🔒 Lock acquired: ${this.lockKey} (value: ${this.lockValue})`
          );
          return true;
        }

        // Lock already exists, check if we should retry
        if (attempt < this.options.maxRetries) {
          console.log(
            `🔄 Lock busy, retrying in ${this.options.retryDelay}ms (attempt ${
              attempt + 1
            }/${this.options.maxRetries})`
          );
          await this.sleep(this.options.retryDelay);
        }
      } catch (error) {
        console.error(
          `❌ Lock acquisition error (attempt ${attempt + 1}):`,
          error
        );
        if (attempt === this.options.maxRetries) {
          throw error;
        }
        await this.sleep(this.options.retryDelay);
      }
    }

    console.log(
      `❌ Failed to acquire lock after ${this.options.maxRetries} attempts: ${this.lockKey}`
    );
    return false;
  }

  /**
   * Release distributed lock
   */
  async release(): Promise<boolean> {
    if (!redis.isConnectionActive()) {
      console.warn("Redis connection not active, cannot release lock");
      return false;
    }

    try {
      const client = redis.getClient();

      // Lua script to ensure we only delete our own lock
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await client.eval(luaScript, {
        keys: [this.lockKey],
        arguments: [this.lockValue],
      });

      if (result === 1) {
        console.log(`🔓 Lock released: ${this.lockKey}`);
        return true;
      } else {
        console.warn(
          `⚠️ Lock not released (may have expired or been taken by another process): ${this.lockKey}`
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Lock release error:`, error);
      return false;
    }
  }

  /**
   * Execute function with distributed lock
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const acquired = await this.acquire();

    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${this.lockKey}`);
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.release();
    }
  }

  /**
   * Check if lock exists
   */
  async exists(): Promise<boolean> {
    if (!redis.isConnectionActive()) {
      return false;
    }

    try {
      const client = redis.getClient();
      const exists = await client.exists(this.lockKey);
      return exists === 1;
    } catch (error) {
      console.error("Lock existence check error:", error);
      return false;
    }
  }

  /**
   * Get lock TTL
   */
  async getTTL(): Promise<number> {
    if (!redis.isConnectionActive()) {
      return -1;
    }

    try {
      const client = redis.getClient();
      return await client.ttl(this.lockKey);
    } catch (error) {
      console.error("Lock TTL check error:", error);
      return -1;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper function for room booking locks
 */
export function createBookingLock(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  options?: LockOptions
): RedisLock {
  const dateRange = `${checkInDate.toISOString()}_${checkOutDate.toISOString()}`;
  const lockKey = `booking:${roomId}:${dateRange}`;
  return new RedisLock(lockKey, {
    ttl: 60, // 1 minute lock for booking operations
    retryDelay: 200, // 200ms retry delay
    maxRetries: 5, // 5 retry attempts
    ...options,
  });
}

/**
 * Helper function for room availability locks
 */
export function createRoomLock(
  roomId: string,
  options?: LockOptions
): RedisLock {
  const lockKey = `room:${roomId}`;
  return new RedisLock(lockKey, {
    ttl: 30, // 30 seconds lock
    retryDelay: 100,
    maxRetries: 3,
    ...options,
  });
}
