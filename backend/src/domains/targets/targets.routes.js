import { Router } from "express";
import { requireAuth, requireAnyPermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createTargetController,
  deleteTargetController,
  listTargetOptionsController,
  listTargetsController,
  updateTargetController,
  updateTargetStatusController,
} from "./targets.controller.js";

export function registerTargetsRoutes(router) {
  const targetsRouter = Router();
  targetsRouter.use(requireAuth);
  targetsRouter.get("/options", requireAnyPermission("targets:view", "targets:create", "targets:edit", "targets:manage"), asyncHandler(listTargetOptionsController));
  targetsRouter.get("/", requireAnyPermission("targets:view", "targets:create", "targets:edit", "targets:manage"), asyncHandler(listTargetsController));
  targetsRouter.post("/", requireAnyPermission("targets:create", "targets:manage"), asyncHandler(createTargetController));
  targetsRouter.patch("/:id", requireAnyPermission("targets:edit", "targets:manage"), asyncHandler(updateTargetController));
  targetsRouter.patch("/:id/status", requireAnyPermission("targets:edit", "targets:manage"), asyncHandler(updateTargetStatusController));
  targetsRouter.delete("/:id", requireAnyPermission("targets:delete", "targets:manage"), asyncHandler(deleteTargetController));
  router.use("/targets", targetsRouter);
}
