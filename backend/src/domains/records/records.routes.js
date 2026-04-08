import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { createRecordController, listRecordsController } from "./records.controller.js";

export function registerRecordsRoutes(router) {
  const recordsRouter = Router();

  recordsRouter.use(requireAuth);
  recordsRouter.get("/", asyncHandler(listRecordsController));
  recordsRouter.post("/", requirePermission("records:create"), asyncHandler(createRecordController));

  router.use("/records", recordsRouter);
}
