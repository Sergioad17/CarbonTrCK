import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  getDashboardActivityController,
  listDashboardPeriodsController,
  putDashboardActivityController,
} from "./dashboard.controller.js";

export function registerDashboardRoutes(router) {
  const dashboardRouter = Router();

  dashboardRouter.use(requireAuth);
  dashboardRouter.get("/activity", asyncHandler(getDashboardActivityController));
  dashboardRouter.put("/activity", asyncHandler(putDashboardActivityController));
  dashboardRouter.get("/periods", asyncHandler(listDashboardPeriodsController));

  router.use("/dashboard", dashboardRouter);
}
