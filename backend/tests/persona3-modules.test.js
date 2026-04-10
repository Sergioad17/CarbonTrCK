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
      if (!url.port || url.port === "5432") {
        url.port = "5433";
      }
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
        c.id AS campus_id,
        c.code AS campus_code,
        lab.id AS lab_area_id,
        lab.code AS lab_area_code,
        adm.id AS adm_area_id,
        adm.code AS adm_area_code,
        admin_user.id AS admin_user_id,
        operativo_role.id AS operativo_role_id
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      JOIN roles operativo_role ON operativo_role.organization_id = o.id AND lower(operativo_role.name) = 'operativo'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function ensureCategory(scopeCode, categoryCode, categoryName, metricCode, unitCode) {
  await query(
    `
      INSERT INTO emission_categories (scope_id, code, name, default_metric_id, default_unit_id, is_active)
      SELECT es.id, $2, $3, m.id, u.id, true
      FROM emission_scopes es
      JOIN metrics m ON m.code = $4
      JOIN units u ON u.code = $5
      WHERE es.code::text = $1
      ON CONFLICT (scope_id,code) DO NOTHING
    `,
    [scopeCode, categoryCode, categoryName, metricCode, unitCode],
  );
}

async function insertRecordForFactor({ organizationId, campusId, areaId, createdBy, factorId, scopeCode, categoryCode, metricCode, unitCode }) {
  await query(
    `
      INSERT INTO records (
        organization_id, campus_id, area_id, scope_id, category_id, metric_id, unit_id,
        record_date, activity_text, quantity_value, emission_factor_id, factor_value_used, co2e_kg,
        status, data_source_id, created_by, updated_by, note
      )
      SELECT
        $1, $2, $3, es.id, ec.id, m.id, u.id,
        CURRENT_DATE, 'P3 test record', 10, ef.id, ef.value, round(10 * ef.value, 6),
        'real', ds.id, $4, $4, 'P3_TEST'
      FROM emission_scopes es
      JOIN emission_categories ec ON ec.scope_id = es.id AND ec.code = $6
      JOIN metrics m ON m.code = $7
      JOIN units u ON u.code = $8
      JOIN emission_factors ef ON ef.id = $5
      JOIN data_sources ds ON ds.code = 'metered'
      WHERE es.code::text = $9
    `,
    [organizationId, campusId, areaId, createdBy, factorId, categoryCode, metricCode, unitCode, scopeCode],
  );
}

async function createTestCampusWithArea(organizationId) {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const campusCode = `P3-${suffix}`.slice(0, 20);
  const areaCode = `P3A${suffix}`.slice(0, 12);

  const campusResult = await query(
    `
      INSERT INTO campuses (organization_id, name, code, city, state, country_code, is_active)
      VALUES ($1, $2, $3, 'Ciudad Mante', 'Tamaulipas', 'MX', true)
      RETURNING id, code
    `,
    [organizationId, `P3 Test Campus ${suffix}`, campusCode],
  );

  const areaResult = await query(
    `
      INSERT INTO areas (campus_id, code, name, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, code
    `,
    [campusResult.rows[0].id, areaCode, `P3 Test Area ${suffix}`],
  );

  return {
    campusId: campusResult.rows[0].id,
    campusCode: campusResult.rows[0].code,
    areaId: areaResult.rows[0].id,
    areaCode: areaResult.rows[0].code,
  };
}

