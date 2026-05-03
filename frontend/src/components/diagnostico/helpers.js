/* ─── AI palette (shared with the page) ───────────────────────────────── */
export const AI = {
  primary:       "#8b5cf6",
  primarySoft:   "rgba(139, 92, 246, 0.15)",
  primaryBorder: "rgba(139, 92, 246, 0.45)",
  text:          "#c4b5fd",
  glow:          "rgba(139, 92, 246, 0.35)",
  primaryDeep:   "#7c3aed",
  primaryLight:  "#a78bfa",
};

export const RISK = {
  low:    { color: "#22C55E", bg: "rgba(34,197,94,.08)",  border: "rgba(34,197,94,.32)",  label: "Bajo"  },
  medium: { color: "#EAB308", bg: "rgba(234,179,8,.08)",  border: "rgba(234,179,8,.35)",  label: "Medio" },
  high:   { color: "#EF4444", bg: "rgba(239,68,68,.08)",  border: "rgba(239,68,68,.35)",  label: "Alto"  },
};

/* ─── Storage keys ────────────────────────────────────────────────────── */
export const KEYS = {
  records:           "carbontrack.records",
  actions:           "carbontrack.actions",
  feedback:          "carbontrack.aiFeedback",
  saved:             "carbontrack.aiSavedRecommendations",
  areaReviews:       "carbontrack.aiAreaReviews",
  reductionPlans:    "carbontrack.aiReductionPlans",
  diagnosticReview:  "carbontrack.aiDiagnosticReview",
};

/* ─── Safe storage helpers ────────────────────────────────────────────── */
function ls() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeParseArray(key, fallback = []) {
  try {
    const store = ls();
    if (!store) return fallback;
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function safeParseObject(key, fallback = {}) {
  try {
    const store = ls();
    if (!store) return fallback;
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    const store = ls();
    if (!store) return false;
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeFromStorage(key) {
  try {
    const store = ls();
    if (!store) return false;
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/* ─── Tiny uid (no deps) ──────────────────────────────────────────────── */
export function uid(prefix = "id") {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}`;
}

/* ─── Domain shortcuts (compose safe helpers) ─────────────────────────── */
export const loadActions          = () => safeParseArray(KEYS.actions);
export const loadFeedback         = () => safeParseArray(KEYS.feedback);
export const loadSavedRecs        = () => safeParseArray(KEYS.saved);
export const loadAreaReviews      = () => safeParseArray(KEYS.areaReviews);
export const loadReductionPlans   = () => safeParseArray(KEYS.reductionPlans);
export const loadDiagnosticReview = () => {
  const v = safeParseObject(KEYS.diagnosticReview, null);
  return v && v.reviewed ? v : null;
};

export function appendItem(key, item) {
  const cur = safeParseArray(key);
  const next = [...cur, item];
  saveToStorage(key, next);
  return next;
}

export function updateItemBy(key, predicate, patch) {
  const cur = safeParseArray(key);
  const next = cur.map(it => predicate(it) ? { ...it, ...patch } : it);
  saveToStorage(key, next);
  return next;
}

/* ─── Downloads (browser only) ────────────────────────────────────────── */
export function downloadJSON(filename, data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    triggerDownload(filename, blob);
    return true;
  } catch {
    return false;
  }
}

export function downloadCSV(filename, rows) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return false;
    const headers = Object.keys(rows[0]);
    const escape = v => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(filename, blob);
    return true;
  } catch {
    return false;
  }
}

function triggerDownload(filename, blob) {
  if (typeof window === "undefined" || !window.URL) return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/* ─── Date formatter ──────────────────────────────────────────────────── */
export function formatDateTime(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatDate(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}
