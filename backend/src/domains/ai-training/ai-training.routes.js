import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  activateTrainingRunController,
  cancelTrainingRunController,
  createTrainingRunController,
  deactivateTrainingRunController,
  deleteTrainingRunController,
  getTrainingRunController,
  getTrainingSummaryController,
  listTrainingRunsController,
  retryTrainingRunController,
  startTrainingRunController,
} from "./ai-training.controller.js";

export function registerAiTrainingRoutes(router) {
  const aiRouter = Router();
  aiRouter.use(requireAuth, requireRole("admin"));

  aiRouter.get("/", asyncHandler(listTrainingRunsController));
  aiRouter.get("/summary", asyncHandler(getTrainingSummaryController));
  aiRouter.post("/", asyncHandler(createTrainingRunController));
  aiRouter.get("/:id", asyncHandler(getTrainingRunController));
  aiRouter.post("/:id/start", asyncHandler(startTrainingRunController));
  aiRouter.post("/:id/cancel", asyncHandler(cancelTrainingRunController));
  aiRouter.post("/:id/retry", asyncHandler(retryTrainingRunController));
  aiRouter.post("/:id/activate", asyncHandler(activateTrainingRunController));
  aiRouter.post("/:id/deactivate", asyncHandler(deactivateTrainingRunController));
  aiRouter.delete("/:id", asyncHandler(deleteTrainingRunController));

  router.use("/ai-training", aiRouter);
}
