import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);

let server;
let baseUrl;
let query;
let closePool;

const EXACT_RECORD_SHAPE_KEYS = [
  "id",
  "dateISO",
  "scope",
  "metric",
  "area",
  "areaCode",
  "campusCode",
  "category",
  "activity",
  "activityText",
  "value",
  "unit",
  "factor",
  "factorId",
  "co2e_kg",
  "co2e_t",
  "status",
  "isEstimated",
  "source",
  "by",
  "note",
  "hasEvidence",
  "evidence",
  "evidenceUrl",
  "evidenceFileId",
  "evidenceFiles",
  "createdAt",
].sort();

function assertAuditEventShape(row, expected = {}) {
  assert.ok(row, "audit event should exist");
  assert.equal(typeof row.organization_id, "string");
  assert.equal(typeof row.user_id, "string");
  assert.equal(typeof row.event_type, "string");
  assert.equal(typeof row.entity_type, "string");
  assert.equal(typeof row.entity_id, "string");
  assert.equal(typeof row.ip_address, "string");
  assert.equal(typeof row.user_agent, "string");
  assert.equal(typeof row.details, "object");

  if (expected.eventType) assert.equal(row.event_type, expected.eventType);
  if (expected.entityType) assert.equal(row.entity_type, expected.entityType);
  if (expected.entityId) assert.equal(row.entity_id, expected.entityId);
  if (expected.userId) assert.equal(row.user_id, expected.userId);
  if (expected.organizationId) assert.equal(row.organization_id, expected.organizationId);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    return { response, body };
  }

  const body = await response.arrayBuffer().catch(() => null);
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
        adm.id AS area_adm_id,
        adm.code AS area_adm_code,
        lab.id AS area_lab_id,
        lab.code AS area_lab_code,
        admin_user.id AS admin_user_id,
        ana_user.id AS ana_user_id,
        operativo_role.id AS operativo_role_id
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      JOIN users ana_user ON ana_user.organization_id = o.id AND ana_user.email::text = 'ana@itsmante.edu.mx'
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

async function ensureRecordCatalogFixtures() {
  await ensureCategory("scope2", "electricidad", "Electricidad", "electricity_consumption", "kwh");
}

async function createRecordFixture(context) {
  const result = await query(
    `
      INSERT INTO records (
        organization_id,
        campus_id,
        area_id,
        scope_id,
        category_id,
        metric_id,
        unit_id,
        record_date,
        activity_text,
        quantity_value,
        factor_value_used,
        co2e_kg,
        status,
        data_source_id,
        note,
        created_by,
        updated_by
      )
      SELECT
        $1,
        $2,
        $3,
        es.id,
        ec.id,
        m.id,
        u.id,
        DATE '2026-04-10',
        'Test Files Record',
        10,
        0.455,
        4.55,
        'real',
        ds.id,
        'TEST_FILES',
        $4,
        $4
      FROM emission_scopes es
      JOIN emission_categories ec ON ec.scope_id = es.id AND ec.code = 'electricidad'
      JOIN metrics m ON m.code = 'electricity_consumption'
      JOIN units u ON u.code = 'kwh'
      JOIN data_sources ds ON ds.code = 'metered'
      WHERE es.code::text = 'scope2'
      RETURNING id
    `,
    [context.organization_id, context.campus_id, context.area_lab_id, context.ana_user_id],
  );

  return result.rows[0].id;
}

