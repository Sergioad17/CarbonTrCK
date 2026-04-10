import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createTargetController,
  deleteTargetController,
  listTargetsController,
  updateTargetController,
  updateTargetStatusController,
} from "./targets.controller.js";

export function registerTargetsRoutes(router) {
  const targetsRouter = Router();
  targetsRouter.use(requireAuth, requirePermission("targets:manage"));
  targetsRouter.get("/", asyncHandler(listTargetsController));
  targetsRouter.post("/", asyncHandler(createTargetController));
  targetsRouter.patch("/:id", asyncHandler(updateTargetController));
  targetsRouter.patch("/:id/status", asyncHandler(updateTargetStatusController));
  targetsRouter.delete("/:id", asyncHandler(deleteTargetController));
  router.use("/targets", targetsRouter);
}
