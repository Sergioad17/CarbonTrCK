import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { clearSession, createSessionForUser, getCurrentUser, getSession, setSession } from "../lib/sessionStore";

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

function normalizeUserPayload(input = {}) {
  const role = normalizeRole(input.role || input.roleKey);
  return {
    id: String(input.id || input.userId || ""),
    userId: String(input.userId || input.id || ""),
    firstName: String(input.firstName || "").trim(),
    paternalLastName: String(input.paternalLastName || "").trim(),
    maternalLastName: String(input.maternalLastName || "").trim(),
    fullName: String(input.fullName || input.name || "").trim(),
    name: String(input.fullName || input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    role,
    roleKey: role,
    campusCode: String(input.campusCode || "CAMPUS-CT").trim(),
    areaAccess: normalizeAreaAccess(input.areaAccess),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    lastLoginAt: input.lastLoginAt || null,
    notes: String(input.notes || "").trim(),
  };
}

function resolveLoginPayload(payload) {
  const rawUser = payload?.user || payload?.data?.user || payload?.data || payload;
  const token = payload?.token || payload?.accessToken || payload?.data?.token || payload?.data?.accessToken || null;
  const refreshToken = payload?.refreshToken || payload?.data?.refreshToken || null;
  const user = normalizeUserPayload(rawUser);

  if (!user.email || !user.id) {
    const error = new Error("invalid_auth_payload");
    error.code = "invalid_auth_payload";
    throw error;
  }

  return { user, token, refreshToken };
}

function buildLocalFallbackUser(email) {
  const localPart = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  const fullName = localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    email,
    fullName: fullName || "Usuario CarbonTrack",
    name: fullName || "Usuario CarbonTrack",
    role: "admin",
    notes: "Acceso local técnico sin autenticación remota",
  };
}

export function isUsingBackendAuth() {
  return isBackendConfigured();
}

export async function login(credentials) {
  const email = String(credentials?.email || "").trim().toLowerCase();
  const password = String(credentials?.password || "");

  if (isBackendConfigured()) {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    const { user, token, refreshToken } = resolveLoginPayload(payload);
    setSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString(),
      token,
      refreshToken,
      user,
    });
    return user;
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  if (!email || !password) {
    const error = new Error("credentials");
    error.code = "credentials";
    throw error;
  }

  const sessionUser = createSessionForUser(buildLocalFallbackUser(email));
  if (!sessionUser) {
    const error = new Error("credentials");
    error.code = "credentials";
    throw error;
  }
  return sessionUser;
}

export async function hydrateCurrentUser() {
  const currentSession = getSession();
  if (!currentSession) return null;

  if (isLocalMode()) {
    return getCurrentUser();
  }

  if (!currentSession.token) {
    clearSession();
    return null;
  }

  try {
    const payload = await apiRequest("/auth/me", { method: "GET" });
    const user = normalizeUserPayload(payload?.user || payload?.data?.user || payload?.data || payload);
    setSession({
      ...currentSession,
      userId: user.id,
      email: user.email,
      role: user.role,
      user,
    });
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export async function requestPasswordReset(emailInput) {
  const email = String(emailInput || "").trim().toLowerCase();

  if (!email) {
    const error = new Error("email_required");
    error.code = "email_required";
    throw error;
  }

  if (isLocalMode()) {
    return {
      ok: true,
      mode: "local",
      message: "Recuperacion de contrasena solo disponible con backend configurado.",
    };
  }

  return apiRequest("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}
