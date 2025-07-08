import { Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types";

export class ResponseHelper {
  static success<T>(
    res: Response,
    data?: T,
    message = "Success",
    statusCode = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date(),
    } as ApiResponse<T>);
  }

  static error(res: Response, message: string, statusCode = 400): void {
    res.status(statusCode).json({
      success: false,
      message,
      timestamp: new Date(),
    } as ApiResponse);
  }

  static paginated<T>(res: Response, result: PaginatedResponse<T>): void {
    res.json(result);
  }

  static notFound(res: Response, resource = "Resource"): void {
    this.error(res, `${resource} not found`, 404);
  }

  static validationError(res: Response, message = "Validation failed"): void {
    this.error(res, message, 400);
  }

  static serverError(res: Response, message = "Internal server error"): void {
    this.error(res, message, 500);
  }
}
