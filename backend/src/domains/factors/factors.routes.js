import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
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
  factorsRouter.use(requireAuth, requireRole("admin"));
  factorsRouter.get("/", asyncHandler(listFactorsController));
  factorsRouter.get("/default", asyncHandler(getDefaultFactorController));
  factorsRouter.get("/:id/usage-count", asyncHandler(getFactorUsageCountController));
  factorsRouter.post("/", asyncHandler(createFactorController));
  factorsRouter.patch("/:id", asyncHandler(updateFactorController));
  factorsRouter.post("/:id/new-version", asyncHandler(createFactorNewVersionController));
  factorsRouter.patch("/:id/default", asyncHandler(updateFactorDefaultController));
  factorsRouter.patch("/:id/status", asyncHandler(updateFactorStatusController));
  router.use("/factors", factorsRouter);
}
