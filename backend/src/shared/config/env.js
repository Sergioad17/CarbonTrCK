import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { AppError } from "../errors/app-error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../../..");
const repoRootDir = path.resolve(backendDir, "..");

const envFiles = [
  path.join(repoRootDir, ".env"),
  path.join(backendDir, ".env.local"),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({
      path: envFile,
      override: false,
    });
  }
}

const requiredKeys = [
  "PORT",
  "NODE_ENV",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_TTL",
  "JWT_REFRESH_TTL",
  "APP_BASE_URL",
  "BCRYPT_ROUNDS",
];

const missingKeys = requiredKeys.filter((key) => !String(process.env[key] ?? "").trim());

if (missingKeys.length > 0) {
  throw new AppError({
    statusCode: 500,
    code: "CONFIG_MISSING",
    message: `Missing required environment variables: ${missingKeys.join(", ")}`,
  });
}

const port = Number(process.env.PORT);
const bcryptRounds = Number(process.env.BCRYPT_ROUNDS);

if (!Number.isInteger(port) || port <= 0) {
  throw new AppError({
    statusCode: 500,
    code: "CONFIG_INVALID",
    message: "PORT must be a positive integer.",
  });
}

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 8 || bcryptRounds > 15) {
  throw new AppError({
    statusCode: 500,
    code: "CONFIG_INVALID",
    message: "BCRYPT_ROUNDS must be an integer between 8 and 15.",
  });
}

export const env = Object.freeze({
  PORT: port,
  NODE_ENV: String(process.env.NODE_ENV).trim(),
  DATABASE_URL: String(process.env.DATABASE_URL).trim(),
  JWT_ACCESS_SECRET: String(process.env.JWT_ACCESS_SECRET).trim(),
  JWT_REFRESH_SECRET: String(process.env.JWT_REFRESH_SECRET).trim(),
  JWT_ACCESS_TTL: String(process.env.JWT_ACCESS_TTL).trim(),
  JWT_REFRESH_TTL: String(process.env.JWT_REFRESH_TTL).trim(),
  APP_BASE_URL: String(process.env.APP_BASE_URL).trim(),
  BCRYPT_ROUNDS: bcryptRounds,
  FORGOT_PASSWORD_TOKEN_TTL: String(process.env.FORGOT_PASSWORD_TOKEN_TTL || "30m").trim(),
  RESEND_API_KEY: String(process.env.RESEND_API_KEY || "").trim(),
  RESEND_FROM_EMAIL: String(process.env.RESEND_FROM_EMAIL || "CarbonTrack <onboarding@resend.dev>").trim(),
  RESEND_REPLY_TO: String(process.env.RESEND_REPLY_TO || "").trim(),
  ALERTS_SCHEDULER_ENABLED: String(process.env.ALERTS_SCHEDULER_ENABLED || "true").trim().toLowerCase() !== "false",
  ALERTS_SCHEDULER_CRON: String(process.env.ALERTS_SCHEDULER_CRON || "*/5 * * * *").trim(),
  ALERTS_DEDUPE_RETENTION_DAYS: Number(process.env.ALERTS_DEDUPE_RETENTION_DAYS || 30),
  ALERTS_WEBHOOK_TIMEOUT_MS: Number(process.env.ALERTS_WEBHOOK_TIMEOUT_MS || 5000),
  ALERTS_APP_URL: String(process.env.ALERTS_APP_URL || process.env.APP_BASE_URL || "").trim(),
});
