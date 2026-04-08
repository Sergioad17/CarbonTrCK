import { getDashboardActivityService, putDashboardActivityService } from "./dashboard.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function getDashboardActivityController(request, response) {
  const items = await getDashboardActivityService(request.user);
  response.json({ items });
}

export async function putDashboardActivityController(request, response) {
  const items = await putDashboardActivityService(request.user, request.body, auditContextFromRequest(request));
  response.json({ items });
}
