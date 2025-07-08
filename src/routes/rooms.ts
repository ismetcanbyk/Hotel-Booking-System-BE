import { Router } from "express";
import { roomController } from "../controllers/roomController";
import {
  authenticate,
  adminOnly,
  validateBody,
  validateQuery,
} from "../middleware/auth";
import { roomValidators } from "../validators/room";

const router = Router();

// Public routes
router.get(
  "/search",
  validateQuery(roomValidators.roomAvailability),
  roomController.searchRooms
);
router.get(
  "/availability",
  validateQuery(roomValidators.roomAvailability),
  roomController.checkAvailability
);
router.get("/categories/stats", roomController.getCategoryStats);

// Customer routes
router.get(
  "/",
  validateQuery(roomValidators.roomFilter),
  roomController.getRooms
);
router.get("/:id", authenticate, roomController.getRoomById);

// Admin routes
router.post(
  "/",
  authenticate,
  adminOnly,
  validateBody(roomValidators.createRoom),
  roomController.createRoom
);
router.put(
  "/:id",
  authenticate,
  adminOnly,
  validateBody(roomValidators.updateRoom),
  roomController.updateRoom
);
router.delete("/:id", authenticate, adminOnly, roomController.deleteRoom);

export default router;
