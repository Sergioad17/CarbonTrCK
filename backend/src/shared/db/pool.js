import pg from "pg";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { mapDatabaseError } from "./sql-errors.js";

const { Pool } = pg;
const isTestPool = env.NODE_ENV === "test" || Boolean(process.env.TEST_DATABASE_URL);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: isTestPool ? 2000 : 0,
  allowExitOnIdle: isTestPool,
});

pool.on("error", (error) => {
  throw error;
});

export async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    throw mapDatabaseError(error);
  }
}

export async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapDatabaseError(error);
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

export function assertRowCount(result, message = "Resource not found.") {
  if (!result || result.rowCount < 1) {
    throw new AppError({
      statusCode: 404,
      code: "NOT_FOUND",
      message,
    });
  }
}

export { pool };
