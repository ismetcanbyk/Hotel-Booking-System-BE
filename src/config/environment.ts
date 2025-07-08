import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  PORT: z
    .string()
    .default("8080")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database Configuration
  MONGODB_URI: z
    .string()
    .default("mongodb://localhost:27017/hotel-booking-system"),
  MONGODB_DB_NAME: z.string().default("hotel-booking-system"),

  // JWT Configuration
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // Redis Configuration
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z
    .string()
    .default("0")
    .transform((val) => parseInt(val, 10)),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: z
    .string()
    .default("12")
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000")
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),

  // CORS Configuration
  CORS_ORIGIN: z.string().default("*"),
  CORS_CREDENTIALS: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  // Application Configuration

  CACHE_TTL: z
    .string()
    .default("3600")
    .transform((val) => parseInt(val, 10)),
});

// Parse and validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

// Derived configurations
export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === "development",
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
  },
  database: {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },
  security: {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },
  cors: {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: env.CORS_CREDENTIALS,
  },
  application: {
    cacheTtl: env.CACHE_TTL,
  },
} as const;
