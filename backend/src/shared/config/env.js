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
      override: true,
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
});
