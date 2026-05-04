import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { forgotPasswordController, loginController, logoutController, meController, refreshController } from "./auth.controller.js";

export function registerAuthRoutes(router) {
  const authRouter = Router();

  authRouter.post("/login", asyncHandler(loginController));
  authRouter.get("/me", requireAuth, asyncHandler(meController));
  authRouter.post("/logout", requireAuth, asyncHandler(logoutController));
  authRouter.post("/refresh", asyncHandler(refreshController));
  authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));

  router.use("/auth", authRouter);
}
