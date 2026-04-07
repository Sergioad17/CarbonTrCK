import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { createEmissionRecord } from "./records";
import { fetchDefaultFactorValue } from "./factors";
import { getSession } from "../lib/sessionStore";
import {
  EQUIPMENT_AREA_OPTIONS,
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  appendEstimatedRecord,
  buildEstimatedRecord,
  computeCo2eMonth,
  computeHoursMonth,
  computeKwhMonth,
  deactivate,
  duplicate,
  filterEquipment,
  getAll,
  getAreaLabel,
  getCategoryLabel,
  getTypeLabel,
  normalizeEquipment,
  upsert,
} from "../lib/equipmentStore";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function emitEquipmentChanged(items) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carbontrack:equipment-changed", { detail: items }));
}

function normalizeEquipmentList(payload) {
  const rawItems = payload?.equipment || payload?.items || payload?.data?.equipment || payload?.data?.items || payload?.data || payload;
  return Array.isArray(rawItems)
    ? rawItems.map((item, index) => normalizeEquipment(item, `equipment-${index + 1}`))
    : [];
}

export async function fetchEquipment() {
  if (isBackendConfigured()) {
    const payload = await apiRequest("/equipment", {
      method: "GET",
      headers: authHeaders(),
    });
    return normalizeEquipmentList(payload);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return getAll();
}

export async function persistEquipment(payload) {
  if (isBackendConfigured()) {
    const method = payload?.id ? "PATCH" : "POST";
    const path = payload?.id ? `/equipment/${payload.id}` : "/equipment";
    const response = await apiRequest(path, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const equipment = normalizeEquipment(
      response?.equipment || response?.item || response?.data?.equipment || response?.data?.item || response?.data || response,
      payload?.id
    );
    const items = await fetchEquipment();
    emitEquipmentChanged(items);
    return { ok: true, equipment, items };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return upsert(payload);
}

export async function updateEquipmentStatus(equipmentId, nextActive) {
  if (isBackendConfigured()) {
    await apiRequest(`/equipment/${equipmentId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: nextActive }),
    });
    const items = await fetchEquipment();
    emitEquipmentChanged(items);
    return items;
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return deactivate(equipmentId, nextActive);
}

export async function duplicateEquipment(equipmentId) {
  if (isBackendConfigured()) {
    const response = await apiRequest(`/equipment/${equipmentId}/duplicate`, {
      method: "POST",
      headers: authHeaders(),
    });
    const equipment = normalizeEquipment(
      response?.equipment || response?.item || response?.data?.equipment || response?.data?.item || response?.data || response
    );
    const items = await fetchEquipment();
    emitEquipmentChanged(items);
    return { ok: true, equipment, items };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return duplicate(equipmentId);
}

export async function fetchEquipmentElectricityFactor() {
  return fetchDefaultFactorValue("scope2", "electricidad");
}

export async function createEquipmentEstimatedEmissionRecord({ equipment, factorValue, factorId, dateISO }) {
  const record = buildEstimatedRecord(equipment, {
    factor: factorValue,
    factorId: factorId || null,
    dateISO,
  });

  if (isLocalMode()) {
    appendEstimatedRecord(record);
    return { ok: true, record };
  }

  if (!isBackendConfigured()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const created = await createEmissionRecord(record);
  return { ok: true, record: created?.record || record };
}

export {
  EQUIPMENT_AREA_OPTIONS,
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  computeCo2eMonth,
  computeHoursMonth,
  computeKwhMonth,
  filterEquipment,
  getAreaLabel,
  getCategoryLabel,
  getTypeLabel,
};
