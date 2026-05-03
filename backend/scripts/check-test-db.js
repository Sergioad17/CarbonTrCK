import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const repoRootDir = path.resolve(backendDir, "..");

dotenv.config({ path: path.join(repoRootDir, ".env"), override: false });
dotenv.config({ path: path.join(backendDir, ".env.local"), override: false });

function resolveTestDatabaseUrl() {
  const raw = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.hostname === "postgres") {
      url.hostname = "127.0.0.1";
      if (!url.port || url.port === "5432") url.port = "5433";
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function redactDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = "*****";
    return url.toString();
  } catch {
    return value;
  }
}

const databaseUrl = resolveTestDatabaseUrl();

if (!databaseUrl) {
  console.error("Backend integration tests require DATABASE_URL or TEST_DATABASE_URL.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true,
});

try {
  await pool.query("SELECT 1");
} catch (error) {
  console.error("Backend integration test database is not reachable.");
  console.error(`Tried: ${redactDatabaseUrl(databaseUrl)}`);
  console.error("Start the local database with: docker compose up -d postgres");
  console.error(`Cause: ${error.code || error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
