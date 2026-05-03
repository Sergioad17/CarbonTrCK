import { AppError } from "../../shared/errors/app-error.js";
import {
  getAdminGovernmentSettings,
  getAdminHomeSummary,
  listActiveSessions,
  listAuditEvents,
  revokeSession,
  upsertAdminGovernmentSettings,
} from "./admin.repository.js";

function assertObject(value, field = "payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be an object.` });
  }
}

export function getAdminGovernmentSettingsService(actor, auditContext) {
  return getAdminGovernmentSettings(actor, auditContext);
}

export function getAdminHomeSummaryService(actor) {
  return getAdminHomeSummary(actor);
}

export function upsertAdminGovernmentSettingsService(actor, payload, auditContext) {
  assertObject(payload);
  return upsertAdminGovernmentSettings(actor, payload, auditContext);
}

export function listActiveSessionsService(actor, options) {
  return listActiveSessions(actor, options);
}

export function revokeSessionService(actor, sessionId, auditContext) {
  return revokeSession(actor, sessionId, auditContext);
}

export function listAuditEventsService(actor, query) {
  return listAuditEvents(actor, {
    search: String(query.search || "").trim(),
    module: String(query.module || "").trim(),
    action: String(query.action || "").trim(),
    status: String(query.status || "").trim(),
  });
}
