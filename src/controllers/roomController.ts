import { Request, Response } from "express";
import { roomService } from "../services/roomService";
import { ICreateRoom, IUpdateRoom } from "../models/Room";
import { ResponseHelper } from "../utils/response";
import { ValidationHelper } from "../utils/validation";
import { asyncHandler } from "../middleware/errorHandler";

export class RoomController {
  createRoom = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const roomData: ICreateRoom = req.body;
      const room = await roomService.createRoom(roomData);
      ResponseHelper.success(res, room, "Room created successfully");
    }
  );

  getRooms = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { category, status, floor, isActive, page, limit } = req.query;
      const { page: safePage, limit: safeLimit } =
        ValidationHelper.sanitizePagination(page, limit);

      const filter: any = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (floor) filter.floor = parseInt(floor as string);
      if (isActive !== undefined) filter.isActive = isActive === "true";

      const result = await roomService.getRooms(filter, safePage, safeLimit);
      ResponseHelper.paginated(res, result);
    }
  );

  getRoomById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!ValidationHelper.validateObjectIdWithResponse(res, id, "Room ID")) {
        return;
      }

      const room = await roomService.getRoomById(id!);

      if (!room) {
        ResponseHelper.notFound(res, "Room");
        return;
      }

      ResponseHelper.success(res, room, "Room retrieved successfully");
    }
  );

  updateRoom = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!ValidationHelper.validateObjectIdWithResponse(res, id, "Room ID")) {
        return;
      }

      const updateData: IUpdateRoom = req.body;
      const room = await roomService.updateRoom(id!, updateData);
      ResponseHelper.success(res, room, "Room updated successfully");
    }
  );

  deleteRoom = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!ValidationHelper.validateObjectIdWithResponse(res, id, "Room ID")) {
        return;
      }

      await roomService.deleteRoom(id!);
      ResponseHelper.success(res, undefined, "Room deleted successfully");
    }
  );

  checkAvailability = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { checkInDate, checkOutDate, category, maxOccupancy } = req.query;

      if (!checkInDate || !checkOutDate) {
        ResponseHelper.validationError(
          res,
          "Check-in and check-out dates are required"
        );
        return;
      }

      const filter: any = {
        checkInDate: new Date(checkInDate as string),
        checkOutDate: new Date(checkOutDate as string),
      };

      if (category) filter.category = category;
      if (maxOccupancy) filter.maxOccupancy = parseInt(maxOccupancy as string);

      const availability = await roomService.checkRoomAvailability(filter);
      ResponseHelper.success(
        res,
        availability,
        "Room availability checked successfully"
      );
    }
  );

  searchRooms = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { checkInDate, checkOutDate, category, maxOccupancy } = req.query;

      if (!checkInDate || !checkOutDate) {
        ResponseHelper.validationError(
          res,
          "Check-in and check-out dates are required"
        );
        return;
      }

      const filter: any = {
        checkInDate: new Date(checkInDate as string),
        checkOutDate: new Date(checkOutDate as string),
      };

      if (category) filter.category = category;
      if (maxOccupancy) filter.maxOccupancy = parseInt(maxOccupancy as string);

      const rooms = await roomService.getAvailableRoomsWithPricing(filter);
      ResponseHelper.success(
        res,
        rooms,
        "Available rooms retrieved successfully"
      );
    }
  );

  getCategoryStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await roomService.getRoomCategoryStats();
      ResponseHelper.success(
        res,
        stats,
        "Room category statistics retrieved successfully"
      );
    }
  );
}

export const roomController = new RoomController();
