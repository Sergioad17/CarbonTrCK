import { Router } from "express";
import { registerActionsRoutes } from "../domains/actions/actions.routes.js";
import { registerAdminRoutes } from "../domains/admin/admin.routes.js";
import { registerAreasRoutes } from "../domains/areas/areas.routes.js";
import { registerAuthRoutes } from "../domains/auth/auth.routes.js";
import { registerDashboardRoutes } from "../domains/dashboard/dashboard.routes.js";
import { registerDevicesRoutes } from "../domains/devices/devices.routes.js";
import { registerEquipmentRoutes } from "../domains/equipment/equipment.routes.js";
import { registerFactorsRoutes } from "../domains/factors/factors.routes.js";
import { registerFilesRoutes } from "../domains/files/files.routes.js";
import { registerNotificationsRoutes } from "../domains/notifications/notifications.routes.js";
import { registerProfileRoutes } from "../domains/profile/profile.routes.js";
import { registerProfileChangeRequestsRoutes } from "../domains/profile-change-requests/profile-change-requests.routes.js";
import { registerRecordsRoutes } from "../domains/records/records.routes.js";
import { registerSettingsRoutes } from "../domains/settings/settings.routes.js";
import { registerTargetsRoutes } from "../domains/targets/targets.routes.js";
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
  registerAdminRoutes(router);
  registerUsersRoutes(router);
  registerProfileRoutes(router);
  registerRecordsRoutes(router);
  registerFilesRoutes(router);
  registerAreasRoutes(router);
  registerDashboardRoutes(router);
  registerDevicesRoutes(router);
  registerFactorsRoutes(router);
  registerEquipmentRoutes(router);
  registerTargetsRoutes(router);
  registerActionsRoutes(router);
  registerSettingsRoutes(router);
  registerNotificationsRoutes(router);
  registerProfileChangeRequestsRoutes(router);

  app.use("/", router);
}
