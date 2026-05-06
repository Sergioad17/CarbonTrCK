import { Router } from "express";
import { requireAnyPermission, requireAuth, requirePermission, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createUserController,
  createRoleController,
  deleteRoleController,
  deleteUserController,
  listRolesPermissionsController,
  listRolesController,
  listUsersController,
  resetUserPasswordController,
  updateRolePermissionsController,
  updateUserController,
  updateUserStatusController,
} from "./users.controller.js";

export function registerUsersRoutes(router) {
  const usersRouter = Router();

  usersRouter.use(requireAuth);

  usersRouter.get("/", requireAnyPermission("users:view", "users:manage"), asyncHandler(listUsersController));
  usersRouter.get("/roles", requireAnyPermission("users:view", "users:manage"), asyncHandler(listRolesController));
  usersRouter.get("/roles-permissions", requireRole("admin"), asyncHandler(listRolesPermissionsController));
  usersRouter.post("/roles", requirePermission("users:manage"), asyncHandler(createRoleController));
  usersRouter.put("/roles/:id/permissions", requirePermission("users:manage"), asyncHandler(updateRolePermissionsController));
  usersRouter.delete("/roles/:id", requirePermission("users:manage"), asyncHandler(deleteRoleController));
  usersRouter.post("/", requirePermission("users:create"), asyncHandler(createUserController));
  usersRouter.patch("/:id", requirePermission("users:edit"), asyncHandler(updateUserController));
  usersRouter.patch("/:id/status", requirePermission("users:delete"), asyncHandler(updateUserStatusController));
  usersRouter.post("/:id/password-reset", requirePermission("users:edit"), asyncHandler(resetUserPasswordController));
  usersRouter.post("/:id/delete", requirePermission("users:delete"), asyncHandler(deleteUserController));
  usersRouter.delete("/:id", requirePermission("users:delete"), asyncHandler(deleteUserController));

  router.use("/users", usersRouter);
}
