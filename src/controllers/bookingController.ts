import { Request, Response } from "express";
import { bookingService } from "../services/bookingService";
import { ICreateBooking, IUpdateBooking } from "../models/Booking";
import { ResponseHelper } from "../utils/response";
import { ValidationHelper } from "../utils/validation";
import { asyncHandler } from "../middleware/errorHandler";

export class BookingController {
  createBooking = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id!.toString();
      const bookingData: ICreateBooking = req.body;

      const booking = await bookingService.createBooking(userId, bookingData);
      ResponseHelper.success(res, booking, "Booking created successfully", 201);
    }
  );

  getAllBookings = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId, roomId, status, paymentStatus, page, limit } = req.query;
      const { page: safePage, limit: safeLimit } =
        ValidationHelper.sanitizePagination(page, limit);

      const filter: any = {};
      if (userId) filter.userId = userId as string;
      if (roomId) filter.roomId = roomId as string;
      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      const result = await bookingService.getBookings(
        filter,
        safePage,
        safeLimit
      );
      ResponseHelper.paginated(res, result);
    }
  );

  getUserBookings = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id!.toString();
      const { page, limit } = req.query;
      const { page: safePage, limit: safeLimit } =
        ValidationHelper.sanitizePagination(page, limit);

      const result = await bookingService.getUserBookings(
        userId,
        safePage,
        safeLimit
      );
      ResponseHelper.paginated(res, result);
    }
  );

  getBookingById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (
        !ValidationHelper.validateObjectIdWithResponse(res, id, "Booking ID")
      ) {
        return;
      }

      const booking = await bookingService.getBookingDetails(id!);

      if (!booking) {
        ResponseHelper.notFound(res, "Booking");
        return;
      }

      ResponseHelper.success(res, booking, "Booking retrieved successfully");
    }
  );

  updateBooking = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (
        !ValidationHelper.validateObjectIdWithResponse(res, id, "Booking ID")
      ) {
        return;
      }

      const updateData: IUpdateBooking = req.body;
      const booking = await bookingService.updateBooking(id!, updateData);
      ResponseHelper.success(res, booking, "Booking updated successfully");
    }
  );

  cancelBooking = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (
        !ValidationHelper.validateObjectIdWithResponse(res, id, "Booking ID")
      ) {
        return;
      }

      const { reason } = req.body;
      const booking = await bookingService.cancelBooking(id!, reason);
      ResponseHelper.success(res, booking, "Booking cancelled successfully");
    }
  );

  confirmBooking = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (
        !ValidationHelper.validateObjectIdWithResponse(res, id, "Booking ID")
      ) {
        return;
      }

      const booking = await bookingService.confirmBooking(id!);
      ResponseHelper.success(res, booking, "Booking confirmed successfully");
    }
  );

  getBookingStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await bookingService.getBookingStats();
      ResponseHelper.success(
        res,
        stats,
        "Booking statistics retrieved successfully"
      );
    }
  );
}

export const bookingController = new BookingController();
