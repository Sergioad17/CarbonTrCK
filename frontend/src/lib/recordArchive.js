import { getCurrentUser } from "./sessionStore";

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

export function normalizeArchiveRole(role) {
  const normalized = cleanString(role).toLowerCase();
  if (normalized === "admin" || normalized === "administrador") return "admin";
  if (normalized === "capturista" || normalized === "operativo") return "operativo";
  if (normalized === "directivo") return "directivo";
  return normalized || "operativo";
}

export function resolveArchiveActor(userOverride) {
  const source = userOverride && typeof userOverride === "object" ? userOverride : getCurrentUser();
  if (!source) return null;

  const role = normalizeArchiveRole(source.role || source.roleKey);
  return {
    id: cleanString(source.id || source.userId),
    email: cleanString(source.email).toLowerCase(),
    name: cleanString(source.fullName || source.name || source.email || "Usuario CarbonTrack"),
    role,
  };
}

export function canArchiveRecord(userOverride) {
  const actor = resolveArchiveActor(userOverride);
  if (!actor) {
    return {
      allowed: false,
      actor: null,
      code: "no_session",
      message: "Inicia sesión para gestionar una baja lógica.",
    };
  }

  if (actor.role === "admin" || actor.role === "operativo") {
    return {
      allowed: true,
      actor,
      code: "allowed",
      message: "Puedes dar de baja registros con motivo obligatorio y trazabilidad.",
    };
  }

  return {
    allowed: false,
    actor,
    code: "forbidden",
    message: "Solo administradores y capturistas pueden dar de baja registros.",
  };
}

export function buildArchiveAuditPayload(userOverride, reason) {
  const actor = resolveArchiveActor(userOverride);
  return {
    reason: cleanString(reason),
    requestedAt: new Date().toISOString(),
    requestedBy: actor
      ? {
          id: actor.id || null,
          name: actor.name,
          email: actor.email || null,
          role: actor.role,
        }
      : null,
    permission: "records:archive",
  };
}
