import { Router } from "express";
import { registerAuthRoutes } from "../domains/auth/auth.routes.js";
import { registerProfileRoutes } from "../domains/profile/profile.routes.js";
import { registerUsersRoutes } from "../domains/users/users.routes.js";

export function registerRoutes(app, { env }) {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "carbontrack-backend",
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  registerAuthRoutes(router);
  registerUsersRoutes(router);
  registerProfileRoutes(router);

  app.use("/", router);
}
