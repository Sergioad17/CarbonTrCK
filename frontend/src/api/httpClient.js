import { API_URL, isBackendConfigured } from "./config";
import { fetchSession, persistSession, removeSession } from "./session";

function buildUrl(path) {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path || ""}`;
  return `${API_URL}${normalizedPath}`;
}

async function parsePayload(response) {
  try {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    return null;
  }
}

function buildHeaders(options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const authEnabled = options.auth !== false;
  const session = authEnabled ? fetchSession() : null;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (authEnabled && session?.token && !headers.Authorization) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return headers;
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await parsePayload(response);

  if (!response.ok) {
    return null;
  }

  const session = fetchSession();
  const nextSession = {
    ...session,
    ...(payload?.data || payload),
    token: payload?.token || payload?.accessToken || payload?.data?.token || payload?.data?.accessToken || null,
    refreshToken:
      payload?.refreshToken || payload?.data?.refreshToken || session?.refreshToken || null,
  };

  if (!nextSession?.token) {
    return null;
  }

  persistSession(nextSession);
  return nextSession;
}

export async function apiRequest(path, options = {}) {
  if (!isBackendConfigured()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const { auth: _auth, ...requestOptions } = options;
  const executeRequest = () =>
    fetch(buildUrl(path), {
      ...requestOptions,
      headers: buildHeaders(options),
    });

  let response = await executeRequest();
  const session = options.auth === false ? null : fetchSession();

  if (response.status === 401 && session?.refreshToken) {
    const refreshedSession = await refreshAccessToken(session.refreshToken);
    if (refreshedSession?.token) {
      response = await executeRequest();
    } else {
      removeSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("carbontrack:session-expired"));
      }
    }
  } else if (response.status === 401 && session?.token && options.auth !== false) {
    removeSession();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("carbontrack:session-expired"));
    }
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || "request_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
