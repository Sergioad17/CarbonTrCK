import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { cleanupTestAuthFixtures, prepareTestAuthFixtures } from "./helpers/test-auth-fixtures.js";
import { configureTestDatabaseUrl } from "./helpers/test-database-url.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(configureTestDatabaseUrl());

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
        c.code AS campus_code,
        lab.code AS area_lab_code
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      WHERE o.name = 'CarbonTrack Test Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

function buildDevicePayload(seed, suffix) {
  return {
    name: `Dispositivo IA ${suffix}`,
    code: `ESP32-AIT-${suffix}`,
    campusCode: seed.campus_code,
    areaCode: seed.area_lab_code,
    protocol: "https",
    streamMode: "scheduled",
    intervalSeconds: "60",
    metric: "electricity_consumption",
    unit: "kWh",
    backendUrl: "https://api.carbontreck.com",
    endpointPath: "/iot/readings",
    wifiProfile: "Campus-IoT",
    deviceType: "ESP32",
    notes: "AI_TRAINING_TEST",
    tlsRequired: true,
    verifyServerCert: true,
    offlineBuffer: true,
    enabled: true,
    voltage: 127,
    powerFactor: 0.94,
  };
}

async function ingestReading(credential, deviceCode, recordedAt, overrides = {}) {
  return request("/iot/readings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceCode,
      recordedAt,
      schemaVersion: "1.0",
      totalKwh: 1500 + Math.random() * 100,
      deltaKwh: 1 + Math.random(),
      voltage: 127 + Math.random(),
      currentAmp: 4 + Math.random(),
      powerFactor: 0.95,
      intervalSeconds: 60,
      batteryLevel: 85,
      batteryVoltage: 3.7,
      payload: { firmwareVersion: "1.0.0" },
      ...overrides,
    }),
  });
}

async function createDeviceWithReadings(token, seed, suffix, readingsCount = 3) {
  const created = await request("/devices", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDevicePayload(seed, suffix)),
  });

  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const device = created.body.item;
  const credential = device.token;
  const baseTime = Date.now() - readingsCount * 60_000;

  for (let i = 0; i < readingsCount; i += 1) {
    const recordedAt = new Date(baseTime + i * 60_000).toISOString();
    const ingest = await ingestReading(credential, device.code, recordedAt);
    assert.equal(ingest.response.status, 201, JSON.stringify(ingest.body));
  }

  return device;
}

