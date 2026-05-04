import { Router } from "express";
import { requireAuth, requirePermission, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createUserController,
  deleteUserController,
  listRolesController,
  listUsersController,
  resetUserPasswordController,
  updateUserController,
  updateUserStatusController,
} from "./users.controller.js";

export function registerUsersRoutes(router) {
  const usersRouter = Router();

  usersRouter.use(requireAuth);

  usersRouter.get("/", requireRole("admin", "directivo"), asyncHandler(listUsersController));
  usersRouter.get("/roles", requireRole("admin", "directivo"), asyncHandler(listRolesController));
  usersRouter.use(requirePermission("users:manage"));
  usersRouter.post("/", asyncHandler(createUserController));
  usersRouter.patch("/:id", asyncHandler(updateUserController));
  usersRouter.patch("/:id/status", asyncHandler(updateUserStatusController));
  usersRouter.post("/:id/password-reset", asyncHandler(resetUserPasswordController));
  usersRouter.post("/:id/delete", asyncHandler(deleteUserController));
  usersRouter.delete("/:id", asyncHandler(deleteUserController));

  router.use("/users", usersRouter);
}
