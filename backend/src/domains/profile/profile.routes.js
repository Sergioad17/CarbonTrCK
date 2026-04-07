import { Router } from "express";
import { requireActiveUser, requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { updateOwnPasswordController } from "./profile.controller.js";

export function registerProfileRoutes(router) {
  const profileRouter = Router();

  profileRouter.use(requireAuth);
  profileRouter.use(requireActiveUser);
  profileRouter.patch("/password", asyncHandler(updateOwnPasswordController));

  router.use("/profile", profileRouter);
}