if (!hasDb) {
  test.skip("ai-training integration tests require DATABASE_URL", () => {});
} else {
  before(async () => {
    const { createApp } = await import("../src/app.js");
    ({ query, closePool } = await import("../src/shared/db/pool.js"));
    const { ensureAiTrainingSchema } = await import("../src/domains/ai-training/ai-training.repository.js");
    await ensureAiTrainingSchema();
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
    await query(`DELETE FROM ai_model_versions WHERE training_run_id IN (SELECT id FROM ai_training_runs WHERE name LIKE 'AI Run %')`);
    await query(`DELETE FROM ai_training_run_devices WHERE training_run_id IN (SELECT id FROM ai_training_runs WHERE name LIKE 'AI Run %')`);
    await query(`DELETE FROM ai_training_runs WHERE name LIKE 'AI Run %'`);
    await query(`DELETE FROM audit_events WHERE event_type LIKE 'ai_training.%'`);
    await query(`DELETE FROM device_readings WHERE device_id IN (SELECT id FROM iot_devices WHERE code LIKE 'ESP32-AIT-%')`);
    await query(
      `
        DELETE FROM audit_events
        WHERE entity_id IN (SELECT id FROM iot_devices WHERE code LIKE 'ESP32-AIT-%')
          OR details->>'deviceCode' LIKE 'ESP32-AIT-%'
          OR details->>'sourceCode' LIKE 'ESP32-AIT-%'
          OR details->>'code' LIKE 'ESP32-AIT-%'
      `,
    );
    await query(`DELETE FROM iot_devices WHERE code LIKE 'ESP32-AIT-%'`);
  });

  test("GET /ai-training sin auth responde 401", async () => {
    const { response } = await request("/ai-training");
    assert.equal(response.status, 401);
  });

  test("GET /ai-training exige rol admin", async () => {
    const auth = await login("ana@itsmante.edu.mx", "captura1A");
    const { response } = await request("/ai-training", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });
    assert.equal(response.status, 403);
  });

  test("POST /ai-training crea entrenamiento con lecturas listas y persiste métricas", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);

    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 3);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run create ${suffix}`,
        description: "Entrenamiento de prueba",
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        trainRatio: 70,
        validationRatio: 20,
        useReadyOnly: true,
      }),
    });

    assert.equal(create.response.status, 201, JSON.stringify(create.body));
    assert.equal(create.body.item.status, "pending");
    assert.equal(create.body.item.devicesCount, 1);
    assert.equal(create.body.item.readingsCount, 3);
    assert.equal(create.body.item.devices.length, 1);
    assert.equal(create.body.item.devices[0].deviceCode, device.code);

    const list = await request("/ai-training", { method: "GET", headers });
    assert.equal(list.response.status, 200);
    const found = list.body.items.find((entry) => entry.id === create.body.item.id);
    assert.ok(found);
    assert.equal(found.devicesCount, 1);

    const detail = await request(`/ai-training/${create.body.item.id}`, { method: "GET", headers });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.item.devicesCount, 1);
    assert.equal(detail.body.item.readingsCount, 3);

    const audit = await query(
      `SELECT event_type FROM audit_events WHERE entity_id = $1 AND event_type = 'ai_training.create'`,
      [create.body.item.id],
    );
    assert.ok(audit.rowCount >= 1);
  });

  test("POST /ai-training con dispositivo sin lecturas listas falla con NO_READY_READINGS", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);

    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 1);
    const readings = await request(`/devices/${device.id}/readings`, { method: "GET", headers });
    assert.equal(readings.response.status, 200);
    const readingId = readings.body.items[0].id;

    const exclude = await request(`/devices/${device.id}/readings/${readingId}/training`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ included: false, status: "excluded", note: "Test exclude" }),
    });
    assert.equal(exclude.response.status, 200);
    assert.equal(exclude.body.item.trainingIncluded, false);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run noready ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: true,
      }),
    });

    assert.equal(create.response.status, 422);
    assert.equal(create.body.code, "NO_READY_READINGS");
  });

  test("POST /ai-training rechaza useReadyOnly false", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);
    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 1);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run unsafe ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: false,
      }),
    });

    assert.equal(create.response.status, 422);
    assert.equal(create.body.code, "READY_ONLY_REQUIRED");
  });

  test("POST /ai-training/:id/start, /cancel y /retry transicionan correctamente", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);
    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 2);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run lifecycle ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: true,
      }),
    });
    const runId = create.body.item.id;

    const start = await request(`/ai-training/${runId}/start`, { method: "POST", headers });
    assert.equal(start.response.status, 200);
    assert.equal(start.body.item.status, "running");
    assert.ok(start.body.item.startedAt);

    const startAgain = await request(`/ai-training/${runId}/start`, { method: "POST", headers });
    assert.equal(startAgain.response.status, 409);
    assert.equal(startAgain.body.code, "INVALID_TRANSITION");

    const cancel = await request(`/ai-training/${runId}/cancel`, { method: "POST", headers });
    assert.equal(cancel.response.status, 200);
    assert.equal(cancel.body.item.status, "cancelled");
    assert.ok(cancel.body.item.finishedAt);

    const retry = await request(`/ai-training/${runId}/retry`, { method: "POST", headers });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.body.item.status, "pending");
    assert.equal(retry.body.item.startedAt, null);
  });

  test("POST /ai-training/:id/activate solo permite entrenamientos completados", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);
    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 2);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run activate ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: true,
      }),
    });
    const runId = create.body.item.id;

    const earlyActivate = await request(`/ai-training/${runId}/activate`, { method: "POST", headers });
    assert.equal(earlyActivate.response.status, 409);
    assert.equal(earlyActivate.body.code, "RUN_NOT_COMPLETED");

    await query(
      `UPDATE ai_training_runs SET status = 'completed', finished_at = now() WHERE id = $1`,
      [runId],
    );

    const stillNoModel = await request(`/ai-training/${runId}/activate`, { method: "POST", headers });
    assert.equal(stillNoModel.response.status, 409);
    assert.equal(stillNoModel.body.code, "MODEL_VERSION_MISSING");

    await query(
      `
        INSERT INTO ai_model_versions (organization_id, training_run_id, model_type, version, status, metrics, artifact_path)
        VALUES ($1,$2,'consumption_prediction','v1','inactive','{"rmse":0.5}'::jsonb,NULL)
      `,
      [seed.organization_id, runId],
    );

    const activate = await request(`/ai-training/${runId}/activate`, { method: "POST", headers });
    assert.equal(activate.response.status, 200);
    assert.equal(activate.body.item.modelVersion.status, "active");
  });

  test("DELETE /ai-training/:id elimina entrenamiento sin modelo activo", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);
    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 1);

    const create = await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run delete ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: true,
      }),
    });
    const runId = create.body.item.id;

    const remove = await request(`/ai-training/${runId}`, { method: "DELETE", headers });
    assert.equal(remove.response.status, 204);

    const detail = await request(`/ai-training/${runId}`, { method: "GET", headers });
    assert.equal(detail.response.status, 404);
  });

  test("GET /ai-training/summary devuelve métricas reales", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const headers = { Authorization: `Bearer ${auth.body.token}`, "Content-Type": "application/json" };
    const suffix = `${Date.now()}`.slice(-6);
    const device = await createDeviceWithReadings(auth.body.token, seed, suffix, 2);

    await request("/ai-training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `AI Run summary ${suffix}`,
        modelType: "consumption_prediction",
        deviceIds: [device.id],
        useReadyOnly: true,
      }),
    });

    const summary = await request("/ai-training/summary", { method: "GET", headers });
    assert.equal(summary.response.status, 200);
    assert.ok(summary.body.summary);
    assert.ok(summary.body.summary.totals);
    assert.ok(Number(summary.body.summary.totals.total) >= 1);
    assert.ok(Number(summary.body.summary.readingsAvailable) >= 2);
  });
}
