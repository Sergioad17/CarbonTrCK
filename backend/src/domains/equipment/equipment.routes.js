import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
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
  // Equipment catalog management remains admin-only for now because the project
  // has no dedicated fine-grained permission for this module yet.
  equipmentRouter.use(requireAuth, requireRole("admin"));
  equipmentRouter.get("/", asyncHandler(listEquipmentController));
  equipmentRouter.post("/", asyncHandler(createEquipmentController));
  equipmentRouter.patch("/:id", asyncHandler(updateEquipmentController));
  equipmentRouter.patch("/:id/status", asyncHandler(updateEquipmentStatusController));
  equipmentRouter.post("/:id/duplicate", asyncHandler(duplicateEquipmentController));
  router.use("/equipment", equipmentRouter);
}
