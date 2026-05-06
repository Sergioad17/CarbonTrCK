import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const ENTITY_TYPES = Object.freeze([
  { id: "building", label: "Edificio", icon: "Building2", color: "#2563EB" },
  { id: "area", label: "Área", icon: "MapPin", color: "#7C3AED" },
  { id: "department", label: "Departamento", icon: "Briefcase", color: "#0891B2" },
  { id: "laboratory", label: "Laboratorio", icon: "FlaskConical", color: "#DC2626" },
  { id: "workshop", label: "Taller", icon: "Wrench", color: "#EA580C" },
  { id: "office", label: "Oficina", icon: "DoorOpen", color: "#64748B" },
  { id: "classroom", label: "Salón", icon: "GraduationCap", color: "#059669" },
  { id: "zone", label: "Zona operativa", icon: "MapPin", color: "#CA8A04" },
]);

const ENTITY_TYPE_IDS = new Set(ENTITY_TYPES.map((type) => type.id));
const AREA_ENTITY_TYPES = new Set(ENTITY_TYPES.filter((type) => type.id !== "building").map((type) => type.id));

function cleanString(value, maxLength = 250) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeCode(value, fallback) {
  const source = cleanString(value || fallback, 60)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return source || "SIN-CODIGO";
}

function normalizeStatus(value) {
  return String(value || "").toLowerCase() === "inactive" ? "inactive" : "active";
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function compactObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildAuditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
    details,
  };
}

function campusShape(row) {
  const metadata = compactObject(row.metadata);
  return {
    id: row.id,
    name: row.name,
    code: row.code || "",
    city: row.city || "",
    responsible: cleanString(metadata.responsible || "", 180),
    status: row.is_active ? "active" : "inactive",
    notes: cleanString(metadata.notes || row.address_line || "", 1000),
    buildingCount: Number(row.building_count || 0),
    areaCount: Number(row.area_count || 0),
  };
}

function entityShape(row) {
  const metadata = compactObject(row.metadata);
  const type = row.kind === "building" ? "building" : metadata.entityType || "area";
  return {
    id: row.id,
    name: row.name,
    type: ENTITY_TYPE_IDS.has(type) ? type : "area",
    code: row.code || "",
    campusId: row.campus_id,
    parentId: row.parent_id || null,
    responsible: cleanString(metadata.responsible || "", 180),
    status: row.is_active ? "active" : "inactive",
    usesElectricity: normalizeBoolean(metadata.usesElectricity),
    usesFuel: normalizeBoolean(metadata.usesFuel),
    hasDevices: normalizeBoolean(metadata.hasDevices || row.has_devices),
    inReductionGoals: normalizeBoolean(metadata.inReductionGoals || row.in_reduction_goals),
    description: row.description || "",
  };
}

function entityMetadata(payload, current = {}) {
  return {
    ...compactObject(current),
    responsible: cleanString(payload.responsible, 180),
    usesElectricity: normalizeBoolean(payload.usesElectricity),
    usesFuel: normalizeBoolean(payload.usesFuel),
    hasDevices: normalizeBoolean(payload.hasDevices),
    inReductionGoals: normalizeBoolean(payload.inReductionGoals),
    entityType: payload.type === "building" ? "building" : payload.type,
  };
}

function validateCampusPayload(payload = {}) {
  const name = cleanString(payload.name, 200);
  if (!name) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "El nombre del campus es obligatorio.",
      details: { field: "name" },
    });
  }

  return {
    name,
    code: normalizeCode(payload.code, name).slice(0, 50),
    city: cleanString(payload.city, 120) || null,
    status: normalizeStatus(payload.status),
    notes: cleanString(payload.notes, 1000),
    responsible: cleanString(payload.responsible, 180),
  };
}

