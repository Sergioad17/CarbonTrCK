import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const FACTORS_KEY = STORAGE_KEYS.factors;
const RECORDS_KEY = STORAGE_KEYS.records;

const todayIso = () => new Date().toISOString().slice(0, 10);

const nowIso = () => new Date().toISOString();

const seedFactors = [
  {
    id: "factor-scope2-mx-sen-demo",
    scope: "scope2",
    category: "electricidad",
    metric: "electricity_consumption",
    numeratorUnit: "kgCO2e",
    denominatorUnit: "kWh",
    value: 0.433,
    region: "MX-SEN",
    provider: "CFE demo",
    sourceUrl: "",
    validFrom: "2026-01-01",
    validTo: null,
    isDefault: true,
    isActive: true,
    uncertaintyPct: 2.5,
    notes: "Valor de ejemplo, editalo con una fuente oficial.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "factor-scope1-diesel-demo",
    scope: "scope1",
    category: "combustible",
    metric: "fuel_volume",
    numeratorUnit: "kgCO2e",
    denominatorUnit: "L",
    value: 2.68,
    region: "MX",
    provider: "SEMARNAT demo",
    sourceUrl: "",
    validFrom: "2026-01-01",
    validTo: null,
    isDefault: true,
    isActive: true,
    uncertaintyPct: 1.8,
    notes: "Valor de ejemplo para diesel, editalo con una fuente oficial.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const cleanString = (value) => String(value ?? "").trim();

const normalizeDate = (value) => {
  const raw = cleanString(value);
  return raw || null;
};

const inferMetric = (scope, category) => {
  if (category === "electricidad" || scope === "scope2") return "electricity_consumption";
  if (category === "combustible" || scope === "scope1") return "fuel_volume";
  return "custom";
};

const inferDenominatorUnit = (category, value) => {
  if (category === "electricidad") return "kWh";
  if (category === "combustible") return "L";
  return cleanString(value) || "kWh";
};

const normalizeNumber = (value, fallback = null) => {
  if (value === "" || value === null || typeof value === "undefined") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeFactor = (factor, fallbackId) => {
  const scope = ["scope1", "scope2", "scope3"].includes(factor?.scope) ? factor.scope : "scope2";
  const category = ["electricidad", "combustible", "otros"].includes(factor?.category)
    ? factor.category
    : scope === "scope1"
    ? "combustible"
    : "electricidad";
  const validFrom = cleanString(factor?.validFrom) || todayIso();
  const validTo = normalizeDate(factor?.validTo);
  const createdAt = cleanString(factor?.createdAt) || nowIso();
  const updatedAt = cleanString(factor?.updatedAt) || nowIso();

  return {
    id: cleanString(factor?.id) || fallbackId || `factor-${Date.now()}`,
    scope,
    category,
    metric: ["electricity_consumption", "fuel_volume", "custom"].includes(factor?.metric)
      ? factor.metric
      : inferMetric(scope, category),
    numeratorUnit: cleanString(factor?.numeratorUnit) || "kgCO2e",
    denominatorUnit: inferDenominatorUnit(category, factor?.denominatorUnit),
    value: normalizeNumber(factor?.value, 0),
    region: cleanString(factor?.region) || "MX",
    provider: cleanString(factor?.provider),
    sourceUrl: cleanString(factor?.sourceUrl),
    validFrom,
    validTo,
    isDefault: Boolean(factor?.isDefault),
    isActive: typeof factor?.isActive === "boolean" ? factor.isActive : true,
    uncertaintyPct: normalizeNumber(factor?.uncertaintyPct, null),
    notes: cleanString(factor?.notes),
    createdAt,
    updatedAt,
  };
};

const combinationKey = (factor) => `${factor.scope}::${factor.category}::${factor.region}`;

const isOpenEndedActive = (factor) => factor.isActive && !factor.validTo;

const compareFactors = (left, right) => {
  const leftOpen = left.validTo ? 1 : 0;
  const rightOpen = right.validTo ? 1 : 0;
  if (leftOpen !== rightOpen) return leftOpen - rightOpen;
  const fromCompare = String(right.validFrom || "").localeCompare(String(left.validFrom || ""));
  if (fromCompare !== 0) return fromCompare;
  return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
};

const sortFactors = (factors) => [...factors].sort(compareFactors);

const readFactors = () => {
  const parsed = safeReadJson(FACTORS_KEY, null);
  if (!Array.isArray(parsed)) return [];
  return sortFactors(parsed.map((factor, index) => normalizeFactor(factor, `factor-${index + 1}`)));
};

const writeFactors = (factors) => {
  const normalized = sortFactors(factors.map((factor, index) => normalizeFactor(factor, `factor-${index + 1}`)));
  safeWriteJson(FACTORS_KEY, normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:factors-changed", { detail: normalized }));
  }
  return normalized;
};

export function ensureSeedData() {
  const current = readFactors();
  if (current.length > 0) return current;
  return writeFactors(seedFactors);
}

export function getAll() {
  return ensureSeedData();
}

export function saveAll(factors) {
  return writeFactors(factors);
}

export function getUsageCount(factorId) {
  const records = safeReadJson(RECORDS_KEY, []);
  if (!Array.isArray(records)) return 0;
  return records.filter((record) => {
    if (!record || typeof record !== "object") return false;
    return record.factorId === factorId || record.factor?.id === factorId;
  }).length;
}

export function findDefaultConflict(factors, target, ignoreId) {
  if (!target?.isDefault || !isOpenEndedActive(target)) return null;
  return factors.find((factor) => (
    factor.id !== ignoreId &&
    factor.isDefault &&
    isOpenEndedActive(factor) &&
    combinationKey(factor) === combinationKey(target)
  )) || null;
}

function clearDefaultConflict(factors, target, ignoreId) {
  return factors.map((factor) => {
    if (
      factor.id !== ignoreId &&
      factor.isDefault &&
      isOpenEndedActive(factor) &&
      combinationKey(factor) === combinationKey(target)
    ) {
      return { ...factor, isDefault: false, updatedAt: nowIso() };
    }
    return factor;
  });
}

export function upsert(inputFactor, options = {}) {
  const factors = getAll();
  const exists = factors.find((factor) => factor.id === inputFactor.id);
  const baseCreatedAt = exists?.createdAt || nowIso();
  const normalized = normalizeFactor(
    { ...inputFactor, createdAt: baseCreatedAt, updatedAt: nowIso() },
    inputFactor.id || `factor-${Date.now()}`
  );

  const conflict = findDefaultConflict(factors, normalized, normalized.id);
  if (conflict && !options.forceDefaultOverride) {
    return { ok: false, reason: "default_conflict", conflict, factors };
  }

  const next = factors.some((factor) => factor.id === normalized.id)
    ? factors.map((factor) => (factor.id === normalized.id ? normalized : factor))
    : [normalized, ...factors];

  const withDefaultsResolved = normalized.isDefault && isOpenEndedActive(normalized)
    ? clearDefaultConflict(next, normalized, normalized.id)
    : next;

  return { ok: true, factor: normalized, factors: writeFactors(withDefaultsResolved) };
}

export function deactivate(id, nextActive = false) {
  const factors = getAll().map((factor) => {
    if (factor.id !== id) return factor;
    return {
      ...factor,
      isActive: nextActive,
      isDefault: nextActive ? factor.isDefault : false,
      updatedAt: nowIso(),
    };
  });
  return writeFactors(factors);
}

export function setDefault(id, options = {}) {
  const factors = getAll();
  const target = factors.find((factor) => factor.id === id);
  if (!target) return { ok: false, reason: "not_found" };

  const normalizedTarget = { ...target, isDefault: true, isActive: true, updatedAt: nowIso() };
  const conflict = findDefaultConflict(factors, normalizedTarget, id);
  if (conflict && !options.force) {
    return { ok: false, reason: "default_conflict", conflict, target: normalizedTarget };
  }

  const next = clearDefaultConflict(
    factors.map((factor) => (factor.id === id ? normalizedTarget : factor)),
    normalizedTarget,
    id
  );
  return { ok: true, factor: normalizedTarget, factors: writeFactors(next) };
}

const minusOneDay = (isoDate) => {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

export function duplicateAsNewVersion(id, changes = {}, options = {}) {
  const factors = getAll();
  const source = factors.find((factor) => factor.id === id);
  if (!source) return { ok: false, reason: "not_found" };

  const candidate = normalizeFactor(
    {
      ...source,
      ...changes,
      id: `factor-${Date.now()}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    `factor-${Date.now()}`
  );

  const conflict = findDefaultConflict(factors, candidate, candidate.id);
  if (conflict && !options.forceDefaultOverride) {
    return { ok: false, reason: "default_conflict", conflict, source, candidate };
  }

  const next = factors.map((factor) => {
    if (factor.id !== id) return factor;
    if (!factor.validTo && candidate.validFrom) {
      const previousValidTo = minusOneDay(candidate.validFrom);
      if (previousValidTo && previousValidTo >= factor.validFrom) {
        return { ...factor, validTo: previousValidTo, isDefault: false, updatedAt: nowIso() };
      }
    }
    return { ...factor, isDefault: false, updatedAt: nowIso() };
  });

  const withCandidate = [candidate, ...next];
  const withDefaultsResolved = candidate.isDefault && isOpenEndedActive(candidate)
    ? clearDefaultConflict(withCandidate, candidate, candidate.id)
    : withCandidate;

  return { ok: true, factor: candidate, previous: source, factors: writeFactors(withDefaultsResolved) };
}

export function filterFactors(factors, filters = {}) {
  const search = cleanString(filters.search).toLowerCase();
  const today = filters.today || todayIso();

  return sortFactors(
    factors.filter((factor) => {
      if (filters.scope && filters.scope !== "all" && factor.scope !== filters.scope) return false;
      if (filters.category && filters.category !== "all" && factor.category !== filters.category) return false;
      if (filters.onlyActive && !factor.isActive) return false;
      if (filters.onlyCurrent && factor.validFrom > today) return false;
      if (filters.onlyCurrent && factor.validTo && factor.validTo < today) return false;
      if (search) {
        const haystack = [factor.provider, factor.region, factor.notes, factor.sourceUrl]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
  );
}

export function getDefaultFactor(scope = "scope2", category = "electricidad") {
  const factors = getAll();
  return (
    factors.find((factor) => factor.scope === scope && factor.category === category && factor.isDefault && factor.isActive) ||
    factors.find((factor) => factor.scope === scope && factor.category === category && factor.isActive) ||
    null
  );
}

export function getDefaultElectricityFactor() {
  return getDefaultFactor("scope2", "electricidad");
}
