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
        ana_user.id AS ana_user_id,
        director_user.id AS director_user_id,
        operativo_role.id AS operativo_role_id
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN users admin_user ON admin_user.organization_id = o.id AND admin_user.email::text = 'admin@itsmante.edu.mx'
      JOIN users ana_user ON ana_user.organization_id = o.id AND ana_user.email::text = 'ana@itsmante.edu.mx'
      JOIN users director_user ON director_user.organization_id = o.id AND director_user.email::text = 'director@itsmante.edu.mx'
      JOIN roles operativo_role ON operativo_role.organization_id = o.id AND lower(operativo_role.name) = 'operativo'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1, "seed context should exist");
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

  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }

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

async function ensureRecordCatalogFixtures() {
  await ensureCategory("scope2", "electricidad", "Electricidad", "electricity_consumption", "kwh");
  await ensureCategory("scope1", "combustible", "Combustible", "fuel_volume", "l");
  await ensureCategory("scope3", "otros", "Otros", "equipment_count", "unit");

  const electricityFactorId = await ensureFactor({
    scopeCode: "scope2",
    categoryCode: "electricidad",
    metricCode: "electricity_consumption",
    unitCode: "kwh",
    value: 0.455,
    provider: "records-test-electricity",
  });

  const fuelFactorId = await ensureFactor({
    scopeCode: "scope1",
    categoryCode: "combustible",
    metricCode: "fuel_volume",
    unitCode: "l",
    value: 2.68,
    provider: "records-test-fuel",
  });

  return { electricityFactorId, fuelFactorId };
}

async function createRecordFixture(params) {
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
        evidence_text,
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
        $8::date,
        $9,
        $10,
        $11,
        round((($10)::numeric * ($11)::numeric), 6),
        'real',
        ds.id,
        $12,
        $13,
        $14,
        $14
      FROM emission_scopes es
      JOIN emission_categories ec ON ec.scope_id = es.id AND ec.code = $5
      JOIN metrics m ON m.code = $6
      JOIN units u ON u.code = $7
      JOIN data_sources ds ON ds.code = $4
      WHERE es.code::text = $15
      RETURNING id
    `,
    [
      params.organizationId,
      params.campusId,
      params.areaId,
      params.sourceCode,
      params.categoryCode,
      params.metricCode,
      params.unitCode,
      params.recordDate || "2026-04-08",
      params.activityText,
      params.value,
      params.factorValue,
      params.note || "TEST_RECORDS",
      params.evidenceText || null,
      params.createdBy,
      params.scopeCode,
    ],
  );

  return result.rows[0].id;
}

async function attachFileToRecord({ organizationId, recordId, uploadedBy, fileName = "test-records-evidence.pdf" }) {
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
      VALUES ($1, $2, 'report', $3, 'application/pdf', 128, $4, '{}'::jsonb)
      RETURNING id
    `,
    [organizationId, uploadedBy, fileName, `https://example.test/files/${fileName}`],
  );

  await query(
    `
      INSERT INTO record_files (record_id, file_id, purpose, is_primary)
      VALUES ($1, $2, 'evidence', true)
    `,
    [recordId, fileResult.rows[0].id],
  );

  return fileResult.rows[0].id;
}

async function createCustomAreaUser(context) {
  const email = `records.custom.${Date.now()}@itsmante.edu.mx`;
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
        'custom',
        $3,
        'Records',
        'Custom',
        'User',
        $4::citext,
        crypt($5, gen_salt('bf', 10)),
        'Records Custom User',
        'TEST_RECORDS',
        true
      )
      RETURNING id
    `,
    [context.organization_id, context.campus_id, `REC-${Date.now()}`, email, password],
  );

  const userId = userResult.rows[0].id;

  await query(
    `
      INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
      VALUES ($1, $2, $3, $4)
    `,
    [context.organization_id, userId, context.operativo_role_id, context.campus_id],
  );

  await query(
    `
      INSERT INTO user_area_access (organization_id, user_id, campus_id, area_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [context.organization_id, userId, context.campus_id, context.area_adm_id, context.admin_user_id],
  );

  return { email, password, userId };
}