async function uploadFile(token, { filename, mimeType, content, kind = "other", endpoint = "/files" }) {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", new Blob([content], { type: mimeType }), filename);

  return request(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

async function createExternalOrgFileFixture() {
  const orgResult = await query(
    `
      INSERT INTO organizations (name, legal_name, country_code, state, city, timezone)
      VALUES ('External Test Org', 'External Test Org', 'MX', 'Tamaulipas', 'Ciudad Mante', 'America/Mexico_City')
      RETURNING id
    `,
  );

  const organizationId = orgResult.rows[0].id;
  const userResult = await query(
    `
      INSERT INTO users (
        organization_id,
        area_access_mode,
        email,
        password_hash,
        full_name,
        is_active
      )
      VALUES (
        $1,
        'all',
        $2::citext,
        crypt('external123A', gen_salt('bf', 10)),
        'External Test User',
        true
      )
      RETURNING id
    `,
    [organizationId, `external.files.${Date.now()}@itsmante.edu.mx`],
  );

  const fileResult = await query(
    `
      INSERT INTO files (
        organization_id,
        uploaded_by,
        kind,
        file_name,
        mime_type,
        size_bytes,
        storage_url,
        metadata
      )
      VALUES (
        $1,
        $2,
        'other',
        $3,
        'application/pdf',
        128,
        'http://localhost:3001/files/external-test',
        '{"storage":"local","diskPath":"storage/uploads/nonexistent/external-test.pdf"}'::jsonb
      )
      RETURNING id
    `,
    [organizationId, userResult.rows[0].id, `external-test-file-${Date.now()}.pdf`],
  );

  return {
    organizationId,
    userId: userResult.rows[0].id,
    fileId: fileResult.rows[0].id,
  };
}

async function createScopedOperativeUser({
  organizationId,
  campusId,
  roleId,
  areaAccessMode = "all",
  areaId = null,
  createdBy,
}) {
  const email = `files.scope.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@itsmante.edu.mx`;
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
        'Files',
        'Scoped',
        'User',
        $5::citext,
        crypt($6, gen_salt('bf', 10)),
        'Files Scoped User',
        'TEST_FILES',
        true
      )
      RETURNING id
    `,
    [organizationId, campusId, areaAccessMode, `FILE-${Date.now()}`, email, password],
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

async function removeStoredTestFilesFromDisk() {
  const result = await query(
    `
      SELECT metadata->>'diskPath' AS disk_path
      FROM files
      WHERE file_name LIKE 'test-files-%'
    `,
  );

  for (const row of result.rows) {
    if (!row.disk_path) continue;
    const absolutePath = path.resolve(backendDir, row.disk_path);
    await fs.unlink(absolutePath).catch(() => {});
  }
}

if (!hasDb) {
  test.skip("files integration tests require DATABASE_URL", () => {});
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
    await removeStoredTestFilesFromDisk();
    await query(`DELETE FROM audit_events WHERE event_type IN ('files.upload', 'records.files_attached')`);
    await query(
      `
        DELETE FROM audit_events
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE email::text LIKE 'files.scope.%@itsmante.edu.mx'
        )
      `,
    );
    await query(`DELETE FROM record_files WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_FILES')`);
    await query(`DELETE FROM record_revisions WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_FILES')`);
    await query(`DELETE FROM files WHERE file_name LIKE 'test-files-%' OR file_name LIKE 'external-test-file-%'`);
    await query(`DELETE FROM records WHERE note = 'TEST_FILES'`);
    await query(`DELETE FROM user_area_access WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'files.scope.%@itsmante.edu.mx')`);
    await query(`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'files.scope.%@itsmante.edu.mx')`);
    await query(`DELETE FROM users WHERE email::text LIKE 'files.scope.%@itsmante.edu.mx'`);
    await query(`DELETE FROM users WHERE email::text LIKE 'external.files.%@itsmante.edu.mx'`);
    await query(`DELETE FROM organizations WHERE name = 'External Test Org'`);
  });

  test("POST /files sin auth responde 401", async () => {
    const formData = new FormData();
    formData.append("kind", "other");
    formData.append("file", new Blob(["hello"], { type: "application/pdf" }), "test-files-no-auth.pdf");

    const { response } = await request("/files", {
      method: "POST",
      body: formData,
    });

    assert.equal(response.status, 401);
  });

  test("POST /files sube archivo y persiste metadata", async () => {
    const context = await getSeedContext();
    const auth = await login();
    const { response, body } = await uploadFile(auth.body.token, {
      filename: "test-files-upload.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 test upload",
      kind: "report",
    });

    assert.equal(response.status, 201);
    assert.equal(body.file.name, "test-files-upload.pdf");
    assert.equal(body.file.fileName, "test-files-upload.pdf");
    assert.equal(body.file.mimeType, "application/pdf");
    assert.equal(body.file.sizeBytes > 0, true);
    assert.ok(body.file.url.endsWith(`/files/${body.file.id}`));

    const db = await query(
      `
        SELECT organization_id, uploaded_by, kind, file_name, mime_type, size_bytes, storage_url, checksum_sha256, metadata
        FROM files
        WHERE id = $1
      `,
      [body.file.id],
    );

    assert.equal(db.rowCount, 1);
    assert.equal(db.rows[0].organization_id, context.organization_id);
    assert.equal(db.rows[0].uploaded_by, context.ana_user_id);
    assert.equal(db.rows[0].kind, "report");
    assert.equal(db.rows[0].file_name, "test-files-upload.pdf");
    assert.equal(db.rows[0].mime_type, "application/pdf");
    assert.equal(db.rows[0].storage_url.endsWith(`/files/${body.file.id}`), true);
    assert.equal(typeof db.rows[0].checksum_sha256, "string");
    assert.equal(Boolean(db.rows[0].metadata?.diskPath), true);

    const audit = await query(
      `
        SELECT organization_id, user_id, event_type, entity_type, entity_id, ip_address, user_agent, details
        FROM audit_events
        WHERE event_type = 'files.upload'
          AND entity_id = $1
      `,
      [body.file.id],
    );
    assert.equal(audit.rowCount, 1);
    assertAuditEventShape(audit.rows[0], {
      eventType: "files.upload",
      entityType: "file",
      entityId: body.file.id,
      userId: context.ana_user_id,
      organizationId: context.organization_id,
    });
    assert.equal(audit.rows[0].details.kind, "report");
    assert.equal(audit.rows[0].details.fileName, "test-files-upload.pdf");
    assert.equal(audit.rows[0].details.mimeType, "application/pdf");
    assert.equal(audit.rows[0].details.sizeBytes > 0, true);
  });

  test("POST /files rechaza MIME invalido", async () => {
    const auth = await login();
    const { response, body } = await uploadFile(auth.body.token, {
      filename: "test-files-invalid.txt",
      mimeType: "text/plain",
      content: "plain text",
      kind: "other",
    });

    assert.equal(response.status, 422);
    assert.equal(body.code, "VALIDATION_ERROR");
  });

  test("GET /files/:id devuelve archivo con auth y headers correctos", async () => {
    const auth = await login();
    const upload = await uploadFile(auth.body.token, {
      filename: "test-files-read.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 test read",
      kind: "report",
    });

    const { response, body } = await request(`/files/${upload.body.file.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("content-disposition")?.includes("test-files-read.pdf"), true);
    assert.equal(Buffer.from(body).toString("utf8"), "%PDF-1.4 test read");
  });

  test("GET /files/:id no permite leer archivo de otra organizacion", async () => {
    const auth = await login();
    const external = await createExternalOrgFileFixture();

    const { response } = await request(`/files/${external.fileId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
      },
    });

    assert.equal(response.status, 404);
  });

  test("POST /records/:id/files asocia archivos al record y devuelve evidenceFiles", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    const auth = await login();
    const upload = await uploadFile(auth.body.token, {
      filename: "test-files-attach.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 attach",
      kind: "report",
    });

    const { response, body } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [upload.body.file.id] }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(body.item).sort(), EXACT_RECORD_SHAPE_KEYS);
    assert.equal(body.item.id, recordId);
    assert.ok(Array.isArray(body.item.evidenceFiles));
    assert.equal(body.item.evidenceFiles.length, 1);
    assert.equal(body.item.evidenceFiles[0].id, upload.body.file.id);

    const link = await query(
      `
        SELECT record_id, file_id, is_primary
        FROM record_files
        WHERE record_id = $1 AND file_id = $2
      `,
      [recordId, upload.body.file.id],
    );
    assert.equal(link.rowCount, 1);
    assert.equal(link.rows[0].is_primary, true);

    const revisions = await query(
      `
        SELECT revision_no, change_reason, changed_by, snapshot
        FROM record_revisions
        WHERE record_id = $1
        ORDER BY revision_no ASC
      `,
      [recordId],
    );
    assert.ok(revisions.rows.length >= 1);
    assert.equal(revisions.rowCount, 1);
    assert.equal(revisions.rows[0].revision_no, 1);
    assert.equal(revisions.rows[0].change_reason, "attach_files");
    assert.equal(revisions.rows[0].changed_by, context.ana_user_id);
    assert.equal(revisions.rows[0].snapshot.id, recordId);
    assert.ok(Array.isArray(revisions.rows[0].snapshot.evidenceFiles));
    assert.equal(revisions.rows[0].snapshot.evidenceFiles.length, 1);
    assert.equal(revisions.rows[0].snapshot.evidenceFiles[0].id, upload.body.file.id);

    const audit = await query(
      `
        SELECT organization_id, user_id, event_type, entity_type, entity_id, ip_address, user_agent, details
        FROM audit_events
        WHERE event_type = 'records.files_attached'
          AND entity_id = $1
      `,
      [recordId],
    );
    assert.equal(audit.rowCount, 1);
    assertAuditEventShape(audit.rows[0], {
      eventType: "records.files_attached",
      entityType: "record",
      entityId: recordId,
      userId: context.ana_user_id,
      organizationId: context.organization_id,
    });
    assert.ok(Array.isArray(audit.rows[0].details.fileIds));
    assert.equal(audit.rows[0].details.fileIds[0], upload.body.file.id);
    assert.equal(audit.rows[0].details.attachedCount, 1);
  });

  test("POST /records/:id/files incrementa revision_no si el record ya tenia revision previa", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    await query(
      `
        INSERT INTO record_revisions (record_id, revision_no, changed_by, change_reason, snapshot)
        VALUES ($1, 1, $2, 'create', '{"id":"seed","evidenceFiles":[]}'::jsonb)
      `,
      [recordId, context.ana_user_id],
    );

    const auth = await login();
    const upload = await uploadFile(auth.body.token, {
      filename: "test-files-attach-revision.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 attach revision",
      kind: "report",
    });

    const { response } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [upload.body.file.id] }),
    });

    assert.equal(response.status, 200);

    const revisions = await query(
      `
        SELECT revision_no, change_reason
        FROM record_revisions
        WHERE record_id = $1
        ORDER BY revision_no ASC
      `,
      [recordId],
    );

    assert.equal(revisions.rowCount, 2);
    assert.equal(revisions.rows[0].revision_no, 1);
    assert.equal(revisions.rows[0].change_reason, "create");
    assert.equal(revisions.rows[1].revision_no, 2);
    assert.equal(revisions.rows[1].change_reason, "attach_files");
  });

  test("POST /records/:id/files falla con record inexistente", async () => {
    const auth = await login();
    const upload = await uploadFile(auth.body.token, {
      filename: "test-files-missing-record.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 missing record",
      kind: "report",
    });

    const { response } = await request(`/records/00000000-0000-0000-0000-000000000001/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [upload.body.file.id] }),
    });

    assert.equal(response.status, 404);
  });

  test("POST /records/:id/files falla con file inexistente", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    const auth = await login();

    const { response } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: ["00000000-0000-0000-0000-000000000001"] }),
    });

    assert.equal(response.status, 422);
  });

  test("POST /records/:id/files falla con archivo de otra organizacion", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    const auth = await login();
    const external = await createExternalOrgFileFixture();

    const { response } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [external.fileId] }),
    });

    assert.equal(response.status, 409);
  });

  test("POST /records/:id/files sin permiso records:update responde 403", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    const uploadOwnerAuth = await login();
    const upload = await uploadFile(uploadOwnerAuth.body.token, {
      filename: "test-files-permission.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 permission",
      kind: "report",
    });

    const directivoAuth = await login("director@itsmante.edu.mx", "consulta1A");
    const { response } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${directivoAuth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [upload.body.file.id] }),
    });

    assert.equal(response.status, 403);
  });

  test("POST /records/:id/files respeta areaAccess custom", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const recordId = await createRecordFixture(context);
    const ownerAuth = await login();
    const upload = await uploadFile(ownerAuth.body.token, {
      filename: "test-files-area-access.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 custom area",
      kind: "report",
    });

    const customUser = await createScopedOperativeUser({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      roleId: context.operativo_role_id,
      areaAccessMode: "custom",
      areaId: context.area_adm_id,
      createdBy: context.admin_user_id,
    });

    const auth = await login(customUser.email, customUser.password);
    const { response } = await request(`/records/${recordId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [upload.body.file.id] }),
    });

    assert.equal(response.status, 403);
  });
}
