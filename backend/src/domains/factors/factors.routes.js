import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createFactorController,
  createFactorNewVersionController,
  getDefaultFactorController,
  getFactorUsageCountController,
  listFactorsController,
  updateFactorController,
  updateFactorDefaultController,
  updateFactorStatusController,
} from "./factors.controller.js";

export function registerFactorsRoutes(router) {
  const factorsRouter = Router();
  factorsRouter.use(requireAuth);
  factorsRouter.get("/", requirePermission("factors:view"), asyncHandler(listFactorsController));
  factorsRouter.get("/default", requirePermission("factors:view"), asyncHandler(getDefaultFactorController));
  factorsRouter.get("/:id/usage-count", requirePermission("factors:view"), asyncHandler(getFactorUsageCountController));
  factorsRouter.post("/", requirePermission("factors:create"), asyncHandler(createFactorController));
  factorsRouter.patch("/:id", requirePermission("factors:edit"), asyncHandler(updateFactorController));
  factorsRouter.post("/:id/new-version", requirePermission("factors:edit"), asyncHandler(createFactorNewVersionController));
  factorsRouter.patch("/:id/default", requirePermission("factors:edit"), asyncHandler(updateFactorDefaultController));
  factorsRouter.patch("/:id/status", requirePermission("factors:delete"), asyncHandler(updateFactorStatusController));
  router.use("/factors", factorsRouter);
}
