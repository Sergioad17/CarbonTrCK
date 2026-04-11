import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

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
      SELECT
        o.id AS organization_id,
        admin_user.id AS admin_user_id,
        ana_user.id AS ana_user_id,
        director_user.id AS director_user_id
      FROM organizations o
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      JOIN users ana_user ON ana_user.organization_id = o.id AND ana_user.email::text = 'ana@itsmante.edu.mx'
      JOIN users director_user ON director_user.organization_id = o.id AND director_user.email::text = 'director@itsmante.edu.mx'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

if (!hasDb) {
  test.skip("persona4 integration tests require DATABASE_URL or TEST_DATABASE_URL. Reproducible local command: docker compose up -d postgres && set DATABASE_URL=postgresql://carbontrack_app:<password>@127.0.0.1:5433/carbontrack", () => {});
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
    await query(`DELETE FROM profile_change_request_events WHERE detail LIKE 'P4 %' OR actor_name = 'P4 Admin'`);
    await query(`DELETE FROM profile_change_requests WHERE reason LIKE 'P4 %' OR detail LIKE 'P4 %' OR resolution_detail LIKE 'P4 %'`);
    await query(`DELETE FROM notifications WHERE title LIKE 'P4 %'`);
    await query(`DELETE FROM user_settings WHERE user_id IN (SELECT id FROM users WHERE email::text IN ('admin@itsmante.edu.mx', 'ana@itsmante.edu.mx'))`);
  });

  test("settings requiere auth", async () => {
    const { response } = await request("/settings");
    assert.equal(response.status, 401);
  });

  test("GET y PUT /settings persisten por usuario y permiten reset", async () => {
    const admin = await login();
    const ana = await login("ana@itsmante.edu.mx", "captura1A");
    const context = await getSeedContext();

    const initial = await request("/settings", {
      method: "GET",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(initial.response.status, 200);
    assert.equal(initial.body.settings.theme, "light");

    const updated = await request("/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: "dark",
        ui: { reducedMotion: true, denseMode: true, showTooltips: false },
        locale: { language: "es-MX", timezone: "America/Mexico_City", dateFormat: "YYYY-MM-DD" },
        units: { co2e: "kg", electricity: "kWh", fuel: "L" },
        rounding: { co2eDecimals: 2, activityDecimals: 1 },
        defaults: { assumedVoltageVrms: 220, assumedPowerFactor: 0.85, defaultIntervalSeconds: 300, defaultElectricityEF: 0.42, defaultFuelEF: null },
        storage: { autoBackupEnabled: true, autoBackupMax: 7 },
      }),
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.settings.theme, "dark");
    assert.equal(updated.body.settings.storage.autoBackupMax, 7);

    const persisted = await query(`SELECT theme, locale, ui, storage FROM user_settings WHERE user_id = $1 AND organization_id = $2`, [
      context.admin_user_id,
      context.organization_id,
    ]);
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0].theme, "dark");
    assert.equal(persisted.rows[0].locale.timezone, "America/Mexico_City");
    const settingsAudit = await query(
      `
        SELECT event_type, entity_type, entity_id, details
        FROM audit_events
        WHERE user_id = $1
          AND event_type IN ('settings.read', 'settings.update')
        ORDER BY created_at DESC
      `,
      [context.admin_user_id],
    );
    assert.ok(settingsAudit.rows.some((row) => row.event_type === "settings.read"));
    assert.ok(settingsAudit.rows.some((row) => row.event_type === "settings.update"));
    assert.ok(settingsAudit.rows.some((row) => row.entity_type === "user_settings" && row.entity_id === context.admin_user_id));

    const anaSettings = await request("/settings", {
      method: "GET",
      headers: { Authorization: `Bearer ${ana.body.token}` },
    });
    assert.equal(anaSettings.response.status, 200);
    assert.equal(anaSettings.body.settings.theme, "light");

    const reset = await request("/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: "light",
        ui: { reducedMotion: false, denseMode: false, showTooltips: true },
        locale: { language: "es-MX", timezone: "America/Monterrey", dateFormat: "DD/MM/YYYY" },
        units: { co2e: "t", electricity: "kWh", fuel: "L" },
        rounding: { co2eDecimals: 3, activityDecimals: 2 },
        defaults: { assumedVoltageVrms: 127, assumedPowerFactor: 0.9, defaultIntervalSeconds: 900, defaultElectricityEF: null, defaultFuelEF: null },
        storage: { autoBackupEnabled: false, autoBackupMax: 5 },
      }),
    });
    assert.equal(reset.response.status, 200);
    assert.equal(reset.body.settings.theme, "light");
  });

  test("settings valida payload inválido", async () => {
    const admin = await login();
    const result = await request("/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: "neon",
        locale: { timezone: "America/Mexico_City", dateFormat: "YYYY-MM-DD" },
        units: { co2e: "t", electricity: "kWh", fuel: "L" },
        ui: { reducedMotion: false, denseMode: false, showTooltips: true },
        rounding: { co2eDecimals: 2, activityDecimals: 2 },
        defaults: { assumedVoltageVrms: 127, assumedPowerFactor: 0.9, defaultIntervalSeconds: 900, defaultElectricityEF: null, defaultFuelEF: null },
        storage: { autoBackupEnabled: false, autoBackupMax: 5 },
      }),
    });
    assert.equal(result.response.status, 422);
  });

  test("notifications CRUD respeta auth, ownership y persistencia", async () => {
    const admin = await login();
    const ana = await login("ana@itsmante.edu.mx", "captura1A");
    const context = await getSeedContext();

    const unauth = await request("/notifications");
    assert.equal(unauth.response.status, 401);

    const created = await request("/notifications", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "system",
        title: "P4 Notification One",
        message: "P4 notification message",
        link: "/perfil",
        meta: { source: "p4-test" },
      }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.notification.status, "unread");
    assert.equal(created.body.notification.link, "/perfil");

    const list = await request("/notifications", {
      method: "GET",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(list.response.status, 200);
    assert.ok(list.body.notifications.some((item) => item.id === created.body.notification.id));

    const markRead = await request(`/notifications/${created.body.notification.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    assert.equal(markRead.response.status, 200);
    assert.equal(markRead.body.notification.status, "read");

    const markUnread = await request(`/notifications/${created.body.notification.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "unread" }),
    });
    assert.equal(markUnread.response.status, 200);
    assert.equal(markUnread.body.notification.status, "unread");

    const archived = await request(`/notifications/${created.body.notification.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    assert.equal(archived.response.status, 200);
    assert.equal(archived.body.notification.status, "archived");

    const second = await request("/notifications", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "system", title: "P4 Notification Two", message: "P4 second message" }),
    });
    assert.equal(second.response.status, 201);

    const allRead = await request("/notifications/mark-all-read", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(allRead.response.status, 200);

    const anaNotification = await query(
      `
        INSERT INTO notifications (organization_id, user_id, status, type, title, message, metadata)
        VALUES ($1,$2,'unread','system','P4 Notification Ana','P4 ana message','{}'::jsonb)
        RETURNING id
      `,
      [context.organization_id, context.ana_user_id],
    );

    const forbiddenOther = await request(`/notifications/${anaNotification.rows[0].id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    assert.equal(forbiddenOther.response.status, 404);

    const cleared = await request("/notifications/archived", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(cleared.response.status, 200);
    assert.ok(cleared.body.deletedCount >= 1);

    const db = await query(`SELECT count(*)::int AS total FROM notifications WHERE user_id = $1 AND title LIKE 'P4 Notification %'`, [context.admin_user_id]);
    assert.ok(db.rows[0].total >= 1);
    const notificationAudit = await query(
      `
        SELECT event_type, entity_type, details
        FROM audit_events
        WHERE user_id = $1
          AND event_type LIKE 'notifications.%'
        ORDER BY created_at DESC
      `,
      [context.admin_user_id],
    );
    const auditedEvents = new Set(notificationAudit.rows.map((row) => row.event_type));
    assert.ok(auditedEvents.has("notifications.read"));
    assert.ok(auditedEvents.has("notifications.create"));
    assert.ok(auditedEvents.has("notifications.status_change"));
    assert.ok(auditedEvents.has("notifications.mark_all_read"));
    assert.ok(auditedEvents.has("notifications.clear_archived"));
    assert.ok(notificationAudit.rows.some((row) => row.entity_type === "notification"));
    assert.ok(notificationAudit.rows.some((row) => row.entity_type === "notification_collection"));

    const anaList = await request("/notifications", {
      method: "GET",
      headers: { Authorization: `Bearer ${ana.body.token}` },
    });
    assert.equal(anaList.response.status, 200);
    assert.ok(anaList.body.notifications.every((item) => item.title !== "P4 Notification Two"));
  });

  test("notifications rechaza type fuera del catálogo frontend con 422", async () => {
    const admin = await login();
    const created = await request("/notifications", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "unexpected_type",
        title: "P4 Invalid Notification Type",
        message: "Should fail",
      }),
    });
    assert.equal(created.response.status, 422);
    assert.equal(created.body.code, "VALIDATION_ERROR");
  });

  test("profile-change-requests respeta alcance usuario/admin, resolución e historial", async () => {
    const admin = await login();
    const ana = await login("ana@itsmante.edu.mx", "captura1A");
    const context = await getSeedContext();

    const unauth = await request("/profile-change-requests");
    assert.equal(unauth.response.status, 401);

    const created = await request("/profile-change-requests", {
      method: "POST",
      headers: { Authorization: `Bearer ${ana.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "email",
        currentValue: "ana@itsmante.edu.mx",
        requestedValue: "ana.p4@itsmante.edu.mx",
        reason: "P4 request reason",
        detail: "P4 create email request",
      }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.request.status, "pending");
    assert.equal(created.body.request.history.length, 1);
    assert.equal(created.body.request.history[0].action, "created");

    const secondRequest = await query(
      `
        INSERT INTO profile_change_requests (
          organization_id, user_id, requester_role, type, status, current_value, requested_value, reason, detail
        )
        VALUES ($1,$2,'admin','password','pending','hidden','hidden','P4 admin request','P4 admin detail')
        RETURNING id
      `,
      [context.organization_id, context.admin_user_id],
    );
    await query(
      `
        INSERT INTO profile_change_request_events (
          request_id, action, actor_user_id, actor_organization_id, actor_name, detail
        )
        VALUES ($1,'created',$2,$3,'P4 Admin','P4 admin created')
      `,
      [secondRequest.rows[0].id, context.admin_user_id, context.organization_id],
    );

    const ownList = await request("/profile-change-requests", {
      method: "GET",
      headers: { Authorization: `Bearer ${ana.body.token}` },
    });
    assert.equal(ownList.response.status, 200);
    assert.equal(ownList.body.requests.length, 1);
    assert.equal(ownList.body.requests[0].id, created.body.request.id);

    const adminList = await request("/profile-change-requests", {
      method: "GET",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(adminList.response.status, 200);
    assert.ok(adminList.body.requests.length >= 2);

    const forbiddenResolve = await request(`/profile-change-requests/${created.body.request.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ana.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", resolutionDetail: "P4 normal user cannot resolve" }),
    });
    assert.equal(forbiddenResolve.response.status, 403);

    const approved = await request(`/profile-change-requests/${created.body.request.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", resolutionDetail: "P4 approved by admin" }),
    });
    assert.equal(approved.response.status, 200);
    assert.equal(approved.body.request.status, "approved");
    assert.equal(approved.body.request.resolutionDetail, "P4 approved by admin");
    assert.equal(approved.body.request.history.at(-1).action, "approved");

    const rejected = await request(`/profile-change-requests/${secondRequest.rows[0].id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", resolutionDetail: "P4 rejected by admin" }),
    });
    assert.equal(rejected.response.status, 200);
    assert.equal(rejected.body.request.status, "rejected");

    const db = await query(
      `
        SELECT status::text AS status, resolved_by_user_id, resolution_detail
        FROM profile_change_requests
        WHERE id = $1
      `,
      [created.body.request.id],
    );
    assert.equal(db.rows[0].status, "approved");
    assert.equal(db.rows[0].resolved_by_user_id, context.admin_user_id);
    assert.equal(db.rows[0].resolution_detail, "P4 approved by admin");

    const events = await query(`SELECT count(*)::int AS total FROM profile_change_request_events WHERE request_id = $1`, [created.body.request.id]);
    assert.equal(events.rows[0].total, 2);
  });
}
