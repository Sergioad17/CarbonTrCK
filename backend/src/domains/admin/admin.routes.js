import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  getAdminGovernmentSettingsController,
  getAdminHomeSummaryController,
  createAdminAuditEventController,
  listActiveSessionsController,
  listAuditEventsController,
  revokeOtherSessionsController,
  revokeSessionController,
  upsertAdminGovernmentSettingsController,
} from "./admin.controller.js";

export function registerAdminRoutes(router) {
  const adminRouter = Router();

  adminRouter.use(requireAuth, requireRole("admin"));
  adminRouter.get("/home", asyncHandler(getAdminHomeSummaryController));
  adminRouter.get("/government", asyncHandler(getAdminGovernmentSettingsController));
  adminRouter.put("/government", asyncHandler(upsertAdminGovernmentSettingsController));
  adminRouter.get("/security/sessions", asyncHandler(listActiveSessionsController));
  adminRouter.delete("/security/sessions", asyncHandler(revokeOtherSessionsController));
  adminRouter.delete("/security/sessions/:id", asyncHandler(revokeSessionController));
  adminRouter.get("/audit-events", asyncHandler(listAuditEventsController));
  adminRouter.post("/audit-events", asyncHandler(createAdminAuditEventController));

  router.use("/admin", adminRouter);
}
