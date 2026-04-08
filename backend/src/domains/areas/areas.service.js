export async function listAreasService(actor, filters) {
  const normalizedFilters = {
    includeInactive: String(filters?.includeInactive || "").trim().toLowerCase() === "true",
  };

  const { listAreas } = await import("./areas.repository.js");
  return listAreas(actor, normalizedFilters);
}
