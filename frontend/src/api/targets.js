import { apiRequest } from "./httpClient";
import { fetchEmissionRecords } from "./records";
import { getSession } from "../lib/sessionStore";
import {
  buildCsv,
  buildTargetLine,
  computeTargetSummary,
  downloadCsv,
  filterRecordsByTarget,
  normalizeAction,
  normalizeTarget,
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
  void seedTargets;
  const [targetsPayload, actionsPayload, records] = await Promise.all([
    apiRequest("/targets", {
      method: "GET",
      headers: authHeaders(),
    }),
    apiRequest("/actions", {
      method: "GET",
      headers: authHeaders(),
    }),
    fetchEmissionRecords(),
  ]);

  return {
    targets: normalizeTargetsList(targetsPayload),
    actions: normalizeActionsList(actionsPayload),
    records,
    error: "",
    meta: { seededFromEmpty: false },
  };
}

export async function persistTarget(payload) {
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

export async function persistAction(payload) {
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

export async function updateTargetStatus(target, patch) {
  const response = await apiRequest(`/targets/${target.id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  const updatedTarget = normalizeTarget(response?.target || response?.data?.target || response?.data || response, target.id);
  const moduleData = await fetchTargetsModuleData();
  return { ok: true, target: updatedTarget, targets: moduleData.targets };
}

export async function deleteTargetById(targetId) {
  await apiRequest(`/targets/${targetId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const moduleData = await fetchTargetsModuleData();
  return { ok: true, targets: moduleData.targets, actions: moduleData.actions };
}

export {
  buildCsv,
  buildTargetLine,
  computeTargetSummary,
  downloadCsv,
  filterRecordsByTarget,
  uid,
};
