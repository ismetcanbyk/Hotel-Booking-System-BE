import bcrypt from "bcrypt";
import { config } from "../config/environment";

export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = config.security.bcryptSaltRounds;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error("Failed to hash password");
  }
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error("Failed to verify password");
  }
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  score: number; // 0-5 strength score
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else {
    score += 1;
  }

  // Maximum length check
  if (password.length > 128) {
    errors.push("Password must be less than 128 characters long");
  }

  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  } else {
    score += 1;
  }

  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  } else {
    score += 1;
  }

  // Contains number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  } else {
    score += 1;
  }

  // Contains special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push("Password must contain at least one special character");
  } else {
    score += 1;
  }

  // No common patterns
  const commonPatterns = [
    "123456",
    "password",
    "qwerty",
    "abc123",
    "111111",
    "admin",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
  ];

  if (
    commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))
  ) {
    errors.push("Password contains common patterns and is not secure");
    score = Math.max(0, score - 2);
  }

  // No sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password should not contain repeated characters");
    score = Math.max(0, score - 1);
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(5, score),
  };
}

export function generateSecurePassword(length: number = 16): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = "";

  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function needsRehash(hashedPassword: string): Promise<boolean> {
  try {
    const currentRounds = config.security.bcryptSaltRounds;
    const hashRounds = bcrypt.getRounds(hashedPassword);

    return hashRounds !== currentRounds;
  } catch (error) {
    return true;
  }
}

export const passwordUtils = {
  getStrengthDescription(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return "Very Weak";
      case 2:
        return "Weak";
      case 3:
        return "Fair";
      case 4:
        return "Good";
      case 5:
        return "Strong";
      default:
        return "Unknown";
    }
  },

  getStrengthColor(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return "#ff4757"; // red
      case 2:
        return "#ffa502"; // orange
      case 3:
        return "#ffb347"; // yellow
      case 4:
        return "#7bed9f"; // light green
      case 5:
        return "#2ed573"; // green
      default:
        return "#747d8c"; // gray
    }
  },

  maskPassword(password: string): string {
    if (password.length <= 2) {
      return "*".repeat(password.length);
    }

    const first = password[0];
    const last = password[password.length - 1];
    const middle = "*".repeat(password.length - 2);

    return `${first}${middle}${last}`;
  },

  isValidFormat(password: string): boolean {
    return (
      typeof password === "string" &&
      password.length >= 1 &&
      password.length <= 128
    );
  },
};
