import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createEquipmentController,
  duplicateEquipmentController,
  listEquipmentController,
  updateEquipmentController,
  updateEquipmentStatusController,
} from "./equipment.controller.js";

export function registerEquipmentRoutes(router) {
  const equipmentRouter = Router();
  equipmentRouter.use(requireAuth);
  equipmentRouter.get("/", requirePermission("equipment:view"), asyncHandler(listEquipmentController));
  equipmentRouter.post("/", requirePermission("equipment:create"), asyncHandler(createEquipmentController));
  equipmentRouter.patch("/:id", requirePermission("equipment:edit"), asyncHandler(updateEquipmentController));
  equipmentRouter.patch("/:id/status", requirePermission("equipment:edit"), asyncHandler(updateEquipmentStatusController));
  equipmentRouter.post("/:id/duplicate", requirePermission("equipment:create"), asyncHandler(duplicateEquipmentController));
  router.use("/equipment", equipmentRouter);
}
