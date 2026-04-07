/* Este archivo se conserva como puente de compatibilidad.
La lógica real del tema y settings vive en src/BackgroundSettings/settingsStore.js,
pero seguimos reexportando desde aquí para no romper imports existentes del sistema. */


export {
  DEFAULT_SETTINGS,
  resolveTheme,
  normalizeSettings,
  getSettings,
  saveSettings,
  applyTheme,
  applySettings,
  resetSettings,
  startSettingsSync,
} from "../BackgroundSettings/settingsStore";
