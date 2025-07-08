import { ObjectId } from "mongodb";
import { getCollection, COLLECTIONS } from "../config/database";
import { redis } from "../config/redis";
import {
  IRoom,
  ICreateRoom,
  IUpdateRoom,
  IRoomFilter,
  IRoomAvailabilityFilter,
  IRoomWithPrice,
  IRoomAvailability,
  RoomCategory,
  RoomStatus,
} from "../models/Room";
import { IBooking, BookingStatus } from "../models/Booking";
import { PaginatedResponse } from "../types";

export class RoomService {
  private get roomsCollection() {
    return getCollection<IRoom>(COLLECTIONS.ROOMS);
  }

  private get bookingsCollection() {
    return getCollection<IBooking>(COLLECTIONS.BOOKINGS);
  }

  /**
   * Create a new room
   */
  async createRoom(roomData: ICreateRoom): Promise<IRoom> {
    const existingRoom = await this.roomsCollection.findOne({
      roomNumber: roomData.roomNumber,
    });

    if (existingRoom) {
      throw new Error(`Room number ${roomData.roomNumber} already exists`);
    }

    const room: Omit<IRoom, "_id"> = {
      ...roomData,
      status: RoomStatus.AVAILABLE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.roomsCollection.insertOne(room);
    return { ...room, _id: result.insertedId };
  }

  /**
   * Update room
   */
  async updateRoom(roomId: string, updateData: IUpdateRoom): Promise<IRoom> {
    const objectId = new ObjectId(roomId);

    const updateDoc: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await this.roomsCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Room not found");
    }

    return result;
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<void> {
    const objectId = new ObjectId(roomId);

    const activeBookings = await this.bookingsCollection.countDocuments({
      roomId: objectId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      checkOutDate: { $gte: new Date() },
    });

    if (activeBookings > 0) {
      throw new Error("Cannot delete room with active bookings");
    }

    const result = await this.roomsCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      throw new Error("Room not found");
    }
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string): Promise<IRoom | null> {
    const objectId = new ObjectId(roomId);
    return await this.roomsCollection.findOne({ _id: objectId });
  }

