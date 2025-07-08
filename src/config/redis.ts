import {
  createClient,
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from "redis";
import { config } from "./environment";

type RedisClient = RedisClientType<
  RedisDefaultModules & RedisModules,
  RedisFunctions,
  RedisScripts
>;

class RedisConnection {
  private client: RedisClient | null = null;
  private isConnected: boolean = false;

  constructor() {
    const clientOptions: any = {
      url: config.redis.url,
      database: config.redis.db,
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 1000),
        connectTimeout: 5000,
      },
    };

    if (config.redis.password) {
      clientOptions.password = config.redis.password;
    }

    this.client = createClient(clientOptions);

    // Setup error handlers
    if (this.client) {
      this.client.on("error", (error) => {
        console.error("❌ Redis client error:", error);
      });

      this.client.on("connect", () => {
        console.log("🔌 Redis client connected");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis client ready");
        this.isConnected = true;
      });

      this.client.on("end", () => {
        console.log("🔐 Redis client disconnected");
        this.isConnected = false;
      });
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client?.isReady) {
        return;
      }

      if (!this.client) {
        throw new Error("Redis client not initialized");
      }

      console.log("🔌 Connecting to Redis...");
      await this.client.connect();

      // Test the connection
      await this.client.ping();

      console.log("✅ Connected to Redis successfully");
    } catch (error) {
      console.error("❌ Redis connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        console.log("🔐 Disconnected from Redis");
      }
    } catch (error) {
      console.error("❌ Redis disconnection error:", error);
    } finally {
      this.isConnected = false;
    }
  }

  getClient(): RedisClient {
    if (!this.client || !this.isConnected) {
      throw new Error("Redis not connected. Call connect() first.");
    }
    return this.client;
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.client?.isReady === true;
  }

  // Cache utilities for room availability
  async setRoomAvailability(
    roomId: string,
    dateRange: string,
    isAvailable: boolean,
    ttl: number = config.application.cacheTtl
  ): Promise<void> {
    try {
      const client = this.getClient();
      const key = `room:availability:${roomId}:${dateRange}`;
      await client.setEx(
        key,
        ttl,
        JSON.stringify({ isAvailable, timestamp: Date.now() })
      );
    } catch (error) {
      console.error("Error setting room availability cache:", error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  async getRoomAvailability(
    roomId: string,
    dateRange: string
  ): Promise<boolean | null> {
    try {
      const client = this.getClient();
      const key = `room:availability:${roomId}:${dateRange}`;
      const cached = await client.get(key);

      if (cached) {
        const data = JSON.parse(cached);
        return data.isAvailable;
      }

      return null;
    } catch (error) {
      console.error("Error getting room availability cache:", error);
      return null;
    }
  }

  async invalidateRoomCache(roomId: string): Promise<void> {
    try {
      const client = this.getClient();
      const pattern = `room:availability:${roomId}:*`;

      const keys: string[] = [];
      for await (const key of client.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await client.del(keys);
        console.log(
          `🗑️ Invalidated ${keys.length} cache entries for room ${roomId}`
        );
      }
    } catch (error) {
      console.error("Error invalidating room cache:", error);
    }
  }
}

export const redis = new RedisConnection();

export const getRedisClient = () => redis.getClient();

export const CACHE_KEYS = {
  ROOM_AVAILABILITY: (roomId: string, dateRange: string) =>
    `room:availability:${roomId}:${dateRange}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  ROOM_ANALYTICS: (roomId: string, period: string) =>
    `analytics:room:${roomId}:${period}`,
  BOOKING_STATS: (period: string) => `analytics:bookings:${period}`,
} as const;
