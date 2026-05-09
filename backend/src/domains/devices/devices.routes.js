import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createDeviceController,
  createDeviceReadingController,
  duplicateDeviceController,
  listDeviceReadingsController,
  listDeviceTrainingReadingsController,
  listDevicesController,
  removeDeviceController,
  removeDeviceReadingController,
  updateDeviceController,
  updateDeviceReadingTrainingController,
  updateDeviceStatusController,
} from "./devices.controller.js";
import { requireDeviceAuth } from "./devices.auth.js";

export function registerDevicesRoutes(router) {
  const devicesRouter = Router();
  devicesRouter.use(requireAuth);

  devicesRouter.get("/", requirePermission("devices:view"), asyncHandler(listDevicesController));
  devicesRouter.post("/", requirePermission("devices:create"), asyncHandler(createDeviceController));
  devicesRouter.get("/:id/readings/training", requirePermission("devices:view"), asyncHandler(listDeviceTrainingReadingsController));
  devicesRouter.get("/:id/readings", requirePermission("devices:view"), asyncHandler(listDeviceReadingsController));
  devicesRouter.patch("/:id/readings/:readingId/training", requirePermission("devices:edit"), asyncHandler(updateDeviceReadingTrainingController));
  devicesRouter.delete("/:id/readings/:readingId", requirePermission("devices:delete"), asyncHandler(removeDeviceReadingController));
  devicesRouter.patch("/:id", requirePermission("devices:edit"), asyncHandler(updateDeviceController));
  devicesRouter.patch("/:id/status", requirePermission("devices:delete"), asyncHandler(updateDeviceStatusController));
  devicesRouter.post("/:id/duplicate", requirePermission("devices:create"), asyncHandler(duplicateDeviceController));
  devicesRouter.delete("/:id", requirePermission("devices:delete"), asyncHandler(removeDeviceController));

  router.use("/devices", devicesRouter);
  router.post("/iot/readings", requireDeviceAuth, asyncHandler(createDeviceReadingController));
}
