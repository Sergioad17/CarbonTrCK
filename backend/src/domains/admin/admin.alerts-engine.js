const ALERT_NOTIFICATION_TYPE = "system";

function cleanString(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(value, fallback) {
  const match = cleanString(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

function hoursFromCondition(condition, fallbackHours) {
  const value = firstNumber(condition, fallbackHours);
  const text = cleanString(condition).toLowerCase();
  if (text.includes("min")) return value / 60;
  if (text.includes("d") || text.includes("dia") || text.includes("día")) return value * 24;
  return value;
}

function daysFromCondition(condition, fallbackDays) {
  const value = firstNumber(condition, fallbackDays);
  const text = cleanString(condition).toLowerCase();
  if (text.includes("h")) return value / 24;
  return value;
}

function percentFromCondition(condition, fallbackPercent) {
  return firstNumber(condition, fallbackPercent);
}

function severityRank(severity) {
  return { critical: 3, warning: 2, info: 1 }[cleanString(severity)] || 1;
}

async function listActiveRules(client, organizationId, type) {
  const params = [organizationId];
  const typeFilter = type ? "AND type = $2" : "";
  if (type) params.push(type);

  const result = await client.query(
    `
      SELECT id, name, type, condition, severity, priority, frequency, channels, recipients,
             enabled, triggered_count, created_at, updated_at
      FROM admin_alert_rules
      WHERE organization_id = $1
        AND enabled = true
        ${typeFilter}
      ORDER BY priority DESC, severity DESC, name ASC
    `,
    params,
  );

  return result.rows.map((row) => ({
    id: cleanString(row.id),
    name: cleanString(row.name),
    type: cleanString(row.type),
    condition: cleanString(row.condition),
    severity: cleanString(row.severity),
    priority: cleanString(row.priority),
    frequency: cleanString(row.frequency),
    channels: Array.isArray(row.channels) ? row.channels : [],
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    triggeredCount: Number(row.triggered_count || 0),
  }));
}

async function resolveRecipientUserIds(client, organizationId, recipients = []) {
  const tokens = [...new Set((recipients || []).map((item) => cleanString(item).toLowerCase()).filter(Boolean))];

  if (tokens.length < 1) {
    const admins = await client.query(
      `
        SELECT DISTINCT u.id
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = u.organization_id
        JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
        WHERE u.organization_id = $1
          AND u.is_active = true
          AND lower(r.name) = 'admin'
      `,
      [organizationId],
    );
    return admins.rows.map((row) => row.id);
  }

  const users = await client.query(
    `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = u.organization_id
      LEFT JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.organization_id = $1
        AND u.is_active = true
        AND (
          lower(u.email::text) = ANY($2::text[])
          OR lower(u.full_name) = ANY($2::text[])
          OR lower(r.name) = ANY($2::text[])
          OR ('validadores' = ANY($2::text[]) AND p.code = 'records:approve')
        )
    `,
    [organizationId, tokens],
  );

  if (users.rowCount > 0) return users.rows.map((row) => row.id);

  const fallback = await client.query(
    `
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = u.organization_id
      JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
      WHERE u.organization_id = $1
        AND u.is_active = true
        AND lower(r.name) = 'admin'
    `,
    [organizationId],
  );
  return fallback.rows.map((row) => row.id);
}

async function hasRecentDuplicate(client, organizationId, userId, ruleId, eventKey) {
  const result = await client.query(
    `
      SELECT id
      FROM notifications
      WHERE organization_id = $1
        AND user_id = $2
        AND status <> 'archived'
        AND metadata @> $3::jsonb
        AND created_at >= now() - interval '24 hours'
      LIMIT 1
    `,
    [organizationId, userId, JSON.stringify({ alertRuleId: ruleId, eventKey })],
  );
  return result.rowCount > 0;
}

async function dispatchRule(client, organizationId, rule, event) {
  const eventKey = cleanString(event.eventKey);
  if (!eventKey) return 0;

  const userIds = await resolveRecipientUserIds(client, organizationId, rule.recipients);
  let inserted = 0;

  for (const userId of userIds) {
    if (await hasRecentDuplicate(client, organizationId, userId, rule.id, eventKey)) continue;

    await client.query(
      `
        INSERT INTO notifications (
          organization_id, user_id, status, type, title, message, metadata, read_at
        )
        VALUES ($1,$2,'unread',$3,$4,$5,$6::jsonb,NULL)
      `,
      [
        organizationId,
        userId,
        ALERT_NOTIFICATION_TYPE,
        cleanString(event.title),
        cleanString(event.message) || null,
        JSON.stringify({
          ...(event.metadata || {}),
          link: cleanString(event.link),
          alertRuleId: rule.id,
          alertRuleName: rule.name,
          alertType: rule.type,
          alertSeverity: rule.severity,
          alertPriority: rule.priority,
          alertFrequency: rule.frequency,
          eventKey,
          channels: rule.channels,
        }),
      ],
    );
    inserted += 1;
  }

  if (inserted > 0) {
    await client.query(
      `
        UPDATE admin_alert_rules
        SET triggered_count = triggered_count + 1,
            updated_at = now()
        WHERE id = $1
          AND organization_id = $2
      `,
      [rule.id, organizationId],
    );
  }

  return inserted;
}

async function dispatchRules(client, organizationId, type, buildEvent) {
  const rules = await listActiveRules(client, organizationId, type);
  let count = 0;
  for (const rule of rules) {
    const event = await buildEvent(rule);
    if (!event) continue;
    count += await dispatchRule(client, organizationId, rule, event);
  }
  return count;
}

export async function evaluateRecordCreatedAlerts(client, actor, record) {
  await dispatchRules(client, actor.organizationId, "validation", (rule) => ({
    eventKey: `record-validation:${record.id}`,
    title: `Registro pendiente de validacion: ${record.activity || record.category}`,
    message: `${record.area || record.areaCode} registro ${record.value} ${record.unit} requiere revision administrativa.`,
    link: "/admin/registros",
    metadata: { recordId: record.id, areaCode: record.areaCode, campusCode: record.campusCode },
  }));

  const threshold = Math.max(...(await listActiveRules(client, actor.organizationId, "anomaly")).map((rule) => percentFromCondition(rule.condition, 30)), 30);
  const co2e = toNumber(record.co2e_t);
  if (co2e === null || co2e <= 0) return;

  const baseline = await client.query(
    `
      SELECT AVG(co2e_kg / 1000.0)::numeric AS avg_tco2e, COUNT(*)::int AS samples
      FROM v_frontend_records
      WHERE organization_id = $1
        AND id <> $2
        AND "areaCode" = $3
        AND category = $4
        AND "dateISO" >= (CURRENT_DATE - interval '90 days')
    `,
    [actor.organizationId, record.id, record.areaCode, record.category],
  );

  const avg = toNumber(baseline.rows[0]?.avg_tco2e);
  const samples = Number(baseline.rows[0]?.samples || 0);
  if (avg === null || samples < 3 || co2e <= avg * (1 + threshold / 100)) return;

  await dispatchRules(client, actor.organizationId, "anomaly", (rule) => ({
    eventKey: `record-anomaly:${record.id}:${rule.id}`,
    title: `Lectura fuera de rango en ${record.area || record.areaCode}`,
    message: `${record.activity || record.category} registro ${co2e.toFixed(3)} tCO2e contra promedio ${avg.toFixed(3)} tCO2e.`,
    link: "/admin/registros",
    metadata: { recordId: record.id, areaCode: record.areaCode, category: record.category, value: co2e, average: avg },
  }));
}

export async function evaluateDeviceReadingAlerts(client, device, reading, result) {
  const organizationId = device.organization_id;
  const batteryLevel = toNumber(reading.payload?.batteryLevel ?? reading.payload?.batteryPercent ?? reading.payload?.battery);

  if (batteryLevel !== null && batteryLevel <= 15) {
    await dispatchRules(client, organizationId, "device", (rule) => ({
      eventKey: `device-battery:${device.id}:${Math.floor(Date.now() / 86400000)}`,
      title: `Bateria critica en ${device.code}`,
      message: `${device.name || device.code} reporto bateria al ${batteryLevel}%.`,
      link: "/catalogos/dispositivos",
      metadata: { deviceId: device.id, deviceCode: device.code, readingId: result.readingId, batteryLevel },
    }));
  }

  const threshold = Math.max(...(await listActiveRules(client, organizationId, "anomaly")).map((rule) => percentFromCondition(rule.condition, 30)), 30);
  const deltaKwh = toNumber(reading.deltaKwh);
  if (deltaKwh === null || deltaKwh <= 0) return;

  const baseline = await client.query(
    `
      SELECT AVG(delta_kwh)::numeric AS avg_delta, COUNT(*)::int AS samples
      FROM device_readings
      WHERE organization_id = $1
        AND device_id = $2
        AND recorded_at >= now() - interval '30 days'
        AND id <> $3
        AND delta_kwh IS NOT NULL
    `,
    [organizationId, device.id, result.readingId],
  );
  const avg = toNumber(baseline.rows[0]?.avg_delta);
  const samples = Number(baseline.rows[0]?.samples || 0);
  if (avg === null || samples < 3 || deltaKwh <= avg * (1 + threshold / 100)) return;

  await dispatchRules(client, organizationId, "anomaly", (rule) => ({
    eventKey: `device-anomaly:${result.readingId}:${rule.id}`,
    title: `Lectura IoT anomala en ${device.code}`,
    message: `Delta ${deltaKwh.toFixed(2)} kWh contra promedio ${avg.toFixed(2)} kWh.`,
    link: "/catalogos/dispositivos",
    metadata: { deviceId: device.id, deviceCode: device.code, readingId: result.readingId, value: deltaKwh, average: avg },
  }));
}

export async function evaluateFactorAlerts(client, actor, factor, action = "updated") {
  await dispatchRules(client, actor.organizationId, "factor", (rule) => ({
    eventKey: `factor:${action}:${factor.id}:${rule.id}`,
    title: `Factor de emision ${action === "created" ? "creado" : "actualizado"}`,
    message: `${factor.scope}/${factor.category}/${factor.metric} quedo en ${factor.value} ${factor.numeratorUnit || "kgCO2e"}/${factor.denominatorUnit}.`,
    link: "/catalogos/factores",
    metadata: { factorId: factor.id, action, scope: factor.scope, category: factor.category, metric: factor.metric },
  }));
}

export async function evaluateTargetAlerts(client, actor, target) {
  if (cleanString(target.status) !== "at_risk") return;
  await dispatchRules(client, actor.organizationId, "goal", (rule) => ({
    eventKey: `goal-risk:${target.id}:${rule.id}`,
    title: `Meta en riesgo: ${target.title}`,
    message: `La meta ${target.title} fue marcada en riesgo y requiere seguimiento.`,
    link: "/admin/metas",
    metadata: { targetId: target.id, status: target.status, targetEnd: target.targetEnd },
  }));
}

export async function runScheduledAdminAlertChecks(client, actor) {
  const organizationId = actor.organizationId;

  await dispatchRules(client, organizationId, "device", async (rule) => {
    const hours = hoursFromCondition(rule.condition, 24);
    const offline = await client.query(
      `
        SELECT d.id, d.code, d.name, latest.recorded_at
        FROM iot_devices d
        LEFT JOIN LATERAL (
          SELECT recorded_at
          FROM device_readings dr
          WHERE dr.device_id = d.id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) latest ON true
        WHERE d.organization_id = $1
          AND d.is_active = true
          AND (latest.recorded_at IS NULL OR latest.recorded_at < now() - make_interval(secs => $2::int))
        ORDER BY latest.recorded_at NULLS FIRST
        LIMIT 1
      `,
      [organizationId, Math.round(hours * 3600)],
    );
    const row = offline.rows[0];
    if (!row) return null;
    return {
      eventKey: `device-offline:${row.id}:${Math.floor(Date.now() / 86400000)}`,
      title: `Dispositivo sin reporte: ${row.code}`,
      message: `${row.name || row.code} no ha enviado lecturas en mas de ${hours} horas.`,
      link: "/catalogos/dispositivos",
      metadata: { deviceId: row.id, deviceCode: row.code, lastReadingAt: row.recorded_at },
    };
  });

  await dispatchRules(client, organizationId, "validation", async (rule) => {
    const days = daysFromCondition(rule.condition, 5);
    const pending = await client.query(
      `
        SELECT r.id, r.created_at, r.activity_text, a.code AS area_code
        FROM records r
        JOIN areas a ON a.id = r.area_id
        WHERE r.organization_id = $1
          AND r.deleted_at IS NULL
          AND r.approved_at IS NULL
          AND r.status <> 'rejected'
          AND r.created_at < now() - make_interval(secs => $2::int)
        ORDER BY r.created_at ASC
        LIMIT 1
      `,
      [organizationId, Math.round(days * 86400)],
    );
    const row = pending.rows[0];
    if (!row) return null;
    return {
      eventKey: `validation-overdue:${row.id}:${Math.floor(Date.now() / 86400000)}`,
      title: "Registro pendiente vencido",
      message: `${row.activity_text} lleva mas de ${days} dias pendiente de validacion.`,
      link: "/admin/validacion",
      metadata: { recordId: row.id, areaCode: row.area_code, createdAt: row.created_at },
    };
  });

  await dispatchRules(client, organizationId, "factor", async (rule) => {
    const expired = await client.query(
      `
        SELECT ef.id, es.code::text AS scope, ec.code AS category, m.code AS metric, ef.valid_to
        FROM emission_factors ef
        JOIN emission_scopes es ON es.id = ef.scope_id
        JOIN emission_categories ec ON ec.id = ef.category_id
        JOIN metrics m ON m.id = ef.metric_id
        WHERE ef.valid_to IS NOT NULL
          AND ef.valid_to < CURRENT_DATE
        ORDER BY ef.valid_to ASC
        LIMIT 1
      `,
    );
    const row = expired.rows[0];
    if (!row) return null;
    return {
      eventKey: `factor-expired:${row.id}:${Math.floor(Date.now() / 86400000)}`,
      title: "Factor de emision vencido",
      message: `${row.scope}/${row.category}/${row.metric} vencio el ${cleanString(row.valid_to).slice(0, 10)}.`,
      link: "/catalogos/factores",
      metadata: { factorId: row.id, scope: row.scope, category: row.category, metric: row.metric, validTo: row.valid_to },
    };
  });

  await dispatchRules(client, organizationId, "goal", async (rule) => {
    const target = await client.query(
      `
        SELECT id, title, target_end
        FROM targets
        WHERE organization_id = $1
          AND status = 'at_risk'
        ORDER BY target_end ASC
        LIMIT 1
      `,
      [organizationId],
    );
    const row = target.rows[0];
    if (!row) return null;
    return {
      eventKey: `goal-risk:${row.id}:${Math.floor(Date.now() / 86400000)}`,
      title: `Meta en riesgo: ${row.title}`,
      message: `La meta ${row.title} esta marcada en riesgo.`,
      link: "/admin/metas",
      metadata: { targetId: row.id, targetEnd: row.target_end },
    };
  });

  await dispatchRules(client, organizationId, "period", async (rule) => {
    const days = daysFromCondition(rule.condition, 7);
    const tableCheck = await client.query(`SELECT to_regclass('public.admin_periods') AS table_name`);
    if (!tableCheck.rows[0]?.table_name) return null;
    const period = await client.query(
      `
        SELECT id, name, end_date
        FROM admin_periods
        WHERE organization_id = $1
          AND end_date >= CURRENT_DATE
          AND end_date <= CURRENT_DATE + make_interval(secs => $2::int)
        ORDER BY end_date ASC
        LIMIT 1
      `,
      [organizationId, Math.round(days * 86400)],
    );
    const row = period.rows[0];
    if (!row) return null;
    return {
      eventKey: `period-closing:${row.id}:${Math.floor(Date.now() / 86400000)}`,
      title: `Periodo proximo a cerrar: ${row.name}`,
      message: `${row.name} cierra el ${cleanString(row.end_date).slice(0, 10)}.`,
      link: "/admin/periodos",
      metadata: { periodId: row.id, endDate: row.end_date },
    };
  });
}
