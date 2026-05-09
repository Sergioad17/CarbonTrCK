import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { cleanupTestAuthFixtures, prepareTestAuthFixtures } from "./helpers/test-auth-fixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function resolveTestDatabaseUrl() {
  const raw = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.hostname === "postgres") {
      url.hostname = "127.0.0.1";
      if (!url.port || url.port === "5432") url.port = "5433";
      return url.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

const resolvedDatabaseUrl = resolveTestDatabaseUrl();
const hasDb = Boolean(resolvedDatabaseUrl);

if (resolvedDatabaseUrl) {
  process.env.TEST_DATABASE_URL = resolvedDatabaseUrl;
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

let server;
let baseUrl;
let query;
let closePool;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email = "admin@itsmante.edu.mx", password = "admin123A") {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function getSeedContext() {
  const result = await query(
    `
      SELECT c.code AS campus_code, a.code AS area_code
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas a ON a.campus_id = c.id AND a.code = 'LAB'
      WHERE o.name = 'CarbonTrack Test Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

if (!hasDb) {
  test.skip("admin periods integration tests require DATABASE_URL or TEST_DATABASE_URL.", () => {});
} else {
  before(async () => {
    const { createApp } = await import("../src/app.js");
    ({ query, closePool } = await import("../src/shared/db/pool.js"));
    const { ensureAdminPeriodsSchema } = await import("../src/domains/admin/admin.periods.repository.js");
    await ensureAdminPeriodsSchema();
    await prepareTestAuthFixtures(query);

    const app = createApp();
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await cleanupTestAuthFixtures(query);
    await closePool();
  });

  afterEach(async () => {
    await query(`DELETE FROM records WHERE note = 'P3_PERIOD_TEST'`);
    await query(`DELETE FROM admin_periods WHERE name LIKE 'P3 Period %'`);
    await query(`DELETE FROM audit_events WHERE event_type LIKE 'admin.periods.%'`);
  });

  test("admin periods list, create, update and block closed-period records", async () => {
    const admin = await login();
    const context = await getSeedContext();
    const headers = { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" };

    const list = await request("/admin/periods", { headers });
    assert.equal(list.response.status, 200);
    assert.ok(Array.isArray(list.body.periods));

    const create = await request("/admin/periods", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `P3 Period ${Date.now()}`,
        label: "Periodo de prueba",
        type: "monthly",
        startDate: "2026-05-01",
        endDate: "2026-05-31",
        status: "open",
        isDefault: true,
        captureDeadline: "2026-06-05",
        validationDeadline: "2026-06-10",
        reportDeadline: "2026-06-15",
        lockCaptureOnClose: true,
        allowSpecialReopen: true,
        specialReopenRoles: ["admin", "directivo"],
        specialReopenNote: "Prueba de reapertura controlada",
      }),
    });
    assert.equal(create.response.status, 201);
    assert.equal(create.body.period.isDefault, true);
    assert.deepEqual(create.body.period.specialReopenRoles, ["admin", "directivo"]);

    const close = await request(`/admin/periods/${create.body.period.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...create.body.period, status: "closed" }),
    });
    assert.equal(close.response.status, 200);
    assert.equal(close.body.period.status, "closed");

    const blockedRecord = await request("/records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateISO: "2026-05-15",
        campusCode: context.campus_code,
        areaCode: context.area_code,
        scope: "scope2",
        category: "electricidad",
        metric: "electricity_consumption",
        unit: "kWh",
        source: "metered",
        activity: "P3 period test",
        value: 10,
        factor: 0.444,
        note: "P3_PERIOD_TEST",
      }),
    });
    assert.equal(blockedRecord.response.status, 409);
    assert.equal(blockedRecord.body.code, "PERIOD_CLOSED");

    const home = await request("/admin/home", { headers });
    assert.equal(home.response.status, 200);
    assert.ok(home.body.summary.overviewKpis.closedPeriods >= 1);
  });
}
