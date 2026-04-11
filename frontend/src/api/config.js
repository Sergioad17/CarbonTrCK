const rawApiUrl = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").trim();

export const API_URL = rawApiUrl.replace(/\/+$/, "");

export function isBackendConfigured() {
  return Boolean(API_URL);
}

export function assertBackendConfigured() {
  if (isBackendConfigured()) {
    return API_URL;
  }

  const error = new Error("backend_not_configured");
  error.code = "backend_not_configured";
  throw error;
}
