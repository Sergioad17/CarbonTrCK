import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const SETTINGS_ENUMS = Object.freeze({
  themes: Object.freeze(["light", "dark", "system"]),
  dateFormats: Object.freeze(["DD/MM/YYYY", "YYYY-MM-DD"]),
  co2eUnits: Object.freeze(["kg", "t"]),
  defaultIntervalSeconds: Object.freeze([60, 300, 900, 3600]),
});

const ALLOWED_THEMES = new Set(SETTINGS_ENUMS.themes);
const ALLOWED_DATE_FORMATS = new Set(SETTINGS_ENUMS.dateFormats);
const ALLOWED_CO2_UNITS = new Set(SETTINGS_ENUMS.co2eUnits);
const ALLOWED_INTERVALS = new Set(SETTINGS_ENUMS.defaultIntervalSeconds);

/**
 * Shared backend/frontend settings contract.
 *
 * Keep this aligned with `frontend/src/BackgroundSettings/settingsStore.js`.
 * The frontend consumes this exact top-level shape plus `updatedAt`.
 *
 * Expected sections:
 * - `theme`: enum from SETTINGS_ENUMS.themes
 * - `ui`: reducedMotion, denseMode, showTooltips
 * - `locale`: language, timezone, dateFormat enum
 * - `units`: co2e enum, electricity, fuel
 * - `rounding`: co2eDecimals, activityDecimals
 * - `defaults`: assumedVoltageVrms, assumedPowerFactor, defaultIntervalSeconds enum,
 *   defaultElectricityEF, defaultFuelEF
 * - `storage`: autoBackupEnabled, autoBackupMax
 *
 * Normalization rules:
 * - missing sections are hydrated from `DEFAULT_SETTINGS`
 * - invalid enums reject writes with 422, but persisted reads fall back safely
 * - nullable emission factors stay `null` when absent/blank/invalid
 * - `updatedAt` is response-only and preserved for the frontend contract
 */
