import { z } from "zod";
import { RoomCategory, BedType, RoomStatus, RoomAmenity } from "../models/Room";

// Room Dimensions Schema
export const roomDimensionsSchema = z.object({
  area: z.number().positive("Area must be positive"),
  bedrooms: z.number().int().min(0, "Bedrooms cannot be negative"),
  bathrooms: z.number().int().min(1, "At least 1 bathroom required"),
  maxOccupancy: z
    .number()
    .int()
    .min(1, "Max occupancy must be at least 1")
    .max(10, "Max occupancy cannot exceed 10"),
  extraBedCapacity: z
    .number()
    .int()
    .min(0, "Extra bed capacity cannot be negative"),
});

// Room Pricing Schema
export const roomPricingSchema = z.object({
  basePrice: z.number().positive("Base price must be positive"),
  weekendSurcharge: z
    .number()
    .min(0, "Weekend surcharge cannot be negative")
    .default(0),
  seasonalRates: z
    .object({
      summer: z.number().positive().optional(),
      winter: z.number().positive().optional(),
      spring: z.number().positive().optional(),
      autumn: z.number().positive().optional(),
    })
    .optional(),
  discounts: z
    .object({
      weekly: z.number().min(0).max(100).optional(),
      monthly: z.number().min(0).max(100).optional(),
      earlyBird: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

// Amenities Schema
export const amenitiesSchema = z
  .array(z.nativeEnum(RoomAmenity))
  .min(1, "At least one amenity is required")
  .refine(
    (amenities) => new Set(amenities).size === amenities.length,
    "Duplicate amenities are not allowed"
  );

// Create Room Schema
export const createRoomSchema = z.object({
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number cannot exceed 10 characters")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Room number can only contain letters, numbers, and hyphens"
    ),
  category: z.nativeEnum(RoomCategory, {
    errorMap: () => ({
      message: `Category must be one of: ${Object.values(RoomCategory).join(
        ", "
      )}`,
    }),
  }),
  floor: z
    .number()
    .int("Floor must be an integer")
    .min(1, "Floor must be at least 1")
    .max(50, "Floor cannot exceed 50"),
  bedType: z.nativeEnum(BedType, {
    errorMap: () => ({
      message: `Bed type must be one of: ${Object.values(BedType).join(", ")}`,
    }),
  }),
  dimensions: roomDimensionsSchema,
  amenities: amenitiesSchema,
  pricing: roomPricingSchema,
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters"),
});

// Update Room Schema
export const updateRoomSchema = z.object({
  category: z.nativeEnum(RoomCategory).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  floor: z.number().int().min(1).max(50).optional(),
  bedType: z.nativeEnum(BedType).optional(),
  dimensions: roomDimensionsSchema.partial().optional(),
  amenities: amenitiesSchema.optional(),
  pricing: roomPricingSchema.partial().optional(),
  description: z.string().min(10).max(500).optional(),
  isActive: z.boolean().optional(),
  housekeepingNotes: z.string().max(1000).optional(),
});

// Room Filter Schema
export const roomFilterSchema = z.object({
  category: z
    .union([z.nativeEnum(RoomCategory), z.array(z.nativeEnum(RoomCategory))])
    .optional(),
  status: z
    .union([z.nativeEnum(RoomStatus), z.array(z.nativeEnum(RoomStatus))])
    .optional(),
  floor: z
    .union([
      z.number().int(),
      z.object({
        gte: z.number().int().optional(),
        lte: z.number().int().optional(),
      }),
    ])
    .optional(),
  bedType: z
    .union([z.nativeEnum(BedType), z.array(z.nativeEnum(BedType))])
    .optional(),
  isActive: z.boolean().optional(),
  maxOccupancy: z
    .object({
      gte: z.number().int().min(1).optional(),
    })
    .optional(),
  priceRange: z
    .object({
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
    })
    .refine(
      (data) => !data.min || !data.max || data.min <= data.max,
      "Minimum price cannot be greater than maximum price"
    )
    .optional(),
  amenities: z.array(z.nativeEnum(RoomAmenity)).optional(),
  averageRating: z
    .object({
      gte: z.number().min(0).max(5).optional(),
    })
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 10, 100))
    .optional(),
});

// Room Availability Schema
export const roomAvailabilitySchema = z
  .object({
    checkInDate: z.string().datetime("Invalid check-in date format"),
    checkOutDate: z.string().datetime("Invalid check-out date format"),
    category: z.nativeEnum(RoomCategory).optional(),
    maxOccupancy: z
      .string()
      .transform((val) => parseInt(val))
      .optional(),
    amenities: z.array(z.nativeEnum(RoomAmenity)).optional(),
  })
  .refine(
    (data) => new Date(data.checkInDate) < new Date(data.checkOutDate),
    "Check-in date must be before check-out date"
  );

// Types
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomFilterInput = z.infer<typeof roomFilterSchema>;
export type RoomAvailabilityInput = z.infer<typeof roomAvailabilitySchema>;

// Validators object
export const roomValidators = {
  createRoom: createRoomSchema,
  updateRoom: updateRoomSchema,
  roomFilter: roomFilterSchema,
  roomAvailability: roomAvailabilitySchema,
};
