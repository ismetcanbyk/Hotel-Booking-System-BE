import { ObjectId } from "mongodb";
import { Response } from "express";
import { ResponseHelper } from "./response";

export class ValidationHelper {
  static isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  }

  static validateObjectIdWithResponse(
    res: Response,
    id: string | undefined,
    fieldName = "ID"
  ): boolean {
    if (!id) {
      ResponseHelper.validationError(res, `${fieldName} is required`);
      return false;
    }

    if (!this.isValidObjectId(id)) {
      ResponseHelper.validationError(res, `Invalid ${fieldName} format`);
      return false;
    }

    return true;
  }

  static validateDateRange(checkIn: Date, checkOut: Date): string[] {
    const errors: string[] = [];

    if (checkIn >= checkOut) {
      errors.push("Check-in date must be before check-out date");
    }

    if (checkIn < new Date()) {
      errors.push("Check-in date cannot be in the past");
    }

    return errors;
  }

  static sanitizePagination(page?: any, limit?: any) {
    return {
      page: parseInt(page?.toString()) || 1,
      limit: Math.min(parseInt(limit?.toString()) || 10, 100), // Max 100
    };
  }
}
