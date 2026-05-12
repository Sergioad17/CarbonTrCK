import { env } from "../config/env.js";
import { logger } from "../logger/index.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function isConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

export function isResendConfigured() {
  return isConfigured();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(text) {
  const safe = escapeHtml(text);
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;color:#1E293B;white-space:pre-wrap;">${safe}</div>`;
}

export async function sendResendEmail({ to, subject, html, text, replyTo }) {
  if (!isConfigured()) {
    return { ok: false, skipped: true, reason: "resend_not_configured" };
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length < 1) {
    return { ok: false, skipped: true, reason: "no_recipients" };
  }

  const payload = {
    from: env.RESEND_FROM_EMAIL,
    to: recipients,
    subject: String(subject || "Notificación CarbonTrack").slice(0, 200),
    html: html || plainTextToHtml(text || ""),
    text: text || undefined,
  };

  const finalReplyTo = replyTo || env.RESEND_REPLY_TO;
  if (finalReplyTo) payload.reply_to = finalReplyTo;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    let parsed = null;
    try { parsed = bodyText ? JSON.parse(bodyText) : null; } catch { parsed = null; }

    if (!response.ok) {
      logger.warn({ status: response.status, body: parsed || bodyText }, "resend_email_failed");
      return {
        ok: false,
        skipped: false,
        status: response.status,
        error: parsed?.message || parsed?.error || bodyText || `HTTP ${response.status}`,
      };
    }
    return { ok: true, id: parsed?.id || null };
  } catch (error) {
    logger.warn({ err: error?.message }, "resend_email_exception");
    return { ok: false, skipped: false, error: error?.message || "resend_request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildEmailHtmlFromBody(body, { title, link } = {}) {
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  const safeTitle = escapeHtml(title || "");
  const safeLink = link ? escapeHtml(link) : "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#22C55E,#15803D);padding:18px 22px;color:#FFFFFF;font-size:15px;font-weight:700;">CarbonTrack · Alertas</td></tr>
        ${safeTitle ? `<tr><td style="padding:20px 22px 6px;font-size:18px;font-weight:700;color:#0F172A;">${safeTitle}</td></tr>` : ""}
        <tr><td style="padding:6px 22px 18px;font-size:14px;line-height:1.6;color:#1E293B;">${safeBody}</td></tr>
        ${safeLink ? `<tr><td style="padding:0 22px 22px;"><a href="${safeLink}" style="display:inline-block;background:#22C55E;color:#FFFFFF;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Ver detalle</a></td></tr>` : ""}
        <tr><td style="padding:14px 22px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:11px;color:#64748B;">Recibiste este correo porque tu rol o regla de alertas en CarbonTrack lo solicita.</td></tr>
      </table>
    </td></tr>
  </table>`;
}
