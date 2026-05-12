import { logger } from "../../shared/logger/index.js";
import { dispatchAcrossChannels } from "./admin.alerts.delivery.js";
import { getAdminAlertTemplate, getAdminAlertTemplateByCode, renderTemplate } from "./admin.alert-templates.repository.js";

function cleanString(value) { return String(value ?? "").trim(); }
function toNumber(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function firstNumber(value, fallback) {
  const match = cleanString(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

function readCondition(rule, key, fallback) {
  const json = rule.conditionJson || {};
  if (Object.prototype.hasOwnProperty.call(json, key) && json[key] != null) {
    const value = Number(json[key]);
    if (Number.isFinite(value)) return value;
  }
  return firstNumber(rule.condition, fallback);
}

function hoursFromRule(rule, fallbackHours) {
  const json = rule.conditionJson || {};
  if (Number.isFinite(Number(json.hours))) return Number(json.hours);
  if (Number.isFinite(Number(json.minutes))) return Number(json.minutes) / 60;
  if (Number.isFinite(Number(json.days))) return Number(json.days) * 24;
  const value = firstNumber(rule.condition, fallbackHours);
  const text = cleanString(rule.condition).toLowerCase();
  if (text.includes("min")) return value / 60;
  if (text.includes("dia") || text.includes("día") || /\bd\b/.test(text)) return value * 24;
  return value;
}

function daysFromRule(rule, fallbackDays) {
  const json = rule.conditionJson || {};
  if (Number.isFinite(Number(json.days))) return Number(json.days);
  if (Number.isFinite(Number(json.hours))) return Number(json.hours) / 24;
  const value = firstNumber(rule.condition, fallbackDays);
  const text = cleanString(rule.condition).toLowerCase();
  if (text.includes("h")) return value / 24;
  return value;
}

function percentFromRule(rule, fallbackPercent) {
  return readCondition(rule, "percent", fallbackPercent);
}

function isInQuietHours(rule, now = new Date()) {
  const start = rule.quietHoursStart;
  const end = rule.quietHoursEnd;
  if (start == null || end == null || start === end) return false;
  const hour = now.getHours();
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function bucketKeyFor(frequency, cooldownMinutes, now = new Date()) {
  const minutes = Number(cooldownMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    const slot = Math.floor(now.getTime() / (minutes * 60_000));
    return `cd:${slot}`;
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  switch (cleanString(frequency)) {
    case "hourly": return `h:${y}${m}${d}${h}`;
    case "daily": return `d:${y}${m}${d}`;
    case "weekly": {
      const onejan = new Date(Date.UTC(y, 0, 1));
      const dayOfYear = Math.floor((Date.UTC(y, now.getUTCMonth(), now.getUTCDate()) - onejan.getTime()) / 86400000) + 1;
      const week = Math.ceil((dayOfYear + onejan.getUTCDay()) / 7);
      return `w:${y}${String(week).padStart(2, "0")}`;
    }
    case "immediate":
    default:
      return `i:${y}${m}${d}${h}${String(now.getUTCMinutes()).padStart(2, "0")}`;
  }
}

async function reserveSlot(client, ruleId, eventKey, bucketKey) {
  const result = await client.query(
    `
      INSERT INTO admin_alert_dedupe (rule_id, event_key, bucket_key)
      VALUES ($1, $2, $3)
      ON CONFLICT (rule_id, event_key, bucket_key) DO NOTHING
      RETURNING rule_id
    `,
    [ruleId, eventKey, bucketKey],
  );
  return result.rowCount > 0;
}

async function listActiveRules(client, organizationId, type) {
  const params = [organizationId];
  const typeFilter = type ? "AND type = $2" : "";
  if (type) params.push(type);

  const result = await client.query(
    `
      SELECT id, name, type, condition, condition_json, severity, priority, frequency,
             channels, recipients, enabled, triggered_count, template_id, webhook_url,
             cooldown_minutes, quiet_hours_start, quiet_hours_end
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
    conditionJson: row.condition_json && typeof row.condition_json === "object" ? row.condition_json : {},
    severity: cleanString(row.severity),
    priority: cleanString(row.priority),
    frequency: cleanString(row.frequency),
    channels: Array.isArray(row.channels) ? row.channels : [],
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    templateId: cleanString(row.template_id),
    webhookUrl: cleanString(row.webhook_url),
    cooldownMinutes: row.cooldown_minutes,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
  }));
}

async function resolveRecipients(client, organizationId, recipients = []) {
  const tokens = [...new Set((recipients || []).map((item) => cleanString(item).toLowerCase()).filter(Boolean))];

  if (tokens.length < 1) {
    const admins = await client.query(
      `
        SELECT DISTINCT u.id, u.email
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = u.organization_id
        JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
        WHERE u.organization_id = $1
          AND u.is_active = true
          AND lower(r.name) = 'admin'
      `,
      [organizationId],
    );
    return {
      userIds: admins.rows.map((row) => row.id),
      emails: admins.rows.map((row) => cleanString(row.email)).filter(Boolean),
    };
  }

  const users = await client.query(
    `
      SELECT DISTINCT u.id, u.email
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

  const literalEmails = tokens.filter((token) => /.+@.+\..+/.test(token));

  if (users.rowCount > 0) {
    const dbEmails = users.rows.map((row) => cleanString(row.email)).filter(Boolean);
    return {
      userIds: users.rows.map((row) => row.id),
      emails: [...new Set([...dbEmails, ...literalEmails])],
    };
  }

  const fallback = await client.query(
    `
      SELECT DISTINCT u.id, u.email
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = u.organization_id
      JOIN roles r ON r.id = ur.role_id AND r.organization_id = ur.organization_id
      WHERE u.organization_id = $1
        AND u.is_active = true
        AND lower(r.name) = 'admin'
    `,
    [organizationId],
  );
  return {
    userIds: fallback.rows.map((row) => row.id),
    emails: [...new Set([
      ...fallback.rows.map((row) => cleanString(row.email)).filter(Boolean),
      ...literalEmails,
    ])],
  };
}

async function resolveTemplateForRule(client, organizationId, rule, defaultCode) {
  if (rule.templateId) {
    const direct = await getAdminAlertTemplate(organizationId, rule.templateId, client);
    if (direct) return direct;
  }
  if (defaultCode) {
    return getAdminAlertTemplateByCode(organizationId, defaultCode, client);
  }
  return null;
}

async function dispatchRule(client, organizationId, rule, event, defaultTemplateCode) {
  const eventKey = cleanString(event.eventKey);
  if (!eventKey) return 0;

  if (isInQuietHours(rule)) {
    logger.debug({ ruleId: rule.id }, "alert_skipped_quiet_hours");
    return 0;
  }

  const bucket = bucketKeyFor(rule.frequency, rule.cooldownMinutes);
  const slot = await reserveSlot(client, rule.id, eventKey, bucket);
  if (!slot) return 0;

  const template = await resolveTemplateForRule(client, organizationId, rule, defaultTemplateCode);
  const rendered = template
    ? renderTemplate(template, { ...(event.metadata || {}), eventKey })
    : { subject: "", body: "" };

  const title = cleanString(rendered.subject) || cleanString(event.title) || rule.name;
  const body = cleanString(rendered.body) || cleanString(event.message) || rule.condition;

  const { userIds, emails } = await resolveRecipients(client, organizationId, rule.recipients);

  const summary = await dispatchAcrossChannels(client, {
    organizationId, rule, event, userIds, emails, title, body,
  });

  const totalSent = (summary.inapp || 0) + (summary.email || 0) + (summary.webhook || 0);
  if (totalSent > 0) {
    await client.query(
      `
        UPDATE admin_alert_rules
        SET triggered_count = triggered_count + 1,
            last_triggered_at = now(),
            last_evaluated_at = now(),
            updated_at = now()
        WHERE id = $1 AND organization_id = $2
      `,
      [rule.id, organizationId],
    );
  } else {
    await client.query(
      `UPDATE admin_alert_rules SET last_evaluated_at = now() WHERE id = $1 AND organization_id = $2`,
      [rule.id, organizationId],
    );
  }

  return totalSent;
}

async function dispatchRules(client, organizationId, type, buildEvent, defaultTemplateCode) {
  const rules = await listActiveRules(client, organizationId, type);
  let count = 0;
  for (const rule of rules) {
    const event = await buildEvent(rule);
    if (!event) continue;
    count += await dispatchRule(client, organizationId, rule, event, defaultTemplateCode);
  }
  return count;
}

export async function evaluateRecordCreatedAlerts(client, actor, record) {
  await dispatchRules(
    client, actor.organizationId, "validation",
    () => ({
      eventKey: `record-validation:${record.id}`,
      title: `Registro pendiente de validación: ${record.activity || record.category}`,
      message: `${record.area || record.areaCode} registró ${record.value} ${record.unit} y requiere revisión administrativa.`,
      link: "/admin/registros",
      metadata: {
        recordId: record.id,
        areaCode: record.areaCode,
        campusCode: record.campusCode,
        activity: record.activity || record.category,
        value: record.value,
        unit: record.unit,
      },
    }),
    "validation-overdue",
  );

  const anomalyRules = await listActiveRules(client, actor.organizationId, "anomaly");
  if (anomalyRules.length < 1) return;

  const threshold = Math.max(...anomalyRules.map((rule) => percentFromRule(rule, 30)), 30);
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

  await dispatchRules(
    client, actor.organizationId, "anomaly",
    (rule) => ({
      eventKey: `record-anomaly:${record.id}:${rule.id}`,
      title: `Lectura fuera de rango en ${record.area || record.areaCode}`,
      message: `${record.activity || record.category} registró ${co2e.toFixed(3)} tCO2e contra promedio ${avg.toFixed(3)} tCO2e.`,
      link: "/admin/registros",
      metadata: {
        recordId: record.id,
        areaCode: record.areaCode,
        category: record.category,
        value: co2e.toFixed(3),
        average: avg.toFixed(3),
        delta: `${(((co2e - avg) / avg) * 100).toFixed(1)}%`,
      },
    }),
    "anomaly-detected",
  );
}

export async function evaluateDeviceReadingAlerts(client, device, reading, result) {
  const organizationId = device.organization_id;
  const batteryLevel = toNumber(reading.payload?.batteryLevel ?? reading.payload?.batteryPercent ?? reading.payload?.battery);

  if (batteryLevel !== null && batteryLevel <= 15) {
    await dispatchRules(
      client, organizationId, "device",
      () => ({
        eventKey: `device-battery:${device.id}:${Math.floor(Date.now() / 86400000)}`,
        title: `Batería crítica en ${device.code}`,
        message: `${device.name || device.code} reportó batería al ${batteryLevel}%.`,
        link: "/catalogos/dispositivos",
        metadata: {
          deviceId: device.id,
          deviceCode: device.code,
          deviceName: device.name || device.code,
          readingId: result.readingId,
          batteryLevel,
        },
      }),
    );
  }

  const anomalyRules = await listActiveRules(client, organizationId, "anomaly");
  if (anomalyRules.length < 1) return;

  const threshold = Math.max(...anomalyRules.map((rule) => percentFromRule(rule, 30)), 30);
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

  await dispatchRules(
    client, organizationId, "anomaly",
    (rule) => ({
      eventKey: `device-anomaly:${result.readingId}:${rule.id}`,
      title: `Lectura IoT anómala en ${device.code}`,
      message: `Delta ${deltaKwh.toFixed(2)} kWh contra promedio ${avg.toFixed(2)} kWh.`,
      link: "/catalogos/dispositivos",
      metadata: {
        deviceId: device.id,
        deviceCode: device.code,
        readingId: result.readingId,
        value: deltaKwh.toFixed(2),
        average: avg.toFixed(2),
      },
    }),
    "anomaly-detected",
  );
}

export async function evaluateFactorAlerts(client, actor, factor, action = "updated") {
  await dispatchRules(
    client, actor.organizationId, "factor",
    () => ({
      eventKey: `factor:${action}:${factor.id}`,
      title: `Factor de emisión ${action === "created" ? "creado" : "actualizado"}`,
      message: `${factor.scope}/${factor.category}/${factor.metric} quedó en ${factor.value} ${factor.numeratorUnit || "kgCO2e"}/${factor.denominatorUnit}.`,
      link: "/catalogos/factores",
      metadata: {
        factorId: factor.id,
        action,
        scope: factor.scope,
        category: factor.category,
        metric: factor.metric,
        value: factor.value,
      },
    }),
  );
}

export async function evaluateTargetAlerts(client, actor, target) {
  if (cleanString(target.status) !== "at_risk") return;
  await dispatchRules(
    client, actor.organizationId, "goal",
    () => ({
      eventKey: `goal-risk:${target.id}`,
      title: `Meta en riesgo: ${target.title}`,
      message: `La meta ${target.title} fue marcada en riesgo y requiere seguimiento.`,
      link: "/admin/metas",
      metadata: { targetId: target.id, title: target.title, status: target.status, targetEnd: target.targetEnd },
    }),
    "goal-risk",
  );
}

export async function evaluateSecurityLoginFailureAlerts(client, organizationId, context) {
  const rules = await listActiveRules(client, organizationId, "security");
  if (rules.length < 1) return 0;

  let total = 0;
  for (const rule of rules) {
    const windowMinutes = readCondition(rule, "minutes", 10);
    const threshold = Math.max(1, readCondition(rule, "attempts", 5));

    const countResult = await client.query(
      `
        SELECT count(*)::int AS attempts
        FROM admin_security_events
        WHERE organization_id = $1
          AND event_type = 'auth.login.failure'
          AND created_at >= now() - make_interval(secs => $2::int)
          AND ($3::text IS NULL OR lower(metadata->>'email') = $3::text)
      `,
      [organizationId, Math.round(windowMinutes * 60), context.email ? String(context.email).toLowerCase() : null],
    );
    const attempts = Number(countResult.rows[0]?.attempts || 0);
    if (attempts < threshold) continue;

    const event = {
      eventKey: `auth-failed:${context.email || "unknown"}:${Math.floor(Date.now() / (windowMinutes * 60_000))}`,
      title: `Intentos fallidos de inicio de sesión`,
      message: `Se detectaron ${attempts} intentos fallidos en los últimos ${windowMinutes} minutos${context.email ? ` para ${context.email}` : ""}.`,
      link: "/admin/seguridad",
      metadata: {
        email: context.email || "",
        attempts,
        windowMinutes,
        ipAddress: context.ipAddress || "",
      },
    };
    total += await dispatchRule(client, organizationId, rule, event, "security-login-failed");
  }
  return total;
}

export async function runScheduledAdminAlertChecksForOrganization(client, organizationId) {
  await dispatchRules(
    client, organizationId, "device",
    async (rule) => {
      const hours = hoursFromRule(rule, 24);
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
        message: `${row.name || row.code} no ha enviado lecturas en más de ${hours} horas.`,
        link: "/catalogos/dispositivos",
        metadata: {
          deviceId: row.id,
          deviceCode: row.code,
          deviceName: row.name || row.code,
          lastReadingAt: row.recorded_at,
          hours,
        },
      };
    },
    "device-offline",
  );

  await dispatchRules(
    client, organizationId, "validation",
    async (rule) => {
      const days = daysFromRule(rule, 5);
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
        message: `${row.activity_text} lleva más de ${days} días pendiente de validación.`,
        link: "/admin/validacion",
        metadata: { recordId: row.id, areaCode: row.area_code, createdAt: row.created_at, days },
      };
    },
    "validation-overdue",
  );

  await dispatchRules(
    client, organizationId, "factor",
    async () => {
      const expired = await client.query(
        `
          SELECT ef.id, es.code::text AS scope, ec.code AS category, m.code AS metric, ef.valid_to
          FROM emission_factors ef
          JOIN emission_scopes es ON es.id = ef.scope_id
          JOIN emission_categories ec ON ec.id = ef.category_id
          JOIN metrics m ON m.id = ef.metric_id
          WHERE ef.valid_to IS NOT NULL AND ef.valid_to < CURRENT_DATE
          ORDER BY ef.valid_to ASC
          LIMIT 1
        `,
      );
      const row = expired.rows[0];
      if (!row) return null;
      return {
        eventKey: `factor-expired:${row.id}:${Math.floor(Date.now() / 86400000)}`,
        title: "Factor de emisión vencido",
        message: `${row.scope}/${row.category}/${row.metric} venció el ${cleanString(row.valid_to).slice(0, 10)}.`,
        link: "/catalogos/factores",
        metadata: {
          factorId: row.id,
          scope: row.scope,
          category: row.category,
          metric: row.metric,
          validTo: cleanString(row.valid_to).slice(0, 10),
        },
      };
    },
    "factor-expired",
  );

  await dispatchRules(
    client, organizationId, "goal",
    async () => {
      const target = await client.query(
        `
          SELECT id, title, target_end FROM targets
          WHERE organization_id = $1 AND status = 'at_risk'
          ORDER BY target_end ASC LIMIT 1
        `,
        [organizationId],
      );
      const row = target.rows[0];
      if (!row) return null;
      return {
        eventKey: `goal-risk:${row.id}:${Math.floor(Date.now() / 86400000)}`,
        title: `Meta en riesgo: ${row.title}`,
        message: `La meta ${row.title} está marcada en riesgo.`,
        link: "/admin/metas",
        metadata: { targetId: row.id, title: row.title, targetEnd: cleanString(row.target_end).slice(0, 10) },
      };
    },
    "goal-risk",
  );

  await dispatchRules(
    client, organizationId, "period",
    async (rule) => {
      const days = daysFromRule(rule, 7);
      const tableCheck = await client.query(`SELECT to_regclass('public.admin_periods') AS table_name`);
      if (!tableCheck.rows[0]?.table_name) return null;
      const period = await client.query(
        `
          SELECT id, name, end_date FROM admin_periods
          WHERE organization_id = $1
            AND end_date >= CURRENT_DATE
            AND end_date <= CURRENT_DATE + make_interval(secs => $2::int)
          ORDER BY end_date ASC LIMIT 1
        `,
        [organizationId, Math.round(days * 86400)],
      );
      const row = period.rows[0];
      if (!row) return null;
      return {
        eventKey: `period-closing:${row.id}:${Math.floor(Date.now() / 86400000)}`,
        title: `Periodo próximo a cerrar: ${row.name}`,
        message: `${row.name} cierra el ${cleanString(row.end_date).slice(0, 10)}.`,
        link: "/admin/periodos",
        metadata: { periodId: row.id, periodName: row.name, endDate: cleanString(row.end_date).slice(0, 10), days },
      };
    },
    "period-closing",
  );
}

// Compat con la firma vieja: actor.organizationId
export async function runScheduledAdminAlertChecks(client, actor) {
  return runScheduledAdminAlertChecksForOrganization(client, actor.organizationId);
}
