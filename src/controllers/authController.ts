import { Request, Response } from "express";
import { userService } from "../services/userService";
import { ResponseHelper } from "../utils/response";
import { asyncHandler } from "../middleware/errorHandler";

export class AuthController {
  register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await userService.register(req.body);
      ResponseHelper.success(res, result, "User registered successfully");
    }
  );

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await userService.login(req.body);
    ResponseHelper.success(res, result, "Login successful");
  });

  getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user!;
      const { password, ...userWithoutPassword } = user;
      ResponseHelper.success(
        res,
        userWithoutPassword,
        "Profile retrieved successfully"
      );
    }
  );
}

export const authController = new AuthController();
