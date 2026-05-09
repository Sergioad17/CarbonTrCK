import {
  getDashboardActivityService,
  listDashboardPeriodsService,
  putDashboardActivityService,
} from "./dashboard.service.js";

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

export async function listDashboardPeriodsController(request, response) {
  const periods = await listDashboardPeriodsService(request.user);
  response.json({ periods });
}
