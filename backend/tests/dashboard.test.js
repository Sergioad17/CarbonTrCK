import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);

let server;
let baseUrl;
let query;
let closePool;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email = "ana@itsmante.edu.mx", password = "captura1A") {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function getSeedContext() {
  const result = await query(
    `
      SELECT
        o.id AS organization_id,
        admin_user.id AS admin_user_id
      FROM organizations o
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

if (!hasDb) {
  test.skip("dashboard integration tests require DATABASE_URL", () => {});
} else {
  before(async () => {
    const { createApp } = await import("../src/app.js");
    ({ query, closePool } = await import("../src/shared/db/pool.js"));

    const app = createApp();
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await closePool();
  });

  afterEach(async () => {
    const context = await getSeedContext();
    await query(`DELETE FROM audit_events WHERE event_type = 'dashboard.activity.update' AND organization_id = $1`, [
      context.organization_id,
    ]);
    await query(`DELETE FROM dashboard_activity_feeds WHERE organization_id = $1`, [context.organization_id]);
  });

  test("GET /dashboard/activity sin auth responde 401", async () => {
    const { response } = await request("/dashboard/activity");
    assert.equal(response.status, 401);
  });

  test("GET /dashboard/activity devuelve arreglo vacio cuando no hay feed", async () => {
    const auth = await login("ana@itsmante.edu.mx", "captura1A");

    const { response, body } = await request("/dashboard/activity", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(body.items, []);
  });

  test("PUT /dashboard/activity persiste hasta 20 elementos y luego GET devuelve lo guardado", async () => {
    const context = await getSeedContext();
    const auth = await login("ana@itsmante.edu.mx", "captura1A");
    const items = Array.from({ length: 22 }, (_, index) => ({
      id: `activity-${index}`,
      status: index % 2 === 0 ? "real" : "est",
      area: `Area ${index}`,
      dateISO: "2026-01-15",
      co2e_t: 1.25 + index,
      time: `Hace ${index}h`,
      by: "Ana Garcia",
      activity: `Actividad ${index}`,
      category: "electricidad",
      unit: "kWh",
      source: "Medicion",
      note: `Nota ${index}`,
      evidence: index === 0 ? "Factura.pdf" : "",
      evidenceUrl: index === 0 ? "/files/evidence-1" : "",
      period: "Ene 2026",
      scope: "scope2",
      state: "published",
      targetTitle: "Meta 2030",
      updatedAt: "2026-01-15T10:00:00.000Z",
      createdAt: "2026-01-15T09:00:00.000Z",
      value: 10 + index,
      factor: 0.455,
      co2e_kg: 455 + index,
    }));

    const putResult = await request("/dashboard/activity", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
        "User-Agent": "dashboard-test-agent",
      },
      body: JSON.stringify({ items }),
    });

    assert.equal(putResult.response.status, 200);
    assert.ok(Array.isArray(putResult.body.items));
    assert.equal(putResult.body.items.length, 20);
    assert.equal(putResult.body.items[0].id, "activity-0");
    assert.equal(putResult.body.items.at(-1).id, "activity-19");

    const stored = await query(
      `
        SELECT id, items, updated_by
        FROM dashboard_activity_feeds
        WHERE organization_id = $1
      `,
      [context.organization_id],
    );

    assert.equal(stored.rowCount, 1);
    assert.equal(stored.rows[0].updated_by, auth.body.user.id);
    assert.equal(stored.rows[0].items.length, 20);

    const auditResult = await query(
      `
        SELECT event_type, entity_type, entity_id, user_id, details, user_agent
        FROM audit_events
        WHERE organization_id = $1
          AND event_type = 'dashboard.activity.update'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [context.organization_id],
    );

    assert.equal(auditResult.rowCount, 1);
    assert.equal(auditResult.rows[0].entity_type, "dashboard_activity_feed");
    assert.equal(auditResult.rows[0].entity_id, stored.rows[0].id);
    assert.equal(auditResult.rows[0].user_id, auth.body.user.id);
    assert.equal(auditResult.rows[0].details.itemCount, 20);
    assert.deepEqual(auditResult.rows[0].details.itemIds.slice(0, 2), ["activity-0", "activity-1"]);
    assert.equal(auditResult.rows[0].user_agent, "dashboard-test-agent");

    const getResult = await request("/dashboard/activity", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(getResult.response.status, 200);
    assert.equal(getResult.body.items.length, 20);
    assert.equal(getResult.body.items[0].activity, "Actividad 0");
    assert.equal(getResult.body.items[0].evidenceUrl, "/files/evidence-1");
    assert.equal(getResult.body.items[0].co2e_kg, 455);
  });

  test("PUT /dashboard/activity rechaza payload invalido", async () => {
    const auth = await login("ana@itsmante.edu.mx", "captura1A");

    const { response, body } = await request("/dashboard/activity", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: { invalid: true } }),
    });

    assert.equal(response.status, 422);
    assert.equal(body.code, "VALIDATION_ERROR");
  });

  test("GET /dashboard/activity comparte el feed dentro de la misma organizacion", async () => {
    const firstAuth = await login("ana@itsmante.edu.mx", "captura1A");
    const secondAuth = await login("admin@itsmante.edu.mx", "admin123A");

    const putResult = await request("/dashboard/activity", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${firstAuth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: "shared-item",
            status: "real",
            area: "ADM",
            dateISO: "2026-02-01",
            co2e_t: 0.44,
            by: "Ana Garcia",
            activity: "Registro compartido",
          },
        ],
      }),
    });

    assert.equal(putResult.response.status, 200);

    const getResult = await request("/dashboard/activity", {
      method: "GET",
      headers: { Authorization: `Bearer ${secondAuth.body.token}` },
    });

    assert.equal(getResult.response.status, 200);
    assert.equal(getResult.body.items.length, 1);
    assert.equal(getResult.body.items[0].id, "shared-item");
  });
}
