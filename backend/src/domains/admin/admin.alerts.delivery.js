import { env } from "../../shared/config/env.js";
import { logger } from "../../shared/logger/index.js";
import { buildEmailHtmlFromBody, isResendConfigured, sendResendEmail } from "../../shared/email/resend-client.js";

function cleanString(value) { return String(value ?? "").trim(); }

function buildAbsoluteLink(link) {
  const value = cleanString(link);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = cleanString(env.ALERTS_APP_URL).replace(/\/$/, "");
  if (!base) return value;
  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function recordDelivery(client, payload) {
  const sentAt = payload.status === "sent" ? new Date() : null;
  await client.query(
    `
      INSERT INTO admin_alert_deliveries (
        organization_id, rule_id, notification_id, user_id, channel, recipient,
        status, provider_message_id, error, attempts, event_key, metadata, sent_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
    `,
    [
      payload.organizationId,
      payload.ruleId || null,
      payload.notificationId || null,
      payload.userId || null,
      payload.channel,
      payload.recipient || null,
      payload.status,
      payload.providerMessageId || null,
      payload.error || null,
      payload.attempts || 1,
      payload.eventKey || null,
      JSON.stringify(payload.metadata || {}),
      sentAt,
    ],
  );
}

async function deliverInAppForUser(client, payload) {
  const { organizationId, userId, rule, event, title, body } = payload;

  const inserted = await client.query(
    `
      INSERT INTO notifications (
        organization_id, user_id, status, type, title, message, metadata, read_at
      )
      VALUES ($1,$2,'unread','system',$3,$4,$5::jsonb,NULL)
      RETURNING id
    `,
    [
      organizationId,
      userId,
      title,
      body || null,
      JSON.stringify({
        ...(event.metadata || {}),
        link: cleanString(event.link),
        alertRuleId: rule.id,
        alertRuleName: rule.name,
        alertType: rule.type,
        alertSeverity: rule.severity,
        alertPriority: rule.priority,
        alertFrequency: rule.frequency,
        eventKey: event.eventKey,
        channel: "inapp",
        channels: rule.channels,
      }),
    ],
  );

  const notificationId = inserted.rows[0]?.id || null;
  await recordDelivery(client, {
    organizationId,
    ruleId: rule.id,
    notificationId,
    userId,
    channel: "inapp",
    recipient: userId,
    status: "sent",
    eventKey: event.eventKey,
    metadata: { title },
  });
  return { notificationId };
}

async function deliverEmail(client, payload) {
  const { organizationId, rule, event, title, body, emails } = payload;
  if (!Array.isArray(emails) || emails.length < 1) return;

  if (!isResendConfigured()) {
    await recordDelivery(client, {
      organizationId,
      ruleId: rule.id,
      channel: "email",
      recipient: emails.join(","),
      status: "skipped",
      error: "resend_not_configured",
      eventKey: event.eventKey,
      metadata: { recipients: emails },
    });
    return;
  }

  const absoluteLink = buildAbsoluteLink(event.link);
  const html = buildEmailHtmlFromBody(body || "", { title, link: absoluteLink });
  const result = await sendResendEmail({
    to: emails,
    subject: title,
    html,
    text: body,
  });

  await recordDelivery(client, {
    organizationId,
    ruleId: rule.id,
    channel: "email",
    recipient: emails.join(","),
    status: result.ok ? "sent" : (result.skipped ? "skipped" : "failed"),
    providerMessageId: result.id || null,
    error: result.ok ? null : (result.error || result.reason || null),
    eventKey: event.eventKey,
    metadata: { recipients: emails, link: absoluteLink },
  });

  if (!result.ok && !result.skipped) {
    await client.query(
      `UPDATE admin_alert_rules SET delivery_failures = delivery_failures + 1 WHERE id = $1`,
      [rule.id],
    );
  }
}

async function deliverWebhook(client, payload) {
  const { organizationId, rule, event, title, body } = payload;
  const url = cleanString(rule.webhookUrl);
  if (!url) return;

  let httpStatus = 0;
  let errorMessage = null;
  let providerMessageId = null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, env.ALERTS_WEBHOOK_TIMEOUT_MS));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "CarbonTrack-Alerts/1" },
      body: JSON.stringify({
        rule: { id: rule.id, name: rule.name, type: rule.type, severity: rule.severity, priority: rule.priority },
        event: {
          eventKey: event.eventKey,
          title,
          message: body,
          link: buildAbsoluteLink(event.link),
          metadata: event.metadata || {},
        },
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    httpStatus = response.status;
    providerMessageId = response.headers.get("x-request-id") || null;
    if (!response.ok) {
      errorMessage = `HTTP ${response.status}`;
    }
  } catch (error) {
    errorMessage = error?.message || "webhook_failed";
    logger.warn({ url, err: errorMessage }, "alert_webhook_failed");
  } finally {
    clearTimeout(timeout);
  }

  await recordDelivery(client, {
    organizationId,
    ruleId: rule.id,
    channel: "webhook",
    recipient: url,
    status: errorMessage ? "failed" : "sent",
    providerMessageId,
    error: errorMessage,
    eventKey: event.eventKey,
    metadata: { httpStatus },
  });

  if (errorMessage) {
    await client.query(
      `UPDATE admin_alert_rules SET delivery_failures = delivery_failures + 1 WHERE id = $1`,
      [rule.id],
    );
  }
}

export async function dispatchAcrossChannels(client, context) {
  const { organizationId, rule, event, userIds, emails, title, body } = context;

  const summary = { inapp: 0, email: 0, webhook: 0, sms: 0, push: 0 };

  for (const channel of rule.channels) {
    if (channel === "inapp") {
      for (const userId of userIds || []) {
        try {
          await deliverInAppForUser(client, { organizationId, userId, rule, event, title, body });
          summary.inapp += 1;
        } catch (error) {
          logger.warn({ err: error?.message, ruleId: rule.id }, "alert_inapp_failed");
          await recordDelivery(client, {
            organizationId,
            ruleId: rule.id,
            userId,
            channel: "inapp",
            recipient: userId,
            status: "failed",
            error: error?.message || "inapp_failed",
            eventKey: event.eventKey,
            metadata: { title },
          });
        }
      }
    } else if (channel === "email") {
      await deliverEmail(client, { organizationId, rule, event, title, body, emails });
      summary.email += (emails || []).length;
    } else if (channel === "webhook") {
      await deliverWebhook(client, { organizationId, rule, event, title, body });
      summary.webhook += 1;
    } else if (channel === "sms" || channel === "push") {
      // Canales aún no integrados: queda registro como "skipped" para visibilidad.
      await recordDelivery(client, {
        organizationId,
        ruleId: rule.id,
        channel,
        recipient: null,
        status: "skipped",
        error: `${channel}_provider_not_configured`,
        eventKey: event.eventKey,
        metadata: { title },
      });
    }
  }

  return summary;
}
