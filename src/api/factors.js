import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { getSession } from "../lib/sessionStore";
import {
  deactivate,
  duplicateAsNewVersion,
  filterFactors,
  findDefaultConflict,
  getAll,
  getDefaultFactor,
  getUsageCount,
  setDefault,
  upsert,
} from "../lib/factorsStore";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeFactor(input = {}, fallbackId) {
  return {
    id: cleanString(input.id) || fallbackId || `factor-${Date.now()}`,
    scope: cleanString(input.scope, "scope2") || "scope2",
    category: cleanString(input.category, "electricidad") || "electricidad",
    metric: cleanString(input.metric),
    numeratorUnit: cleanString(input.numeratorUnit, "kgCO2e") || "kgCO2e",
    denominatorUnit: cleanString(input.denominatorUnit, "kWh") || "kWh",
    value: Number.isFinite(Number(input.value)) ? Number(input.value) : 0,
    region: cleanString(input.region, "MX") || "MX",
    provider: cleanString(input.provider),
    sourceUrl: cleanString(input.sourceUrl),
    validFrom: cleanString(input.validFrom),
    validTo: cleanString(input.validTo) || null,
    isDefault: Boolean(input.isDefault),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    uncertaintyPct: input.uncertaintyPct === null || input.uncertaintyPct === "" ? null : Number(input.uncertaintyPct),
    notes: cleanString(input.notes),
    createdAt: cleanString(input.createdAt),
    updatedAt: cleanString(input.updatedAt),
  };
}

function normalizeFactorsList(payload) {
  const rawItems = payload?.factors || payload?.data?.factors || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map((item, index) => normalizeFactor(item, `factor-${index + 1}`)) : [];
}

export async function fetchFactors() {
  if (isBackendConfigured()) {
    const payload = await apiRequest("/factors", {
      method: "GET",
      headers: authHeaders(),
    });
    return normalizeFactorsList(payload);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return getAll();
}

export async function fetchFactorUsageCount(factorId) {
  if (isBackendConfigured()) {
    const payload = await apiRequest(`/factors/${factorId}/usage-count`, {
      method: "GET",
      headers: authHeaders(),
    });
    return Number(payload?.count || payload?.data?.count || 0);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return getUsageCount(factorId);
}

export async function persistFactor({ factor, payload, mode = "edit", forceDefaultOverride = false }) {
  if (isBackendConfigured()) {
    const response = await apiRequest(
        factor && mode === "newVersion" ? `/factors/${factor.id}/new-version` : factor ? `/factors/${factor.id}` : "/factors",
      {
        method: factor ? (mode === "newVersion" ? "POST" : "PATCH") : "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...payload, forceDefaultOverride }),
      }
    );
    return {
      ok: true,
      factor: normalizeFactor(response?.factor || response?.data?.factor || response?.data || response),
      factors: await fetchFactors(),
    };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return factor && mode === "newVersion"
    ? duplicateAsNewVersion(factor.id, payload, { forceDefaultOverride })
    : upsert({ ...factor, ...payload }, { forceDefaultOverride });
}

export async function updateFactorDefault(factorId, force = false) {
  if (isBackendConfigured()) {
    const response = await apiRequest(`/factors/${factorId}/default`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ force }),
    });
    return {
      ok: true,
      factor: normalizeFactor(response?.factor || response?.data?.factor || response?.data || response, factorId),
      factors: await fetchFactors(),
    };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return setDefault(factorId, force ? { force: true } : undefined);
}

export async function updateFactorStatus(factorId, nextActive) {
  if (isBackendConfigured()) {
    await apiRequest(`/factors/${factorId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: nextActive }),
    });
    return fetchFactors();
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return deactivate(factorId, nextActive);
}

export async function fetchDefaultFactorValue(scope = "scope2", category = "electricidad") {
  if (isBackendConfigured()) {
    const payload = await apiRequest(`/factors/default?scope=${encodeURIComponent(scope)}&category=${encodeURIComponent(category)}`, {
      method: "GET",
      headers: authHeaders(),
    });
    const rawFactor = payload?.factor || payload?.data?.factor || payload?.data || payload;
    return rawFactor ? normalizeFactor(rawFactor) : null;
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return getDefaultFactor(scope, category);
}

export {
  filterFactors,
  findDefaultConflict,
};
