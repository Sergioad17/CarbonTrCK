import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureFiniteNumber(value, field, { min = 0 } = {}) {
  const parsed = toNullableNumber(value);
  if (parsed === null || parsed < min) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid number.`, details: { field } });
  }
  return parsed;
}

function ensureActorAccess(actor, campusCode, areaCode) {
  if (actor.campusCode && cleanString(actor.campusCode) && cleanString(actor.campusCode) !== cleanString(campusCode)) {
    throw new AppError({ statusCode: 403, code: "FORBIDDEN", message: "You cannot operate on equipment outside your assigned campus." });
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowed = new Set((actor.areaAccess.areaCodes || []).map((code) => cleanString(code)));
    if (!allowed.has(cleanString(areaCode))) {
      throw new AppError({ statusCode: 403, code: "FORBIDDEN", message: "You cannot operate on equipment outside your assigned areas." });
    }
  }
}

function buildEquipmentShape(row) {
  return {
    id: cleanString(row.id),
    campusCode: cleanString(row.campus_code),
    areaCode: cleanString(row.area_code),
    name: cleanString(row.name),
    category: cleanString(row.category),
    type: cleanString(row.type),
    quantity: Number(row.quantity),
    powerW: Number(row.power_w),
    usage: {
      hoursPerDay: Number(row.usage_hours_per_day),
      daysPerWeek: Number(row.usage_days_per_week),
      weeksPerMonth: Number(row.usage_weeks_per_month),
    },
    notes: cleanString(row.notes),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCampusByCode(organizationId, campusCode, client = { query }) {
  const result = await client.query(`SELECT id, code FROM campuses WHERE organization_id = $1 AND lower(code) = lower($2) LIMIT 1`, [
    organizationId,
    cleanString(campusCode),
  ]);
  return result.rows[0] || null;
}

async function getAreaByCode(campusId, areaCode, client = { query }) {
  const result = await client.query(`SELECT id, code FROM areas WHERE campus_id = $1 AND lower(code) = lower($2) AND is_active = true LIMIT 1`, [
    campusId,
    cleanString(areaCode),
  ]);
  return result.rows[0] || null;
}

async function resolveEquipmentBinding(actor, payload, client) {
  const campus = await getCampusByCode(actor.organizationId, payload.campusCode, client);
  if (!campus) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "campusCode is invalid.", details: { field: "campusCode" } });

  const area = await getAreaByCode(campus.id, payload.areaCode, client);
  if (!area) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "areaCode is invalid for the selected campus.", details: { field: "areaCode" } });

  ensureActorAccess(actor, campus.code, area.code);
  return { campus, area };
}

async function getEquipmentRow(actor, equipmentId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        ei.id,
        c.code AS campus_code,
        a.code AS area_code,
        ei.category_code AS category,
        ei.ui_type_code AS type,
        ei.name,
        ei.quantity,
        ei.power_w,
        ei.usage_hours_per_day,
        ei.usage_days_per_week,
        ei.usage_weeks_per_month,
        COALESCE(ei.notes, '') AS notes,
        ei.is_active,
        ei.created_at,
        ei.updated_at
      FROM equipment_inventory ei
      JOIN campuses c ON c.id = ei.campus_id
      JOIN areas a ON a.id = ei.area_id
      WHERE ei.id = $1
        AND ei.organization_id = $2
      LIMIT 1
    `,
    [equipmentId, actor.organizationId],
  );
  const row = result.rows[0] || null;
  if (row) ensureActorAccess(actor, row.campus_code, row.area_code);
  return row;
}

