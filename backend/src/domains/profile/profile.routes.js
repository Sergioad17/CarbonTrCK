import { Router } from "express";
import { requireActiveUser, requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { getOwnProfileController, updateOwnPasswordController } from "./profile.controller.js";

export function registerProfileRoutes(router) {
  const profileRouter = Router();

  profileRouter.use(requireAuth);
  profileRouter.use(requireActiveUser);
  profileRouter.get("/", asyncHandler(getOwnProfileController));
  profileRouter.patch("/password", asyncHandler(updateOwnPasswordController));

  router.use("/profile", profileRouter);
}
