import { apiRequest } from "./httpClient";
import { getSession, setSession } from "../lib/sessionStore";
import {
  USER_AREA_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_ROLE_SUMMARY,
  describeAreaAccess,
  filterUsers,
  getRoleLabel,
} from "../lib/usersStore";

function authHeaders() {
  const session = getSession();
  return session?.token
    ? {
        Authorization: `Bearer ${session.token}`,
      }
    : {};
}

function normalizeAreaAccess(areaAccess) {
  if (!areaAccess || areaAccess.mode !== "custom") return { mode: "all", areaCodes: [] };
  return {
    mode: "custom",
    areaCodes: Array.isArray(areaAccess.areaCodes) ? areaAccess.areaCodes.filter(Boolean) : [],
  };
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "administrador") return "admin";
  if (normalized === "directivo") return "directivo";
  if (normalized === "operativo" || normalized === "capturista") return "operativo";
  return normalized || "operativo";
}

function normalizeUser(input = {}) {
  const role = normalizeRole(input.role || input.roleKey);
  return {
    id: String(input.id || input.userId || ""),
    numericId: String(input.numericId || ""),
    firstName: String(input.firstName || "").trim(),
    paternalLastName: String(input.paternalLastName || "").trim(),
    maternalLastName: String(input.maternalLastName || "").trim(),
    fullName: String(input.fullName || input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    role,
    roleKey: role,
    campusCode: String(input.campusCode || "CAMPUS-CT").trim(),
    areaAccess: normalizeAreaAccess(input.areaAccess),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    lastLoginAt: input.lastLoginAt || null,
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
    notes: String(input.notes || "").trim(),
  };
}

function normalizeUsersList(payload) {
  const rawItems = payload?.users || payload?.data?.users || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeUser) : [];
}

function normalizeRolesList(payload) {
  const rawItems = payload?.roles || payload?.data?.roles || payload?.data || payload;
  return Array.isArray(rawItems) && rawItems.length ? rawItems : USER_ROLE_OPTIONS;
}

function syncCurrentSessionUser(users) {
  const session = getSession();
  if (!session?.userId || !Array.isArray(users)) return;
  const currentUser = users.find((item) => item.id === session.userId);
  if (!currentUser) return;
  setSession({
    ...session,
    email: currentUser.email,
    role: currentUser.role,
    user: currentUser,
  });
}

export async function fetchUsersModuleData() {
  const [usersPayload, rolesPayload] = await Promise.all([
    apiRequest("/users", {
      method: "GET",
      headers: authHeaders(),
    }),
    apiRequest("/users/roles", {
      method: "GET",
      headers: authHeaders(),
    }),
  ]);

  const users = normalizeUsersList(usersPayload);
  const roles = normalizeRolesList(rolesPayload);
  syncCurrentSessionUser(users);
  return { users, roles, meta: { initializedEmpty: false } };
}

export async function saveUser(payload) {
  const method = payload?.id ? "PATCH" : "POST";
  const path = payload?.id ? `/users/${payload.id}` : "/users";
  const response = await apiRequest(path, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const user = normalizeUser(response?.user || response?.data?.user || response?.data || response);
  const temporaryPassword =
    response?.temporaryPassword ||
    response?.data?.temporaryPassword ||
    response?.password ||
    response?.data?.password ||
    "";
  const users = normalizeUsersList(await apiRequest("/users", { method: "GET", headers: authHeaders() }));
  syncCurrentSessionUser(users);
  return { ok: true, user, users, temporaryPassword };
}

export async function updateUserStatus(user, nextActive) {
  await apiRequest(`/users/${user.id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive: nextActive }),
  });
  const users = normalizeUsersList(await apiRequest("/users", { method: "GET", headers: authHeaders() }));
  syncCurrentSessionUser(users);
  return users;
}

export async function deleteUser(userId) {
  try {
    await apiRequest(`/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch (error) {
    const missingDeleteRoute =
      error?.status === 404 &&
      String(error?.message || error?.payload?.message || "").includes("Route DELETE");

    if (!missingDeleteRoute) {
      throw error;
    }

    await apiRequest(`/users/${userId}/delete`, {
      method: "POST",
      headers: authHeaders(),
    });
  }
  const users = normalizeUsersList(await apiRequest("/users", { method: "GET", headers: authHeaders() }));
  syncCurrentSessionUser(users);
  return users;
}

export async function resetUserPassword(userId) {
  const response = await apiRequest(`/users/${userId}/password-reset`, {
    method: "POST",
    headers: authHeaders(),
  });
  const tempPassword =
    response?.temporaryPassword ||
    response?.password ||
    response?.data?.temporaryPassword ||
    response?.data?.password ||
    "";
  return { ok: true, password: tempPassword };
}

export {
  USER_AREA_OPTIONS,
  describeAreaAccess,
  filterUsers,
  getRoleLabel,
  USER_ROLE_OPTIONS,
  USER_ROLE_SUMMARY,
};
