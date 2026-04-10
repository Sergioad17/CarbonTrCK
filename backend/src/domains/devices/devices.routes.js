import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
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
  devicesRouter.use(requireAuth, requireRole("admin"));

  devicesRouter.get("/", asyncHandler(listDevicesController));
  devicesRouter.post("/", asyncHandler(createDeviceController));
  devicesRouter.patch("/:id", asyncHandler(updateDeviceController));
  devicesRouter.patch("/:id/status", asyncHandler(updateDeviceStatusController));
  devicesRouter.post("/:id/duplicate", asyncHandler(duplicateDeviceController));
  devicesRouter.delete("/:id", asyncHandler(removeDeviceController));

  router.use("/devices", devicesRouter);
  router.post("/iot/readings", requireDeviceAuth, asyncHandler(createDeviceReadingController));
}