function validateEntityPayload(payload = {}) {
  const name = cleanString(payload.name, 220);
  const type = cleanString(payload.type || "area", 40);
  if (!name) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "El nombre de la entidad es obligatorio.",
      details: { field: "name" },
    });
  }
  if (!ENTITY_TYPE_IDS.has(type)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "El tipo de entidad no es válido.",
      details: { field: "type" },
    });
  }

  return {
    name,
    type,
    code: normalizeCode(payload.code, name),
    campusId: cleanString(payload.campusId, 80),
    parentId: cleanString(payload.parentId, 80) || null,
    responsible: cleanString(payload.responsible, 180),
    status: normalizeStatus(payload.status),
    description: cleanString(payload.description, 2000),
    usesElectricity: normalizeBoolean(payload.usesElectricity),
    usesFuel: normalizeBoolean(payload.usesFuel),
    hasDevices: normalizeBoolean(payload.hasDevices),
    inReductionGoals: normalizeBoolean(payload.inReductionGoals),
  };
}

async function ensureCampus(client, actor, campusId) {
  const result = await client.query(
    `
      SELECT id
      FROM campuses
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [campusId, actor.organizationId],
  );
  if (result.rowCount < 1) {
    throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El campus no existe." });
  }
}

async function resolveAreaParent(client, actor, entity) {
  if (!entity.parentId) {
    return { buildingId: null, parentAreaId: null };
  }

  const parent = await client.query(
    `
      SELECT 'building' AS kind, b.id, b.campus_id, NULL::uuid AS building_id
      FROM buildings b
      JOIN campuses c ON c.id = b.campus_id
      WHERE b.id = $1 AND c.organization_id = $2
      UNION ALL
      SELECT 'area' AS kind, a.id, a.campus_id, a.building_id
      FROM areas a
      JOIN campuses c ON c.id = a.campus_id
      WHERE a.id = $1 AND c.organization_id = $2
      LIMIT 1
    `,
    [entity.parentId, actor.organizationId],
  );

  if (parent.rowCount < 1) {
    throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "La entidad padre no existe." });
  }

  const row = parent.rows[0];
  if (row.campus_id !== entity.campusId) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "La entidad padre debe pertenecer al mismo campus.",
      details: { field: "parentId" },
    });
  }

  return row.kind === "building"
    ? { buildingId: row.id, parentAreaId: null }
    : { buildingId: row.building_id || null, parentAreaId: row.id };
}

async function assertNoAreaCycle(client, areaId, parentAreaId) {
  if (!areaId || !parentAreaId) return;
  const result = await client.query(
    `
      WITH RECURSIVE parents AS (
        SELECT id, parent_area_id
        FROM areas
        WHERE id = $1
        UNION ALL
        SELECT a.id, a.parent_area_id
        FROM areas a
        JOIN parents p ON p.parent_area_id = a.id
      )
      SELECT id
      FROM parents
      WHERE id = $2
      LIMIT 1
    `,
    [parentAreaId, areaId],
  );
  if (result.rowCount > 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "La entidad padre no puede crear un ciclo en el árbol.",
      details: { field: "parentId" },
    });
  }
}

export async function listOrgStructure(actor) {
  const [campusResult, buildingResult, areaResult] = await Promise.all([
    query(
      `
        SELECT
          c.id,
          c.name,
          c.code,
          c.address_line,
          c.city,
          c.metadata,
          c.is_active,
          count(DISTINCT b.id)::int AS building_count,
          count(DISTINCT a.id)::int AS area_count
        FROM campuses c
        LEFT JOIN buildings b ON b.campus_id = c.id
        LEFT JOIN areas a ON a.campus_id = c.id
        WHERE c.organization_id = $1
        GROUP BY c.id
        ORDER BY c.name ASC, c.code ASC
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          'building' AS kind,
          b.id,
          b.campus_id,
          b.name,
          b.code,
          b.description,
          b.metadata,
          b.is_active,
          NULL::uuid AS parent_id,
          EXISTS (
            SELECT 1
            FROM device_bindings db
            JOIN iot_devices d ON d.id = db.device_id AND d.organization_id = db.organization_id
            WHERE db.campus_id = b.campus_id
              AND db.organization_id = $1
              AND d.is_active
          ) AS has_devices,
          EXISTS (
            SELECT 1
            FROM targets t
            WHERE t.campus_id = b.campus_id
              AND t.organization_id = $1
              AND t.is_active
              AND t.status = 'active'
          ) AS in_reduction_goals
        FROM buildings b
        JOIN campuses c ON c.id = b.campus_id
        WHERE c.organization_id = $1
        ORDER BY c.name ASC, b.name ASC
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          'area' AS kind,
          a.id,
          a.campus_id,
          a.name,
          a.code,
          a.description,
          a.metadata,
          a.is_active,
          COALESCE(a.parent_area_id, a.building_id) AS parent_id,
          EXISTS (
            SELECT 1
            FROM device_bindings db
            JOIN iot_devices d ON d.id = db.device_id AND d.organization_id = db.organization_id
            WHERE db.area_id = a.id
              AND db.organization_id = $1
              AND d.is_active
          ) AS has_devices,
          EXISTS (
            SELECT 1
            FROM targets t
            WHERE t.area_id = a.id
              AND t.organization_id = $1
              AND t.is_active
              AND t.status = 'active'
          ) AS in_reduction_goals
        FROM areas a
        JOIN campuses c ON c.id = a.campus_id
        WHERE c.organization_id = $1
        ORDER BY c.name ASC, a.name ASC
      `,
      [actor.organizationId],
    ),
  ]);

  return {
    campuses: campusResult.rows.map(campusShape),
    entities: [...buildingResult.rows, ...areaResult.rows].map(entityShape),
    entityTypes: ENTITY_TYPES,
  };
}

export async function createCampus(actor, payload, auditContext) {
  const campus = validateCampusPayload(payload);
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO campuses (organization_id, name, code, city, country_code, address_line, metadata, is_active)
        VALUES ($1,$2,$3,$4,'MX',$5,$6::jsonb,$7)
        RETURNING id, name, code, address_line, city, metadata, is_active, 0::int AS building_count, 0::int AS area_count
      `,
      [
        actor.organizationId,
        campus.name,
        campus.code,
        campus.city,
        campus.notes || null,
        JSON.stringify({ responsible: campus.responsible, notes: campus.notes }),
        campus.status === "active",
      ],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Creó el campus ${campus.name}`,
        module: "Estructura organizacional",
        action: "Crear campus",
        target: campus.code,
      }),
      eventType: "admin.org_structure.campus_create",
      entityType: "campus",
      entityId: result.rows[0].id,
    });

    return campusShape(result.rows[0]);
  });
}

export async function updateCampus(actor, campusId, payload, auditContext) {
  const campus = validateCampusPayload(payload);
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE campuses
        SET name = $3,
            code = $4,
            city = $5,
            address_line = $6,
            metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb,
            is_active = $8
        WHERE id = $1
          AND organization_id = $2
        RETURNING
          id,
          name,
          code,
          address_line,
          city,
          metadata,
          is_active,
          (SELECT count(*)::int FROM buildings b WHERE b.campus_id = campuses.id) AS building_count,
          (SELECT count(*)::int FROM areas a WHERE a.campus_id = campuses.id) AS area_count
      `,
      [
        campusId,
        actor.organizationId,
        campus.name,
        campus.code,
        campus.city,
        campus.notes || null,
        JSON.stringify({ responsible: campus.responsible, notes: campus.notes }),
        campus.status === "active",
      ],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El campus no existe." });
    }

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Actualizó el campus ${campus.name}`,
        module: "Estructura organizacional",
        action: "Actualizar campus",
        target: campus.code,
      }),
      eventType: "admin.org_structure.campus_update",
      entityType: "campus",
      entityId: campusId,
    });

    return campusShape(result.rows[0]);
  });
}

export async function deleteCampus(actor, campusId, auditContext) {
  return withTransaction(async (client) => {
    const childCount = await client.query(
      `
        SELECT
          (SELECT count(*)::int FROM buildings b WHERE b.campus_id = c.id) AS buildings,
          (SELECT count(*)::int FROM areas a WHERE a.campus_id = c.id) AS areas
        FROM campuses c
        WHERE c.id = $1
          AND c.organization_id = $2
      `,
      [campusId, actor.organizationId],
    );
    if (childCount.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El campus no existe." });
    }
    const counts = childCount.rows[0];
    if (Number(counts.buildings) > 0 || Number(counts.areas) > 0) {
      throw new AppError({
        statusCode: 409,
        code: "RESOURCE_IN_USE",
        message: "No se puede eliminar un campus con entidades asociadas.",
      });
    }

    const result = await client.query(
      `
        DELETE FROM campuses
        WHERE id = $1
          AND organization_id = $2
        RETURNING id, name, code
      `,
      [campusId, actor.organizationId],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Eliminó el campus ${result.rows[0].name}`,
        module: "Estructura organizacional",
        action: "Eliminar campus",
        target: result.rows[0].code,
      }),
      eventType: "admin.org_structure.campus_delete",
      entityType: "campus",
      entityId: campusId,
    });

    return { deleted: true, id: campusId };
  });
}

