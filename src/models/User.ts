import { ObjectId } from "mongodb";

export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface IUser {
  _id?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;

  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
}

export interface ICreateUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface IPublicUser {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;

  createdAt: Date;
  lastLoginAt?: Date;
}

export interface IUserFilter {
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface IUserStats {
  totalUsers: number;
  activeUsers: number;
  customerCount: number;
  adminCount: number;
  newUsersThisMonth: number;
}

export interface IUserActivity {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  lastLoginAt?: Date;
  totalBookings: number;
  recentBookings: number;
}
