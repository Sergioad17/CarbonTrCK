import { getSettingsService, upsertSettingsService } from "./settings.service.js";

export async function getSettingsController(request, response) {
  response.json({ settings: await getSettingsService(request.user) });
}

export async function upsertSettingsController(request, response) {
  response.json({ settings: await upsertSettingsService(request.user, request.body) });
}
