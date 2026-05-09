import { Router } from "express";
import { requireAuth, requirePermission } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  archiveRecordController,
  createRecordController,
  decideRecordsController,
  getRecordController,
  listValidationDecisionsController,
  listValidationQueueController,
  listRecordRevisionsController,
  listRecordsController,
} from "./records.controller.js";

export function registerRecordsRoutes(router) {
  const recordsRouter = Router();

  recordsRouter.use(requireAuth);
  recordsRouter.get("/", asyncHandler(listRecordsController));
  recordsRouter.get("/validation/queue", requirePermission("records:approve"), asyncHandler(listValidationQueueController));
  recordsRouter.get("/validation/decisions", requirePermission("records:approve"), asyncHandler(listValidationDecisionsController));
  recordsRouter.post("/validation/decisions", requirePermission("records:approve"), asyncHandler(decideRecordsController));
  recordsRouter.get("/:id", asyncHandler(getRecordController));
  recordsRouter.get("/:id/revisions", asyncHandler(listRecordRevisionsController));
  recordsRouter.post("/", requirePermission("records:create"), asyncHandler(createRecordController));
  recordsRouter.patch("/:id/archive", requirePermission("records:update"), asyncHandler(archiveRecordController));

  router.use("/records", recordsRouter);
}
