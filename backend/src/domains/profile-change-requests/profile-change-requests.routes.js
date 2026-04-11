import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  createProfileChangeRequestController,
  listProfileChangeRequestsController,
  updateProfileChangeRequestController,
} from "./profile-change-requests.controller.js";

export function registerProfileChangeRequestsRoutes(router) {
  const requestsRouter = Router();
  requestsRouter.use(requireAuth);
  requestsRouter.get("/", asyncHandler(listProfileChangeRequestsController));
  requestsRouter.post("/", asyncHandler(createProfileChangeRequestController));
  requestsRouter.patch("/:id", asyncHandler(updateProfileChangeRequestController));
  router.use("/profile-change-requests", requestsRouter);
}