  /**
   * Get rooms with filtering and pagination
   */
  async getRooms(
    filter: IRoomFilter,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<IRoom>> {
    const mongoFilter: any = {};

    if (filter.category) {
      mongoFilter.category = Array.isArray(filter.category)
        ? { $in: filter.category }
        : filter.category;
    }

    if (filter.status) {
      mongoFilter.status = Array.isArray(filter.status)
        ? { $in: filter.status }
        : filter.status;
    }

    if (filter.floor !== undefined) {
      mongoFilter.floor = filter.floor;
    }

    if (filter.isActive !== undefined) {
      mongoFilter.isActive = filter.isActive;
    }

    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.roomsCollection
        .find(mongoFilter)
        .sort({ roomNumber: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.roomsCollection.countDocuments(mongoFilter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: "Rooms retrieved successfully",
      data: rooms,
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
   * Check room availability for date range (with Redis cache using dedicated methods)
   */
  async checkRoomAvailability(
    filter: IRoomAvailabilityFilter
  ): Promise<IRoomAvailability[]> {
    const dateRange = `${filter.checkInDate.toISOString()}_${filter.checkOutDate.toISOString()}`;

    const roomFilter: any = { isActive: true };

    if (filter.category) {
      roomFilter.category = filter.category;
    }

    if (filter.maxOccupancy) {
      roomFilter["dimensions.maxOccupancy"] = { $gte: filter.maxOccupancy };
    }

    const rooms = await this.roomsCollection.find(roomFilter).toArray();

    const availabilityPromises = rooms.map(async (room) => {
      const roomId = room._id!.toString();

      // Check Redis cache first using dedicated method
      let isAvailable = null;
      try {
        if (redis.isConnectionActive()) {
          isAvailable = await redis.getRoomAvailability(roomId, dateRange);
          if (isAvailable !== null) {
            console.log(
              `📦 Cache hit for room ${room.roomNumber} availability`
            );
          }
        }
      } catch (error) {
        console.warn(`Cache read failed for room ${roomId}:`, error);
      }

      let conflictingBookings: ObjectId[] = [];

      // If not in cache, check database
      if (isAvailable === null) {
        const bookings = await this.bookingsCollection
          .find({
            roomId: room._id,
            status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            $or: [
              {
                checkInDate: { $lt: filter.checkOutDate },
                checkOutDate: { $gt: filter.checkInDate },
              },
            ],
            ...(filter.excludeBookingId && {
              _id: { $ne: filter.excludeBookingId },
            }),
          })
          .toArray();

        isAvailable = bookings.length === 0;
        conflictingBookings = bookings.map((b) => b._id!);

        // Cache the result using dedicated Redis method
        try {
          if (redis.isConnectionActive()) {
            await redis.setRoomAvailability(
              roomId,
              dateRange,
              isAvailable,
              300
            ); // 5 minutes TTL
            console.log(
              `💾 Cached availability for room ${room.roomNumber}: ${isAvailable}`
            );
          }
        } catch (error) {
          console.warn(`Cache write failed for room ${roomId}:`, error);
        }
      }
      // If from cache and not available, we need to fetch conflicting bookings
      else if (!isAvailable) {
        const bookings = await this.bookingsCollection
          .find({
            roomId: room._id,
            status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            $or: [
              {
                checkInDate: { $lt: filter.checkOutDate },
                checkOutDate: { $gt: filter.checkInDate },
              },
            ],
            ...(filter.excludeBookingId && {
              _id: { $ne: filter.excludeBookingId },
            }),
          })
          .toArray();

        conflictingBookings = bookings.map((b) => b._id!);
      }

      return {
        _id: room._id!,
        roomNumber: room.roomNumber,
        category: room.category,
        bedType: room.bedType,
        maxOccupancy: room.dimensions.maxOccupancy,
        amenities: room.amenities,
        basePrice: room.pricing.basePrice,
        description: room.description,
        isAvailable,
        conflictingBookings,
      };
    });

    const results = await Promise.all(availabilityPromises);
    return results;
  }

  /**
   * Get available rooms with pricing
   */
  async getAvailableRoomsWithPricing(
    filter: IRoomAvailabilityFilter
  ): Promise<IRoomWithPrice[]> {
    const availability = await this.checkRoomAvailability(filter);
    const availableRooms = availability.filter((room) => room.isAvailable);

    if (availableRooms.length === 0) {
      return [];
    }

    const roomIds = availableRooms.map((room) => room._id);
    const rooms = await this.roomsCollection
      .find({ _id: { $in: roomIds } })
      .toArray();

    const totalNights = Math.ceil(
      (filter.checkOutDate.getTime() - filter.checkInDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return rooms.map((room) => {
      const calculatedPrice = room.pricing.basePrice * totalNights;
      return {
        ...room,
        calculatedPrice,
        originalPrice: room.pricing.basePrice * totalNights,
        appliedDiscounts: [],
        totalNights,
      };
    });
  }

  /**
   * Get rooms by category
   */
  async getRoomsByCategory(category: RoomCategory): Promise<IRoom[]> {
    return await this.roomsCollection
      .find({ category, isActive: true })
      .sort({ roomNumber: 1 })
      .toArray();
  }

  /**
   * Update room status
   */
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<IRoom> {
    const objectId = new ObjectId(roomId);

    const result = await this.roomsCollection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("Room not found");
    }

    return result;
  }

  /**
   * Get simple room statistics
   */
  async getRoomCategoryStats(): Promise<any[]> {
    const pipeline = [
      {
        $group: {
          _id: "$category",
          totalRooms: { $sum: 1 },
          availableRooms: {
            $sum: { $cond: [{ $eq: ["$status", RoomStatus.AVAILABLE] }, 1, 0] },
          },
          occupiedRooms: {
            $sum: { $cond: [{ $eq: ["$status", RoomStatus.OCCUPIED] }, 1, 0] },
          },
          averagePrice: { $avg: "$pricing.basePrice" },
        },
      },
      {
        $project: {
          category: "$_id",
          totalRooms: 1,
          availableRooms: 1,
          occupiedRooms: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
          _id: 0,
        },
      },
      { $sort: { totalRooms: -1 } },
    ];

    return await this.roomsCollection.aggregate(pipeline).toArray();
  }
}

export const roomService = new RoomService();
