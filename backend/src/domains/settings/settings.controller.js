import { getSettingsService, upsertSettingsService } from "./settings.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function getSettingsController(request, response) {
  response.json({ settings: await getSettingsService(request.user, auditContextFromRequest(request)) });
}

export async function upsertSettingsController(request, response) {
  response.json({ settings: await upsertSettingsService(request.user, request.body, auditContextFromRequest(request)) });
}
