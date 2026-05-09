import { apiRequest } from "./httpClient";

const BASE = "/ai-training";

function normalizeRun(input = {}) {
  return {
    id: String(input.id || ""),
    name: String(input.name || ""),
    description: String(input.description || ""),
    modelType: String(input.modelType || ""),
    status: String(input.status || "pending"),
    dateFrom: input.dateFrom || null,
    dateTo: input.dateTo || null,
    trainRatio: Number.isFinite(Number(input.trainRatio)) ? Number(input.trainRatio) : 70,
    validationRatio: Number.isFinite(Number(input.validationRatio)) ? Number(input.validationRatio) : 20,
    maxReadings: input.maxReadings === null || input.maxReadings === undefined ? null : Number(input.maxReadings),
    readingsCount: Number(input.readingsCount || 0),
    devicesCount: Number(input.devicesCount || 0),
    metrics: input.metrics && typeof input.metrics === "object" ? input.metrics : {},
    parameters: input.parameters && typeof input.parameters === "object" ? input.parameters : {},
    errorMessage: String(input.errorMessage || ""),
    startedAt: input.startedAt || null,
    finishedAt: input.finishedAt || null,
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
    devices: Array.isArray(input.devices)
      ? input.devices.map((device) => ({
          deviceId: String(device.deviceId || device.device_id || ""),
          deviceCode: String(device.deviceCode || device.device_code || ""),
        }))
      : [],
    modelVersion: input.modelVersion
      ? {
          id: String(input.modelVersion.id || ""),
          modelType: String(input.modelVersion.modelType || ""),
          version: String(input.modelVersion.version || ""),
          status: String(input.modelVersion.status || "inactive"),
          metrics: input.modelVersion.metrics && typeof input.modelVersion.metrics === "object" ? input.modelVersion.metrics : {},
          artifactPath: String(input.modelVersion.artifactPath || ""),
          activatedAt: input.modelVersion.activatedAt || null,
          activatedBy: input.modelVersion.activatedBy || null,
          createdAt: input.modelVersion.createdAt || null,
        }
      : null,
  };
}

function normalizeList(payload) {
  const items = payload?.items || payload?.data?.items || [];
  return Array.isArray(items) ? items.map(normalizeRun) : [];
}

function pickItem(payload) {
  return payload?.item || payload?.data?.item || payload || {};
}

export async function fetchAITrainingRuns() {
  const payload = await apiRequest(BASE);
  return normalizeList(payload);
}

export async function fetchAITrainingRun(id) {
  const payload = await apiRequest(`${BASE}/${id}`);
  return normalizeRun(pickItem(payload));
}

export async function fetchAITrainingSummary() {
  const payload = await apiRequest(`${BASE}/summary`);
  const summary = payload?.summary || payload?.data?.summary || {};
  return {
    totals: summary.totals || { total: 0, running: 0, pending: 0, completed: 0, failed: 0, cancelled: 0 },
    lastCompletedRun: summary.lastCompletedRun || null,
    activeModel: summary.activeModel || null,
    readingsAvailable: Number(summary.readingsAvailable || 0),
  };
}

export async function createAITrainingRun(payload) {
  const response = await apiRequest(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeRun(pickItem(response));
}

export async function startAITrainingRun(id) {
  const response = await apiRequest(`${BASE}/${id}/start`, { method: "POST" });
  return normalizeRun(pickItem(response));
}

export async function cancelAITrainingRun(id) {
  const response = await apiRequest(`${BASE}/${id}/cancel`, { method: "POST" });
  return normalizeRun(pickItem(response));
}

export async function retryAITrainingRun(id) {
  const response = await apiRequest(`${BASE}/${id}/retry`, { method: "POST" });
  return normalizeRun(pickItem(response));
}

export async function activateAITrainingRun(id) {
  const response = await apiRequest(`${BASE}/${id}/activate`, { method: "POST" });
  return normalizeRun(pickItem(response));
}

export async function deactivateAITrainingRun(id) {
  const response = await apiRequest(`${BASE}/${id}/deactivate`, { method: "POST" });
  return normalizeRun(pickItem(response));
}

export async function deleteAITrainingRun(id) {
  await apiRequest(`${BASE}/${id}`, { method: "DELETE" });
  return { ok: true };
}
