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
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    return { response, body };
  }

  const body = await response.text().catch(() => null);
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
        ana_user.id AS ana_user_id
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN users ana_user ON ana_user.organization_id = o.id AND ana_user.email::text = 'ana@itsmante.edu.mx'
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

async function ensureFactor({ scopeCode, categoryCode, metricCode, unitCode, value, provider }) {
  const existing = await query(
    `
      SELECT ef.id
      FROM emission_factors ef
      JOIN emission_scopes es ON es.id = ef.scope_id
      JOIN emission_categories ec ON ec.id = ef.category_id
      JOIN metrics m ON m.id = ef.metric_id
      JOIN units u ON u.id = ef.denominator_unit_id
      WHERE es.code::text = $1
        AND ec.code = $2
        AND m.code = $3
        AND u.code = $4
        AND coalesce(ef.provider, '') = $5
      LIMIT 1
    `,
    [scopeCode, categoryCode, metricCode, unitCode, provider],
  );

  if (existing.rowCount > 0) return existing.rows[0].id;

  const inserted = await query(
    `
      INSERT INTO emission_factors (
        scope_id,
        category_id,
        metric_id,
        numerator_unit_id,
        denominator_unit_id,
        value,
        region,
        provider,
        valid_from,
        is_default
      )
      SELECT
        es.id,
        ec.id,
        m.id,
        kgco2e.id,
        u.id,
        $5,
        'TEST',
        $6,
        DATE '2025-01-01',
        true
      FROM emission_scopes es
      JOIN emission_categories ec ON ec.scope_id = es.id AND ec.code = $2
      JOIN metrics m ON m.code = $3
      JOIN units u ON u.code = $4
      JOIN units kgco2e ON kgco2e.code = 'kgco2e'
      WHERE es.code::text = $1
      RETURNING id
    `,
    [scopeCode, categoryCode, metricCode, unitCode, value, provider],
  );

  return inserted.rows[0].id;
}

async function ensureFrontendCatalogFixtures() {
  await ensureCategory("scope2", "electricidad", "Electricidad", "electricity_consumption", "kwh");

  const electricityFactorId = await ensureFactor({
    scopeCode: "scope2",
    categoryCode: "electricidad",
    metricCode: "electricity_consumption",
    unitCode: "kwh",
    value: 0.455,
    provider: "frontend-consumer-electricity",
  });

  return { electricityFactorId };
}

