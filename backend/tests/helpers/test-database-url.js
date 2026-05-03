export function configureTestDatabaseUrl() {
  const raw = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.hostname === "postgres") {
      url.hostname = "127.0.0.1";
      if (!url.port || url.port === "5432") url.port = "5433";
    }

    const resolved = url.toString();
    process.env.TEST_DATABASE_URL = resolved;
    process.env.DATABASE_URL = resolved;
    return resolved;
  } catch {
    process.env.TEST_DATABASE_URL = raw;
    process.env.DATABASE_URL = raw;
    return raw;
  }
}
