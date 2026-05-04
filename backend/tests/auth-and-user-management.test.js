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

function assertNormalizedUserShape(user, options = {}) {
  const expectedKeys = [
    "areaAccess",
    "campusCode",
    "createdAt",
    "email",
    "firstName",
    "fullName",
    "id",
    "isActive",
    "lastLoginAt",
    "maternalLastName",
    "notes",
    "numericId",
    "paternalLastName",
    "permissions",
    "role",
    "roleKey",
    "roles",
    "updatedAt",
  ];

  if (options.includeOrganizationId) {
    expectedKeys.push("organizationId");
  }

  if ("previousLoginAt" in user) {
    expectedKeys.push("previousLoginAt");
  }

  assert.deepEqual(Object.keys(user).sort(), expectedKeys.sort());
  assert.equal(typeof user.id, "string");
  assert.equal(typeof user.numericId, "string");
  assert.equal(typeof user.firstName, "string");
  assert.equal(typeof user.paternalLastName, "string");
  assert.equal(typeof user.maternalLastName, "string");
  assert.equal(typeof user.fullName, "string");
  assert.equal(typeof user.email, "string");
  assert.equal(typeof user.role, "string");
  assert.equal(typeof user.roleKey, "string");
  assert.equal(typeof user.campusCode, "string");
  assert.equal(typeof user.isActive, "boolean");
  assert.ok(user.lastLoginAt === null || typeof user.lastLoginAt === "string");
  assert.ok(user.previousLoginAt === undefined || user.previousLoginAt === null || typeof user.previousLoginAt === "string");
  assert.ok(user.createdAt === null || typeof user.createdAt === "string");
  assert.ok(user.updatedAt === null || typeof user.updatedAt === "string");
  assert.equal(typeof user.notes, "string");
  assert.equal(typeof user.areaAccess, "object");
  assert.ok(["all", "custom"].includes(user.areaAccess.mode));
  assert.ok(Array.isArray(user.areaAccess.areaCodes));
  assert.ok(Array.isArray(user.permissions));
  assert.ok(Array.isArray(user.roles));

  if (options.includeOrganizationId) {
    assert.equal(typeof user.organizationId, "string");
  }
}

