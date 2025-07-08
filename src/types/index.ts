import { ObjectId } from "mongodb";

// Export all models
export * from "../models/User";
export * from "../models/Room";
export * from "../models/Booking";

// Base interfaces
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// User related types
export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export interface User extends BaseDocument {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface UserRegistrationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

// Room related types
export enum RoomCategory {
  BASIC = "basic",
  PREMIUM = "premium",
  SUITE = "suite",
}

export interface RoomAmenities {
  wifi: boolean;
  airConditioning: boolean;
  television: boolean;
  minibar: boolean;
  balcony: boolean;
  oceanView: boolean;
  kitchenette: boolean;
  jacuzzi: boolean;
}

export interface Room extends BaseDocument {
  roomNumber: string;
  category: RoomCategory;
  floor: number;
  capacity: number;
  basePrice: number;
  description: string;
  amenities: RoomAmenities;
  images: string[];
  isActive: boolean;
  maintenanceNotes?: string;
  lastMaintenanceDate?: Date;
}

export interface RoomCreateInput {
  roomNumber: string;
  category: RoomCategory;
  floor: number;
  capacity: number;
  basePrice: number;
  description: string;
  amenities: RoomAmenities;
  images?: string[];
}

export interface RoomUpdateInput {
  roomNumber?: string;
  category?: RoomCategory;
  floor?: number;
  capacity?: number;
  basePrice?: number;
  description?: string;
  amenities?: Partial<RoomAmenities>;
  images?: string[];
  isActive?: boolean;
  maintenanceNotes?: string;
}

export interface RoomAvailabilityQuery {
  checkInDate: Date;
  checkOutDate: Date;
  capacity?: number;
  category?: RoomCategory;
}

// Booking related types
export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export interface Booking extends BaseDocument {
  userId: ObjectId;
  roomId: ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  totalAmount: number;
  status: BookingStatus;
  specialRequests?: string;
  cancellationReason?: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentId?: string;
  confirmedAt?: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  cancelledAt?: Date;
}

export interface BookingCreateInput {
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  specialRequests?: string;
}

export interface BookingUpdateInput {
  checkInDate?: Date;
  checkOutDate?: Date;
  guests?: number;
  specialRequests?: string;
  status?: BookingStatus;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  tokens: AuthTokens;
}

// Query and Filter types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RoomFilters extends PaginationQuery {
  category?: RoomCategory;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  amenities?: Partial<RoomAmenities>;
  isActive?: boolean;
}

export interface BookingFilters extends PaginationQuery {
  userId?: string;
  roomId?: string;
  status?: BookingStatus;
  checkInDate?: Date;
  checkOutDate?: Date;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UserFilters extends PaginationQuery {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

// Analytics and reporting types
export interface RoomOccupancyReport {
  roomId: string;
  roomNumber: string;
  category: RoomCategory;
  totalDays: number;
  occupiedDays: number;
  occupancyRate: number;
  revenue: number;
  averageDailyRate: number;
}

export interface BookingAnalytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  occupancyRate: number;
  topRoomCategories: Array<{
    category: RoomCategory;
    bookings: number;
    revenue: number;
  }>;
}

export interface MonthlyAnalytics {
  month: string;
  year: number;
  bookings: BookingAnalytics;
  rooms: RoomOccupancyReport[];
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: ValidationError[];
}

// Request context types
export interface AuthenticatedRequest {
  user: User;
}

// Express Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Utility types
export type CreateInput<T> = Omit<T, keyof BaseDocument>;
export type UpdateInput<T> = Partial<Omit<T, keyof BaseDocument | "_id">>;
export type PublicUser = Omit<
  User,
  "password" | "emailVerificationToken" | "passwordResetToken"
>;

// Database query helpers
export interface MongoQuery {
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  projection?: Record<string, 0 | 1>;
}

// Rate limiting types
export interface RateLimitInfo {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RoomAvailabilityCache {
  isAvailable: boolean;
  timestamp: number;
}
