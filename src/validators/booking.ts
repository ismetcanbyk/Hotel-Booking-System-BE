import { z } from "zod";
import { BookingStatus, PaymentStatus } from "../models/Booking";

// Object ID validation helper
const objectIdSchema = z
  .string()
  .length(24, "Invalid ID format")
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

// Date validation helpers
const dateStringSchema = z
  .string()
  .datetime(
    "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)"
  )
  .transform((str) => new Date(str));

const futureDateSchema = dateStringSchema.refine(
  (date) => date > new Date(),
  "Date must be in the future"
);

// Create Booking Schema
export const createBookingSchema = z
  .object({
    roomId: objectIdSchema,
    checkInDate: futureDateSchema,
    checkOutDate: dateStringSchema,
    numberOfGuests: z
      .number()
      .int("Number of guests must be an integer")
      .min(1, "At least 1 guest is required")
      .max(10, "Maximum 10 guests allowed"),
    specialRequests: z
      .string()
      .max(1000, "Special requests cannot exceed 1000 characters")
      .optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  })
  .refine(
    (data) => {
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    },
    {
      message: "Booking cannot exceed 30 days",
      path: ["checkOutDate"],
    }
  );

// Update Booking Schema
export const updateBookingSchema = z
  .object({
    checkInDate: futureDateSchema.optional(),
    checkOutDate: dateStringSchema.optional(),
    numberOfGuests: z
      .number()
      .int("Number of guests must be an integer")
      .min(1, "At least 1 guest is required")
      .max(10, "Maximum 10 guests allowed")
      .optional(),
    status: z
      .nativeEnum(BookingStatus, {
        errorMap: () => ({
          message: `Status must be one of: ${Object.values(BookingStatus).join(
            ", "
          )}`,
        }),
      })
      .optional(),
    paymentStatus: z
      .nativeEnum(PaymentStatus, {
        errorMap: () => ({
          message: `Payment status must be one of: ${Object.values(
            PaymentStatus
          ).join(", ")}`,
        }),
      })
      .optional(),
    specialRequests: z
      .string()
      .max(1000, "Special requests cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.checkInDate && data.checkOutDate) {
        return data.checkOutDate > data.checkInDate;
      }
      return true;
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["checkOutDate"],
    }
  );

// Cancel Booking Schema
export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .min(1, "Cancellation reason is required")
    .max(500, "Cancellation reason cannot exceed 500 characters")
    .optional(),
});

// Booking Filter Schema (for query parameters)
export const bookingFilterSchema = z
  .object({
    userId: objectIdSchema.optional(),
    roomId: objectIdSchema.optional(),
    status: z
      .union([
        z.nativeEnum(BookingStatus),
        z.array(z.nativeEnum(BookingStatus)),
      ])
      .optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    checkInDateFrom: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .optional(),
    checkInDateTo: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .optional(),
    checkOutDateFrom: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .optional(),
    checkOutDateTo: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .optional(),
    page: z
      .string()
      .transform((val) => Math.max(1, parseInt(val) || 1))
      .optional(),
    limit: z
      .string()
      .transform((val) => Math.min(Math.max(1, parseInt(val) || 10), 100))
      .optional(),
  })
  .refine((data) => {
    if (data.checkInDateFrom && data.checkInDateTo) {
      return data.checkInDateFrom <= data.checkInDateTo;
    }
    return true;
  }, "Check-in date 'from' cannot be after 'to'")
  .refine((data) => {
    if (data.checkOutDateFrom && data.checkOutDateTo) {
      return data.checkOutDateFrom <= data.checkOutDateTo;
    }
    return true;
  }, "Check-out date 'from' cannot be after 'to'");

// User Bookings Schema (simpler filter for customer)
export const userBookingsSchema = z.object({
  status: z
    .union([z.nativeEnum(BookingStatus), z.array(z.nativeEnum(BookingStatus))])
    .optional(),
  page: z
    .string()
    .transform((val) => Math.max(1, parseInt(val) || 1))
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(Math.max(1, parseInt(val) || 10), 50))
    .optional(),
});

// Booking ID Parameter Schema
export const bookingIdSchema = z.object({
  id: objectIdSchema,
});

// Date availability check schema
export const dateRangeSchema = z
  .object({
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
  })
  .refine(
    (data) => new Date(data.checkInDate) < new Date(data.checkOutDate),
    "Check-in date must be before check-out date"
  )
  .refine(
    (data) => new Date(data.checkInDate) >= new Date(),
    "Check-in date cannot be in the past"
  );

// Types
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;
export type UserBookingsInput = z.infer<typeof userBookingsSchema>;
export type BookingIdInput = z.infer<typeof bookingIdSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// Validators object
export const bookingValidators = {
  createBooking: createBookingSchema,
  updateBooking: updateBookingSchema,
  cancelBooking: cancelBookingSchema,
  bookingFilter: bookingFilterSchema,
  userBookings: userBookingsSchema,
  bookingId: bookingIdSchema,
  dateRange: dateRangeSchema,
};
