const SESSION_KEY = "carbontrack.session";

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeRole(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === "admin" || normalized === "administrador") return "admin";
  if (normalized === "directivo") return "directivo";
  if (normalized === "operativo" || normalized === "capturista") return "operativo";
  return normalized || "operativo";
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
    name: cleanString(user.name || user.fullName || user.email || "Usuario CarbonTrack"),
    fullName: cleanString(user.fullName || user.name || user.email || "Usuario CarbonTrack"),
    role,
    roleKey: role,
    areaAccess: normalizeAreaAccess(user.areaAccess),
    permissions: Array.isArray(user.permissions) ? user.permissions.map(String) : [],
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

function normalizeSession(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const userId = cleanString(input.userId || input.user?.id);
  const email = cleanString(input.email || input.user?.email).toLowerCase();
  if (!userId || !email) return null;

  const user =
    input.user && typeof input.user === "object" && !Array.isArray(input.user)
      ? toViewUser({
          ...input.user,
          id: cleanString(input.user.id || userId),
          userId: cleanString(input.user.userId || input.user.id || userId),
          email,
          role: input.user.role || input.role,
        })
      : null;

  return {
    userId,
    email,
    role: normalizeRole(input.role || user?.role),
    createdAt: cleanString(input.createdAt) || new Date().toISOString(),
    token: cleanString(input.token) || null,
    refreshToken: cleanString(input.refreshToken) || null,
    user,
  };
}

function readRawSession() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeRawSession(value) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(SESSION_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function writeSession(session) {
  const normalized = normalizeSession(session);
  if (!normalized) return null;
  writeRawSession(JSON.stringify(normalized));
  return normalized;
}

export function getSession() {
  const raw = readRawSession();
  if (!raw) return null;
  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setSession(sessionInput) {
  return writeSession(sessionInput);
}

export function clearSession() {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  if (session.user) {
    return toViewUser({
      ...session.user,
      id: session.user.id || session.userId,
      userId: session.user.userId || session.user.id || session.userId,
      email: session.user.email || session.email,
      role: session.user.role || session.role,
    });
  }

  return toViewUser({
    id: session.userId,
    userId: session.userId,
    email: session.email,
    role: session.role,
  });
}

export function updateCurrentUser(patch = {}) {
  const session = getSession();
  const currentUser = getCurrentUser();
  if (!session || !currentUser) return { ok: false, reason: "no_session" };

  const nextUser = toViewUser({
    ...currentUser,
    ...patch,
    id: currentUser.id,
    userId: currentUser.userId || currentUser.id,
    email: cleanString(patch.email, currentUser.email).toLowerCase(),
    role: normalizeRole(patch.role || currentUser.role),
  });

  writeSession({
    ...session,
    userId: nextUser.id,
    email: nextUser.email,
    role: nextUser.role,
    user: nextUser,
  });

  return {
    ok: true,
    user: nextUser,
    session: getSession(),
  };
}
