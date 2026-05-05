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

export function generateTemporaryPassword(policy = defaultPolicy) {
  const minPasswordLength = Math.max(8, Number(policy.minPasswordLength) || defaultPolicy.minPasswordLength);
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";
  const required = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    numbers[crypto.randomInt(numbers.length)],
  ];

  if (policy.requireSpecialChar) {
    required.push(special[crypto.randomInt(special.length)]);
  }

  const pool = `${uppercase}${lowercase}${numbers}${policy.requireSpecialChar ? special : ""}`;
  while (required.length < minPasswordLength) {
    required.push(pool[crypto.randomInt(pool.length)]);
  }

  for (let index = required.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [required[index], required[swapIndex]] = [required[swapIndex], required[index]];
  }

  return required.join("");
}
