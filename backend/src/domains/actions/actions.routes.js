import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { createActionController, listActionsController, updateActionController } from "./actions.controller.js";

export function registerActionsRoutes(router) {
  const actionsRouter = Router();
  actionsRouter.use(requireAuth, requirePermission("targets:manage"));
  actionsRouter.get("/", asyncHandler(listActionsController));
  actionsRouter.post("/", asyncHandler(createActionController));
  actionsRouter.patch("/:id", asyncHandler(updateActionController));
  router.use("/actions", actionsRouter);
}
