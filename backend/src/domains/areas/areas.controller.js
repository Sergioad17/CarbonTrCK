import { listAreasService } from "./areas.service.js";

export async function listAreasController(request, response) {
  const items = await listAreasService(request.user, request.query);
  response.json({ items });
}
