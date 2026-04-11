import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  clearArchivedNotificationsController,
  createNotificationController,
  listNotificationsController,
  markAllNotificationsReadController,
  updateNotificationStatusController,
} from "./notifications.controller.js";

export function registerNotificationsRoutes(router) {
  const notificationsRouter = Router();
  notificationsRouter.use(requireAuth);
  notificationsRouter.get("/", asyncHandler(listNotificationsController));
  notificationsRouter.post("/", asyncHandler(createNotificationController));
  notificationsRouter.patch("/:id", asyncHandler(updateNotificationStatusController));
  notificationsRouter.post("/mark-all-read", asyncHandler(markAllNotificationsReadController));
  notificationsRouter.delete("/archived", asyncHandler(clearArchivedNotificationsController));
  router.use("/notifications", notificationsRouter);
}
