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
        lab.code AS area_lab_code,
        adm.code AS area_adm_code
      FROM organizations o
      JOIN campuses c ON c.organization_id = o.id AND c.code = 'CAMPUS-CT'
      JOIN areas lab ON lab.campus_id = c.id AND lab.code = 'LAB'
      JOIN areas adm ON adm.campus_id = c.id AND adm.code = 'ADM'
      WHERE o.name = 'CarbonTrack Demo Org'
      LIMIT 1
    `,
  );

  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

function buildDevicePayload(seed, suffix) {
  return {
    name: `Dispositivo prueba ${suffix}`,
    code: `ESP32-TEST-${suffix}`,
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
    notes: "TEST_DEVICE",
    tlsRequired: true,
    verifyServerCert: true,
    offlineBuffer: true,
    enabled: true,
    voltage: 127,
    powerFactor: 0.94,
  };
}

if (!hasDb) {
  test.skip("devices integration tests require DATABASE_URL", () => {});
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
        WHERE entity_id IN (
          SELECT id
          FROM iot_devices
          WHERE code LIKE 'ESP32-TEST-%'
        )
        OR details->>'deviceCode' LIKE 'ESP32-TEST-%'
        OR details->>'sourceCode' LIKE 'ESP32-TEST-%'
        OR details->>'code' LIKE 'ESP32-TEST-%'
      `,
    );

    await query(`DELETE FROM iot_devices WHERE code LIKE 'ESP32-TEST-%'`);
  });

  test("GET /devices sin auth responde 401", async () => {
    const { response } = await request("/devices");
    assert.equal(response.status, 401);
  });

  test("GET /devices exige rol admin", async () => {
    const auth = await login("ana@itsmante.edu.mx", "captura1A");
    const { response } = await request("/devices", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(response.status, 403);
  });

  test("POST /devices crea dispositivo y GET /devices oculta la credencial", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const suffix = `${Date.now()}`.slice(-6);
    const payload = buildDevicePayload(seed, suffix);

    const createResult = await request("/devices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    assert.equal(createResult.response.status, 201);
    assert.ok(createResult.body.item.id);
    assert.ok(createResult.body.item.token);
    assert.match(createResult.body.item.token, /^[A-Z2-9]{7}(?:-[A-Z2-9]{7}){8}$/);

    const dbResult = await query(
      `
        SELECT credential_hash, credential_issued_at
        FROM iot_devices
        WHERE code = $1
      `,
      [payload.code],
    );

    assert.equal(dbResult.rowCount, 1);
    assert.ok(dbResult.rows[0].credential_hash);
    assert.ok(dbResult.rows[0].credential_issued_at);

    const listResult = await request("/devices", {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(listResult.response.status, 200);
    const item = listResult.body.items.find((device) => device.code === payload.code);
    assert.ok(item);
    assert.equal(item.token, "");
  });

  test("PATCH /devices y PATCH /devices/:id/status actualizan configuracion", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const suffix = `${Date.now()}`.slice(-6);
    const payload = buildDevicePayload(seed, suffix);

    const created = await request("/devices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const deviceId = created.body.item.id;

    const updateResult = await request(`/devices/${deviceId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        name: `${payload.name} actualizado`,
        areaCode: seed.area_adm_code,
        protocol: "mqtt",
        backendUrl: "mqtts://broker.carbontreck.com",
        endpointPath: "/telemetry/carbontrack/device",
        streamMode: "realtime",
        intervalSeconds: "30",
      }),
    });

    assert.equal(updateResult.response.status, 200);
    assert.equal(updateResult.body.item.areaCode, seed.area_adm_code);
    assert.equal(updateResult.body.item.protocol, "mqtt");
    assert.equal(updateResult.body.item.streamMode, "realtime");

    const statusResult = await request(`/devices/${deviceId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: false }),
    });

    assert.equal(statusResult.response.status, 200);
    assert.equal(statusResult.body.item.enabled, false);
    assert.equal(statusResult.body.item.status, "offline");
  });

  test("POST /devices/:id/duplicate emite nueva credencial y DELETE /devices/:id elimina", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const suffix = `${Date.now()}`.slice(-6);
    const payload = buildDevicePayload(seed, suffix);

    const created = await request("/devices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const duplicateResult = await request(`/devices/${created.body.item.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(duplicateResult.response.status, 201);
    assert.notEqual(duplicateResult.body.item.id, created.body.item.id);
    assert.notEqual(duplicateResult.body.item.code, payload.code);
    assert.ok(duplicateResult.body.item.token);

    const deleteResult = await request(`/devices/${created.body.item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.body.token}` },
    });

    assert.equal(deleteResult.response.status, 204);
  });

  test("POST /iot/readings acepta credencial valida y rechaza lecturas duplicadas", async () => {
    const seed = await getSeedContext();
    const auth = await login();
    const suffix = `${Date.now()}`.slice(-6);
    const payload = buildDevicePayload(seed, suffix);

    const created = await request("/devices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.body.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const credential = created.body.item.token;
    const recordedAt = new Date().toISOString();
    const readingPayload = {
      deviceCode: payload.code,
      recordedAt,
      schemaVersion: "1.0",
      totalKwh: 1523.44,
      deltaKwh: 1.27,
      voltage: 127.4,
      currentAmp: 4.12,
      powerFactor: 0.96,
      intervalSeconds: 60,
      payload: {
        firmwareVersion: "1.0.0",
      },
    };

    const ingestResult = await request("/iot/readings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(readingPayload),
    });

    assert.equal(ingestResult.response.status, 201);
    assert.equal(ingestResult.body.ok, true);
    assert.equal(ingestResult.body.deviceCode, payload.code);

    const duplicateResult = await request("/iot/readings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(readingPayload),
    });

    assert.equal(duplicateResult.response.status, 409);
    assert.equal(duplicateResult.body.code, "DUPLICATE_DEVICE_READING");
  });
}
