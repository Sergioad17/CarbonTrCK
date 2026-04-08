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
        c.id AS campus_id,
        c.code AS campus_code,
        adm.id AS area_adm_id,
        adm.code AS area_adm_code,
        lab.id AS area_lab_id,
        lab.code AS area_lab_code,
        admin_user.id AS admin_user_id,
        operativo_role.id AS operativo_role_id
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      JOIN roles operativo_role ON operativo_role.organization_id = o.id AND lower(operativo_role.name) = 'operativo'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function createScopedOperativeUser({
  organizationId,
  campusId,
  roleId,
  areaAccessMode = "all",
  areaId = null,
  createdBy,
}) {
  const email = `areas.scope.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@itsmante.edu.mx`;
  const password = "captura1A";

  const userResult = await query(
    `
      INSERT INTO users (
        organization_id,
        campus_id,
        area_access_mode,
        numeric_id,
        first_name,
        paternal_last_name,
        maternal_last_name,
        email,
        password_hash,
        full_name,
        notes,
        is_active
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'Areas',
        'Scoped',
        'User',
        $5::citext,
        crypt($6, gen_salt('bf', 10)),
        'Areas Scoped User',
        'TEST_AREAS',
        true
      )
      RETURNING id
    `,
    [organizationId, campusId, areaAccessMode, `AREA-${Date.now()}`, email, password],
  );

  const userId = userResult.rows[0].id;

  await query(
    `
      INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
      VALUES ($1, $2, $3, $4)
    `,
    [organizationId, userId, roleId, campusId],
  );

  if (areaAccessMode === "custom" && areaId) {
    await query(
      `
        INSERT INTO user_area_access (organization_id, user_id, campus_id, area_id, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [organizationId, userId, campusId, areaId, createdBy],
    );
  }

  return { email, password, userId };
}

async function createTestCampusWithAreas(organizationId) {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const campusCode = `AR-${suffix}`.slice(0, 20);
  const areaCode = `AA${suffix}`.slice(0, 12);
  const inactiveAreaCode = `IA${suffix}`.slice(0, 12);

  const campusResult = await query(
    `
      INSERT INTO campuses (organization_id, name, code, city, state, country_code, is_active)
      VALUES ($1, $2, $3, 'Ciudad Mante', 'Tamaulipas', 'MX', true)
      RETURNING id, code
    `,
    [organizationId, `Areas Campus ${suffix}`, campusCode],
  );

  const areaResult = await query(
    `
      INSERT INTO areas (campus_id, code, name, tags, metadata, is_active)
      VALUES ($1, $2, $3, 'office, admin', '{"source":"areas-test"}'::jsonb, true)
      RETURNING id, code
    `,
    [campusResult.rows[0].id, areaCode, `Areas Area ${suffix}`],
  );

  const inactiveResult = await query(
    `
      INSERT INTO areas (campus_id, code, name, metadata, is_active)
      VALUES ($1, $2, $3, '{"source":"areas-test","inactive":true}'::jsonb, false)
      RETURNING id, code
    `,
    [campusResult.rows[0].id, inactiveAreaCode, `Areas Inactive ${suffix}`],
  );

  return {
    campusId: campusResult.rows[0].id,
    campusCode: campusResult.rows[0].code,
    areaId: areaResult.rows[0].id,
    areaCode: areaResult.rows[0].code,
    inactiveAreaId: inactiveResult.rows[0].id,
    inactiveAreaCode: inactiveResult.rows[0].code,
  };
}

async function createTestAreasInCampus(campusId) {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const activeAreaCode = `CA${suffix}`.slice(0, 12);
  const inactiveAreaCode = `CI${suffix}`.slice(0, 12);

  const activeResult = await query(
    `
      INSERT INTO areas (campus_id, code, name, tags, metadata, is_active)
      VALUES ($1, $2, $3, 'office, admin', '{"source":"areas-test"}'::jsonb, true)
      RETURNING id, code
    `,
    [campusId, activeAreaCode, `Areas Inline ${suffix}`],
  );

  const inactiveResult = await query(
    `
      INSERT INTO areas (campus_id, code, name, metadata, is_active)
      VALUES ($1, $2, $3, '{"source":"areas-test","inactive":true}'::jsonb, false)
      RETURNING id, code
    `,
    [campusId, inactiveAreaCode, `Areas Inline Inactive ${suffix}`],
  );

  return {
    activeAreaId: activeResult.rows[0].id,
    activeAreaCode: activeResult.rows[0].code,
    inactiveAreaId: inactiveResult.rows[0].id,
    inactiveAreaCode: inactiveResult.rows[0].code,
  };
}

if (!hasDb) {
  test.skip("areas integration tests require DATABASE_URL", () => {});
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
    await query(
      `
        DELETE FROM audit_events
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE email::text LIKE 'areas.scope.%@itsmante.edu.mx'
        )
      `,
    );
    await query(`DELETE FROM user_area_access WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'areas.scope.%@itsmante.edu.mx')`);
    await query(`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'areas.scope.%@itsmante.edu.mx')`);
    await query(`DELETE FROM users WHERE email::text LIKE 'areas.scope.%@itsmante.edu.mx'`);
    await query(`DELETE FROM areas WHERE name LIKE 'Areas %'`);
    await query(`DELETE FROM campuses WHERE name LIKE 'Areas Campus %'`);
  });

  test("GET /areas sin auth responde 401", async () => {
    const { response } = await request("/areas");
    assert.equal(response.status, 401);
  });

  test("GET /areas devuelve catalogo estable y solo areas activas por defecto", async () => {
    const context = await getSeedContext();
    const inlineAreas = await createTestAreasInCampus(context.campus_id);
    const auth = await login("admin@itsmante.edu.mx", "admin123A");

    const { response, body } = await request("/areas", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length >= 1);

    const item = body.items.find((area) => area.code === inlineAreas.activeAreaCode);
    assert.ok(item);
    assert.equal(typeof item.id, "string");
    assert.equal(item.code, inlineAreas.activeAreaCode);
    assert.equal(item.name.startsWith("Areas Inline "), true);
    assert.equal(item.campusCode, context.campus_code);
    assert.equal(item.isActive, true);
    assert.deepEqual(item.tags, ["office", "admin"]);
    assert.equal(item.metadata.source, "areas-test");

    const inactive = body.items.find((area) => area.code === inlineAreas.inactiveAreaCode);
    assert.equal(inactive, undefined);
  });

  test("GET /areas permite includeInactive para acceso administrativo", async () => {
    const context = await getSeedContext();
    const inlineAreas = await createTestAreasInCampus(context.campus_id);
    const auth = await login("admin@itsmante.edu.mx", "admin123A");

    const { response, body } = await request("/areas?includeInactive=true", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    const inactive = body.items.find((area) => area.code === inlineAreas.inactiveAreaCode);
    assert.ok(inactive);
    assert.equal(inactive.isActive, false);
  });

  test("GET /areas respeta areaAccess custom", async () => {
    const context = await getSeedContext();
    const customUser = await createScopedOperativeUser({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      roleId: context.operativo_role_id,
      areaAccessMode: "custom",
      areaId: context.area_adm_id,
      createdBy: context.admin_user_id,
    });

    const auth = await login(customUser.email, customUser.password);
    const { response, body } = await request("/areas", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].code, context.area_adm_code);
    assert.equal(body.items[0].campusCode, context.campus_code);
  });

  test("GET /areas respeta campus asignado del usuario", async () => {
    const context = await getSeedContext();
    const extraCampus = await createTestCampusWithAreas(context.organization_id);
    const scopedUser = await createScopedOperativeUser({
      organizationId: context.organization_id,
      campusId: extraCampus.campusId,
      roleId: context.operativo_role_id,
      createdBy: context.admin_user_id,
    });

    const auth = await login(scopedUser.email, scopedUser.password);
    const { response, body } = await request("/areas", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].code, extraCampus.areaCode);
    assert.equal(body.items[0].campusCode, extraCampus.campusCode);
  });
}
