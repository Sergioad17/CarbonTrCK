import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createAdminCatalogEntryController,
  createAdminAlertRuleController,
  createAdminAlertTemplateController,
  createOrgCampusController,
  createOrgEntityController,
  deleteAdminAlertRuleController,
  deleteAdminAlertTemplateController,
  deleteOrgCampusController,
  deleteOrgEntityController,
  getAdminGovernmentSettingsController,
  getAdminHomeSummaryController,
  createAdminAuditEventController,
  createAdminPeriodController,
  getAdminEmissionCalculationController,
  listAdminAlertTemplatesController,
  listAdminCatalogsController,
  listAdminAlertsController,
  listAdminPeriodsController,
  listOrgStructureController,
  listActiveSessionsController,
  listAuditEventsController,
  revokeOtherSessionsController,
  revokeSessionController,
  recalculateAdminEmissionsController,
  runAdminAlertRuleController,
  updateAdminCatalogEntryController,
  updateAdminCatalogEntryStatusController,
  updateAdminAlertRuleController,
  updateAdminAlertRuleStatusController,
  updateAdminAlertTemplateController,
  updateAdminPeriodController,
  updateOrgCampusController,
  updateOrgEntityController,
  upsertAdminGovernmentSettingsController,
} from "./admin.controller.js";

export function registerAdminRoutes(router) {
  const adminRouter = Router();

  adminRouter.use(requireAuth, requireRole("admin"));
  adminRouter.get("/home", asyncHandler(getAdminHomeSummaryController));
  adminRouter.get("/emissions-calculation", asyncHandler(getAdminEmissionCalculationController));
  adminRouter.post("/emissions-calculation/recalculate", asyncHandler(recalculateAdminEmissionsController));
  adminRouter.get("/catalogs", asyncHandler(listAdminCatalogsController));
  adminRouter.post("/catalogs/:catalogId/entries", asyncHandler(createAdminCatalogEntryController));
  adminRouter.put("/catalogs/:catalogId/entries/:entryId", asyncHandler(updateAdminCatalogEntryController));
  adminRouter.patch("/catalogs/:catalogId/entries/:entryId/status", asyncHandler(updateAdminCatalogEntryStatusController));
  adminRouter.get("/periods", asyncHandler(listAdminPeriodsController));
  adminRouter.post("/periods", asyncHandler(createAdminPeriodController));
  adminRouter.put("/periods/:id", asyncHandler(updateAdminPeriodController));
  adminRouter.get("/org-structure", asyncHandler(listOrgStructureController));
  adminRouter.post("/org-structure/campuses", asyncHandler(createOrgCampusController));
  adminRouter.put("/org-structure/campuses/:id", asyncHandler(updateOrgCampusController));
  adminRouter.delete("/org-structure/campuses/:id", asyncHandler(deleteOrgCampusController));
  adminRouter.post("/org-structure/entities", asyncHandler(createOrgEntityController));
  adminRouter.put("/org-structure/entities/:id", asyncHandler(updateOrgEntityController));
  adminRouter.delete("/org-structure/entities/:id", asyncHandler(deleteOrgEntityController));
  adminRouter.get("/government", asyncHandler(getAdminGovernmentSettingsController));
  adminRouter.put("/government", asyncHandler(upsertAdminGovernmentSettingsController));
  adminRouter.get("/security/sessions", asyncHandler(listActiveSessionsController));
  adminRouter.delete("/security/sessions", asyncHandler(revokeOtherSessionsController));
  adminRouter.delete("/security/sessions/:id", asyncHandler(revokeSessionController));
  adminRouter.get("/audit-events", asyncHandler(listAuditEventsController));
  adminRouter.post("/audit-events", asyncHandler(createAdminAuditEventController));
  adminRouter.get("/alerts", asyncHandler(listAdminAlertsController));
  adminRouter.post("/alerts/rules", asyncHandler(createAdminAlertRuleController));
  adminRouter.put("/alerts/rules/:id", asyncHandler(updateAdminAlertRuleController));
  adminRouter.patch("/alerts/rules/:id/status", asyncHandler(updateAdminAlertRuleStatusController));
  adminRouter.delete("/alerts/rules/:id", asyncHandler(deleteAdminAlertRuleController));
  adminRouter.post("/alerts/rules/:id/run", asyncHandler(runAdminAlertRuleController));
  adminRouter.get("/alerts/templates", asyncHandler(listAdminAlertTemplatesController));
  adminRouter.post("/alerts/templates", asyncHandler(createAdminAlertTemplateController));
  adminRouter.put("/alerts/templates/:id", asyncHandler(updateAdminAlertTemplateController));
  adminRouter.delete("/alerts/templates/:id", asyncHandler(deleteAdminAlertTemplateController));

  router.use("/admin", adminRouter);
}
