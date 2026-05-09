import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createAdminCatalogEntryController,
  createOrgCampusController,
  createOrgEntityController,
  deleteOrgCampusController,
  deleteOrgEntityController,
  getAdminGovernmentSettingsController,
  getAdminHomeSummaryController,
  createAdminAuditEventController,
  createAdminPeriodController,
  listAdminCatalogsController,
  listAdminPeriodsController,
  listOrgStructureController,
  listActiveSessionsController,
  listAuditEventsController,
  revokeOtherSessionsController,
  revokeSessionController,
  updateAdminCatalogEntryController,
  updateAdminCatalogEntryStatusController,
  updateAdminPeriodController,
  updateOrgCampusController,
  updateOrgEntityController,
  upsertAdminGovernmentSettingsController,
} from "./admin.controller.js";

export function registerAdminRoutes(router) {
  const adminRouter = Router();

  adminRouter.use(requireAuth, requireRole("admin"));
  adminRouter.get("/home", asyncHandler(getAdminHomeSummaryController));
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

  router.use("/admin", adminRouter);
}
