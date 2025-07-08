import { Router } from "express";
import { bookingController } from "../controllers/bookingController";
import {
  authenticate,
  adminOnly,
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/auth";
import { bookingValidators } from "../validators/booking";

const router = Router();

// Customer routes (auth required)
router.post(
  "/",
  authenticate,
  validateBody(bookingValidators.createBooking),
  bookingController.createBooking
);
router.get(
  "/my-bookings",
  authenticate,
  validateQuery(bookingValidators.userBookings),
  bookingController.getUserBookings
);
router.get(
  "/:id",
  authenticate,
  validateParams(bookingValidators.bookingId),
  bookingController.getBookingById
);
router.put(
  "/:id",
  authenticate,
  validateParams(bookingValidators.bookingId),
  validateBody(bookingValidators.updateBooking),
  bookingController.updateBooking
);
router.patch(
  "/:id/cancel",
  authenticate,
  validateParams(bookingValidators.bookingId),
  validateBody(bookingValidators.cancelBooking),
  bookingController.cancelBooking
);

// Admin routes (admin auth required)
router.get(
  "/",
  authenticate,
  adminOnly,
  validateQuery(bookingValidators.bookingFilter),
  bookingController.getAllBookings
);
router.patch(
  "/:id/confirm",
  authenticate,
  adminOnly,
  validateParams(bookingValidators.bookingId),
  bookingController.confirmBooking
);
router.get(
  "/stats/overview",
  authenticate,
  adminOnly,
  bookingController.getBookingStats
);

export default router;
