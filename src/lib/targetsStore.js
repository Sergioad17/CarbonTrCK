const TARGETS_KEY = "carbontrack.targets";
const ACTIONS_KEY = "carbontrack.actions";
const RECORDS_KEY = "carbontrack.records";

const SCOPE_CATEGORY = {
  scope1: ["combustible"],
  scope2: ["electricidad"],
  scope3: ["otros"],
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeParseArray(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTarget(target) {
  if (!target || typeof target !== "object") return null;
  return {
    id: String(target.id || uid("target")),
    title: String(target.title || "Meta sin nombre"),
    scope: ["scope1", "scope2", "scope3", "all"].includes(target.scope) ? target.scope : "all",
    category: ["electricidad", "combustible", "otros", "all"].includes(target.category) ? target.category : "all",
    areaId: target.areaId ? String(target.areaId) : "all",
    type: target.type === "absolute" ? "absolute" : "reduction_percent",
    baselineStart: String(target.baselineStart || ""),
    baselineEnd: String(target.baselineEnd || ""),
    baselineValue: toNumber(target.baselineValue, 0),
    targetStart: String(target.targetStart || ""),
    targetEnd: String(target.targetEnd || ""),
    targetValue: toNumber(target.targetValue, 0),
    description: String(target.description || ""),
    status: ["active", "paused", "completed"].includes(target.status) ? target.status : "active",
    createdBy: String(target.createdBy || ""),
    createdById: String(target.createdById || ""),
    pauseReason: String(target.pauseReason || ""),
    createdAt: String(target.createdAt || new Date().toISOString()),
  };
}

function normalizeAction(action) {
  if (!action || typeof action !== "object") return null;
  return {
    id: String(action.id || uid("action")),
    targetId: String(action.targetId || ""),
    title: String(action.title || "Accion sin nombre"),
    owner: String(action.owner || ""),
    status: ["planned", "in_progress", "done", "blocked"].includes(action.status) ? action.status : "planned",
    startDate: String(action.startDate || ""),
    endDate: String(action.endDate || ""),
    impact_tco2e: toNumber(action.impact_tco2e, 0),
    evidence: String(action.evidence || ""),
    notes: String(action.notes || ""),
  };
}

export function loadTargets() {
  try {
    const items = safeParseArray(window.localStorage.getItem(TARGETS_KEY)).map(normalizeTarget).filter(Boolean);
    return { targets: items, error: null };
  } catch {
    return { targets: [], error: "No se pudieron cargar las metas." };
  }
}

export function loadActions() {
  try {
    const items = safeParseArray(window.localStorage.getItem(ACTIONS_KEY)).map(normalizeAction).filter(Boolean);
    return { actions: items, error: null };
  } catch {
    return { actions: [], error: "No se pudieron cargar las acciones." };
  }
}

export function loadRecords() {
  try {
    const parsed = safeParseArray(window.localStorage.getItem(RECORDS_KEY));
    const records = parsed
      .filter((row) => row && typeof row === "object")
      .map((row, index) => ({
        id: String(row.id || `record-${index}`),
        dateISO: String(row.dateISO || ""),
        area: String(row.area || "Sin area"),
        category: String(row.category || "otros").toLowerCase(),
        activity: String(row.activity || ""),
        value: toNumber(row.value, 0),
        unit: String(row.unit || ""),
        factor: toNumber(row.factor, 0),
        co2e_kg: toNumber(row.co2e_kg, 0),
        co2e_t: Number.isFinite(Number(row.co2e_t)) ? Number(row.co2e_t) : toNumber(row.co2e_kg, 0) / 1000,
        status: row.status === "est" ? "est" : "real",
        source: String(row.source || ""),
        by: String(row.by || ""),
      }));
    return { records, error: null };
  } catch {
    return { records: [], error: "No se pudieron cargar los registros." };
  }
}

export function saveTargets(targets) {
  window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets.map(normalizeTarget).filter(Boolean)));
}

export function saveActions(actions) {
  window.localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions.map(normalizeAction).filter(Boolean)));
}

export function upsertTarget(targets, payload) {
  const next = normalizeTarget(payload);
  if (!next) return targets;
  const index = targets.findIndex((row) => row.id === next.id);
  if (index < 0) return [next, ...targets];
  const copy = targets.slice();
  copy[index] = next;
  return copy;
}

export function upsertAction(actions, payload) {
  const next = normalizeAction(payload);
  if (!next) return actions;
  const index = actions.findIndex((row) => row.id === next.id);
  if (index < 0) return [next, ...actions];
  const copy = actions.slice();
  copy[index] = next;
  return copy;
}

export function removeTarget(targets, actions, targetId) {
  return {
    targets: targets.filter((row) => row.id !== targetId),
    actions: actions.filter((row) => row.targetId !== targetId),
  };
}

function inDateRange(value, start, end) {
  if (!value) return false;
  const t = new Date(`${value}T12:00:00`).getTime();
  if (!Number.isFinite(t)) return false;
  if (start) {
    const s = new Date(`${start}T00:00:00`).getTime();
    if (Number.isFinite(s) && t < s) return false;
  }
  if (end) {
    const e = new Date(`${end}T23:59:59`).getTime();
    if (Number.isFinite(e) && t > e) return false;
  }
  return true;
}

