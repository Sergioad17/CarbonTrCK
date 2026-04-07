import { clearSession, getCurrentUser, getSession, setSession } from "../lib/sessionStore";

export function fetchCurrentUser(options) {
  return getCurrentUser(options);
}

export function fetchSession() {
  return getSession();
}

export function persistSession(session) {
  return setSession(session);
}

export function removeSession() {
  return clearSession();
}
