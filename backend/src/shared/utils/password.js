import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const defaultPolicy = Object.freeze({
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: false,
});

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function assertPasswordComplexity(password, policy = defaultPolicy) {
  const value = String(password || "");
  const minPasswordLength = Math.max(6, Number(policy.minPasswordLength) || defaultPolicy.minPasswordLength);
  const hasLowercase = /[a-z]/.test(value);
  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value);

  const isValid =
    value.length >= minPasswordLength
    && hasLowercase
    && (!policy.requireUppercase || hasUppercase)
    && (!policy.requireNumber || hasNumber)
    && (!policy.requireSpecialChar || hasSpecialChar);

  if (!isValid) {
    const requirements = [`at least ${minPasswordLength} characters`, "lowercase"];
    if (policy.requireUppercase) requirements.push("uppercase");
    if (policy.requireNumber) requirements.push("a number");
    if (policy.requireSpecialChar) requirements.push("a special character");
    throw new AppError({
      statusCode: 422,
      code: "INVALID_PASSWORD",
      message: `Password must include ${requirements.join(", ")}.`,
    });
  }
}

export function generateTemporaryPassword() {
  // Guarantees uppercase, lowercase and numeric characters for the default policy.
  return `Ct-${crypto.randomBytes(6).toString("hex")}A1`;
}
