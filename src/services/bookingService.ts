import { ObjectId } from "mongodb";
import { getCollection, COLLECTIONS } from "../config/database";
import { redis } from "../config/redis";
import { createBookingLock } from "../utils/redisLock";
import {
  IBooking,
  ICreateBooking,
  IUpdateBooking,
  IBookingFilter,
  IBookingDetails,
  BookingStatus,
  PaymentStatus,
} from "../models/Booking";
import { IRoom } from "../models/Room";
import { PaginatedResponse } from "../types";

export interface IBookingValidation {
  isValid: boolean;
  errors: string[];
}

export class BookingService {
  private get bookingsCollection() {
    return getCollection<IBooking>(COLLECTIONS.BOOKINGS);
  }

  private get roomsCollection() {
    return getCollection<IRoom>(COLLECTIONS.ROOMS);
  }

  /**
   * Create a new booking
   */
  async createBooking(
    userId: string,
    bookingData: ICreateBooking
  ): Promise<IBooking> {
    const userObjectId = new ObjectId(userId);
    const roomObjectId = new ObjectId(bookingData.roomId);

    // Create distributed lock for this room and date range
    const bookingLock = createBookingLock(
      roomObjectId.toString(),
      bookingData.checkInDate,
      bookingData.checkOutDate
    );

    // Execute booking creation with lock to prevent concurrent bookings
    return await bookingLock.withLock(async () => {
      console.log(
        `🔒 Creating booking with lock for room ${roomObjectId.toString()} from ${bookingData.checkInDate.toISOString()} to ${bookingData.checkOutDate.toISOString()}`
      );

      // Validate the booking (re-check inside lock for race conditions)
      const validation = await this.validateBooking(bookingData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      // Get room for pricing
      const room = await this.roomsCollection.findOne({ _id: roomObjectId });
      if (!room) {
        throw new Error("Room not found");
      }

      // Simple price calculation
      const totalNights = Math.ceil(
        (bookingData.checkOutDate.getTime() -
          bookingData.checkInDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const totalAmount = room.pricing.basePrice * totalNights;

      const booking: Omit<IBooking, "_id"> = {
        userId: userObjectId,
        roomId: roomObjectId,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        numberOfGuests: bookingData.numberOfGuests,
        totalAmount,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        ...(bookingData.specialRequests && {
          specialRequests: bookingData.specialRequests,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.bookingsCollection.insertOne(booking);

      // Invalidate room availability cache using Redis built-in method
      try {
        if (redis.isConnectionActive()) {
          await redis.invalidateRoomCache(roomObjectId.toString());
        }
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }

      console.log(
        `✅ Booking created successfully with ID: ${result.insertedId}`
      );
      return { ...booking, _id: result.insertedId };
    });
  }

  /**
   * Validate booking for conflicts
   */
  async validateBooking(
    bookingData: ICreateBooking
  ): Promise<IBookingValidation> {
    const errors: string[] = [];
    const roomObjectId = new ObjectId(bookingData.roomId);

    // Basic validation
    if (bookingData.checkInDate >= bookingData.checkOutDate) {
      errors.push("Check-in date must be before check-out date");
    }

    if (bookingData.checkInDate < new Date()) {
      errors.push("Check-in date cannot be in the past");
    }

    if (bookingData.numberOfGuests <= 0) {
      errors.push("Number of guests must be greater than 0");
    }

    // Get room details
    const room = await this.roomsCollection.findOne({ _id: roomObjectId });
    if (!room) {
      errors.push("Room not found");
      return { isValid: false, errors };
    }

    if (!room.isActive) {
      errors.push("Room is not available for booking");
    }

    if (bookingData.numberOfGuests > room.dimensions.maxOccupancy) {
      errors.push(
        `Number of guests exceeds room capacity (${room.dimensions.maxOccupancy})`
      );
    }

    // Check for conflicting bookings
    const conflictingBookings = await this.bookingsCollection
      .find({
        roomId: roomObjectId,
        status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        $or: [
          {
            checkInDate: { $lt: bookingData.checkOutDate },
            checkOutDate: { $gt: bookingData.checkInDate },
          },
        ],
      })
      .toArray();

    if (conflictingBookings.length > 0) {
      errors.push("Room is not available for the selected dates");
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    updateData: IUpdateBooking
  ): Promise<IBooking> {
    const objectId = new ObjectId(bookingId);

    const updateDoc: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await this.bookingsCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Booking not found");
    }

    // Invalidate room cache if dates changed using Redis built-in method
    try {
      if (
        redis.isConnectionActive() &&
        (updateData.checkInDate || updateData.checkOutDate)
      ) {
        await redis.invalidateRoomCache(result.roomId.toString());
      }
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
    }

    return result;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<IBooking> {
    const objectId = new ObjectId(bookingId);

    const result = await this.bookingsCollection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: BookingStatus.CANCELLED,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Booking not found");
    }

    // Invalidate room cache when booking is cancelled
    try {
      if (redis.isConnectionActive()) {
        await this.invalidateRoomCache(result.roomId.toString());
      }
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
    }

    return result;
  }

  /**
   * Confirm booking
   */
  async confirmBooking(bookingId: string): Promise<IBooking> {
    const objectId = new ObjectId(bookingId);

    const result = await this.bookingsCollection.findOneAndUpdate(
      { _id: objectId, status: BookingStatus.PENDING },
      {
        $set: {
          status: BookingStatus.CONFIRMED,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Booking not found or cannot be confirmed");
    }

    // Invalidate room cache when booking is confirmed
    try {
      if (redis.isConnectionActive()) {
        await this.invalidateRoomCache(result.roomId.toString());
      }
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
    }

    return result;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<IBooking | null> {
    const objectId = new ObjectId(bookingId);
    return await this.bookingsCollection.findOne({ _id: objectId });
  }

  /**
   * Get booking with details
   */
  async getBookingDetails(bookingId: string): Promise<IBookingDetails | null> {
    const objectId = new ObjectId(bookingId);

    const pipeline = [
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: COLLECTIONS.ROOMS,
          localField: "roomId",
          foreignField: "_id",
          as: "roomData",
        },
      },
      {
        $lookup: {
          from: COLLECTIONS.USERS,
          localField: "userId",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$roomData" },
      { $unwind: "$userData" },
      {
        $project: {
          _id: 1,
          userId: 1,
          roomId: 1,
          checkInDate: 1,
          checkOutDate: 1,
          numberOfGuests: 1,
          totalAmount: 1,
          status: 1,
          paymentStatus: 1,
          specialRequests: 1,
          createdAt: 1,
          updatedAt: 1,
          room: {
            roomNumber: "$roomData.roomNumber",
            category: "$roomData.category",
            bedType: "$roomData.bedType",
          },
          user: {
            firstName: "$userData.firstName",
            lastName: "$userData.lastName",
            email: "$userData.email",
            phone: "$userData.phone",
          },
        },
      },
    ];

    const result = await this.bookingsCollection.aggregate(pipeline).toArray();
    return result.length > 0 ? (result[0] as IBookingDetails) : null;
  }

  /**
   * Get bookings with filtering
   */
  async getBookings(
    filter: IBookingFilter,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<IBookingDetails>> {
    const mongoFilter: any = {};

    if (filter.userId) {
      mongoFilter.userId = new ObjectId(filter.userId);
    }

    if (filter.roomId) {
      mongoFilter.roomId = new ObjectId(filter.roomId);
    }

    if (filter.status) {
      mongoFilter.status = Array.isArray(filter.status)
        ? { $in: filter.status }
        : filter.status;
    }

    if (filter.paymentStatus) {
      mongoFilter.paymentStatus = filter.paymentStatus;
    }

    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: mongoFilter },
      {
        $lookup: {
          from: COLLECTIONS.ROOMS,
          localField: "roomId",
          foreignField: "_id",
          as: "roomData",
        },
      },
      { $unwind: "$roomData" },
      {
        $lookup: {
          from: COLLECTIONS.USERS,
          localField: "userId",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          _id: 1,
          userId: 1,
          roomId: 1,
          checkInDate: 1,
          checkOutDate: 1,
          numberOfGuests: 1,
          totalAmount: 1,
          status: 1,
          paymentStatus: 1,
          specialRequests: 1,
          createdAt: 1,
          updatedAt: 1,
          room: {
            roomNumber: "$roomData.roomNumber",
            category: "$roomData.category",
            bedType: "$roomData.bedType",
          },
          user: {
            firstName: "$userData.firstName",
            lastName: "$userData.lastName",
            email: "$userData.email",
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline = [{ $match: mongoFilter }, { $count: "total" }];

    const [bookings, countResult] = await Promise.all([
      this.bookingsCollection.aggregate(pipeline).toArray(),
      this.bookingsCollection.aggregate(countPipeline).toArray(),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: "Bookings retrieved successfully",
      data: bookings as IBookingDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<IBookingDetails>> {
    const userObjectId = new ObjectId(userId);
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: COLLECTIONS.ROOMS,
          localField: "roomId",
          foreignField: "_id",
          as: "roomData",
        },
      },
      { $unwind: "$roomData" },
      {
        $project: {
          _id: 1,
          userId: 1,
          roomId: 1,
          checkInDate: 1,
          checkOutDate: 1,
          numberOfGuests: 1,
          totalAmount: 1,
          status: 1,
          paymentStatus: 1,
          specialRequests: 1,
          createdAt: 1,
          updatedAt: 1,
          room: {
            roomNumber: "$roomData.roomNumber",
            category: "$roomData.category",
            bedType: "$roomData.bedType",
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline = [
      { $match: { userId: userObjectId } },
      { $count: "total" },
    ];

    const [bookings, countResult] = await Promise.all([
      this.bookingsCollection.aggregate(pipeline).toArray(),
      this.bookingsCollection.aggregate(countPipeline).toArray(),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: "User bookings retrieved successfully",
      data: bookings as IBookingDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get simple booking statistics
   */
  async getBookingStats(): Promise<any | null> {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          pendingBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BookingStatus.PENDING] }, 1, 0],
            },
          },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BookingStatus.CONFIRMED] }, 1, 0],
            },
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BookingStatus.CANCELLED] }, 1, 0],
            },
          },
          totalRevenue: { $sum: "$totalAmount" },
          averageBookingValue: { $avg: "$totalAmount" },
        },
      },
    ];

    const result = await this.bookingsCollection.aggregate(pipeline).toArray();

    if (result.length === 0) {
      return {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        averageBookingValue: 0,
      };
    }

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Invalidate room cache when booking changes
   */
  private async invalidateRoomCache(roomId: string): Promise<void> {
    try {
      if (!redis.isConnectionActive()) return;

      const client = redis.getClient();
      const pattern = `room:availability:*${roomId}*`;

      const keys: string[] = [];
      for await (const key of client.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }

      // Also invalidate general room availability searches
      const searchPattern = `room:availability:search:*`;
      for await (const key of client.scanIterator({ MATCH: searchPattern })) {
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

export const bookingService = new BookingService();
