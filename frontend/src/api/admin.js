import { apiRequest } from "./httpClient";

function extractSettings(payload) {
  return payload?.settings || payload?.data?.settings || payload;
}

export async function fetchAdminGovernmentSettings() {
  return extractSettings(await apiRequest("/admin/government"));
}

export async function fetchAdminHomeSummary() {
  const payload = await apiRequest("/admin/home");
  return payload?.summary || payload?.data?.summary || payload;
}

export async function fetchOrgStructure() {
  const payload = await apiRequest("/admin/org-structure");
  return payload?.structure || payload?.data?.structure || { campuses: [], entities: [], entityTypes: [] };
}

export async function fetchAdminCatalogs() {
  const payload = await apiRequest("/admin/catalogs");
  return payload?.catalogs || payload?.data?.catalogs || { definitions: [], entries: {}, options: {} };
}

export async function fetchAdminPeriods() {
  const payload = await apiRequest("/admin/periods");
  return payload?.periods || payload?.data?.periods || [];
}

export async function fetchAdminEmissionCalculation() {
  const payload = await apiRequest("/admin/emissions-calculation");
  return payload?.data || payload?.calculation || payload;
}

export async function recalculateAdminEmissions(input = {}) {
  const payload = await apiRequest("/admin/emissions-calculation/recalculate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload?.data || payload?.result || payload;
}

export async function createAdminPeriod(period) {
  const payload = await apiRequest("/admin/periods", {
    method: "POST",
    body: JSON.stringify(period),
  });
  return payload?.period || payload?.data?.period || payload;
}

export async function updateAdminPeriod(id, period) {
  const payload = await apiRequest(`/admin/periods/${id}`, {
    method: "PUT",
    body: JSON.stringify(period),
  });
  return payload?.period || payload?.data?.period || payload;
}

export async function createAdminCatalogEntry(catalogId, entry) {
  const payload = await apiRequest(`/admin/catalogs/${catalogId}/entries`, {
    method: "POST",
    body: JSON.stringify(entry),
  });
  return payload?.entry || payload?.data?.entry || payload;
}

export async function updateAdminCatalogEntry(catalogId, entryId, entry) {
  const payload = await apiRequest(`/admin/catalogs/${catalogId}/entries/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(entry),
  });
  return payload?.entry || payload?.data?.entry || payload;
}

export async function updateAdminCatalogEntryStatus(catalogId, entryId, status) {
  const payload = await apiRequest(`/admin/catalogs/${catalogId}/entries/${entryId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return payload?.entry || payload?.data?.entry || payload;
}

export async function createOrgCampus(campus) {
  const payload = await apiRequest("/admin/org-structure/campuses", {
    method: "POST",
    body: JSON.stringify(campus),
  });
  return payload?.campus || payload?.data?.campus || payload;
}

export async function updateOrgCampus(id, campus) {
  const payload = await apiRequest(`/admin/org-structure/campuses/${id}`, {
    method: "PUT",
    body: JSON.stringify(campus),
  });
  return payload?.campus || payload?.data?.campus || payload;
}

export async function deleteOrgCampus(id) {
  const payload = await apiRequest(`/admin/org-structure/campuses/${id}`, { method: "DELETE" });
  return payload?.result || payload?.data?.result || payload;
}

export async function createOrgEntity(entity) {
  const payload = await apiRequest("/admin/org-structure/entities", {
    method: "POST",
    body: JSON.stringify(entity),
  });
  return payload?.entity || payload?.data?.entity || payload;
}

export async function updateOrgEntity(id, entity) {
  const payload = await apiRequest(`/admin/org-structure/entities/${id}`, {
    method: "PUT",
    body: JSON.stringify(entity),
  });
  return payload?.entity || payload?.data?.entity || payload;
}

export async function deleteOrgEntity(id) {
  const payload = await apiRequest(`/admin/org-structure/entities/${id}`, { method: "DELETE" });
  return payload?.result || payload?.data?.result || payload;
}

export async function saveAdminGovernmentSettings(settings) {
  return extractSettings(await apiRequest("/admin/government", {
    method: "PUT",
    body: JSON.stringify(settings),
  }));
}

export async function fetchAdminSessions() {
  const payload = await apiRequest("/admin/security/sessions");
  return payload?.sessions || payload?.data?.sessions || [];
}

export async function revokeAdminSession(id) {
  const payload = await apiRequest(`/admin/security/sessions/${id}`, { method: "DELETE" });
  const result = payload?.result || payload;
  if (!result?.revoked) {
    throw new Error("La sesión no fue revocada por el backend.");
  }
  return result;
}

export async function revokeOtherAdminSessions() {
  const payload = await apiRequest("/admin/security/sessions", { method: "DELETE" });
  const result = payload?.result || payload;
  if (!Number.isFinite(Number(result?.revokedCount))) {
    throw new Error("El backend no confirmó el cierre de sesiones remotas.");
  }
  return { revokedCount: Number(result.revokedCount) };
}

export async function fetchAdminAuditEvents(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  const suffix = params.toString() ? `?${params}` : "";
  const payload = await apiRequest(`/admin/audit-events${suffix}`);
  return payload?.events || payload?.data?.events || [];
}

export async function recordAdminAuditEvent(event) {
  const payload = await apiRequest("/admin/audit-events", {
    method: "POST",
    body: JSON.stringify(event),
  });
  return payload?.result || payload;
}
