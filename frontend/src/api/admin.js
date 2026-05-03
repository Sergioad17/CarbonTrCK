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
  return payload?.result || payload;
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
