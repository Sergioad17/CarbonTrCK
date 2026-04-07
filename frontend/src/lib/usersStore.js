import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const USERS_KEY = STORAGE_KEYS.users;
const ROLES_KEY = STORAGE_KEYS.roles;
const DEFAULT_CAMPUS = "CAMPUS-CT";

export const USER_AREA_OPTIONS = [
  { value: "CC1", label: "CC1" },
  { value: "CC2", label: "CC2" },
  { value: "Aulas", label: "Aulas" },
  { value: "Redes", label: "Redes" },
  { value: "Industrial", label: "Industrial" },
  { value: "Agricola", label: "Agrícola" },
  { value: "Admin", label: "Admin" },
];

export const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "operativo", label: "Operativo" },
  { value: "directivo", label: "Directivo" },
];

export const USER_ROLE_SUMMARY = {
  admin: [
    "Ver todo, capturar, exportar, editar catálogos y gestionar usuarios.",
    "Puede configurar accesos y modificar catálogos de factores y equipos.",
  ],
  operativo: [
    "Capturar registros, ver dashboards y exportar reportes cuando aplique.",
    "No puede editar catálogos ni gestionar usuarios.",
  ],
  directivo: [
    "Solo puede ver dashboards y reportes, y exportar si aplica.",
    "No puede capturar registros ni editar catálogos.",
  ],
};

const nowIso = () => new Date().toISOString();

const cleanString = (value, fallback = "") => String(value ?? fallback).trim();

const buildFullName = (firstName, paternalLastName, maternalLastName, fallback = "Usuario") => {
  const parts = [firstName, paternalLastName, maternalLastName].map((value) => cleanString(value)).filter(Boolean);
  return parts.join(" ") || cleanString(fallback, "Usuario");
};

const toNumericUserId = (value, fallbackSeed = Date.now()) => {
  const explicit = cleanString(value);
  if (/^\d+$/.test(explicit)) return explicit;

  const source = explicit || String(fallbackSeed);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 900000;
  }
  return String(hash + 100000);
};

const splitFullName = (fullName) => {
  const parts = cleanString(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", paternalLastName: "", maternalLastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], paternalLastName: "", maternalLastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], paternalLastName: parts[1], maternalLastName: "" };
  }
  return {
    firstName: parts.slice(0, -2).join(" "),
    paternalLastName: parts.at(-2) || "",
    maternalLastName: parts.at(-1) || "",
  };
};

const normalizeRole = (value) => {
  if (value === "admin" || value === "operativo" || value === "directivo") return value;
  return "operativo";
};

const normalizeAreaCodes = (areaCodes) => {
  if (!Array.isArray(areaCodes)) return [];
  const allowed = new Set(USER_AREA_OPTIONS.map((option) => option.value));
  return [...new Set(areaCodes.map((code) => cleanString(code)).filter((code) => allowed.has(code)))];
};

const normalizeAreaAccess = (areaAccess) => {
  const mode = areaAccess?.mode === "custom" ? "custom" : "all";
  const areaCodes = normalizeAreaCodes(areaAccess?.areaCodes);
  return {
    mode,
    areaCodes: mode === "custom" ? areaCodes : [],
  };
};

const normalizeUser = (user = {}, fallbackId) => {
  const createdAt = cleanString(user.createdAt) || nowIso();
  const updatedAt = cleanString(user.updatedAt) || nowIso();
  const email = cleanString(user.email).toLowerCase();
  const sourceFullName = cleanString(user.fullName || user.name, "Usuario");
  const nameParts = {
    ...splitFullName(sourceFullName),
    firstName: cleanString(user.firstName, splitFullName(sourceFullName).firstName),
    paternalLastName: cleanString(user.paternalLastName, splitFullName(sourceFullName).paternalLastName),
    maternalLastName: cleanString(user.maternalLastName, splitFullName(sourceFullName).maternalLastName),
  };
  const fullName = buildFullName(nameParts.firstName, nameParts.paternalLastName, nameParts.maternalLastName, sourceFullName);
  const userId = cleanString(user.id) || fallbackId || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalized = {
    id: userId,
    numericId: toNumericUserId(user.numericId, userId),
    firstName: nameParts.firstName,
    paternalLastName: nameParts.paternalLastName,
    maternalLastName: nameParts.maternalLastName,
    fullName,
    email,
    role: normalizeRole(user.role),
    campusCode: cleanString(user.campusCode, DEFAULT_CAMPUS) || DEFAULT_CAMPUS,
    areaAccess: normalizeAreaAccess(user.areaAccess),
    isActive: typeof user.isActive === "boolean" ? user.isActive : true,
    lastLoginAt: cleanString(user.lastLoginAt) || null,
    createdAt,
    updatedAt,
    notes: cleanString(user.notes),
  };

  if (normalized.role === "admin" && normalized.areaAccess.mode !== "all") {
    normalized.areaAccess = { mode: "all", areaCodes: [] };
  }

  return normalized;
};

