import { query } from "../../shared/db/pool.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseTags(value) {
  const raw = cleanString(value);
  if (!raw) return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildNormalizedAreaShape(row) {
  return {
    id: row.id,
    code: cleanString(row.code),
    name: cleanString(row.name),
    campusCode: cleanString(row.campus_code),
    isActive: Boolean(row.is_active),
    building: cleanString(row.building_name) || null,
    parentArea: cleanString(row.parent_area_name) || null,
    tags: parseTags(row.tags),
    metadata: row.metadata || {},
  };
}

function shouldIncludeInactive(actor, filters) {
  if (!filters.includeInactive) return false;

  const permissionSet = new Set(actor.permissions || []);
  return permissionSet.has("users:manage") || actor.roleKey === "admin" || actor.roleKey === "directivo";
}

export async function listAreas(actor, filters = {}) {
  const values = [actor.organizationId];
  const conditions = ["c.organization_id = $1"];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    conditions.push(`c.code = $${values.length}`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);

    if (allowedAreaCodes.length < 1) {
      return [];
    }

    values.push(allowedAreaCodes);
    conditions.push(`a.code = ANY($${values.length}::text[])`);
  }

  if (!shouldIncludeInactive(actor, filters)) {
    conditions.push("a.is_active = true");
  }

  const result = await query(
    `
      SELECT
        a.id,
        a.code,
        a.name,
        a.is_active,
        a.tags,
        a.metadata,
        c.code AS campus_code,
        b.name AS building_name,
        parent.name AS parent_area_name
      FROM areas a
      JOIN campuses c ON c.id = a.campus_id
      LEFT JOIN buildings b ON b.id = a.building_id
      LEFT JOIN areas parent ON parent.id = a.parent_area_id
      WHERE ${conditions.join("\n        AND ")}
      ORDER BY c.code ASC, a.name ASC, a.code ASC
    `,
    values,
  );

  return result.rows.map(buildNormalizedAreaShape);
}