if (!hasDb) {
  test.skip("records integration tests require DATABASE_URL", () => {});
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
    await query(`DELETE FROM audit_events WHERE event_type LIKE 'records.%'`);
    await query(
      `
        DELETE FROM audit_events
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE email::text LIKE 'records.custom.%@itsmante.edu.mx'
        )
      `,
    );
    await query(`DELETE FROM record_files WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_RECORDS')`);
    await query(`DELETE FROM record_revisions WHERE record_id IN (SELECT id FROM records WHERE note = 'TEST_RECORDS')`);
    await query(`DELETE FROM files WHERE file_name LIKE 'test-records-%'`);
    await query(`DELETE FROM records WHERE note = 'TEST_RECORDS'`);
    await query(`DELETE FROM user_area_access WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'records.custom.%@itsmante.edu.mx')`);
    await query(`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'records.custom.%@itsmante.edu.mx')`);
    await query(`DELETE FROM users WHERE email::text LIKE 'records.custom.%@itsmante.edu.mx'`);
    await query(`DELETE FROM areas WHERE code = 'TST-AREA'`);
    await query(`DELETE FROM campuses WHERE code = 'TEST-OTHER'`);
  });

  test("GET /records sin auth responde 401", async () => {
    const { response } = await request("/records");
    assert.equal(response.status, 401);
  });

  test("GET /records devuelve shape estable con evidencia y filtros", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();

    const recordId = await createRecordFixture({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      areaId: context.area_lab_id,
      scopeCode: "scope2",
      categoryCode: "electricidad",
      metricCode: "electricity_consumption",
      unitCode: "kwh",
      sourceCode: "metered",
      createdBy: context.ana_user_id,
      activityText: "Test GET Records",
      value: 120,
      factorValue: 0.455,
      note: "TEST_RECORDS",
      evidenceText: "nota evidencia",
    });

    await attachFileToRecord({
      organizationId: context.organization_id,
      recordId,
      uploadedBy: context.ana_user_id,
      fileName: "test-records-shape.pdf",
    });

    const auth = await login();
    const { response, body } = await request("/records?category=electricidad&source=Medicion", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length >= 1);

    const record = body.items.find((item) => item.id === recordId);
    assert.ok(record, "should include created fixture");

    const expectedKeys = [
      "activity",
      "activityText",
      "area",
      "areaCode",
      "by",
      "campusCode",
      "category",
      "co2e_kg",
      "co2e_t",
      "createdAt",
      "dateISO",
      "evidence",
      "evidenceFileId",
      "evidenceFiles",
      "evidenceUrl",
      "factor",
      "factorId",
      "hasEvidence",
      "id",
      "isEstimated",
      "metric",
      "note",
      "scope",
      "source",
      "status",
      "unit",
      "value",
    ];

    assert.deepEqual(Object.keys(record).sort(), expectedKeys.sort());
    assert.equal(record.source, "Medicion");
    assert.equal(record.category, "electricidad");
    assert.equal(record.areaCode, "LAB");
    assert.equal(record.hasEvidence, true);
    assert.ok(Array.isArray(record.evidenceFiles));
    assert.equal(record.evidenceFiles.length, 1);
    assert.equal(record.evidenceFiles[0].fileName, "test-records-shape.pdf");
  });

  test("GET /records respeta areaAccess custom", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();

    await createRecordFixture({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      areaId: context.area_adm_id,
      scopeCode: "scope2",
      categoryCode: "electricidad",
      metricCode: "electricity_consumption",
      unitCode: "kwh",
      sourceCode: "metered",
      createdBy: context.ana_user_id,
      activityText: "Test Custom ADM",
      value: 100,
      factorValue: 0.455,
    });

    await createRecordFixture({
      organizationId: context.organization_id,
      campusId: context.campus_id,
      areaId: context.area_lab_id,
      scopeCode: "scope2",
      categoryCode: "electricidad",
      metricCode: "electricity_consumption",
      unitCode: "kwh",
      sourceCode: "metered",
      createdBy: context.ana_user_id,
      activityText: "Test Custom LAB",
      value: 100,
      factorValue: 0.455,
    });

    const customUser = await createCustomAreaUser(context);
    const auth = await login(customUser.email, customUser.password);
    const { response, body } = await request("/records", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].areaCode, "ADM");
  });

  test("POST /records crea record real, revision y auditoria", async () => {
    const context = await getSeedContext();
    const fixtures = await ensureRecordCatalogFixtures();
    const auth = await login();

    const payload = {
      dateISO: "2026-04-08",
      scope: "scope2",
      metric: "electricity_consumption",
      area: "Laboratorio",
      areaCode: "LAB",
      campusCode: "CAMPUS-CT",
      category: "electricidad",
      activity: "Test POST Records",
      activityText: "Test POST Records",
      value: 1200,
      unit: "kWh",
      factor: 0.455,
      factorId: fixtures.electricityFactorId,
      co2e_kg: 546,
      status: "real",
      isEstimated: false,
      source: "Medicion",
      note: "TEST_RECORDS",
    };

    const { response, body } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 201);
    assert.equal(body.item.areaCode, "LAB");
    assert.equal(body.item.campusCode, "CAMPUS-CT");
    assert.equal(body.item.source, "Medicion");

    const recordDb = await query(
      `
        SELECT
          r.id,
          r.organization_id,
          r.campus_id,
          r.area_id,
          r.created_by,
          r.factor_value_used,
          r.co2e_kg,
          c.code AS campus_code,
          a.code AS area_code
        FROM records r
        JOIN campuses c ON c.id = r.campus_id
        JOIN areas a ON a.id = r.area_id
        WHERE r.id = $1
      `,
      [body.item.id],
    );

    assert.equal(recordDb.rowCount, 1);
    assert.equal(recordDb.rows[0].organization_id, context.organization_id);
    assert.equal(recordDb.rows[0].campus_code, "CAMPUS-CT");
    assert.equal(recordDb.rows[0].area_code, "LAB");
    assert.equal(recordDb.rows[0].created_by, context.ana_user_id);
    assert.equal(Number(recordDb.rows[0].factor_value_used), 0.455);
    assert.equal(Number(recordDb.rows[0].co2e_kg), 546);

    const revision = await query(
      `SELECT revision_no, change_reason FROM record_revisions WHERE record_id = $1`,
      [body.item.id],
    );
    assert.equal(revision.rowCount, 1);
    assert.equal(revision.rows[0].revision_no, 1);
    assert.equal(revision.rows[0].change_reason, "create");

    const audit = await query(
      `
        SELECT event_type, entity_type, entity_id
        FROM audit_events
        WHERE event_type = 'records.create'
          AND entity_id = $1
      `,
      [body.item.id],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(audit.rows[0].entity_type, "record");
  });

  test("POST /records sin permiso responde 403", async () => {
    await ensureRecordCatalogFixtures();
    const auth = await login("director@itsmante.edu.mx", "consulta1A");

    const { response } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-08",
        scope: "scope2",
        metric: "electricity_consumption",
        areaCode: "LAB",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activityText: "Test Forbidden",
        value: 50,
        unit: "kWh",
        factor: 0.455,
        source: "Medicion",
      }),
    });

    assert.equal(response.status, 403);
  });

  test("POST /records falla con area fuera del campus", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const auth = await login();

    const campusResult = await query(
      `
        INSERT INTO campuses (organization_id, name, code, city, state, country_code, is_active)
        VALUES ($1, 'Test Other Campus', 'TEST-OTHER', 'Ciudad Mante', 'Tamaulipas', 'MX', true)
        RETURNING id
      `,
      [context.organization_id],
    );

    await query(
      `
        INSERT INTO areas (campus_id, code, name, is_active)
        VALUES ($1, 'TST-AREA', 'Test Area', true)
      `,
      [campusResult.rows[0].id],
    );

    const { response } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-08",
        scope: "scope2",
        metric: "electricity_consumption",
        areaCode: "TST-AREA",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activityText: "Test Invalid Area",
        value: 50,
        unit: "kWh",
        factor: 0.455,
        source: "Medicion",
      }),
    });

    assert.equal(response.status, 422);
  });

  test("POST /records falla con unidad incompatible", async () => {
    await ensureRecordCatalogFixtures();
    const auth = await login();

    const { response } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-08",
        scope: "scope2",
        metric: "electricity_consumption",
        areaCode: "LAB",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activityText: "Test Invalid Unit",
        value: 50,
        unit: "L",
        factor: 0.455,
        source: "Medicion",
      }),
    });

    assert.equal(response.status, 422);
  });

  test("POST /records falla con factorId invalido", async () => {
    const fixtures = await ensureRecordCatalogFixtures();
    const auth = await login();

    const { response } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-08",
        scope: "scope2",
        metric: "electricity_consumption",
        areaCode: "LAB",
        campusCode: "CAMPUS-CT",
        category: "electricidad",
        activityText: "Test Invalid Factor",
        value: 50,
        unit: "kWh",
        factor: 0.455,
        factorId: fixtures.fuelFactorId,
        source: "Medicion",
      }),
    });

    assert.equal(response.status, 422);
  });

  test("POST /records resuelve catalogos desde payload frontend a FKs reales", async () => {
    const context = await getSeedContext();
    await ensureRecordCatalogFixtures();
    const auth = await login();

    const { response, body } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-09",
        scope: "scope1",
        category: "combustible",
        metric: "fuel_volume",
        unit: "L",
        source: "Inventario",
        campusCode: "CAMPUS-CT",
        area: "Laboratorio",
        activityText: "Test Catalog Resolution",
        value: 18,
        factor: 2.68,
        status: "real",
        note: "TEST_RECORDS",
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(body.item.scope, "scope1");
    assert.equal(body.item.category, "combustible");
    assert.equal(body.item.metric, "fuel_volume");
    assert.equal(body.item.unit, "L");
    assert.equal(body.item.source, "Inventario");
    assert.equal(body.item.areaCode, "LAB");

    const db = await query(
      `
        SELECT
          es.code::text AS scope_code,
          ec.code AS category_code,
          m.code AS metric_code,
          u.code AS unit_code,
          ds.code AS source_code,
          c.code AS campus_code,
          a.code AS area_code,
          r.factor_value_used
        FROM records r
        JOIN emission_scopes es ON es.id = r.scope_id
        JOIN emission_categories ec ON ec.id = r.category_id
        JOIN metrics m ON m.id = r.metric_id
        JOIN units u ON u.id = r.unit_id
        JOIN data_sources ds ON ds.id = r.data_source_id
        JOIN campuses c ON c.id = r.campus_id
        JOIN areas a ON a.id = r.area_id
        WHERE r.id = $1
      `,
      [body.item.id],
    );

    assert.equal(db.rowCount, 1);
    assert.equal(db.rows[0].scope_code, "scope1");
    assert.equal(db.rows[0].category_code, "combustible");
    assert.equal(db.rows[0].metric_code, "fuel_volume");
    assert.equal(db.rows[0].unit_code, "l");
    assert.equal(db.rows[0].source_code, "inventory");
    assert.equal(db.rows[0].campus_code, "CAMPUS-CT");
    assert.equal(db.rows[0].area_code, "LAB");
    assert.equal(Number(db.rows[0].factor_value_used), 2.68);
  });

  test("POST /records mantiene status estimado consistente y crea estimation_method_id", async () => {
    await ensureRecordCatalogFixtures();
    const auth = await login();

    const { response, body } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-10",
        scope: "scope2",
        category: "electricidad",
        metric: "electricity_consumption",
        unit: "kWh",
        source: "Estimacion",
        campusCode: "CAMPUS-CT",
        areaCode: "LAB",
        activityText: "Test Estimated Consistency",
        value: 25,
        factor: 0.455,
        status: "real",
        isEstimated: false,
        note: "TEST_RECORDS",
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(body.item.status, "est");
    assert.equal(body.item.isEstimated, true);

    const db = await query(
      `
        SELECT
          r.status,
          r.is_estimated,
          em.code AS estimation_method_code,
          ds.code AS source_code
        FROM records r
        JOIN data_sources ds ON ds.id = r.data_source_id
        LEFT JOIN estimation_methods em ON em.id = r.estimation_method_id
        WHERE r.id = $1
      `,
      [body.item.id],
    );

    assert.equal(db.rowCount, 1);
    assert.equal(db.rows[0].status, "est");
    assert.equal(db.rows[0].is_estimated, true);
    assert.equal(db.rows[0].source_code, "estimation");
    assert.equal(db.rows[0].estimation_method_code, "manual_rule");
  });

  test("POST /records falla si category no pertenece al scope", async () => {
    await ensureRecordCatalogFixtures();
    const auth = await login();

    const { response } = await request("/records", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateISO: "2026-04-11",
        scope: "scope2",
        category: "combustible",
        metric: "fuel_volume",
        unit: "L",
        source: "Inventario",
        campusCode: "CAMPUS-CT",
        areaCode: "LAB",
        activityText: "Test Invalid Scope Category",
        value: 10,
        factor: 2.68,
        note: "TEST_RECORDS",
      }),
    });

    assert.equal(response.status, 422);
  });
}
