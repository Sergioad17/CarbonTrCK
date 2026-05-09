import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

for (const envPath of [
  path.join(repoRoot, ".env.prod"),
  path.join(repoRoot, ".env"),
  path.join(backendRoot, ".env"),
]) {
  dotenv.config({ path: envPath, override: false });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const migrationsDir = path.join(backendRoot, "database", "migrations");
const pool = new pg.Pool({ connectionString: databaseUrl });

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = (await fs.readdir(migrationsDir))
      .filter((file) => /^\d+_.*\.sql$/.test(file))
      .filter((file) => !file.startsWith("001_"))
      .sort((left, right) => left.localeCompare(right));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply ${file}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    }

    console.log("migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(async (error) => {
  console.error("migration failed");
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
