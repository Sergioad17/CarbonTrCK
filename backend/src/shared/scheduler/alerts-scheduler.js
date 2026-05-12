import { env } from "../config/env.js";
import { logger } from "../logger/index.js";
import { withTransaction } from "../db/pool.js";
import { runScheduledAdminAlertChecksForOrganization } from "../../domains/admin/admin.alerts-engine.js";

let timer = null;
let running = false;

function parseCronToMinutes(expr) {
  // Soporta `*/N * * * *` y devuelve N minutos. Fallback: 5 min.
  const trimmed = String(expr || "").trim();
  const match = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (match) {
    const minutes = Number(match[1]);
    if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440) return minutes;
  }
  if (/^\d+$/.test(trimmed)) {
    const minutes = Number(trimmed);
    if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440) return minutes;
  }
  return 5;
}

async function runOneTick() {
  if (running) {
    logger.debug("alerts_scheduler_tick_skipped_overlap");
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    await withTransaction(async (client) => {
      const orgs = await client.query(`SELECT id FROM organizations`);
      for (const row of orgs.rows) {
        try {
          await runScheduledAdminAlertChecksForOrganization(client, row.id);
        } catch (orgError) {
          logger.warn({ err: orgError?.message, organizationId: row.id }, "alerts_scheduler_org_failed");
        }
      }

      const retentionDays = Math.max(1, Number(env.ALERTS_DEDUPE_RETENTION_DAYS) || 30);
      await client.query(
        `DELETE FROM admin_alert_dedupe WHERE created_at < now() - make_interval(secs => $1::int)`,
        [retentionDays * 86_400],
      );
    });
    logger.info({ ms: Date.now() - startedAt }, "alerts_scheduler_tick_completed");
  } catch (error) {
    logger.error({ err: error?.message }, "alerts_scheduler_tick_failed");
  } finally {
    running = false;
  }
}

export function startAlertsScheduler() {
  if (timer) return;
  if (!env.ALERTS_SCHEDULER_ENABLED) {
    logger.info("alerts_scheduler_disabled_by_env");
    return;
  }
  const minutes = parseCronToMinutes(env.ALERTS_SCHEDULER_CRON);
  logger.info({ minutes }, "alerts_scheduler_started");
  setTimeout(() => {
    runOneTick().catch(() => {});
    timer = setInterval(() => { runOneTick().catch(() => {}); }, minutes * 60_000);
  }, 30_000);
}

export function stopAlertsScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export async function runAlertsSchedulerNow() {
  await runOneTick();
}
