import { ObjectId } from "mongodb";
import { getCollection, COLLECTIONS } from "../config/database";
import { redis } from "../config/redis";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateTokens } from "../utils/jwt";
import {
  User,
  UserRole,
  UserRegistrationInput,
  UserLoginInput,
  AuthResponse,
} from "../types";

export class UserService {
  private get usersCollection() {
    return getCollection<User>(COLLECTIONS.USERS);
  }

  /**
   * Register a new user
   */
  async register(input: UserRegistrationInput): Promise<AuthResponse> {
    const existingUser = await this.usersCollection.findOne({
      email: input.email,
    });
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    const hashedPassword = await hashPassword(input.password);

    const user: Omit<User, "_id"> = {
      email: input.email,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      ...(input.phone && { phone: input.phone }),
      role: UserRole.CUSTOMER,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.usersCollection.insertOne(user);
    const userId = result.insertedId;

    const tokens = generateTokens(userId.toString(), user.email, user.role);

    const { password, ...userWithoutPassword } = { ...user, _id: userId };

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: UserLoginInput): Promise<AuthResponse> {
    const user = await this.usersCollection.findOne({ email: input.email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    const tokens = generateTokens(user._id!.toString(), user.email, user.role);

    await this.usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );

    const { password, ...userWithoutPassword } = user;

    // Cache user profile for 1 hour
    try {
      if (redis.isConnectionActive()) {
        const cacheKey = `user:profile:${user._id}`;
        await redis
          .getClient()
          .setEx(cacheKey, 3600, JSON.stringify(userWithoutPassword));
        console.log(`💾 Cached user profile: ${user.email}`);
      }
    } catch (error) {
      console.warn("User cache failed:", error);
    }

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Get user by ID (with cache)
   */
  async getUserById(id: string): Promise<User | null> {
    // Try cache first
    try {
      if (redis.isConnectionActive()) {
        const cacheKey = `user:profile:${id}`;
        const cached = await redis.getClient().get(cacheKey);
        if (cached) {
          console.log(`📦 Cache hit for user: ${id}`);
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn("User cache read failed:", error);
    }

    // Get from database
    const user = await this.usersCollection.findOne({ _id: new ObjectId(id) });

    // Cache the result if found
    if (user) {
      try {
        if (redis.isConnectionActive()) {
          const cacheKey = `user:profile:${id}`;
          const { password, ...userWithoutPassword } = user;
          await redis
            .getClient()
            .setEx(cacheKey, 3600, JSON.stringify(userWithoutPassword));
          console.log(`💾 Cached user from DB: ${user.email}`);
        }
      } catch (error) {
        console.warn("User cache write failed:", error);
      }
    }

    return user;
  }
}

export const userService = new UserService();
