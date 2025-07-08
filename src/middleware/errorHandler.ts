import { Request, Response, NextFunction } from "express";
import { ResponseHelper } from "../utils/response";

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error:", error);

  if (error.name === "ValidationError") {
    ResponseHelper.validationError(res, error.message);
    return;
  }

  if (error.name === "CastError") {
    ResponseHelper.validationError(res, "Invalid ID format");
    return;
  }

  if (error.code === 11000) {
    ResponseHelper.error(res, "Duplicate field value", 409);
    return;
  }

  const message = error.message || "Internal server error";
  const statusCode = error.statusCode || 500;

  ResponseHelper.error(res, message, statusCode);
};