async function createScopedTargetsUser({ organizationId, campusId, roleId, areaId, createdBy, campusCode }) {
  const email = `p3.targets.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@itsmante.edu.mx`;
  const password = "captura1A";

  const userResult = await query(
    `
      INSERT INTO users (
        organization_id, campus_id, area_access_mode, numeric_id, first_name, paternal_last_name,
        maternal_last_name, email, password_hash, full_name, notes, is_active
      )
      VALUES (
        $1, $2, 'custom', $3, 'P3', 'Targets', 'User', $4::citext,
        crypt($5, gen_salt('bf', 10)), $6, 'P3_TEST', true
      )
      RETURNING id
    `,
    [organizationId, campusId, `P3-${Date.now()}`, email, password, `P3 Targets User ${campusCode}`],
  );

  const userId = userResult.rows[0].id;

  await query(`INSERT INTO user_roles (organization_id, user_id, role_id, campus_id) VALUES ($1, $2, $3, $4)`, [
    organizationId,
    userId,
    roleId,
    campusId,
  ]);

  await query(`INSERT INTO user_area_access (organization_id, user_id, campus_id, area_id, created_by) VALUES ($1, $2, $3, $4, $5)`, [
    organizationId,
    userId,
    campusId,
    areaId,
    createdBy,
  ]);

  await query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, p.id
      FROM permissions p
      WHERE p.code = 'targets:manage'
      ON CONFLICT (role_id,permission_id) DO NOTHING
    `,
    [roleId],
  );

  return { email, password, userId };
}

async function getAuditCount(eventType, entityId) {
  const result = await query(`SELECT count(*)::int AS total FROM audit_events WHERE event_type = $1 AND entity_id = $2`, [eventType, entityId]);
  return result.rows[0].total;
}

if (!hasDb) {
  test.skip("persona3 integration tests require DATABASE_URL or TEST_DATABASE_URL. Reproducible local command: docker compose up -d postgres && set TEST_DATABASE_URL=postgresql://carbontrack_app:<password>@127.0.0.1:5433/carbontrack", () => {});
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
    await query(`DELETE FROM audit_events WHERE event_type LIKE 'factors.%' OR event_type LIKE 'equipment.%' OR event_type LIKE 'targets.%' OR event_type LIKE 'actions.%'`);
    await query(
      `
        DELETE FROM audit_events
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE email::text LIKE 'p3.targets.%@itsmante.edu.mx'
        )
      `,
    );
    await query(`DELETE FROM records WHERE note = 'P3_TEST'`);
    await query(`DELETE FROM target_actions WHERE title LIKE 'P3 %'`);
    await query(`DELETE FROM targets WHERE title LIKE 'P3 %'`);
    await query(`DELETE FROM equipment_inventory WHERE name LIKE 'P3 %'`);
    await query(`DELETE FROM emission_factors WHERE provider LIKE 'P3-%' OR notes = 'P3_TEST'`);
    await query(`DELETE FROM user_area_access WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'p3.targets.%@itsmante.edu.mx')`);
    await query(`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'p3.targets.%@itsmante.edu.mx')`);
    await query(`DELETE FROM users WHERE email::text LIKE 'p3.targets.%@itsmante.edu.mx'`);
    await query(`DELETE FROM areas WHERE code LIKE 'P3A%' AND name LIKE 'P3 Test Area %'`);
    await query(`DELETE FROM campuses WHERE code LIKE 'P3-%' AND name LIKE 'P3 Test Campus %'`);
  });

  test("GET /factors sin auth responde 401", async () => {
    const { response } = await request("/factors");
    assert.equal(response.status, 401);
  });

  test("POST /factors y GET /factors/default y usage-count funcionan con persistencia real", async () => {
    const context = await getSeedContext();
    await ensureCategory("scope2", "electricidad", "Electricidad", "electricity_consumption", "kwh");
    const auth = await login();

    const create = await request("/factors", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "scope2",
        category: "electricidad",
        metric: "electricity_consumption",
        numeratorUnit: "kgCO2e",
        denominatorUnit: "kWh",
        value: 0.42,
        region: "MX",
        provider: `P3-${Date.now()}`,
        sourceUrl: "https://example.test/factor",
        validFrom: "2026-01-01",
        isDefault: true,
        uncertaintyPct: 3,
        notes: "P3_TEST",
      }),
    });

    assert.equal(create.response.status, 201);
    assert.equal(create.body.factor.scope, "scope2");
    assert.equal(create.body.factor.isDefault, true);
    assert.equal(await getAuditCount("factors.create", create.body.factor.id), 1);

    const list = await request("/factors", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(list.response.status, 200);
    assert.ok(list.body.factors.some((row) => row.id === create.body.factor.id));

    const defaultFactor = await request("/factors/default?scope=scope2&category=electricidad", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(defaultFactor.response.status, 200);
    assert.equal(defaultFactor.body.factor.id, create.body.factor.id);

    await insertRecordForFactor({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      areaId: context.lab_area_id,
      createdBy: context.admin_user_id,
      factorId: create.body.factor.id,
      scopeCode: "scope2",
      categoryCode: "electricidad",
      metricCode: "electricity_consumption",
      unitCode: "kwh",
    });

    const usage = await request(`/factors/${create.body.factor.id}/usage-count`, {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(usage.response.status, 200);
    assert.equal(usage.body.count, 1);
  });

  test("PATCH /factors, new-version, default y status manejan cambios y desactivación consistente", async () => {
    await ensureCategory("scope2", "electricidad", "Electricidad", "electricity_consumption", "kwh");
    const auth = await login();
    const provider = `P3-${Date.now()}`;

    const first = await request("/factors", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "scope2",
        category: "electricidad",
        metric: "electricity_consumption",
        denominatorUnit: "kWh",
        value: 0.4,
        region: "MX",
        provider,
        validFrom: "2026-01-01",
        isDefault: true,
        notes: "P3_TEST",
      }),
    });
    assert.equal(first.response.status, 201);

    const conflicting = await request("/factors", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "scope2",
        category: "electricidad",
        metric: "electricity_consumption",
        denominatorUnit: "kWh",
        value: 0.41,
        region: "MX",
        provider,
        validFrom: "2026-02-01",
        isDefault: true,
        notes: "P3_TEST",
      }),
    });
    assert.equal(conflicting.response.status, 409);

    const updated = await request(`/factors/${first.body.factor.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: 0.45, notes: "P3_TEST" }),
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.factor.value, 0.45);

    const newVersion = await request(`/factors/${first.body.factor.id}/new-version`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: 0.5, validFrom: "2026-03-01", isDefault: true, forceDefaultOverride: true, notes: "P3_TEST" }),
    });
    assert.equal(newVersion.response.status, 201);

    const setDefault = await request(`/factors/${newVersion.body.factor.id}/default`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });
    assert.equal(setDefault.response.status, 200);
    assert.equal(setDefault.body.factor.isDefault, true);

    const disable = await request(`/factors/${newVersion.body.factor.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(disable.response.status, 200);
    assert.equal(disable.body.factor.isActive, false);
    assert.equal(await getAuditCount("factors.status_change", newVersion.body.factor.id), 1);

    const defaultFactor = await request("/factors/default?scope=scope2&category=electricidad", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.notEqual(defaultFactor.body.factor?.id, newVersion.body.factor.id);
  });

  test("PATCH /factors/:id responde 404 cuando no existe", async () => {
    const auth = await login();
    const result = await request("/factors/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: 1 }),
    });
    assert.equal(result.response.status, 404);
  });

  test("equipment respeta auth, persistencia, auditoría y duplicate/status", async () => {
    const context = await getSeedContext();
    const admin = await login();
    const ana = await login("ana@itsmante.edu.mx", "captura1A");

    const forbidden = await request("/equipment", {
      method: "GET",
      headers: { Authorization: `Bearer ${ana.body.token}` },
    });
    assert.equal(forbidden.response.status, 403);

    const create = await request("/equipment", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        campusCode: context.campus_code,
        areaCode: context.lab_area_code,
        category: "electricidad",
        type: "it",
        name: `P3 Router ${Date.now()}`,
        quantity: 2,
        powerW: 50,
        usage: { hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.3 },
        notes: "P3 equipment",
      }),
    });
    assert.equal(create.response.status, 201);
    assert.equal(create.body.item.usage.hoursPerDay, 8);
    assert.equal(await getAuditCount("equipment.create", create.body.item.id), 1);

    const patch = await request(`/equipment/${create.body.item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "P3 Equipo actualizado", powerW: 60 }),
    });
    assert.equal(patch.response.status, 200);
    assert.equal(patch.body.item.powerW, 60);

    const status = await request(`/equipment/${create.body.item.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(status.response.status, 200);
    assert.equal(status.body.item.isActive, false);

    const duplicate = await request(`/equipment/${create.body.item.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(duplicate.response.status, 201);
    assert.notEqual(duplicate.body.item.id, create.body.item.id);

    const db = await query(`SELECT count(*)::int AS total FROM equipment_inventory WHERE organization_id = $1 AND name LIKE 'P3 %'`, [context.organization_id]);
    assert.ok(db.rows[0].total >= 2);
  });

  test("PATCH /equipment/:id responde 404 cuando no existe", async () => {
    const admin = await login();
    const result = await request("/equipment/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "P3 Missing" }),
    });
    assert.equal(result.response.status, 404);
  });

  test("targets y actions respetan permisos, persistencia, seguridad de alcance y cascada al borrar", async () => {
    const context = await getSeedContext();
    const scopedCampus = await createTestCampusWithArea(context.organization_id);
    const scopedUser = await createScopedTargetsUser({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      roleId: context.operativo_role_id,
      areaId: context.adm_area_id,
      createdBy: context.admin_user_id,
      campusCode: context.campus_code,
    });

    const admin = await login();
    const scopedAuth = await login(scopedUser.email, scopedUser.password);

    const createTarget = await request("/targets", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `P3 Target ${Date.now()}`,
        description: "P3 target",
        type: "reduction_percent",
        metric: "co2e_emission",
        unit: "tCO2e",
        scope: "scope2",
        category: "electricidad",
        campus: "CAMPUS-CT",
        area: "LAB",
        baselineStart: "2025-01-01",
        baselineEnd: "2025-12-31",
        targetStart: "2026-01-01",
        targetEnd: "2026-12-31",
        baselineValue: 100,
        targetValue: 15,
        status: "active",
      }),
    });
    assert.equal(createTarget.response.status, 201);
    assert.equal(await getAuditCount("targets.create", createTarget.body.target.id), 1);

    const createScopedTarget = await request("/targets", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `P3 Target Scoped ${Date.now()}`,
        description: "P3 target scoped",
        type: "absolute",
        metric: "co2e_emission",
        unit: "tCO2e",
        scope: "scope2",
        category: "electricidad",
        campus: "CAMPUS-CT",
        area: "ADM",
        targetStart: "2026-01-01",
        targetEnd: "2026-12-31",
        targetValue: 50,
        status: "active",
      }),
    });
    assert.equal(createScopedTarget.response.status, 201);

    const patchPreserveCampus = await request(`/targets/${createTarget.body.target.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ description: "P3 target updated", targetValue: 12 }),
    });
    assert.equal(patchPreserveCampus.response.status, 200);
    assert.equal(patchPreserveCampus.body.target.targetValue, 12);

    const targetCampusDb = await query(
      `
        SELECT c.code AS campus_code
        FROM targets t
        LEFT JOIN campuses c ON c.id = t.campus_id
        WHERE t.id = $1
      `,
      [createTarget.body.target.id],
    );
    assert.equal(targetCampusDb.rows[0].campus_code, "CAMPUS-CT");

    const pause = await request(`/targets/${createTarget.body.target.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused", pauseReason: "P3 pause" }),
    });
    assert.equal(pause.response.status, 200);
    assert.equal(pause.body.target.status, "paused");

    const createActionAllowed = await request("/actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: createScopedTarget.body.target.id,
        title: "P3 Action Allowed",
        owner: "Admin",
        status: "planned",
        startDate: "2026-02-01",
        endDate: "2026-03-01",
        impact_tco2e: 5,
        evidence: "https://example.test/evidence",
        notes: "P3 action note",
      }),
    });
    assert.equal(createActionAllowed.response.status, 201);
    assert.equal(await getAuditCount("actions.create", createActionAllowed.body.action.id), 1);

    const createActionCascade = await request("/actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: createTarget.body.target.id,
        title: "P3 Action Cascade",
        owner: "Admin",
        status: "planned",
        startDate: "2026-04-01",
        endDate: "2026-05-01",
        impact_tco2e: 3,
        notes: "P3 cascade action",
      }),
    });
    assert.equal(createActionCascade.response.status, 201);

    const createActionForbidden = await request("/actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${scopedAuth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: createTarget.body.target.id,
        title: "P3 Action Forbidden",
        impact_tco2e: 2,
      }),
    });
    assert.equal(createActionForbidden.response.status, 403);

    const updateActionForbidden = await request(`/actions/${createActionAllowed.body.action.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${scopedAuth.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: createTarget.body.target.id, title: "P3 Action Forbidden Move" }),
    });
    assert.equal(updateActionForbidden.response.status, 403);

    const scopedListActions = await request("/actions", {
      method: "GET",
      headers: { Authorization: `Bearer ${scopedAuth.body.token}` },
    });
    assert.equal(scopedListActions.response.status, 200);
    assert.equal(scopedListActions.body.actions.length, 1);
    assert.equal(scopedListActions.body.actions[0].id, createActionAllowed.body.action.id);

    const updateAction = await request(`/actions/${createActionAllowed.body.action.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done", impact_tco2e: 6 }),
    });
    assert.equal(updateAction.response.status, 200);
    assert.equal(updateAction.body.action.status, "done");

    const deleted = await request(`/targets/${createTarget.body.target.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(deleted.response.status, 204);

    const deleteMissing = await request("/targets/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${admin.body.token}` },
    });
    assert.equal(deleteMissing.response.status, 404);

    const deletedTargetActionCount = await query(`SELECT count(*)::int AS total FROM target_actions WHERE id = $1`, [createActionCascade.body.action.id]);
    assert.equal(deletedTargetActionCount.rows[0].total, 0);

    const otherTargetActionCount = await query(`SELECT count(*)::int AS total FROM target_actions WHERE id = $1`, [createActionAllowed.body.action.id]);
    assert.equal(otherTargetActionCount.rows[0].total, 1);
  });

  test("PATCH /actions/:id responde 404 cuando no existe", async () => {
    const admin = await login();
    const result = await request("/actions/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Missing action" }),
    });
    assert.equal(result.response.status, 404);
  });

  test("casos inválidos de Persona 3 responden 422", async () => {
    const admin = await login();

    const invalidFactor = await request("/factors", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "scope2", category: "electricidad", metric: "electricity_consumption", denominatorUnit: "kWh", value: -1, validFrom: "2026-01-01" }),
    });
    assert.equal(invalidFactor.response.status, 422);

    const invalidEquipment = await request("/equipment", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ campusCode: "CAMPUS-CT", areaCode: "LAB", name: "", quantity: 1 }),
    });
    assert.equal(invalidEquipment.response.status, 422);

    const invalidTarget = await request("/targets", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "P3 Invalid Target",
        type: "reduction_percent",
        metric: "co2e_emission",
        unit: "tCO2e",
        targetStart: "2026-12-31",
        targetEnd: "2026-01-01",
        targetValue: 200,
      }),
    });
    assert.equal(invalidTarget.response.status, 422);

    const invalidAction = await request("/actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.body.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: "00000000-0000-0000-0000-000000000000", title: "P3 Invalid Action", impact_tco2e: -1 }),
    });
    assert.equal(invalidAction.response.status, 422);
  });
}