const DEFAULT_SETTINGS = Object.freeze({
  theme: "light",
  ui: { reducedMotion: false, denseMode: false, showTooltips: true },
  locale: { language: "es-MX", timezone: "America/Monterrey", dateFormat: "DD/MM/YYYY" },
  units: { co2e: "t", electricity: "kWh", fuel: "L" },
  rounding: { co2eDecimals: 3, activityDecimals: 2 },
  defaults: {
    assumedVoltageVrms: 127,
    assumedPowerFactor: 0.9,
    defaultIntervalSeconds: 900,
    defaultElectricityEF: null,
    defaultFuelEF: null,
  },
  storage: { autoBackupEnabled: false, autoBackupMax: 5 },
});

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeNullableNumber(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensurePlainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid object.`, details: { field } });
  }
  return value;
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

function normalizeSettingsInput(input = {}) {
  const source = ensurePlainObject(input, "settings");
  const ui = source.ui && typeof source.ui === "object" && !Array.isArray(source.ui) ? source.ui : {};
  const locale = source.locale && typeof source.locale === "object" && !Array.isArray(source.locale) ? source.locale : {};
  const units = source.units && typeof source.units === "object" && !Array.isArray(source.units) ? source.units : {};
  const rounding = source.rounding && typeof source.rounding === "object" && !Array.isArray(source.rounding) ? source.rounding : {};
  const defaults = source.defaults && typeof source.defaults === "object" && !Array.isArray(source.defaults) ? source.defaults : {};
  const storage = source.storage && typeof source.storage === "object" && !Array.isArray(source.storage) ? source.storage : {};

  const theme = cleanString(source.theme || DEFAULT_SETTINGS.theme);
  if (!ALLOWED_THEMES.has(theme)) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "theme is invalid.", details: { field: "theme" } });

  const timezone = cleanString(locale.timezone || DEFAULT_SETTINGS.locale.timezone);
  if (!timezone || timezone.length > 100) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "locale.timezone is invalid.", details: { field: "locale.timezone" } });
  }

  const dateFormat = cleanString(locale.dateFormat || DEFAULT_SETTINGS.locale.dateFormat);
  if (!ALLOWED_DATE_FORMATS.has(dateFormat)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "locale.dateFormat is invalid.", details: { field: "locale.dateFormat" } });
  }

  const co2eUnit = cleanString(units.co2e || DEFAULT_SETTINGS.units.co2e);
  if (!ALLOWED_CO2_UNITS.has(co2eUnit)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "units.co2e is invalid.", details: { field: "units.co2e" } });
  }

  const interval = Number(defaults.defaultIntervalSeconds ?? DEFAULT_SETTINGS.defaults.defaultIntervalSeconds);
  if (!ALLOWED_INTERVALS.has(interval)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "defaults.defaultIntervalSeconds is invalid.", details: { field: "defaults.defaultIntervalSeconds" } });
  }

  return {
    theme,
    ui: {
      reducedMotion: Boolean(ui.reducedMotion),
      denseMode: Boolean(ui.denseMode),
      showTooltips: typeof ui.showTooltips === "boolean" ? ui.showTooltips : DEFAULT_SETTINGS.ui.showTooltips,
    },
    locale: {
      language: cleanString(locale.language || DEFAULT_SETTINGS.locale.language) || DEFAULT_SETTINGS.locale.language,
      timezone,
      dateFormat,
    },
    units: {
      co2e: co2eUnit,
      electricity: cleanString(units.electricity || DEFAULT_SETTINGS.units.electricity) || DEFAULT_SETTINGS.units.electricity,
      fuel: cleanString(units.fuel || DEFAULT_SETTINGS.units.fuel) || DEFAULT_SETTINGS.units.fuel,
    },
    rounding: {
      co2eDecimals: clamp(rounding.co2eDecimals, 0, 4, DEFAULT_SETTINGS.rounding.co2eDecimals),
      activityDecimals: clamp(rounding.activityDecimals, 0, 4, DEFAULT_SETTINGS.rounding.activityDecimals),
    },
    defaults: {
      assumedVoltageVrms: Math.max(1, clamp(defaults.assumedVoltageVrms, 1, 1000, DEFAULT_SETTINGS.defaults.assumedVoltageVrms)),
      assumedPowerFactor: clamp(defaults.assumedPowerFactor, 0, 1, DEFAULT_SETTINGS.defaults.assumedPowerFactor),
      defaultIntervalSeconds: interval,
      defaultElectricityEF: normalizeNullableNumber(defaults.defaultElectricityEF),
      defaultFuelEF: normalizeNullableNumber(defaults.defaultFuelEF),
    },
    storage: {
      autoBackupEnabled: Boolean(storage.autoBackupEnabled),
      autoBackupMax: clamp(storage.autoBackupMax, 1, 20, DEFAULT_SETTINGS.storage.autoBackupMax),
    },
  };
}

function buildSettingsShape(row) {
  const locale = row?.locale && typeof row.locale === "object" ? row.locale : {};
  const ui = row?.ui && typeof row.ui === "object" ? row.ui : {};
  const units = row?.units && typeof row.units === "object" ? row.units : {};
  const defaults = row?.defaults && typeof row.defaults === "object" ? row.defaults : {};
  const rounding = row?.rounding && typeof row.rounding === "object" ? row.rounding : {};
  const storage = row?.storage && typeof row.storage === "object" ? row.storage : {};

  return {
    ...DEFAULT_SETTINGS,
    theme: cleanString(row?.theme || DEFAULT_SETTINGS.theme),
    locale: {
      ...DEFAULT_SETTINGS.locale,
      ...locale,
      language: cleanString(locale.language || DEFAULT_SETTINGS.locale.language) || DEFAULT_SETTINGS.locale.language,
      timezone: cleanString(locale.timezone || DEFAULT_SETTINGS.locale.timezone) || DEFAULT_SETTINGS.locale.timezone,
      dateFormat: cleanString(locale.dateFormat || DEFAULT_SETTINGS.locale.dateFormat) || DEFAULT_SETTINGS.locale.dateFormat,
    },
    ui: {
      ...DEFAULT_SETTINGS.ui,
      reducedMotion: Boolean(ui.reducedMotion),
      denseMode: Boolean(ui.denseMode),
      showTooltips: typeof ui.showTooltips === "boolean" ? ui.showTooltips : DEFAULT_SETTINGS.ui.showTooltips,
    },
    units: {
      ...DEFAULT_SETTINGS.units,
      co2e: cleanString(units.co2e || DEFAULT_SETTINGS.units.co2e) || DEFAULT_SETTINGS.units.co2e,
      electricity: cleanString(units.electricity || DEFAULT_SETTINGS.units.electricity) || DEFAULT_SETTINGS.units.electricity,
      fuel: cleanString(units.fuel || DEFAULT_SETTINGS.units.fuel) || DEFAULT_SETTINGS.units.fuel,
    },
    rounding: {
      co2eDecimals: clamp(rounding.co2eDecimals, 0, 4, DEFAULT_SETTINGS.rounding.co2eDecimals),
      activityDecimals: clamp(rounding.activityDecimals, 0, 4, DEFAULT_SETTINGS.rounding.activityDecimals),
    },
    defaults: {
      assumedVoltageVrms: Math.max(1, clamp(defaults.assumedVoltageVrms, 1, 1000, DEFAULT_SETTINGS.defaults.assumedVoltageVrms)),
      assumedPowerFactor: clamp(defaults.assumedPowerFactor, 0, 1, DEFAULT_SETTINGS.defaults.assumedPowerFactor),
      defaultIntervalSeconds: ALLOWED_INTERVALS.has(Number(defaults.defaultIntervalSeconds)) ? Number(defaults.defaultIntervalSeconds) : DEFAULT_SETTINGS.defaults.defaultIntervalSeconds,
      defaultElectricityEF: normalizeNullableNumber(defaults.defaultElectricityEF),
      defaultFuelEF: normalizeNullableNumber(defaults.defaultFuelEF),
    },
    storage: {
      autoBackupEnabled: Boolean(storage.autoBackupEnabled),
      autoBackupMax: clamp(storage.autoBackupMax, 1, 20, DEFAULT_SETTINGS.storage.autoBackupMax),
    },
    updatedAt: row?.updated_at || new Date().toISOString(),
  };
}

async function getSettingsRow(actor, client = { query }) {
  const result = await client.query(
    `
      SELECT id, theme, locale, ui, units, defaults, rounding, storage, updated_at
      FROM user_settings
      WHERE user_id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [actor.id, actor.organizationId],
  );
  return result.rows[0] || null;
}

