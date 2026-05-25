import {
  createAdminCatalogEntryService,
  createOrgCampusService,
  createOrgEntityService,
  deleteOrgCampusService,
  deleteOrgEntityService,
  getAdminGovernmentSettingsService,
  getAdminEmissionCalculationService,
  getAdminHomeSummaryService,
  createAdminPeriodService,
  createAdminAuditEventService,
  createAdminAlertRuleService,
  createAdminAlertTemplateService,
  deleteAdminAlertRuleService,
  deleteAdminAlertTemplateService,
  listAdminAlertTemplatesService,
  listAdminCatalogsService,
  listAdminAlertsService,
  listAdminPeriodsService,
  listOrgStructureService,
  listActiveSessionsService,
  listAuditEventsService,
  revokeOtherSessionsService,
  revokeSessionService,
  recalculateAdminEmissionsService,
  runAdminAlertRuleService,
  updateAdminCatalogEntryService,
  updateAdminCatalogEntryStatusService,
  updateAdminAlertRuleService,
  updateAdminAlertRuleStatusService,
  updateAdminAlertTemplateService,
  updateAdminPeriodService,
  updateOrgCampusService,
  updateOrgEntityService,
  upsertAdminGovernmentSettingsService,
} from "./admin.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function getAdminGovernmentSettingsController(request, response) {
  response.json({
    settings: await getAdminGovernmentSettingsService(request.user, auditContextFromRequest(request)),
  });
}

export async function getAdminHomeSummaryController(request, response) {
  response.json({ summary: await getAdminHomeSummaryService(request.user) });
}

export async function getAdminEmissionCalculationController(request, response) {
  response.json({ data: await getAdminEmissionCalculationService(request.user) });
}

export async function recalculateAdminEmissionsController(request, response) {
  response.json({
    data: await recalculateAdminEmissionsService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function listOrgStructureController(request, response) {
  response.json({ structure: await listOrgStructureService(request.user) });
}

export async function listAdminCatalogsController(request, response) {
  response.json({ catalogs: await listAdminCatalogsService(request.user) });
}

export async function listAdminPeriodsController(request, response) {
  response.json({ periods: await listAdminPeriodsService(request.user) });
}

export async function createAdminPeriodController(request, response) {
  response.status(201).json({
    period: await createAdminPeriodService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function updateAdminPeriodController(request, response) {
  response.json({
    period: await updateAdminPeriodService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function createAdminCatalogEntryController(request, response) {
  response.status(201).json({
    entry: await createAdminCatalogEntryService(
      request.user,
      request.params.catalogId,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function updateAdminCatalogEntryController(request, response) {
  response.json({
    entry: await updateAdminCatalogEntryService(
      request.user,
      request.params.catalogId,
      request.params.entryId,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function updateAdminCatalogEntryStatusController(request, response) {
  response.json({
    entry: await updateAdminCatalogEntryStatusService(
      request.user,
      request.params.catalogId,
      request.params.entryId,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function createOrgCampusController(request, response) {
  response.status(201).json({
    campus: await createOrgCampusService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function updateOrgCampusController(request, response) {
  response.json({
    campus: await updateOrgCampusService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function deleteOrgCampusController(request, response) {
  response.json({
    result: await deleteOrgCampusService(request.user, request.params.id, auditContextFromRequest(request)),
  });
}

export async function createOrgEntityController(request, response) {
  response.status(201).json({
    entity: await createOrgEntityService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function updateOrgEntityController(request, response) {
  response.json({
    entity: await updateOrgEntityService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function deleteOrgEntityController(request, response) {
  response.json({
    result: await deleteOrgEntityService(request.user, request.params.id, auditContextFromRequest(request)),
  });
}

export async function upsertAdminGovernmentSettingsController(request, response) {
  response.json({
    settings: await upsertAdminGovernmentSettingsService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function listActiveSessionsController(request, response) {
  response.json({
    sessions: await listActiveSessionsService(request.user, {
      currentSessionId: request.auth?.sessionId || null,
    }),
  });
}

export async function revokeSessionController(request, response) {
  response.json({
    result: await revokeSessionService(request.user, request.params.id, auditContextFromRequest(request)),
  });
}

export async function revokeOtherSessionsController(request, response) {
  response.json({
    result: await revokeOtherSessionsService(
      request.user,
      request.auth?.sessionId || null,
      auditContextFromRequest(request),
    ),
  });
}

export async function listAuditEventsController(request, response) {
  response.json({ events: await listAuditEventsService(request.user, request.query) });
}

export async function createAdminAuditEventController(request, response) {
  response.status(201).json({
    result: await createAdminAuditEventService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function listAdminAlertsController(request, response) {
  response.json({ alerts: await listAdminAlertsService(request.user) });
}

export async function createAdminAlertRuleController(request, response) {
  response.status(201).json({
    rule: await createAdminAlertRuleService(request.user, request.body, auditContextFromRequest(request)),
  });
}

export async function updateAdminAlertRuleController(request, response) {
  response.json({
    rule: await updateAdminAlertRuleService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function updateAdminAlertRuleStatusController(request, response) {
  response.json({
    rule: await updateAdminAlertRuleStatusService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function deleteAdminAlertRuleController(request, response) {
  response.json({
    result: await deleteAdminAlertRuleService(
      request.user,
      request.params.id,
      auditContextFromRequest(request),
    ),
  });
}

export async function runAdminAlertRuleController(request, response) {
  response.json({
    result: await runAdminAlertRuleService(request.user, request.params.id),
  });
}

export async function listAdminAlertTemplatesController(request, response) {
  response.json({ templates: await listAdminAlertTemplatesService(request.user) });
}

export async function createAdminAlertTemplateController(request, response) {
  response.status(201).json({
    template: await createAdminAlertTemplateService(
      request.user,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function updateAdminAlertTemplateController(request, response) {
  response.json({
    template: await updateAdminAlertTemplateService(
      request.user,
      request.params.id,
      request.body,
      auditContextFromRequest(request),
    ),
  });
}

export async function deleteAdminAlertTemplateController(request, response) {
  response.json({
    result: await deleteAdminAlertTemplateService(
      request.user,
      request.params.id,
      auditContextFromRequest(request),
    ),
  });
}
