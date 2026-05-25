import { AppError } from "../../shared/errors/app-error.js";
import {
  getAdminGovernmentSettings,
  getAdminHomeSummary,
  createAdminAuditEvent,
  listActiveSessions,
  listAuditEvents,
  revokeOtherSessions,
  revokeSession,
  upsertAdminGovernmentSettings,
} from "./admin.repository.js";
import {
  createAdminCatalogEntry,
  listAdminCatalogs,
  updateAdminCatalogEntry,
  updateAdminCatalogEntryStatus,
} from "./admin.catalogs.repository.js";
import {
  createAdminPeriod,
  listAdminPeriods,
  updateAdminPeriod,
} from "./admin.periods.repository.js";
import {
  getAdminEmissionCalculation,
  recalculateAdminEmissions,
} from "./admin.emissions.repository.js";
import {
  createAdminAlertRule,
  deleteAdminAlertRule,
  listAdminAlerts,
  runAlertRuleManually,
  updateAdminAlertRule,
  updateAdminAlertRuleStatus,
} from "./admin.alerts.repository.js";
import {
  createAdminAlertTemplate,
  deleteAdminAlertTemplate,
  listAdminAlertTemplates,
  updateAdminAlertTemplate,
} from "./admin.alert-templates.repository.js";
import {
  createCampus as createOrgCampus,
  createEntity as createOrgEntity,
  deleteCampus as deleteOrgCampus,
  deleteEntity as deleteOrgEntity,
  listOrgStructure as listOrgStructureRepository,
  updateCampus as updateOrgCampus,
  updateEntity as updateOrgEntity,
} from "./org-structure.repository.js";

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

export function listOrgStructureService(actor) {
  return listOrgStructureRepository(actor);
}

export function listAdminCatalogsService() {
  return listAdminCatalogs();
}

export function listAdminPeriodsService(actor) {
  return listAdminPeriods(actor);
}

export function getAdminEmissionCalculationService(actor) {
  return getAdminEmissionCalculation(actor);
}

export function recalculateAdminEmissionsService(actor, payload, auditContext) {
  assertObject(payload);
  return recalculateAdminEmissions(actor, payload, auditContext);
}

export function createAdminPeriodService(actor, payload, auditContext) {
  assertObject(payload);
  return createAdminPeriod(actor, payload, auditContext);
}

export function updateAdminPeriodService(actor, periodId, payload, auditContext) {
  assertObject(payload);
  return updateAdminPeriod(actor, periodId, payload, auditContext);
}

export function createAdminCatalogEntryService(actor, catalogId, payload, auditContext) {
  assertObject(payload);
  return createAdminCatalogEntry(actor, catalogId, payload, auditContext);
}

export function updateAdminCatalogEntryService(actor, catalogId, entryId, payload, auditContext) {
  assertObject(payload);
  return updateAdminCatalogEntry(actor, catalogId, entryId, payload, auditContext);
}

export function updateAdminCatalogEntryStatusService(actor, catalogId, entryId, payload, auditContext) {
  assertObject(payload);
  return updateAdminCatalogEntryStatus(actor, catalogId, entryId, payload, auditContext);
}

export function createOrgCampusService(actor, payload, auditContext) {
  assertObject(payload);
  return createOrgCampus(actor, payload, auditContext);
}

export function updateOrgCampusService(actor, campusId, payload, auditContext) {
  assertObject(payload);
  return updateOrgCampus(actor, campusId, payload, auditContext);
}

export function deleteOrgCampusService(actor, campusId, auditContext) {
  return deleteOrgCampus(actor, campusId, auditContext);
}

export function createOrgEntityService(actor, payload, auditContext) {
  assertObject(payload);
  return createOrgEntity(actor, payload, auditContext);
}

export function updateOrgEntityService(actor, entityId, payload, auditContext) {
  assertObject(payload);
  return updateOrgEntity(actor, entityId, payload, auditContext);
}

export function deleteOrgEntityService(actor, entityId, auditContext) {
  return deleteOrgEntity(actor, entityId, auditContext);
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

export function revokeOtherSessionsService(actor, currentSessionId, auditContext) {
  return revokeOtherSessions(actor, currentSessionId, auditContext);
}

export function listAuditEventsService(actor, query) {
  return listAuditEvents(actor, {
    search: String(query.search || "").trim(),
    module: String(query.module || "").trim(),
    action: String(query.action || "").trim(),
    status: String(query.status || "").trim(),
    severity: String(query.severity || "").trim(),
    user: String(query.user || "").trim(),
    dateFrom: String(query.dateFrom || "").trim(),
    dateTo: String(query.dateTo || "").trim(),
  });
}

export function createAdminAuditEventService(actor, payload, auditContext) {
  assertObject(payload);
  return createAdminAuditEvent(actor, payload, auditContext);
}

export function listAdminAlertsService(actor) {
  return listAdminAlerts(actor);
}

export function createAdminAlertRuleService(actor, payload, auditContext) {
  assertObject(payload);
  return createAdminAlertRule(actor, payload, auditContext);
}

export function updateAdminAlertRuleService(actor, ruleId, payload, auditContext) {
  assertObject(payload);
  return updateAdminAlertRule(actor, ruleId, payload, auditContext);
}

export function updateAdminAlertRuleStatusService(actor, ruleId, payload, auditContext) {
  assertObject(payload);
  return updateAdminAlertRuleStatus(actor, ruleId, payload.enabled, auditContext);
}

export function deleteAdminAlertRuleService(actor, ruleId, auditContext) {
  return deleteAdminAlertRule(actor, ruleId, auditContext);
}

export function runAdminAlertRuleService(actor, ruleId) {
  return runAlertRuleManually(actor, ruleId);
}

export function listAdminAlertTemplatesService(actor) {
  return listAdminAlertTemplates(actor);
}

export function createAdminAlertTemplateService(actor, payload, auditContext) {
  assertObject(payload);
  return createAdminAlertTemplate(actor, payload, auditContext);
}

export function updateAdminAlertTemplateService(actor, templateId, payload, auditContext) {
  assertObject(payload);
  return updateAdminAlertTemplate(actor, templateId, payload, auditContext);
}

export function deleteAdminAlertTemplateService(actor, templateId, auditContext) {
  return deleteAdminAlertTemplate(actor, templateId, auditContext);
}
