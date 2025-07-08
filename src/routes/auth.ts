import { Router } from "express";
import { authController } from "../controllers/authController";
import { authenticate, validateBody } from "../middleware/auth";
import { userRegistrationSchema, userLoginSchema } from "../validators/auth";

const router = Router();

// Public routes
router.post(
  "/register",
  validateBody(userRegistrationSchema),
  authController.register
);
router.post("/login", validateBody(userLoginSchema), authController.login);

// Protected routes
router.get("/me", authenticate, authController.getProfile);

export default router;