export async function createEntity(actor, payload, auditContext) {
  const entity = validateEntityPayload(payload);
  return withTransaction(async (client) => {
    await ensureCampus(client, actor, entity.campusId);

    let result;
    if (entity.type === "building") {
      result = await client.query(
        `
          INSERT INTO buildings (campus_id, name, code, description, metadata, is_active)
          VALUES ($1,$2,$3,$4,$5::jsonb,$6)
          RETURNING 'building' AS kind, id, campus_id, name, code, description, metadata, is_active, NULL::uuid AS parent_id, false AS has_devices, false AS in_reduction_goals
        `,
        [
          entity.campusId,
          entity.name,
          entity.code.slice(0, 50),
          entity.description || null,
          JSON.stringify(entityMetadata(entity)),
          entity.status === "active",
        ],
      );
    } else {
      const parent = await resolveAreaParent(client, actor, entity);
      result = await client.query(
        `
          INSERT INTO areas (campus_id, building_id, parent_area_id, code, name, description, metadata, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
          RETURNING 'area' AS kind, id, campus_id, name, code, description, metadata, is_active, COALESCE(parent_area_id, building_id) AS parent_id, false AS has_devices, false AS in_reduction_goals
        `,
        [
          entity.campusId,
          parent.buildingId,
          parent.parentAreaId,
          entity.code,
          entity.name,
          entity.description || null,
          JSON.stringify(entityMetadata(entity)),
          entity.status === "active",
        ],
      );
    }

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Creó la entidad ${entity.name}`,
        module: "Estructura organizacional",
        action: "Crear entidad",
        target: entity.code,
      }),
      eventType: "admin.org_structure.entity_create",
      entityType: entity.type === "building" ? "building" : "area",
      entityId: result.rows[0].id,
    });

    return entityShape(result.rows[0]);
  });
}

export async function updateEntity(actor, entityId, payload, auditContext) {
  const entity = validateEntityPayload(payload);
  return withTransaction(async (client) => {
    await ensureCampus(client, actor, entity.campusId);

    const current = await client.query(
      `
        SELECT 'building' AS kind, b.id, b.campus_id, b.metadata
        FROM buildings b
        JOIN campuses c ON c.id = b.campus_id
        WHERE b.id = $1 AND c.organization_id = $2
        UNION ALL
        SELECT 'area' AS kind, a.id, a.campus_id, a.metadata
        FROM areas a
        JOIN campuses c ON c.id = a.campus_id
        WHERE a.id = $1 AND c.organization_id = $2
        LIMIT 1
      `,
      [entityId, actor.organizationId],
    );
    if (current.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "La entidad no existe." });
    }

    const currentRow = current.rows[0];
    if (currentRow.kind === "building" && entity.type !== "building") {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "Un edificio no puede cambiarse a otro tipo desde esta edición.",
        details: { field: "type" },
      });
    }
    if (currentRow.kind === "area" && !AREA_ENTITY_TYPES.has(entity.type)) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "Una entidad de área no puede cambiarse a edificio desde esta edición.",
        details: { field: "type" },
      });
    }

    if (currentRow.kind === "building" && currentRow.campus_id !== entity.campusId) {
      const children = await client.query(`SELECT count(*)::int AS total FROM areas WHERE building_id = $1`, [entityId]);
      if (Number(children.rows[0]?.total || 0) > 0) {
        throw new AppError({
          statusCode: 409,
          code: "RESOURCE_IN_USE",
          message: "No se puede mover un edificio con entidades asociadas a otro campus.",
        });
      }
    }

    let result;
    if (currentRow.kind === "building") {
      result = await client.query(
        `
          UPDATE buildings
          SET campus_id = $3,
              name = $4,
              code = $5,
              description = $6,
              metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb,
              is_active = $8
          WHERE id = $1
            AND EXISTS (
              SELECT 1
              FROM campuses c
              WHERE c.id = buildings.campus_id
                AND c.organization_id = $2
            )
          RETURNING 'building' AS kind, id, campus_id, name, code, description, metadata, is_active, NULL::uuid AS parent_id, false AS has_devices, false AS in_reduction_goals
        `,
        [
          entityId,
          actor.organizationId,
          entity.campusId,
          entity.name,
          entity.code.slice(0, 50),
          entity.description || null,
          JSON.stringify(entityMetadata(entity, currentRow.metadata)),
          entity.status === "active",
        ],
      );
    } else {
      const parent = await resolveAreaParent(client, actor, entity);
      await assertNoAreaCycle(client, entityId, parent.parentAreaId);
      result = await client.query(
        `
          UPDATE areas
          SET campus_id = $3,
              building_id = $4,
              parent_area_id = $5,
              code = $6,
              name = $7,
              description = $8,
              metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
              is_active = $10
          WHERE id = $1
            AND EXISTS (
              SELECT 1
              FROM campuses c
              WHERE c.id = areas.campus_id
                AND c.organization_id = $2
            )
          RETURNING 'area' AS kind, id, campus_id, name, code, description, metadata, is_active, COALESCE(parent_area_id, building_id) AS parent_id, false AS has_devices, false AS in_reduction_goals
        `,
        [
          entityId,
          actor.organizationId,
          entity.campusId,
          parent.buildingId,
          parent.parentAreaId,
          entity.code,
          entity.name,
          entity.description || null,
          JSON.stringify(entityMetadata(entity, currentRow.metadata)),
          entity.status === "active",
        ],
      );
    }

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Actualizó la entidad ${entity.name}`,
        module: "Estructura organizacional",
        action: "Actualizar entidad",
        target: entity.code,
      }),
      eventType: "admin.org_structure.entity_update",
      entityType: currentRow.kind,
      entityId,
    });

    return entityShape(result.rows[0]);
  });
}

