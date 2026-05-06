import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { generateReportController } from "./reports.controller.js";

export function registerReportsRoutes(router) {
  const reportsRouter = Router();
  reportsRouter.use(requireAuth);
  reportsRouter.post("/generate", requirePermission("reports:view"), asyncHandler(generateReportController));
  router.use("/reports", reportsRouter);
}
