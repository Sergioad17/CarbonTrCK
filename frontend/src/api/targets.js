import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { fetchEmissionRecords } from "./records";
import { getSession } from "../lib/sessionStore";
import {
  buildCsv,
  buildTargetLine,
  computeTargetSummary,
  downloadCsv,
  filterRecordsByTarget,
  loadActions,
  loadRecords,
  loadTargets,
  normalizeAction,
  normalizeTarget,
  removeTarget,
  saveActions,
  saveTargets,
  upsertAction,
  upsertTarget,
  uid,
} from "../lib/targetsStore";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function normalizeTargetsList(payload) {
  const rawItems = payload?.targets || payload?.data?.targets || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeTarget).filter(Boolean) : [];
}

function normalizeActionsList(payload) {
  const rawItems = payload?.actions || payload?.data?.actions || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeAction).filter(Boolean) : [];
}

export async function fetchTargetsModuleData(seedTargets = []) {
  if (isBackendConfigured()) {
    const [targetsPayload, actionsPayload, records] = await Promise.all([
      apiRequest("/targets", {
        method: "GET",
        headers: authHeaders(),
      }),
      apiRequest("/actions", {
        method: "GET",
        headers: authHeaders(),
      }),
      fetchEmissionRecords([]),
    ]);

    return {
      targets: normalizeTargetsList(targetsPayload),
      actions: normalizeActionsList(actionsPayload),
      records,
      error: "",
      meta: { seededFromEmpty: false },
    };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const targetsState = loadTargets();
  const actionsState = loadActions();
  const recordsState = loadRecords();
  const hasSeedTargets = Array.isArray(seedTargets) && seedTargets.length > 0;
  const targets = targetsState.targets.length
    ? targetsState.targets
    : hasSeedTargets
    ? seedTargets.map(normalizeTarget).filter(Boolean)
    : [];

  if (!targetsState.targets.length && targets.length) {
    saveTargets(targets);
  }

  return {
    targets,
    actions: actionsState.actions,
    records: recordsState.records,
    error: targetsState.error || actionsState.error || recordsState.error || "",
    meta: { seededFromEmpty: !targetsState.targets.length && targets.length > 0 },
  };
}

export async function persistTarget(payload) {
  if (isBackendConfigured()) {
    const method = payload?.id ? "PATCH" : "POST";
    const path = payload?.id ? `/targets/${payload.id}` : "/targets";
    const response = await apiRequest(path, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const target = normalizeTarget(response?.target || response?.data?.target || response?.data || response, payload?.id);
    const moduleData = await fetchTargetsModuleData();
    return { ok: true, target, targets: moduleData.targets };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const current = loadTargets().targets;
  const targets = upsertTarget(current, payload);
  saveTargets(targets);
  return { ok: true, target: normalizeTarget(payload), targets };
}

export async function persistAction(payload) {
  if (isBackendConfigured()) {
    const method = payload?.id ? "PATCH" : "POST";
    const path = payload?.id ? `/actions/${payload.id}` : "/actions";
    const response = await apiRequest(path, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const action = normalizeAction(response?.action || response?.data?.action || response?.data || response, payload?.id);
    const moduleData = await fetchTargetsModuleData();
    return { ok: true, action, actions: moduleData.actions };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const current = loadActions().actions;
  const actions = upsertAction(current, payload);
  saveActions(actions);
  return { ok: true, action: normalizeAction(payload), actions };
}

export async function updateTargetStatus(target, patch) {
  const payload = { ...target, ...patch };
  if (isBackendConfigured()) {
    const response = await apiRequest(`/targets/${target.id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const updatedTarget = normalizeTarget(response?.target || response?.data?.target || response?.data || response, target.id);
    const moduleData = await fetchTargetsModuleData();
    return { ok: true, target: updatedTarget, targets: moduleData.targets };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const current = loadTargets().targets;
  const targets = upsertTarget(current, payload);
  saveTargets(targets);
  return { ok: true, target: normalizeTarget(payload), targets };
}

export async function deleteTargetById(targetId) {
  if (isBackendConfigured()) {
    await apiRequest(`/targets/${targetId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const moduleData = await fetchTargetsModuleData();
    return { ok: true, targets: moduleData.targets, actions: moduleData.actions };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const currentTargets = loadTargets().targets;
  const currentActions = loadActions().actions;
  const next = removeTarget(currentTargets, currentActions, targetId);
  saveTargets(next.targets);
  saveActions(next.actions);
  return { ok: true, targets: next.targets, actions: next.actions };
}

export {
  buildCsv,
  buildTargetLine,
  computeTargetSummary,
  downloadCsv,
  filterRecordsByTarget,
  uid,
};
