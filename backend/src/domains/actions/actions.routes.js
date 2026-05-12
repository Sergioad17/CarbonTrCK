import { Router } from "express";
import { requireAuth, requireAnyPermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { createActionController, deleteActionController, listActionsController, updateActionController } from "./actions.controller.js";

export function registerActionsRoutes(router) {
  const actionsRouter = Router();
  actionsRouter.use(requireAuth);
  actionsRouter.get("/", requireAnyPermission("targets:view", "targets:create", "targets:edit", "targets:manage"), asyncHandler(listActionsController));
  actionsRouter.post("/", requireAnyPermission("targets:create", "targets:manage"), asyncHandler(createActionController));
  actionsRouter.patch("/:id", requireAnyPermission("targets:edit", "targets:manage"), asyncHandler(updateActionController));
  actionsRouter.delete("/:id", requireAnyPermission("targets:delete", "targets:manage"), asyncHandler(deleteActionController));
  router.use("/actions", actionsRouter);
}