async function findLatestAuditEvent(eventType, email) {
  const result = await query(
    `
      SELECT event_type, details, created_at
      FROM audit_events
      WHERE event_type = $1
        AND ($2::text IS NULL OR details->>'email' = $2)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [eventType, email || null],
  );

  return result.rows[0] || null;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email = "admin@itsmante.edu.mx", password = "admin123A") {
  const { response, body } = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { response, body };
}

if (!hasDb) {
  test.skip("backend integration tests require DATABASE_URL", () => {});
} else {
  before(async () => {
    const { createApp } = await import("../src/app.js");
    ({ query, closePool } = await import("../src/shared/db/pool.js"));
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
    const users = await query(
      `
        SELECT id
        FROM users
        WHERE email::text LIKE 'test.%@itsmante.edu.mx'
           OR email::text = 'inactive@itsmante.edu.mx'
      `,
    );
    const userIds = users.rows.map((row) => row.id);
    if (userIds.length < 1) {
      return;
    }

    await query(`DELETE FROM audit_events WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await query(`DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await query(`DELETE FROM password_reset_tokens WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await query(`DELETE FROM user_area_access WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await query(`DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);
  });

  test("login exitoso", async () => {
    const { response, body } = await login();
    assert.equal(response.status, 200);
    assert.ok(body.token);
    assert.ok(body.refreshToken);
    assert.equal(body.user.roleKey, "admin");
    assertNormalizedUserShape(body.user, { includeOrganizationId: true });
  });

  test("login con password incorrecta", async () => {
    const { response, body } = await login("admin@itsmante.edu.mx", "incorrecta123A");
    assert.equal(response.status, 401);
    assert.equal(body.code, "INVALID_CREDENTIALS");

    const auditEvent = await findLatestAuditEvent("auth.login.failure", "admin@itsmante.edu.mx");
    assert.equal(auditEvent.details.reason, "invalid_password");
  });

  test("login con email inexistente audita intento", async () => {
    const { response, body } = await login("missing.user@itsmante.edu.mx", "Nada123A");
    assert.equal(response.status, 401);
    assert.equal(body.code, "INVALID_CREDENTIALS");

    const auditEvent = await findLatestAuditEvent("auth.login.failure", "missing.user@itsmante.edu.mx");
    assert.equal(auditEvent.details.reason, "user_not_found");
  });

  test("login con usuario inactivo", async () => {
    const auth = await login();
    const password = "Inactiva123A!";
    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Usuario",
        paternalLastName: "Inactivo",
        maternalLastName: "Demo",
        fullName: "Usuario Inactivo Demo",
        email: "inactive@itsmante.edu.mx",
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: false,
        notes: "",
        temporaryPassword: password,
      }),
    });
    assert.equal(created.response.status, 201);

    const { response, body } = await login("inactive@itsmante.edu.mx", password);
    assert.equal(response.status, 401);
    assert.equal(body.code, "USER_INACTIVE");
  });

  test("auth me", async () => {
    const auth = await login();
    const { response, body } = await request("/auth/me", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(response.status, 200);
    assert.equal(body.user.email, "admin@itsmante.edu.mx");
    assertNormalizedUserShape(body.user, { includeOrganizationId: true });
  });

  test("profile me", async () => {
    const auth = await login();
    const { response, body } = await request("/profile", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(response.status, 200);
    assert.equal(body.profile.email, "admin@itsmante.edu.mx");
    assertNormalizedUserShape(body.profile, { includeOrganizationId: true });
  });

  test("refresh exitoso", async () => {
    const auth = await login();
    const { response, body } = await request("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.body.refreshToken }),
    });
    assert.equal(response.status, 200);
    assert.ok(body.token);
    assert.ok(body.refreshToken);
    assert.notEqual(body.refreshToken, auth.body.refreshToken);

    const sessions = await query(
      `
        SELECT revoked_at, replaced_by_session_id
        FROM auth_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 2
      `,
      [auth.body.user.id],
    );
    assert.equal(sessions.rows.length, 2);
    assert.equal(Boolean(sessions.rows[1].revoked_at), true);
    assert.ok(sessions.rows[1].replaced_by_session_id);
  });

  test("refresh invalido", async () => {
    const { response, body } = await request("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "invalid" }),
    });
    assert.equal(response.status, 401);
    assert.equal(body.code, "INVALID_REFRESH_TOKEN");

    const auditEvent = await findLatestAuditEvent("auth.refresh.failure", null);
    assert.equal(auditEvent.details.reason, "invalid_refresh_token");
  });

  test("users roles devuelve catalogo normalizado", async () => {
    const auth = await login();
    const { response, body } = await request("/users/roles", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.roles));
    assert.ok(body.roles.length >= 3);

    const adminRole = body.roles.find((role) => role.key === "admin");
    assert.ok(adminRole);
    assert.deepEqual(Object.keys(adminRole).sort(), ["id", "key", "label", "name", "value"]);
    assert.equal(adminRole.value, adminRole.key);
  });

  test("forgot password ciego", async () => {
    const { response, body } = await request("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@itsmante.edu.mx" }),
    });
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
  });

  test("forgot password persiste token real con expiracion", async () => {
    const { response, body } = await request("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@itsmante.edu.mx" }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);

    const tokens = await query(
      `
        SELECT expires_at, revoked_at, consumed_at
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE u.email = 'admin@itsmante.edu.mx'
        ORDER BY prt.created_at DESC
        LIMIT 1
      `,
    );
    assert.equal(tokens.rows.length, 1);
    assert.equal(tokens.rows[0].revoked_at, null);
    assert.equal(tokens.rows[0].consumed_at, null);
    assert.equal(new Date(tokens.rows[0].expires_at).getTime() > Date.now(), true);
  });

  test("creacion de usuario y relaciones", async () => {
    const auth = await login();
    const email = `test.create.${Date.now()}@itsmante.edu.mx`;
    const { response, body } = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Luisa",
        paternalLastName: "Perez",
        maternalLastName: "Diaz",
        fullName: "Luisa Perez Diaz",
        email,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "custom", areaCodes: ["ADM"] },
        isActive: true,
        notes: "Alta de prueba",
      }),
    });

    assert.equal(response.status, 201);
    assert.ok(body.temporaryPassword);

    const roleRows = await query(
      `
        SELECT COUNT(*)::int AS total
        FROM user_roles ur
        JOIN users u ON u.id = ur.user_id
        WHERE u.email = $1
      `,
      [email],
    );
    const areaRows = await query(
      `
        SELECT COUNT(*)::int AS total
        FROM user_area_access uaa
        JOIN users u ON u.id = uaa.user_id
        WHERE u.email = $1
      `,
      [email],
    );

    assert.equal(roleRows.rows[0].total, 1);
    assert.equal(areaRows.rows[0].total, 1);
    assertNormalizedUserShape(body.user, { includeOrganizationId: true });
    assert.deepEqual(body.user.areaAccess, { mode: "custom", areaCodes: ["ADM"] });
  });

  test("listado de usuarios permite filtros y mantiene shape normalizado", async () => {
    const auth = await login();
    const unique = Date.now();
    const createUserPayload = (suffix, overrides = {}) => ({
      firstName: suffix,
      paternalLastName: "Filtro",
      maternalLastName: "Demo",
      fullName: `${suffix} Filtro Demo`,
      email: `test.filter.${suffix.toLowerCase()}.${unique}@itsmante.edu.mx`,
      role: "operativo",
      campusCode: "CAMPUS-CT",
      areaAccess: { mode: "all", areaCodes: [] },
      isActive: true,
      notes: `Nota ${suffix}`,
      ...overrides,
    });

    const activeUser = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify(createUserPayload("Activo", {
        role: "directivo",
        areaAccess: { mode: "custom", areaCodes: ["ADM"] },
      })),
    });
    assert.equal(activeUser.response.status, 201);

    const inactiveUser = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify(createUserPayload("Inactivo", {
        isActive: false,
        role: "operativo",
      })),
    });
    assert.equal(inactiveUser.response.status, 201);

    const byRole = await request("/users?role=directivo", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(byRole.response.status, 200);
    assert.ok(byRole.body.users.some((user) => user.email === activeUser.body.user.email));
    assert.ok(byRole.body.users.every((user) => user.roleKey === "directivo"));
    byRole.body.users.forEach((user) => assertNormalizedUserShape(user));

    const byStatus = await request("/users?isActive=false", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(byStatus.response.status, 200);
    assert.ok(byStatus.body.users.some((user) => user.email === inactiveUser.body.user.email));
    assert.ok(byStatus.body.users.every((user) => user.isActive === false));
    byStatus.body.users.forEach((user) => assertNormalizedUserShape(user));

    const bySearch = await request(`/users?search=${encodeURIComponent(activeUser.body.user.email)}`, {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(bySearch.response.status, 200);
    assert.ok(bySearch.body.users.some((user) => user.email === activeUser.body.user.email));
    bySearch.body.users.forEach((user) => assertNormalizedUserShape(user));

    const byCampus = await request("/users?campusCode=CAMPUS-CT", {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(byCampus.response.status, 200);
    assert.ok(byCampus.body.users.some((user) => user.email === activeUser.body.user.email));
    assert.ok(byCampus.body.users.every((user) => user.campusCode === "CAMPUS-CT"));
  });

  test("duplicidad de email", async () => {
    const auth = await login();
    const payload = {
      firstName: "Mario",
      paternalLastName: "Lopez",
      maternalLastName: "Diaz",
      fullName: "Mario Lopez Diaz",
      email: "test.duplicate@itsmante.edu.mx",
      role: "operativo",
      campusCode: "CAMPUS-CT",
      areaAccess: { mode: "all", areaCodes: [] },
      isActive: true,
      notes: "",
    };

    const first = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(first.response.status, 201);

    const second = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(second.response.status, 409);
  });

  test("creacion de usuario con password temporal permite login", async () => {
    const auth = await login();
    const email = `test.create.login.${Date.now()}@itsmante.edu.mx`;
    const temporaryPassword = "TempCuenta123A!";
    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Login",
        paternalLastName: "Nuevo",
        maternalLastName: "Demo",
        fullName: "Login Nuevo Demo",
        email,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
        temporaryPassword,
      }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.temporaryPassword, temporaryPassword);

    const createdLogin = await login(email, temporaryPassword);
    assert.equal(createdLogin.response.status, 200);
    assert.equal(createdLogin.body.user.email, email);
  });

  test("edicion de usuario", async () => {
    const auth = await login();
    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Clara",
        paternalLastName: "Mendez",
        maternalLastName: "Diaz",
        fullName: "Clara Mendez Diaz",
        email: `test.edit.${Date.now()}@itsmante.edu.mx`,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
      }),
    });

    const updated = await request(`/users/${created.body.user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        ...created.body.user,
        firstName: "Clara Editada",
        fullName: "Clara Editada Mendez Diaz",
        role: "directivo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "custom", areaCodes: ["LAB"] },
        notes: "Actualizada",
      }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.user.firstName, "Clara Editada");
    assert.equal(updated.body.user.roleKey, "directivo");
    assert.equal(updated.body.user.areaAccess.mode, "custom");
    assertNormalizedUserShape(updated.body.user, { includeOrganizationId: true });
  });

  test("cambio de estado", async () => {
    const auth = await login();
    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Raul",
        paternalLastName: "Soto",
        maternalLastName: "Diaz",
        fullName: "Raul Soto Diaz",
        email: `test.status.${Date.now()}@itsmante.edu.mx`,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
      }),
    });

    const updated = await request(`/users/${created.body.user.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.user.isActive, false);
    assertNormalizedUserShape(updated.body.user, { includeOrganizationId: true });
  });

  test("borrado de usuario elimina cuenta e impide login", async () => {
    const auth = await login();
    const suffix = Date.now();
    const email = `test.delete.${suffix}@itsmante.edu.mx`;
    const temporaryPassword = "DeleteCuenta123A!";
    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Delete",
        paternalLastName: "User",
        maternalLastName: "Demo",
        fullName: "Delete User Demo",
        email,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
        temporaryPassword,
      }),
    });
    assert.equal(created.response.status, 201);

    const loginBeforeDelete = await login(email, temporaryPassword);
    assert.equal(loginBeforeDelete.response.status, 200);

    const deleted = await request(`/users/${created.body.user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.ok, true);

    const loginAfterDelete = await login(email, temporaryPassword);
    assert.equal(loginAfterDelete.response.status, 401);

    const list = await request(`/users?search=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.users.some((user) => user.email === email), false);

    const fallbackEmail = `test.delete.fallback.${suffix}@itsmante.edu.mx`;
    const fallbackPassword = "DeleteFallback123A!";
    const fallbackCreated = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Delete",
        paternalLastName: "Fallback",
        maternalLastName: "Demo",
        fullName: "Delete Fallback Demo",
        email: fallbackEmail,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
        temporaryPassword: fallbackPassword,
      }),
    });
    assert.equal(fallbackCreated.response.status, 201);

    const fallbackDeleted = await request(`/users/${fallbackCreated.body.user.id}/delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });
    assert.equal(fallbackDeleted.response.status, 200);
    assert.equal(fallbackDeleted.body.ok, true);

    const fallbackLoginAfterDelete = await login(fallbackEmail, fallbackPassword);
    assert.equal(fallbackLoginAfterDelete.response.status, 401);
  });

  test("reset de password administrativo invalida password anterior", async () => {
    const auth = await login();
    const target = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Reset",
        paternalLastName: "User",
        maternalLastName: "Demo",
        fullName: "Reset User Demo",
        email: `test.reset.${Date.now()}@itsmante.edu.mx`,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
      }),
    });

    const { response, body } = await request(`/users/${target.body.user.id}/password-reset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });
    assert.equal(response.status, 200);
    assert.ok(body.temporaryPassword);

    const loginWithOldPassword = await login(target.body.user.email, target.body.temporaryPassword);
    assert.equal(loginWithOldPassword.response.status, 401);

    const loginWithResetPassword = await login(target.body.user.email, body.temporaryPassword);
    assert.equal(loginWithResetPassword.response.status, 200);

    const { response: secondResetResponse, body: secondResetBody } = await request(`/users/${target.body.user.id}/password-reset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });
    assert.equal(secondResetResponse.status, 200);

    const staleLogin = await login(target.body.user.email, body.temporaryPassword);
    assert.equal(staleLogin.response.status, 401);

    const freshLogin = await login(target.body.user.email, secondResetBody.temporaryPassword);
    assert.equal(freshLogin.response.status, 200);
  });

  test("cambio de password propio", async () => {
    const auth = await login();
    const email = `test.profile.password.${Date.now()}@itsmante.edu.mx`;
    const temporaryPassword = "PerfilCuenta123A!";
    const nextPassword = `NuevaClave${Date.now()}A!`;

    const created = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "Perfil",
        paternalLastName: "Password",
        maternalLastName: "Demo",
        fullName: "Perfil Password Demo",
        email,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
        notes: "",
        temporaryPassword,
      }),
    });
    assert.equal(created.response.status, 201);

    const targetAuth = await login(email, temporaryPassword);
    assert.equal(targetAuth.response.status, 200);

    const changed = await request("/profile/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${targetAuth.body.token}`,
      },
      body: JSON.stringify({
        currentPassword: temporaryPassword,
        nextPassword,
      }),
    });

    assert.equal(changed.response.status, 200);

    const relogin = await login(email, nextPassword);
    assert.equal(relogin.response.status, 200);
  });

  test("guard por rol y permiso", async () => {
    const auth = await login("director@itsmante.edu.mx", "consulta1A");
    const { response, body } = await request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.body.token}`,
      },
      body: JSON.stringify({
        firstName: "No",
        paternalLastName: "Permitido",
        fullName: "No Permitido",
        email: `test.denied.${Date.now()}@itsmante.edu.mx`,
        role: "operativo",
        campusCode: "CAMPUS-CT",
        areaAccess: { mode: "all", areaCodes: [] },
        isActive: true,
      }),
    });

    assert.equal(response.status, 403);
    assert.equal(body.code, "FORBIDDEN");
  });

  test("acceso denegado a ruta protegida", async () => {
    const { response, body } = await request("/users");
    assert.equal(response.status, 401);
    assert.equal(body.code, "UNAUTHENTICATED");
  });
}
