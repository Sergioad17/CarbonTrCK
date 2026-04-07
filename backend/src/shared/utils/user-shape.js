import { normalizeRoleKey, pickPrimaryRole } from "./rbac.js";

function normalizeAreaAccess(areaAccessMode, areaCodes = []) {
  if (areaAccessMode !== "custom") {
    return { mode: "all", areaCodes: [] };
  }

  return {
    mode: "custom",
    areaCodes: Array.from(new Set((areaCodes || []).filter(Boolean))),
  };
}

export function buildNormalizedUserShape(rawUser) {
  const roles = Array.isArray(rawUser?.roles) ? rawUser.roles : [];
  const primaryRole = pickPrimaryRole(
    roles.map((role) => ({
      key: normalizeRoleKey(role.key || role.name),
      label: role.label || role.name,
    })),
  );

  return {
    id: String(rawUser.id || ""),
    numericId: rawUser.numericId ? String(rawUser.numericId) : "",
    firstName: String(rawUser.firstName || ""),
    paternalLastName: String(rawUser.paternalLastName || ""),
    maternalLastName: String(rawUser.maternalLastName || ""),
    fullName: String(rawUser.fullName || ""),
    email: String(rawUser.email || "").toLowerCase(),
    role: primaryRole.key,
    roleKey: primaryRole.key,
    campusCode: String(rawUser.campusCode || ""),
    areaAccess: normalizeAreaAccess(rawUser.areaAccessMode, rawUser.areaCodes),
    isActive: Boolean(rawUser.isActive),
    lastLoginAt: rawUser.lastLoginAt || null,
    createdAt: rawUser.createdAt || null,
    updatedAt: rawUser.updatedAt || null,
    notes: String(rawUser.notes || ""),
  };
}
