import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createDeviceController,
  createDeviceReadingController,
  duplicateDeviceController,
  listDevicesController,
  removeDeviceController,
  updateDeviceController,
  updateDeviceStatusController,
} from "./devices.controller.js";
import { requireDeviceAuth } from "./devices.auth.js";

export function registerDevicesRoutes(router) {
  const devicesRouter = Router();
  devicesRouter.use(requireAuth);

  devicesRouter.get("/", requirePermission("devices:view"), asyncHandler(listDevicesController));
  devicesRouter.post("/", requirePermission("devices:create"), asyncHandler(createDeviceController));
  devicesRouter.patch("/:id", requirePermission("devices:edit"), asyncHandler(updateDeviceController));
  devicesRouter.patch("/:id/status", requirePermission("devices:delete"), asyncHandler(updateDeviceStatusController));
  devicesRouter.post("/:id/duplicate", requirePermission("devices:create"), asyncHandler(duplicateDeviceController));
  devicesRouter.delete("/:id", requirePermission("devices:delete"), asyncHandler(removeDeviceController));

  router.use("/devices", devicesRouter);
  router.post("/iot/readings", requireDeviceAuth, asyncHandler(createDeviceReadingController));
}
