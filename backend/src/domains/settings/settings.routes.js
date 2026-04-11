import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { getSettingsController, upsertSettingsController } from "./settings.controller.js";

export function registerSettingsRoutes(router) {
  const settingsRouter = Router();
  settingsRouter.use(requireAuth);
  settingsRouter.get("/", asyncHandler(getSettingsController));
  settingsRouter.put("/", asyncHandler(upsertSettingsController));
  router.use("/settings", settingsRouter);
}
