import { z } from "zod";
import { UserRole } from "../types";

/**
 * User registration validation schema
 */
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email is too long")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/,
      "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),

  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
});

/**
 * User login validation schema
 */
export const userLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

/**
 * Token refresh validation schema
 */
export const tokenRefreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required")
    .regex(
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      "Invalid token format"
    ),
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(128, "Password is too long"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .max(128, "New password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/,
        "New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      ),

    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

/**
 * Password reset request validation schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
});

/**
 * Password reset validation schema
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),

    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/,
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      ),

    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password and confirmation password do not match",
    path: ["confirmPassword"],
  });

/**
 * User profile update validation schema
 */
export const userProfileUpdateSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name is too long")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "First name can only contain letters, spaces, hyphens, and apostrophes"
      )
      .trim()
      .optional(),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name is too long")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Last name can only contain letters, spaces, hyphens, and apostrophes"
      )
      .trim()
      .optional(),

    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Admin user creation validation schema
 */
export const adminUserCreationSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email is too long")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/,
      "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),

  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),

  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
});

/**
 * Email verification validation schema
 */
export const emailVerificationSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .max(255, "Token is too long"),
});

/**
 * Query parameter validation schemas
 */
export const authQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "Page must be a positive number"),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),

  search: z
    .string()
    .optional()
    .transform((val) => val?.trim() || undefined),

  role: z.nativeEnum(UserRole).optional(),

  isActive: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined
    ),

  emailVerified: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined
    ),
});

/**
 * Logout validation schema
 */
export const logoutSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required")
    .regex(
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      "Invalid token format"
    )
    .optional(), // Optional for logout all devices
});

/**
 * Type exports for TypeScript inference
 */
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type TokenRefreshInput = z.infer<typeof tokenRefreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type AdminUserCreationInput = z.infer<typeof adminUserCreationSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type AuthQueryInput = z.infer<typeof authQuerySchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

/**
 * Validation helper functions
 */
export const authValidators = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const result = z.string().email().safeParse(email);
    return result.success;
  },

  /**
   * Validate password strength (basic check)
   */
  isValidPassword(password: string): boolean {
    const schema = z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/
      );

    const result = schema.safeParse(password);
    return result.success;
  },

  /**
   * Validate phone number format
   */
  isValidPhone(phone: string): boolean {
    const result = z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/)
      .safeParse(phone);
    return result.success;
  },

  /**
   * Validate name format
   */
  isValidName(name: string): boolean {
    const result = z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-zA-Z\s'-]+$/)
      .safeParse(name);

    return result.success;
  },

  /**
   * Validate JWT token format
   */
  isValidTokenFormat(token: string): boolean {
    const result = z
      .string()
      .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
      .safeParse(token);

    return result.success;
  },
};
