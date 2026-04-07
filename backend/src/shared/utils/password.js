import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const complexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function assertPasswordComplexity(password) {
  if (!complexityPattern.test(String(password || ""))) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_PASSWORD",
      message: "Password must be at least 8 characters and include uppercase, lowercase and a number.",
    });
  }
}

export function generateTemporaryPassword() {
  return `CT-${crypto.randomBytes(6).toString("base64url")}A1`;
}
