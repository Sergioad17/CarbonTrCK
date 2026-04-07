import { hydrateCurrentUser } from "./auth";
import { apiRequest } from "./httpClient";
import { isBackendConfigured } from "./config";
import { createNotification } from "./notifications";
import { createProfileChangeRequest, fetchProfileChangeRequests, subscribeProfileChangeRequests } from "./profileRequests";
import { fetchSettings, persistSettings } from "./settings";
import { saveUser } from "./users";
import { clearSession, getCurrentUser, getSession, updateCurrentUser } from "../lib/sessionStore";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export async function fetchProfilePageData(user) {
  const session = getSession();

  if (!session) {
    return {
      session: null,
      profile: user || null,
      settings: fetchSettings(),
      requests: fetchProfileChangeRequests(),
    };
  }

  const profile = isBackendConfigured()
    ? (await hydrateCurrentUser().catch(() => null)) || user || null
    : getCurrentUser() || user || null;

  return {
    session: getSession() || session,
    profile,
    settings: fetchSettings(),
    requests: fetchProfileChangeRequests(),
  };
}

export function subscribeProfileRequests(listener) {
  return subscribeProfileChangeRequests(listener);
}

export async function persistProfileUser(profile, payload) {
  if (isBackendConfigured()) {
    const result = await saveUser({ ...profile, ...payload, id: profile?.id });
    return {
      ok: Boolean(result?.ok),
      user: result?.user || null,
      session: getSession(),
    };
  }

  return updateCurrentUser(payload);
}

export async function persistProfileSettings(settings) {
  return persistSettings(settings);
}

export async function registerProfileChangeRequest(input) {
  return createProfileChangeRequest(input);
}

export async function submitProfilePasswordChange(input) {
  if (isBackendConfigured()) {
    await apiRequest("/profile/password", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    return { ok: true, mode: "backend" };
  }

  return { ok: true, mode: "local_only" };
}

export async function publishProfileNotification(notification) {
  return createNotification(notification);
}

export function listProfileRequests() {
  return fetchProfileChangeRequests();
}

export function clearProfileSession() {
  return clearSession();
}