export async function deleteEntity(actor, entityId, auditContext) {
  return withTransaction(async (client) => {
    const current = await client.query(
      `
        SELECT 'building' AS kind, b.id, b.name, b.code
        FROM buildings b
        JOIN campuses c ON c.id = b.campus_id
        WHERE b.id = $1 AND c.organization_id = $2
        UNION ALL
        SELECT 'area' AS kind, a.id, a.name, a.code
        FROM areas a
        JOIN campuses c ON c.id = a.campus_id
        WHERE a.id = $1 AND c.organization_id = $2
        LIMIT 1
      `,
      [entityId, actor.organizationId],
    );
    if (current.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "La entidad no existe." });
    }

    const row = current.rows[0];
    if (row.kind === "building") {
      const areas = await client.query(`SELECT count(*)::int AS total FROM areas WHERE building_id = $1`, [entityId]);
      if (Number(areas.rows[0]?.total || 0) > 0) {
        throw new AppError({
          statusCode: 409,
          code: "RESOURCE_IN_USE",
          message: "No se puede eliminar un edificio con entidades asociadas.",
        });
      }
      await client.query(`DELETE FROM buildings WHERE id = $1`, [entityId]);
    } else {
      const children = await client.query(`SELECT count(*)::int AS total FROM areas WHERE parent_area_id = $1`, [entityId]);
      if (Number(children.rows[0]?.total || 0) > 0) {
        throw new AppError({
          statusCode: 409,
          code: "RESOURCE_IN_USE",
          message: "No se puede eliminar una entidad con entidades hijas.",
        });
      }
      await client.query(`DELETE FROM areas WHERE id = $1`, [entityId]);
    }

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        description: `Eliminó la entidad ${row.name}`,
        module: "Estructura organizacional",
        action: "Eliminar entidad",
        target: row.code,
      }),
      eventType: "admin.org_structure.entity_delete",
      entityType: row.kind,
      entityId,
    });

    return { deleted: true, id: entityId };
  });
}
