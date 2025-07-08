import { MongoClient, Db, Collection, Document } from "mongodb";
import { config } from "./environment";

class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.client = new MongoClient(config.database.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      writeConcern: {
        w: "majority",
      },
    });
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client && this.db) {
        return;
      }

      console.log("🔌 Connecting to MongoDB...");

      if (!this.client) {
        throw new Error("MongoDB client not initialized");
      }

      await this.client.connect();

      // Test the connection
      await this.client.db("admin").command({ ping: 1 });

      this.db = this.client.db(config.database.dbName);
      this.isConnected = true;

      console.log(
        `✅ Connected to MongoDB database: ${config.database.dbName}`
      );

      // Setup database indexes
      await this.setupIndexes();
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        console.log("🔐 Disconnected from MongoDB");
      }
    } catch (error) {
      console.error("❌ MongoDB disconnection error:", error);
    } finally {
      this.client = null;
      this.db = null;
      this.isConnected = false;
    }
  }

  getDb(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    const db = this.getDb();
    return db.collection<T>(name);
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.client !== null && this.db !== null;
  }

  private async setupIndexes(): Promise<void> {
    try {
      const db = this.getDb();

      // Users collection indexes
      const usersCollection = db.collection("users");
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await usersCollection.createIndex({ role: 1 });
      await usersCollection.createIndex({ createdAt: 1 });

      // Rooms collection indexes
      const roomsCollection = db.collection("rooms");
      await roomsCollection.createIndex({ roomNumber: 1 }, { unique: true });
      await roomsCollection.createIndex({ category: 1 });
      await roomsCollection.createIndex({ isActive: 1 });
      await roomsCollection.createIndex({ category: 1, isActive: 1 });

      // Bookings collection indexes
      const bookingsCollection = db.collection("bookings");
      await bookingsCollection.createIndex({ roomId: 1 });
      await bookingsCollection.createIndex({ userId: 1 });
      await bookingsCollection.createIndex({ status: 1 });
      await bookingsCollection.createIndex({ checkInDate: 1, checkOutDate: 1 });
      await bookingsCollection.createIndex({
        roomId: 1,
        checkInDate: 1,
        checkOutDate: 1,
        status: 1,
      });

      await bookingsCollection.createIndex({
        roomId: 1,
        status: 1,
        checkInDate: 1,
        checkOutDate: 1,
      });

      console.log("✅ Database indexes created successfully");
    } catch (error) {
      console.error("❌ Error creating database indexes:", error);
    }
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    database: string;
  }> {
    try {
      if (!this.isConnectionActive()) {
        throw new Error("Database connection is not active");
      }

      const db = this.getDb();
      await db.admin().ping();

      return {
        status: "healthy",
        timestamp: new Date(),
        database: config.database.dbName,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        database: config.database.dbName,
      };
    }
  }
}

export const database = new DatabaseConnection();

export const getDb = () => database.getDb();
export const getCollection = <T extends Document = Document>(name: string) =>
  database.getCollection<T>(name);

export const COLLECTIONS = {
  USERS: "users",
  ROOMS: "rooms",
  BOOKINGS: "bookings",
} as const;
