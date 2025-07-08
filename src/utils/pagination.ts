import { PaginatedResponse } from "../types";

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult {
  skip: number;
  limit: number;
  page: number;
}

export class PaginationHelper {
  static calculatePagination(page = 1, limit = 10): PaginationResult {
    const safePage = Math.max(1, parseInt(page.toString()) || 1);
    const safeLimit = Math.max(
      1,
      Math.min(100, parseInt(limit.toString()) || 10)
    ); // Max 100 items
    const skip = (safePage - 1) * safeLimit;

    return {
      skip,
      limit: safeLimit,
      page: safePage,
    };
  }

  static buildResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = "Data retrieved successfully"
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date(),
    };
  }
}
