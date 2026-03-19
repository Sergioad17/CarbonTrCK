import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const SETTINGS_KEY = STORAGE_KEYS.settings;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const ALLOWED_INTERVALS = [60, 300, 900, 3600];
const ALLOWED_THEMES = ["light", "dark", "system"];
const ALLOWED_DATE_FORMATS = ["DD/MM/YYYY", "YYYY-MM-DD"];
const ALLOWED_CO2_UNITS = ["kg", "t"];

export const DEFAULT_SETTINGS = {
  theme: "light",
  ui: {
    reducedMotion: false,
    denseMode: false,
    showTooltips: true,
  },
  locale: {
    language: "es-MX",
    timezone: "America/Monterrey",
    dateFormat: "DD/MM/YYYY",
  },
  units: {
    co2e: "t",
    electricity: "kWh",
    fuel: "L",
  },
  rounding: {
    co2eDecimals: 3,
    activityDecimals: 2,
  },
  defaults: {
    assumedVoltageVrms: 127,
    assumedPowerFactor: 0.9,
    defaultIntervalSeconds: 900,
    defaultElectricityEF: null,
    defaultFuelEF: null,
  },
  storage: {
    autoBackupEnabled: false,
    autoBackupMax: 5,
  },
  updatedAt: new Date().toISOString(),
};

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

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(theme = DEFAULT_SETTINGS.theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

export function normalizeSettings(input = {}) {
  const ui = input?.ui || {};
  const locale = input?.locale || {};
  const units = input?.units || {};
  const rounding = input?.rounding || {};
  const defaults = input?.defaults || {};
  const storage = input?.storage || {};

  return {
    theme: ALLOWED_THEMES.includes(input?.theme) ? input.theme : DEFAULT_SETTINGS.theme,
    ui: {
      reducedMotion: Boolean(ui.reducedMotion),
      denseMode: Boolean(ui.denseMode),
      showTooltips: typeof ui.showTooltips === "boolean" ? ui.showTooltips : DEFAULT_SETTINGS.ui.showTooltips,
    },
    locale: {
      language: String(locale.language || DEFAULT_SETTINGS.locale.language),
      timezone: String(locale.timezone || DEFAULT_SETTINGS.locale.timezone),
      dateFormat: ALLOWED_DATE_FORMATS.includes(locale.dateFormat) ? locale.dateFormat : DEFAULT_SETTINGS.locale.dateFormat,
    },
    units: {
      co2e: ALLOWED_CO2_UNITS.includes(units.co2e) ? units.co2e : DEFAULT_SETTINGS.units.co2e,
      electricity: String(units.electricity || DEFAULT_SETTINGS.units.electricity),
      fuel: String(units.fuel || DEFAULT_SETTINGS.units.fuel),
    },
    rounding: {
      co2eDecimals: clamp(rounding.co2eDecimals, 0, 4, DEFAULT_SETTINGS.rounding.co2eDecimals),
      activityDecimals: clamp(rounding.activityDecimals, 0, 4, DEFAULT_SETTINGS.rounding.activityDecimals),
    },
    defaults: {
      assumedVoltageVrms: Math.max(1, clamp(defaults.assumedVoltageVrms, 1, 1000, DEFAULT_SETTINGS.defaults.assumedVoltageVrms)),
      assumedPowerFactor: clamp(defaults.assumedPowerFactor, 0, 1, DEFAULT_SETTINGS.defaults.assumedPowerFactor),
      defaultIntervalSeconds: ALLOWED_INTERVALS.includes(Number(defaults.defaultIntervalSeconds))
        ? Number(defaults.defaultIntervalSeconds)
        : DEFAULT_SETTINGS.defaults.defaultIntervalSeconds,
      defaultElectricityEF: normalizeNullableNumber(defaults.defaultElectricityEF),
      defaultFuelEF: normalizeNullableNumber(defaults.defaultFuelEF),
    },
    storage: {
      autoBackupEnabled: Boolean(storage.autoBackupEnabled),
      autoBackupMax: clamp(storage.autoBackupMax, 1, 20, DEFAULT_SETTINGS.storage.autoBackupMax),
    },
    updatedAt: String(input?.updatedAt || new Date().toISOString()),
  };
}

export function getSettings() {
  const stored = safeReadJson(SETTINGS_KEY, null);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...stored });
}

export function saveSettings(nextSettings) {
  const normalized = normalizeSettings({
    ...getSettings(),
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  });
  safeWriteJson(SETTINGS_KEY, normalized);
  applySettings(normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:settings-changed", { detail: normalized }));
  }
  return normalized;
}

export function applyTheme(theme = DEFAULT_SETTINGS.theme) {
  if (typeof document === "undefined") return resolveTheme(theme);
  const root = document.documentElement;
  const effectiveTheme = resolveTheme(theme);
  root.dataset.theme = effectiveTheme;
  root.dataset.themePreference = theme;
  return effectiveTheme;
}

export function applySettings(settingsInput) {
  const settings = normalizeSettings(settingsInput);
  if (typeof document === "undefined") return settings;
  const root = document.documentElement;
  applyTheme(settings.theme);
  root.dataset.density = settings.ui.denseMode ? "dense" : "comfortable";
  root.dataset.motion = settings.ui.reducedMotion ? "reduced" : "full";
  root.dataset.tooltips = settings.ui.showTooltips ? "on" : "off";
  return settings;
}

export function resetSettings() {
  return saveSettings(DEFAULT_SETTINGS);
}

let cleanupSync = null;

export function startSettingsSync() {
  if (typeof window === "undefined") return () => {};
  if (cleanupSync) return cleanupSync;

  const media = typeof window.matchMedia === "function" ? window.matchMedia(SYSTEM_THEME_QUERY) : null;

  const syncFromStorage = () => {
    applySettings(getSettings());
  };

  const syncSystemTheme = () => {
    const settings = getSettings();
    if (settings.theme === "system") applyTheme("system");
  };

  syncFromStorage();

  window.addEventListener("storage", syncFromStorage);
  window.addEventListener("carbontrack:settings-changed", syncFromStorage);
  if (media?.addEventListener) media.addEventListener("change", syncSystemTheme);
  else if (media?.addListener) media.addListener(syncSystemTheme);

  cleanupSync = () => {
    window.removeEventListener("storage", syncFromStorage);
    window.removeEventListener("carbontrack:settings-changed", syncFromStorage);
    if (media?.removeEventListener) media.removeEventListener("change", syncSystemTheme);
    else if (media?.removeListener) media.removeListener(syncSystemTheme);
    cleanupSync = null;
  };

  return cleanupSync;
}