export async function getSettings(actor, auditContext) {
  return withTransaction(async (client) => {
    const settings = buildSettingsShape(await getSettingsRow(actor, client));
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { theme: settings.theme, language: settings.locale.language }),
      eventType: "settings.read",
      entityType: "user_settings",
      entityId: actor.id,
    });
    return settings;
  });
}

export async function upsertSettings(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const normalized = normalizeSettingsInput(payload);
    const result = await client.query(
      `
        INSERT INTO user_settings (
          organization_id, user_id, theme, locale, ui, units, defaults, rounding, storage
        )
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          theme = EXCLUDED.theme,
          locale = EXCLUDED.locale,
          ui = EXCLUDED.ui,
          units = EXCLUDED.units,
          defaults = EXCLUDED.defaults,
          rounding = EXCLUDED.rounding,
          storage = EXCLUDED.storage
        RETURNING id, theme, locale, ui, units, defaults, rounding, storage, updated_at
      `,
      [
        actor.organizationId,
        actor.id,
        normalized.theme,
        JSON.stringify(normalized.locale),
        JSON.stringify(normalized.ui),
        JSON.stringify(normalized.units),
        JSON.stringify(normalized.defaults),
        JSON.stringify(normalized.rounding),
        JSON.stringify(normalized.storage),
      ],
    );

    const settings = buildSettingsShape(result.rows[0]);
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        theme: settings.theme,
        locale: settings.locale,
        units: settings.units,
        defaults: { defaultIntervalSeconds: settings.defaults.defaultIntervalSeconds },
      }),
      eventType: "settings.update",
      entityType: "user_settings",
      entityId: actor.id,
    });
    return settings;
  });
}