const compareUsers = (left, right) => {
  if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
  return left.fullName.localeCompare(right.fullName, "es", { sensitivity: "base" });
};

const sortUsers = (users) => [...users].sort(compareUsers);

let storeMeta = {
  initializedEmpty: false,
};

function readUsers() {
  storeMeta = { initializedEmpty: false };
  const parsed = safeReadJson(USERS_KEY, null);
  if (!Array.isArray(parsed)) return [];
  return sortUsers(parsed.map((user, index) => normalizeUser(user, `user-${index + 1}`)));
}

function writeUsers(users) {
  const normalized = sortUsers(users.map((user, index) => normalizeUser(user, `user-${index + 1}`)));
  safeWriteJson(USERS_KEY, normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:users-changed", { detail: normalized }));
  }
  return normalized;
}

function ensureRoles() {
  const current = safeReadJson(ROLES_KEY, null);
  if (Array.isArray(current) && current.length > 0) return current;
  safeWriteJson(ROLES_KEY, USER_ROLE_OPTIONS);
  return USER_ROLE_OPTIONS;
}

export function getStoreMeta() {
  return { ...storeMeta };
}

export function getRoles() {
  return ensureRoles();
}

export function ensureSeedData() {
  ensureRoles();
  const current = readUsers();
  if (current.length > 0) return current;
  storeMeta = { initializedEmpty: true };
  return current;
}

export function getAll() {
  return ensureSeedData();
}

export function saveAll(users) {
  ensureRoles();
  storeMeta = { initializedEmpty: false };
  return writeUsers(users);
}

export function findById(id) {
  return getAll().find((user) => user.id === id) || null;
}

function emailExists(users, email, ignoreId) {
  const target = cleanString(email).toLowerCase();
  return users.some((user) => user.id !== ignoreId && cleanString(user.email).toLowerCase() === target);
}

export function upsert(input) {
  const users = getAll();
  const existing = users.find((user) => user.id === input.id);
  const normalized = normalizeUser(
    {
      ...existing,
      ...input,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    },
    input.id
  );

  if (emailExists(users, normalized.email, normalized.id)) {
    return { ok: false, reason: "duplicate_email" };
  }

  const next = existing
    ? users.map((user) => (user.id === normalized.id ? normalized : user))
    : [normalized, ...users];

  return {
    ok: true,
    user: normalized,
    users: writeUsers(next),
  };
}

export function deactivate(id, nextActive = false) {
  const users = getAll().map((user) =>
    user.id === id
      ? {
          ...user,
          isActive: nextActive,
          updatedAt: nowIso(),
        }
      : user
  );
  return writeUsers(users);
}

export function activate(id) {
  return deactivate(id, true);
}

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "CT-";
  for (let index = 0; index < 10; index += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
}

export function resetPasswordMock(id) {
  const user = findById(id);
  if (!user) return { ok: false, reason: "not_found" };
  const password = generateTempPassword();
  const users = getAll().map((item) =>
    item.id === id
      ? {
          ...item,
          updatedAt: nowIso(),
        }
      : item
  );
  writeUsers(users);
  return { ok: true, password, user: findById(id) };
}

export function describeAreaAccess(user) {
  if (!user?.areaAccess || user.areaAccess.mode !== "custom") return "Todas las áreas";
  if (!user.areaAccess.areaCodes.length) return "Sin áreas";
  return user.areaAccess.areaCodes.join(", ");
}

export function getRoleLabel(role) {
  return USER_ROLE_OPTIONS.find((option) => option.value === role)?.label || "Operativo";
}

export function filterUsers(users, filters = {}) {
  const search = cleanString(filters.search).toLowerCase();
  return sortUsers(
    users.filter((user) => {
      if (filters.role && filters.role !== "all" && user.role !== filters.role) return false;
      if (filters.status === "active" && !user.isActive) return false;
      if (filters.status === "inactive" && user.isActive) return false;
      if (filters.areaCode && filters.areaCode !== "all") {
        if (user.areaAccess.mode !== "custom") return false;
        if (!user.areaAccess.areaCodes.includes(filters.areaCode)) return false;
      }
      if (search) {
        const haystack = [user.fullName, user.email].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
  );
}
