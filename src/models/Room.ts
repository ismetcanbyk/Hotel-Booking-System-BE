import { ObjectId } from "mongodb";

export enum RoomCategory {
  BASIC = "basic",
  PREMIUM = "premium",
  SUITE = "suite",
}

export enum RoomStatus {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  MAINTENANCE = "maintenance",
  OUT_OF_ORDER = "out_of_order",
}

export enum BedType {
  SINGLE = "single",
  DOUBLE = "double",
  QUEEN = "queen",
  KING = "king",
  TWIN = "twin",
}

export enum RoomAmenity {
  WIFI = "WiFi",
  AIR_CONDITIONING = "AC",
  TELEVISION = "TV",
  MINIBAR = "Minibar",
  BALCONY = "Balcony",
  SAFE = "Safe",
}

export type IRoomAmenities = RoomAmenity[];

export interface IRoomPricing {
  basePrice: number;
  weekendSurcharge: number;
  seasonalRates?: {
    summer?: number;
    winter?: number;
    spring?: number;
    autumn?: number;
  };
  discounts?: {
    weekly?: number;
    monthly?: number;
    earlyBird?: number;
  };
}

export interface IRoomDimensions {
  area: number;
  bedrooms: number;
  bathrooms: number;
  maxOccupancy: number;
  extraBedCapacity: number;
}

export interface IRoom {
  _id?: ObjectId;
  roomNumber: string;
  category: RoomCategory;
  status: RoomStatus;
  floor: number;
  bedType: BedType;
  dimensions: IRoomDimensions;
  amenities: IRoomAmenities;
  pricing: IRoomPricing;
  description: string;
  isActive: boolean;
  housekeepingNotes?: string;
  maintenanceHistory?: {
    date: Date;
    description: string;
    cost?: number;
    performedBy: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  lastOccupiedAt?: Date;
  averageRating?: number;
  totalReviews?: number;
}

export interface ICreateRoom {
  roomNumber: string;
  category: RoomCategory;
  floor: number;
  bedType: BedType;
  dimensions: IRoomDimensions;
  amenities: IRoomAmenities;
  pricing: IRoomPricing;
  description: string;
}

export interface IUpdateRoom {
  category?: RoomCategory;
  status?: RoomStatus;
  floor?: number;
  bedType?: BedType;
  dimensions?: Partial<IRoomDimensions>;
  amenities?: IRoomAmenities;
  pricing?: Partial<IRoomPricing>;
  description?: string;
  isActive?: boolean;
  housekeepingNotes?: string;
}

export interface IRoomFilter {
  category?: RoomCategory | RoomCategory[];
  status?: RoomStatus | RoomStatus[];
  floor?: number | { $gte?: number; $lte?: number };
  bedType?: BedType | BedType[];
  isActive?: boolean;
  maxOccupancy?: { $gte?: number };
  priceRange?: {
    min?: number;
    max?: number;
  };
  amenities?: IRoomAmenities;
  averageRating?: { $gte?: number };
}

export interface IRoomAvailabilityFilter {
  checkInDate: Date;
  checkOutDate: Date;
  excludeBookingId?: ObjectId;
  category?: RoomCategory | RoomCategory[];
  maxOccupancy?: number;
  amenities?: IRoomAmenities;
}

export interface IRoomWithPrice extends IRoom {
  calculatedPrice: number;
  originalPrice: number;
  appliedDiscounts: string[];
  totalNights: number;
}

export interface IRoomOccupancyStats {
  _id: ObjectId;
  roomNumber: string;
  category: RoomCategory;
  totalBookings: number;
  occupancyRate: number;
  averageStayDuration: number;
  totalRevenue: number;
  averageRating: number;
}

export interface IRoomCategoryStats {
  category: RoomCategory;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  averageOccupancyRate: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface IRoomAvailability {
  _id: ObjectId;
  roomNumber: string;
  category: RoomCategory;
  bedType: BedType;
  maxOccupancy: number;
  amenities: IRoomAmenities;
  basePrice: number;
  description: string;
  isAvailable: boolean;
  conflictingBookings?: ObjectId[];
}