export async function listEquipment(actor) {
  const clauses = ["organization_id = $1"];
  const values = [actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    clauses.push(`campus_code = $${values.length}`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const areaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    if (areaCodes.length < 1) return [];
    values.push(areaCodes);
    clauses.push(`area_code = ANY($${values.length}::text[])`);
  }

  const result = await query(
    `
      SELECT
        id,
        campus_code,
        area_code,
        category,
        type,
        name,
        quantity,
        power_w,
        (usage->>'hoursPerDay')::numeric AS usage_hours_per_day,
        (usage->>'daysPerWeek')::numeric AS usage_days_per_week,
        (usage->>'weeksPerMonth')::numeric AS usage_weeks_per_month,
        COALESCE(notes, '') AS notes,
        is_active,
        created_at,
        updated_at
      FROM v_frontend_equipment
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC, name ASC
    `,
    values,
  );

  return result.rows.map(buildEquipmentShape);
}

export async function createEquipment(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const binding = await resolveEquipmentBinding(actor, payload, client);
    const inserted = await client.query(
      `
        INSERT INTO equipment_inventory (
          organization_id, campus_id, area_id, category_code, ui_type_code, name,
          quantity, power_w, usage_hours_per_day, usage_days_per_week, usage_weeks_per_month,
          notes, is_active, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        actor.organizationId,
        binding.campus.id,
        binding.area.id,
        cleanString(payload.category || "electricidad") || "electricidad",
        cleanString(payload.type || "otro") || "otro",
        cleanString(payload.name),
        ensureFiniteNumber(payload.quantity ?? 1, "quantity", { min: 0 }),
        ensureFiniteNumber(payload.powerW ?? 0, "powerW", { min: 0 }),
        ensureFiniteNumber(payload.usage?.hoursPerDay ?? 0, "usage.hoursPerDay", { min: 0 }),
        ensureFiniteNumber(payload.usage?.daysPerWeek ?? 0, "usage.daysPerWeek", { min: 0 }),
        ensureFiniteNumber(payload.usage?.weeksPerMonth ?? 4.3, "usage.weeksPerMonth", { min: 0.000001 }),
        cleanString(payload.notes) || null,
        "isActive" in payload ? Boolean(payload.isActive) : true,
        actor.id,
      ],
    );

    const item = buildEquipmentShape(await getEquipmentRow(actor, inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "equipment.create",
      entityType: "equipment",
      entityId: item.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { campusCode: item.campusCode, areaCode: item.areaCode },
    });
    return item;
  });
}

export async function updateEquipment(actor, equipmentId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existingRow = await getEquipmentRow(actor, equipmentId, client);
    if (!existingRow) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Equipment not found." });
    const existing = buildEquipmentShape(existingRow);

    const merged = {
      campusCode: payload.campusCode ?? existing.campusCode,
      areaCode: payload.areaCode ?? existing.areaCode,
      category: payload.category ?? existing.category,
      type: payload.type ?? existing.type,
      name: payload.name ?? existing.name,
      quantity: "quantity" in payload ? payload.quantity : existing.quantity,
      powerW: "powerW" in payload ? payload.powerW : existing.powerW,
      usage: {
        hoursPerDay: payload.usage?.hoursPerDay ?? existing.usage.hoursPerDay,
        daysPerWeek: payload.usage?.daysPerWeek ?? existing.usage.daysPerWeek,
        weeksPerMonth: payload.usage?.weeksPerMonth ?? existing.usage.weeksPerMonth,
      },
      notes: "notes" in payload ? payload.notes : existing.notes,
      isActive: "isActive" in payload ? payload.isActive : existing.isActive,
    };

    const binding = await resolveEquipmentBinding(actor, merged, client);
    await client.query(
      `
        UPDATE equipment_inventory
        SET
          campus_id = $1,
          area_id = $2,
          category_code = $3,
          ui_type_code = $4,
          name = $5,
          quantity = $6,
          power_w = $7,
          usage_hours_per_day = $8,
          usage_days_per_week = $9,
          usage_weeks_per_month = $10,
          notes = $11,
          is_active = $12
        WHERE id = $13
          AND organization_id = $14
      `,
      [
        binding.campus.id,
        binding.area.id,
        cleanString(merged.category || "electricidad") || "electricidad",
        cleanString(merged.type || "otro") || "otro",
        cleanString(merged.name),
        ensureFiniteNumber(merged.quantity, "quantity", { min: 0 }),
        ensureFiniteNumber(merged.powerW, "powerW", { min: 0 }),
        ensureFiniteNumber(merged.usage.hoursPerDay, "usage.hoursPerDay", { min: 0 }),
        ensureFiniteNumber(merged.usage.daysPerWeek, "usage.daysPerWeek", { min: 0 }),
        ensureFiniteNumber(merged.usage.weeksPerMonth, "usage.weeksPerMonth", { min: 0.000001 }),
        cleanString(merged.notes) || null,
        Boolean(merged.isActive),
        equipmentId,
        actor.organizationId,
      ],
    );

    const item = buildEquipmentShape(await getEquipmentRow(actor, equipmentId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "equipment.update",
      entityType: "equipment",
      entityId: item.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });
    return item;
  });
}

export async function updateEquipmentStatus(actor, equipmentId, isActive, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getEquipmentRow(actor, equipmentId, client);
    if (!existing) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Equipment not found." });

    await client.query(`UPDATE equipment_inventory SET is_active = $1 WHERE id = $2 AND organization_id = $3`, [
      Boolean(isActive),
      equipmentId,
      actor.organizationId,
    ]);

    const item = buildEquipmentShape(await getEquipmentRow(actor, equipmentId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "equipment.status_change",
      entityType: "equipment",
      entityId: item.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { isActive: Boolean(isActive) },
    });
    return item;
  });
}

export async function duplicateEquipment(actor, equipmentId, auditContext) {
  return withTransaction(async (client) => {
    const sourceRow = await getEquipmentRow(actor, equipmentId, client);
    if (!sourceRow) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Equipment not found." });
    const source = buildEquipmentShape(sourceRow);

    const binding = await resolveEquipmentBinding(actor, source, client);
    const inserted = await client.query(
      `
        INSERT INTO equipment_inventory (
          organization_id, campus_id, area_id, category_code, ui_type_code, name,
          quantity, power_w, usage_hours_per_day, usage_days_per_week, usage_weeks_per_month,
          notes, is_active, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        actor.organizationId,
        binding.campus.id,
        binding.area.id,
        source.category,
        source.type,
        `${source.name} copia`,
        source.quantity,
        source.powerW,
        source.usage.hoursPerDay,
        source.usage.daysPerWeek,
        source.usage.weeksPerMonth,
        source.notes || null,
        source.isActive,
        actor.id,
      ],
    );

    const item = buildEquipmentShape(await getEquipmentRow(actor, inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "equipment.duplicate",
      entityType: "equipment",
      entityId: item.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { sourceEquipmentId: equipmentId },
    });
    return item;
  });
}