async function uploadFile(token, { filename, mimeType, content, kind = "other" }) {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", new Blob([content], { type: mimeType }), filename);

  return request("/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

if (!hasDb) {
  test.skip("frontend consumer integration tests require DATABASE_URL", () => {});
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
    await query(`DELETE FROM audit_events WHERE event_type IN ('records.create', 'records.files_attached', 'files.upload', 'dashboard.activity.update')`);
    await query(`DELETE FROM dashboard_activity_feeds`);
    await query(`DELETE FROM record_files WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_FRONTEND_FLOW')`);
    await query(`DELETE FROM record_revisions WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_FRONTEND_FLOW')`);
    await query(`DELETE FROM files WHERE file_name LIKE 'test-frontend-%'`);
    await query(`DELETE FROM records WHERE note = 'TEST_FRONTEND_FLOW'`);
  });

  test("Flujo frontend: crear registro manual y verlo en Emisiones, Dashboard, Areas y Reportes basados en GET /records", async () => {
    await ensureFrontendCatalogFixtures();
    const auth = await login();

    const createResult = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-20",
        scope: "scope2",
        metric: "electricity_consumption",
        area: "Laboratorio",
        areaCode: "LAB",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activity: "Registro manual frontend",
        activityText: "Registro manual frontend",
        value: 88,
        unit: "kWh",
        factor: 0.455,
        co2e_kg: 40.04,
        co2e_t: 0.04004,
        status: "real",
        isEstimated: false,
        source: "Medicion",
        by: "Ana Garcia",
        note: "TEST_FRONTEND_FLOW",
        hasEvidence: false,
        evidenceFileId: null,
        fileIds: [],
      }),
    });

    assert.equal(createResult.response.status, 201);
    const createdId = createResult.body.item.id;

    const recordsResult = await request("/records", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(recordsResult.response.status, 200);
    const createdRecord = recordsResult.body.items.find((item) => item.id === createdId);
    assert.ok(createdRecord);
    assert.equal(createdRecord.activity, "Registro manual frontend");
    assert.equal(createdRecord.areaCode, "LAB");
    assert.equal(createdRecord.campusCode, "CAMPUS-CT");
    assert.deepEqual(createdRecord.evidenceFiles, []);

    const activityItems = [
      {
        id: `activity-${createdId}`,
        status: createdRecord.status,
        area: createdRecord.area,
        dateISO: createdRecord.dateISO,
        co2e_t: createdRecord.co2e_t,
        time: "Justo ahora",
        by: createdRecord.by || "Tu",
        activity: createdRecord.activity,
        category: createdRecord.category,
        unit: createdRecord.unit,
        source: createdRecord.source,
        note: createdRecord.note,
        evidence: createdRecord.evidence,
        evidenceUrl: createdRecord.evidenceUrl,
        period: "Abr 2026",
        scope: createdRecord.scope,
        state: "published",
        targetTitle: "",
        updatedAt: createdRecord.createdAt,
        createdAt: createdRecord.createdAt,
        value: createdRecord.value,
        factor: createdRecord.factor,
        co2e_kg: createdRecord.co2e_kg,
      },
    ];

    const persistActivity = await request("/dashboard/activity", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: activityItems }),
    });

    assert.equal(persistActivity.response.status, 200);

    const dashboardResult = await request("/dashboard/activity", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(dashboardResult.response.status, 200);
    assert.equal(dashboardResult.body.items.length, 1);
    assert.equal(dashboardResult.body.items[0].activity, "Registro manual frontend");

    const areasResult = await request("/areas", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(areasResult.response.status, 200);
    const labArea = areasResult.body.items.find((item) => item.code === "LAB");
    assert.ok(labArea);
    assert.equal(labArea.campusCode, "CAMPUS-CT");
  });

  test("Flujo frontend exacto con evidencia: upload, create con fileIds, attach redundante y lectura consistente", async () => {
    const context = await getSeedContext();
    const fixtures = await ensureFrontendCatalogFixtures();
    const auth = await login();

    const uploadResult = await uploadFile(auth.body.token, {
      filename: "test-frontend-evidence.pdf",
      mimeType: "application/pdf",
      content: "%PDF-1.4 frontend evidence",
      kind: "report",
    });

    assert.equal(uploadResult.response.status, 201);
    const fileId = uploadResult.body.file.id;

    const createResult = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-21",
        scope: "scope2",
        metric: "electricity_consumption",
        area: "Laboratorio",
        areaCode: "LAB",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activity: "Registro frontend con evidencia",
        activityText: "Registro frontend con evidencia",
        value: 120,
        unit: "kWh",
        factor: 0.455,
        factorId: fixtures.electricityFactorId,
        co2e_kg: 54.6,
        co2e_t: 0.0546,
        status: "real",
        isEstimated: false,
        source: "Medicion",
        by: "Ana Garcia",
        note: "TEST_FRONTEND_FLOW",
        hasEvidence: true,
        evidenceFileId: fileId,
        fileIds: [fileId],
      }),
    });

    assert.equal(createResult.response.status, 201);
    const createdId = createResult.body.item.id;
    assert.equal(createResult.body.item.evidenceFiles.length, 1);
    assert.equal(createResult.body.item.evidenceFiles[0].id, fileId);

    const attachAgainResult = await request(`/records/${createdId}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: [fileId] }),
    });

    assert.equal(attachAgainResult.response.status, 200);
    assert.equal(attachAgainResult.body.item.evidenceFiles.length, 1);
    assert.equal(attachAgainResult.body.item.evidenceFiles[0].id, fileId);

    const linkCount = await query(
      `
        SELECT count(*)::int AS total
        FROM record_files
        WHERE record_id = $1
          AND file_id = $2
      `,
      [createdId, fileId],
    );
    assert.equal(linkCount.rows[0].total, 1);

    const revisions = await query(
      `
        SELECT count(*)::int AS total
        FROM record_revisions
        WHERE record_id = $1
      `,
      [createdId],
    );
    assert.equal(revisions.rows[0].total, 1);

    const recordsResult = await request("/records", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(recordsResult.response.status, 200);
    const evidenceRecord = recordsResult.body.items.find((item) => item.id === createdId);
    assert.ok(evidenceRecord);
    assert.equal(evidenceRecord.hasEvidence, true);
    assert.equal(evidenceRecord.evidenceFiles.length, 1);
    assert.equal(evidenceRecord.evidenceFiles[0].id, fileId);
    assert.equal(evidenceRecord.areaCode, context.area_lab_code);
    assert.equal(evidenceRecord.campusCode, context.campus_code);
  });
}
