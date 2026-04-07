const rawApiUrl = String(import.meta.env.VITE_API_URL || "").trim();
const rawLocalMode = String(import.meta.env.VITE_LOCAL_MODE || "").trim().toLowerCase();

export const API_URL = rawApiUrl.replace(/\/+$/, "");
export const LOCAL_MODE = rawLocalMode === "true" || rawLocalMode === "1";
export const BACKEND_MODE = Boolean(API_URL) && !LOCAL_MODE;

export function isBackendConfigured() {
  return BACKEND_MODE;
}

export function isLocalMode() {
  return LOCAL_MODE;
}