function matchesScope(record, scope) {
  if (scope === "all") return true;
  const categories = SCOPE_CATEGORY[scope] || [];
  if (!categories.length) return true;
  return categories.includes(record.category);
}

function matchesCategory(record, category) {
  if (category === "all") return true;
  return record.category === category;
}

function matchesArea(record, areaId) {
  if (!areaId || areaId === "all") return true;
  return record.area === areaId;
}

export function filterRecordsByTarget(records, target, dateMode = "target") {
  const start = dateMode === "baseline" ? target.baselineStart : target.targetStart;
  const end = dateMode === "baseline" ? target.baselineEnd : target.targetEnd;
  return records.filter((record) => {
    if (!matchesScope(record, target.scope)) return false;
    if (!matchesCategory(record, target.category)) return false;
    if (!matchesArea(record, target.areaId)) return false;
    if (!inDateRange(record.dateISO, start, end)) return false;
    return true;
  });
}

function sumCo2(records) {
  return records.reduce((acc, row) => acc + toNumber(row.co2e_t, 0), 0);
}

function monthDiff(startISO, endISO) {
  const s = new Date(`${startISO}T12:00:00`);
  const e = new Date(`${endISO}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const years = e.getFullYear() - s.getFullYear();
  const months = e.getMonth() - s.getMonth();
  return years * 12 + months;
}

function getMonthKeys(startISO, endISO) {
  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const keys = [];
  while (cursor.getTime() <= last.getTime()) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[(month || 1) - 1]} ${year}`;
}

function statusFromProgress(target, progressPct, todayISO) {
  if (target.status === "completed" || progressPct >= 100) return "completed";
  if (target.status === "paused") return "paused";
  const today = new Date(`${todayISO}T12:00:00`).getTime();
  const start = new Date(`${target.targetStart}T12:00:00`).getTime();
  const end = new Date(`${target.targetEnd}T12:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "active";
  const elapsedRatio = Math.min(Math.max((today - start) / (end - start), 0), 1);
  const expectedProgress = elapsedRatio * 100;
  if (progressPct + 12 < expectedProgress) return "at_risk";
  return "active";
}

export function computeTargetSummary(target, records, actions, todayISO = new Date().toISOString().slice(0, 10)) {
  const baselineRecords = filterRecordsByTarget(records, target, "baseline");
  const targetRecords = filterRecordsByTarget(records, target, "target");
  const baseline = target.baselineValue > 0 ? target.baselineValue : sumCo2(baselineRecords);
  const actual = targetRecords.length ? sumCo2(targetRecords) : baseline;
  const targetAbsolute = target.type === "reduction_percent"
    ? Math.max(0, baseline * (1 - target.targetValue / 100))
    : Math.max(0, target.targetValue);
  const denominator = Math.abs(baseline - targetAbsolute) || 1;
  const progressRaw = ((baseline - actual) / denominator) * 100;
  const progressPct = Math.max(0, Math.min(100, progressRaw));
  const remaining = Math.max(actual - targetAbsolute, 0);
  const monthsLeft = Math.max(1, monthDiff(todayISO, target.targetEnd));
  const requiredMonthly = remaining / monthsLeft;
  const linkedActions = actions.filter((row) => row.targetId === target.id);
  const avoided = linkedActions.reduce((acc, row) => acc + toNumber(row.impact_tco2e, 0), 0);
  const state = statusFromProgress(target, progressPct, todayISO);
  return {
    baseline,
    actual,
    targetAbsolute,
    progressPct,
    remaining,
    requiredMonthly,
    avoided,
    state,
    linkedActions,
    baselineRecords,
    targetRecords,
  };
}

export function buildTargetLine(target, records) {
  const targetRecords = filterRecordsByTarget(records, target, "target");
  const baseline = target.baselineValue || 0;
  const targetAbsolute = target.type === "reduction_percent"
    ? Math.max(0, baseline * (1 - target.targetValue / 100))
    : Math.max(0, target.targetValue);
  const keys = getMonthKeys(target.targetStart, target.targetEnd);
  const grouped = targetRecords.reduce((acc, row) => {
    const key = row.dateISO ? row.dateISO.slice(0, 7) : "";
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + toNumber(row.co2e_t, 0);
    return acc;
  }, {});
  const steps = Math.max(keys.length - 1, 1);
  return keys.map((key, index) => {
    const goal = baseline + ((targetAbsolute - baseline) * index) / steps;
    const actual = grouped[key] ?? null;
    return {
      key,
      label: monthLabel(key),
      goal,
      actual,
    };
  });
}

export function buildCsv(items, columns) {
  const esc = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = columns.map((col) => esc(col.label)).join(",");
  const rows = items.map((item) => columns.map((col) => esc(col.get(item))).join(","));
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export {
  TARGETS_KEY,
  ACTIONS_KEY,
  RECORDS_KEY,
  normalizeTarget,
  normalizeAction,
  uid,
};
