export const STORAGE_KEYS = {
  records: "carbontrack.records",
  activity: "carbontrack.activity",
  devices: "carbontrack.devices",
  deviceLastTotal: "carbontrack.device_last_total",
  factors: "carbontrack.factors",
  equipment: "carbontrack.equipment",
  users: "carbontrack.users",
  roles: "carbontrack.roles",
  targets: "carbontrack.targets",
  actions: "carbontrack.actions",
  settings: "carbontrack.settings",
};

export function safeReadJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeWriteJson(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
