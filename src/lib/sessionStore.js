import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";
import { findById, getAll, getRoleLabel, upsert } from "./usersStore";

const SESSION_KEY = STORAGE_KEYS.session;
const DEFAULT_CAMPUS = "CAMPUS-CT";

function nowIso() {
  return new Date().toISOString();
}

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeRole(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === "admin" || normalized === "administrador") return "admin";
  if (normalized === "directivo") return "directivo";
  if (normalized === "operativo" || normalized === "capturista") return "operativo";
  return "operativo";
}

function normalizeAreaAccess(areaAccess) {
  if (!areaAccess || areaAccess.mode !== "custom") return { mode: "all", areaCodes: [] };
  const areaCodes = Array.isArray(areaAccess.areaCodes)
    ? areaAccess.areaCodes.map((code) => cleanString(code)).filter(Boolean)
    : [];
  return { mode: "custom", areaCodes };
}

function toViewUser(user) {
  if (!user) return null;
  const role = normalizeRole(user.role);
  return {
    ...user,
    name: user.fullName,
    role,
    roleKey: role,
    roleLabel: getRoleLabel(role),
    areaAccess: normalizeAreaAccess(user.areaAccess),
  };
}

function normalizeSession(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const userId = cleanString(input.userId);
  const email = cleanString(input.email).toLowerCase();
  if (!userId || !email) return null;
  const embeddedUser =
    input.user && typeof input.user === "object" && !Array.isArray(input.user)
      ? {
          ...input.user,
          id: cleanString(input.user.id || userId),
          userId: cleanString(input.user.userId || input.user.id || userId),
          email: cleanString(input.user.email || email).toLowerCase(),
          role: normalizeRole(input.user.role || input.role),
          roleKey: normalizeRole(input.user.roleKey || input.user.role || input.role),
          name: cleanString(input.user.name || input.user.fullName),
          fullName: cleanString(input.user.fullName || input.user.name),
          areaAccess: normalizeAreaAccess(input.user.areaAccess),
        }
      : null;
  return {
    userId,
    email,
    role: normalizeRole(input.role),
    createdAt: cleanString(input.createdAt) || nowIso(),
    token: cleanString(input.token) || null,
    refreshToken: cleanString(input.refreshToken) || null,
    user: embeddedUser,
  };
}

function writeSession(session) {
  const normalized = normalizeSession(session);
  if (!normalized) return null;
  safeWriteJson(SESSION_KEY, normalized);
  return normalized;
}

function ensureUserRecord(userInput = {}) {
  const email = cleanString(userInput.email).toLowerCase();
  if (!email) return null;
  const existing = getAll().find((user) => user.email === email);
  const payload = {
    id: existing?.id || cleanString(userInput.id) || undefined,
    firstName: cleanString(userInput.firstName, existing?.firstName || ""),
    paternalLastName: cleanString(userInput.paternalLastName, existing?.paternalLastName || ""),
    maternalLastName: cleanString(userInput.maternalLastName, existing?.maternalLastName || ""),
    fullName: cleanString(userInput.fullName || userInput.name, existing?.fullName || "Usuario CarbonTrack"),
    email: email || existing?.email,
    role: normalizeRole(userInput.role || existing?.role),
    campusCode: cleanString(userInput.campusCode, existing?.campusCode || DEFAULT_CAMPUS) || DEFAULT_CAMPUS,
    areaAccess: userInput.areaAccess || existing?.areaAccess || { mode: "all", areaCodes: [] },
    isActive: typeof userInput.isActive === "boolean" ? userInput.isActive : existing?.isActive ?? true,
    lastLoginAt: cleanString(userInput.lastLoginAt, nowIso()) || nowIso(),
    notes: cleanString(userInput.notes, existing?.notes || "Acceso local técnico"),
  };

  const result = upsert(payload);
  if (!result.ok) return existing || null;
  return result.user;
}

export function getSession() {
  return normalizeSession(safeReadJson(SESSION_KEY, null));
}

export function setSession(sessionInput) {
  return writeSession(sessionInput);
}

export function clearSession() {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

export function createSessionForUser(userInput = {}) {
  const user = ensureUserRecord({ ...userInput, lastLoginAt: nowIso() });
  if (!user) return null;
  writeSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: nowIso(),
  });
  return toViewUser(findById(user.id) || user);
}

export function getCurrentUser(options = {}) {
  const session = getSession();
  if (!session) return null;
  if (session.user && session.user.id) {
    return toViewUser({
      ...session.user,
      id: session.user.id,
      email: session.user.email || session.email,
      role: session.user.role || session.role,
    });
  }
  const user = findById(session.userId);
  if (user) return toViewUser(user);
  if (!options.rebuildMissingUser) return null;
  const rebuiltUser = ensureUserRecord({
    id: session.userId,
    email: session.email,
    role: session.role,
    fullName: "Usuario CarbonTrack",
    firstName: "Usuario",
    paternalLastName: "CarbonTrack",
    maternalLastName: "",
    campusCode: DEFAULT_CAMPUS,
    areaAccess: { mode: "all", areaCodes: [] },
    isActive: true,
  });
  return toViewUser(rebuiltUser);
}

export function updateCurrentUser(patch = {}) {
  const session = getSession();
  if (!session) return { ok: false, reason: "no_session" };
  const currentUser = findById(session.userId);
  if (!currentUser) return { ok: false, reason: "not_found" };
  const result = upsert({
    ...currentUser,
    ...patch,
    id: currentUser.id,
    email: cleanString(patch.email, currentUser.email).toLowerCase(),
  });
  if (!result.ok) return result;
  writeSession({
    ...session,
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    user: toViewUser(result.user),
  });
  return {
    ok: true,
    user: toViewUser(result.user),
    session: getSession(),
  };
}
