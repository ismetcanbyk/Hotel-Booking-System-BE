import { ObjectId } from "mongodb";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export interface IBooking {
  _id?: ObjectId;
  userId: ObjectId;
  roomId: ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateBooking {
  userId: ObjectId;
  roomId: ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  specialRequests?: string;
}

export interface IUpdateBooking {
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuests?: number;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  specialRequests?: string;
}

export interface IBookingFilter {
  userId?: ObjectId;
  roomId?: ObjectId;
  status?: BookingStatus | BookingStatus[];
  paymentStatus?: PaymentStatus;
  checkInDate?: {
    $gte?: Date;
    $lte?: Date;
  };
  checkOutDate?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface IBookingDetails extends IBooking {
  room: {
    roomNumber: string;
    category: string;
    bedType: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}
