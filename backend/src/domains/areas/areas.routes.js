import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { listAreasController } from "./areas.controller.js";

export function registerAreasRoutes(router) {
  const areasRouter = Router();

  areasRouter.use(requireAuth);
  areasRouter.get("/", asyncHandler(listAreasController));

  router.use("/areas", areasRouter);
}
