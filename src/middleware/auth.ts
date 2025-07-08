import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, extractTokenFromHeader } from "../utils/jwt";
import { getCollection, COLLECTIONS } from "../config/database";
import { User, UserRole } from "../types";
import { ObjectId } from "mongodb";
import { ResponseHelper } from "../utils/response";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      ResponseHelper.error(res, "Access token required", 401);
      return;
    }

    const payload = verifyAccessToken(token) as any;

    try {
      const usersCollection = getCollection<User>(COLLECTIONS.USERS);
      const user = await usersCollection.findOne({
        _id: new ObjectId(payload.userId.toString()),
        isActive: true,
      });

      if (!user) {
        ResponseHelper.error(res, "User not found or account deactivated", 401);
        return;
      }

      req.user = user;

      // Update last login - don't fail if database is not available
      await usersCollection
        .updateOne(
          { _id: user._id },
          {
            $set: {
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            },
          }
        )
        .catch((err) => {
          console.warn("Failed to update last login time:", err);
        });

      next();
    } catch (dbError) {
      console.error("Database error during authentication:", dbError);
      ResponseHelper.error(
        res,
        "Database unavailable - authentication failed",
        503
      );
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);

    let message = "Authentication failed";
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        message = "Access token expired";
      } else if (error.message.includes("invalid")) {
        message = "Invalid access token";
      }
    }

    ResponseHelper.error(res, message, 401);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        ResponseHelper.error(res, "Authentication required", 401);
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        ResponseHelper.error(res, "Insufficient permissions", 403);
        return;
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      ResponseHelper.error(res, "Authorization check failed", 500);
    }
  };
};

export const adminOnly = authorize(UserRole.ADMIN);

export const customerOrAdmin = authorize(UserRole.CUSTOMER, UserRole.ADMIN);

export const validateBody = (schema: any) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        ResponseHelper.error(res, "Validation failed", 400);
        return;
      }

      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation error:", error);
      ResponseHelper.error(res, "Validation processing failed", 500);
    }
  };
};

export const validateQuery = (schema: any) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        ResponseHelper.error(res, "Query validation failed", 400);
        return;
      }

      req.query = result.data;
      next();
    } catch (error) {
      console.error("Query validation error:", error);
      ResponseHelper.error(res, "Query validation processing failed", 500);
    }
  };
};

export const validateParams = (schema: any) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        ResponseHelper.error(res, "Parameter validation failed", 400);
        return;
      }

      req.params = result.data;
      next();
    } catch (error) {
      console.error("Parameter validation error:", error);
      ResponseHelper.error(res, "Parameter validation processing failed", 500);
    }
  };
};
