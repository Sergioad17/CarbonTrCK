import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const EQUIPMENT_KEY = STORAGE_KEYS.equipment;
const RECORDS_KEY = STORAGE_KEYS.records;

const DEFAULT_CAMPUS = "CAMPUS-CT";
const DEFAULT_WEEKS_PER_MONTH = 4.3;
const DEFAULT_ELECTRICITY_FACTOR = 0.433;

export const EQUIPMENT_CATEGORY_OPTIONS = [
  { value: "electricidad", label: "Electricidad" },
  { value: "combustible", label: "Combustible" },
  { value: "otros", label: "Otros" },
];

export const EQUIPMENT_TYPE_OPTIONS = [
  { value: "it", label: "IT" },
  { value: "iluminacion", label: "Iluminación" },
  { value: "clima", label: "Clima" },
  { value: "redes", label: "Redes" },
  { value: "industrial", label: "Industrial" },
  { value: "agricola", label: "Agrícola" },
  { value: "admin", label: "Admin" },
  { value: "otro", label: "Otro" },
];

export const EQUIPMENT_AREA_OPTIONS = [
  { value: "CC1", label: "CC1" },
  { value: "CC2", label: "CC2" },
  { value: "Aulas", label: "Aulas" },
  { value: "Redes", label: "Redes" },
  { value: "Industrial", label: "Industrial / Calidad" },
  { value: "Agricola", label: "Agrícola" },
  { value: "Admin", label: "Administración" },
  { value: "SalaJuntas", label: "Sala de juntas" },
];

const SEED_EQUIPMENT = [
  { areaCode: "CC1", name: "PC de escritorio", type: "it", quantity: 28, powerW: 180, usage: { hoursPerDay: 7, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Equipo de laboratorio para prácticas." },
  { areaCode: "CC1", name: "Monitor LED", type: "it", quantity: 28, powerW: 32, usage: { hoursPerDay: 7, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Monitores asociados al centro de cómputo." },
  { areaCode: "CC1", name: "Impresora láser", type: "admin", quantity: 2, powerW: 600, usage: { hoursPerDay: 0.7, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Uso administrativo y académico." },
  { areaCode: "CC2", name: "PC de escritorio", type: "it", quantity: 24, powerW: 170, usage: { hoursPerDay: 7, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Inventario para clases prácticas." },
  { areaCode: "CC2", name: "Monitor LED", type: "it", quantity: 24, powerW: 30, usage: { hoursPerDay: 7, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Operación durante horario escolar." },
  { areaCode: "Aulas", name: "Proyector", type: "it", quantity: 16, powerW: 250, usage: { hoursPerDay: 4, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Promedio por salón." },
  { areaCode: "Aulas", name: "Pantalla / TV", type: "it", quantity: 6, powerW: 120, usage: { hoursPerDay: 3, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Uso mixto en aulas y auditorios." },
  { areaCode: "Redes", name: "Switch administrable", type: "redes", quantity: 8, powerW: 75, usage: { hoursPerDay: 24, daysPerWeek: 7, weeksPerMonth: 4.3 }, notes: "Operación continua." },
  { areaCode: "Redes", name: "Router", type: "redes", quantity: 4, powerW: 18, usage: { hoursPerDay: 24, daysPerWeek: 7, weeksPerMonth: 4.3 }, notes: "Backbone de conectividad." },
  { areaCode: "Redes", name: "UPS", type: "redes", quantity: 3, powerW: 90, usage: { hoursPerDay: 24, daysPerWeek: 7, weeksPerMonth: 4.3 }, notes: "Consumo base estimado sin carga pico." },
  { areaCode: "Industrial", name: "Banco de pruebas", type: "industrial", quantity: 2, powerW: 2200, usage: { hoursPerDay: 2.5, daysPerWeek: 4, weeksPerMonth: 4.3 }, notes: "Potencia estimada para prácticas." },
  { areaCode: "Industrial", name: "Maquinaria ligera", type: "industrial", quantity: 3, powerW: 1500, usage: { hoursPerDay: 2, daysPerWeek: 4, weeksPerMonth: 4.3 }, notes: "Se usa cuando no hay medición directa." },
  { areaCode: "Agricola", name: "Bomba de riego", type: "agricola", quantity: 2, powerW: 1100, usage: { hoursPerDay: 3, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Consumo eléctrico del vivero." },
  { areaCode: "Agricola", name: "Iluminación exterior", type: "iluminacion", quantity: 14, powerW: 45, usage: { hoursPerDay: 5, daysPerWeek: 7, weeksPerMonth: 4.3 }, notes: "Luminarias de apoyo agrícola." },
  { areaCode: "Agricola", name: "Tractor", category: "combustible", type: "agricola", quantity: 1, powerW: 0, usage: { hoursPerDay: 2, daysPerWeek: 3, weeksPerMonth: 4.3 }, notes: "Próximamente: litros/hora y factor específico.", isActive: true },
  { areaCode: "Admin", name: "PC de oficina", type: "admin", quantity: 12, powerW: 140, usage: { hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Uso administrativo." },
  { areaCode: "Admin", name: "Pantalla de recepción", type: "admin", quantity: 2, powerW: 95, usage: { hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.3 }, notes: "Señalización y recepción." },
  { areaCode: "SalaJuntas", name: "Pantalla de juntas", type: "admin", quantity: 1, powerW: 160, usage: { hoursPerDay: 2, daysPerWeek: 4, weeksPerMonth: 4.3 }, notes: "Sala de juntas." },
];

const nowIso = () => new Date().toISOString();

const cleanString = (value, fallback = "") => String(value ?? fallback).trim();

const normalizeNumber = (value, fallback = 0) => {
  if (value === "" || value === null || typeof value === "undefined") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeUsage = (usage = {}) => ({
  hoursPerDay: normalizeNumber(usage.hoursPerDay, 0),
  daysPerWeek: normalizeNumber(usage.daysPerWeek, 0),
  weeksPerMonth: normalizeNumber(usage.weeksPerMonth, DEFAULT_WEEKS_PER_MONTH),
});

const buildId = () => `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getAreaLabel = (areaCode) =>
  EQUIPMENT_AREA_OPTIONS.find((option) => option.value === areaCode)?.label || areaCode || "Sin área";

export const getTypeLabel = (type) =>
  EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Otro";

export const getCategoryLabel = (category) =>
  EQUIPMENT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || category || "Electricidad";

export function normalizeEquipment(item = {}, fallbackId) {
  const createdAt = cleanString(item.createdAt) || nowIso();
  const updatedAt = cleanString(item.updatedAt) || nowIso();
  const category = ["electricidad", "combustible", "otros"].includes(item.category) ? item.category : "electricidad";
  const type = EQUIPMENT_TYPE_OPTIONS.some((option) => option.value === item.type) ? item.type : "otro";

  return {
    id: cleanString(item.id) || fallbackId || buildId(),
    campusCode: cleanString(item.campusCode, DEFAULT_CAMPUS) || DEFAULT_CAMPUS,
    areaCode: cleanString(item.areaCode, "Aulas") || "Aulas",
    name: cleanString(item.name, "Equipo"),
    category,
    type,
    quantity: Math.max(0, normalizeNumber(item.quantity, 1)),
    powerW: Math.max(0, normalizeNumber(item.powerW, 0)),
    usage: normalizeUsage(item.usage),
    notes: cleanString(item.notes),
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    createdAt,
    updatedAt,
  };
}

function sortEquipment(items) {
  return [...items].sort((left, right) => {
    const kwhDiff = computeKwhMonth(right) - computeKwhMonth(left);
    if (kwhDiff !== 0) return kwhDiff;
    return String(left.name).localeCompare(String(right.name), "es");
  });
}

function seedRows() {
  return SEED_EQUIPMENT.map((item, index) =>
    normalizeEquipment(
      {
        campusCode: DEFAULT_CAMPUS,
        category: "electricidad",
        isActive: true,
        ...item,
      },
      `seed-eq-${index + 1}`
    )
  );
}

function readEquipment() {
  const parsed = safeReadJson(EQUIPMENT_KEY, null);
  if (!Array.isArray(parsed)) return [];
  return sortEquipment(parsed.map((item, index) => normalizeEquipment(item, `eq-${index + 1}`)));
}

function writeEquipment(items) {
  const normalized = sortEquipment(items.map((item, index) => normalizeEquipment(item, `eq-${index + 1}`)));
  safeWriteJson(EQUIPMENT_KEY, normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:equipment-changed", { detail: normalized }));
  }
  return normalized;
}

export function ensureSeedData() {
  const current = readEquipment();
  if (current.length > 0) return current;
  return writeEquipment(seedRows());
}

export function getAll() {
  return ensureSeedData();
}

export function saveAll(items) {
  return writeEquipment(items);
}

export function upsert(input) {
  const items = getAll();
  const existing = items.find((item) => item.id === input.id);
  const normalized = normalizeEquipment(
    {
      ...existing,
      ...input,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    },
    input.id || buildId()
  );

  const next = existing
    ? items.map((item) => (item.id === normalized.id ? normalized : item))
    : [normalized, ...items];

  return { ok: true, equipment: normalized, items: writeEquipment(next) };
}

export function deactivate(id, nextActive = false) {
  return writeEquipment(
    getAll().map((item) =>
      item.id === id
        ? {
            ...item,
            isActive: nextActive,
            updatedAt: nowIso(),
          }
        : item
    )
  );
}

export function duplicate(id) {
  const items = getAll();
  const source = items.find((item) => item.id === id);
  if (!source) return { ok: false, reason: "not_found" };

  const copy = normalizeEquipment(
    {
      ...source,
      id: buildId(),
      name: `${source.name} copia`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    buildId()
  );

  return { ok: true, equipment: copy, items: writeEquipment([copy, ...items]) };
}

export function computeHoursMonth(item) {
  const usage = normalizeUsage(item?.usage);
  return usage.hoursPerDay * usage.daysPerWeek * usage.weeksPerMonth;
}

export function computeKwhMonth(item) {
  const equipment = normalizeEquipment(item);
  if (equipment.category !== "electricidad") return 0;
  return (equipment.powerW * computeHoursMonth(equipment) * equipment.quantity) / 1000;
}

export function computeCo2eMonth(item, factorKgPerKwh = DEFAULT_ELECTRICITY_FACTOR) {
  const factor = Number.isFinite(Number(factorKgPerKwh)) ? Number(factorKgPerKwh) : DEFAULT_ELECTRICITY_FACTOR;
  const kwhMonth = computeKwhMonth(item);
  const co2eKg = kwhMonth * factor;
  return {
    co2eKg,
    co2eT: co2eKg / 1000,
  };
}

export function filterEquipment(items, filters = {}) {
  const search = cleanString(filters.search).toLowerCase();
  return sortEquipment(
    items.filter((item) => {
      if (filters.areaCode && filters.areaCode !== "all" && item.areaCode !== filters.areaCode) return false;
      if (filters.type && filters.type !== "all" && item.type !== filters.type) return false;
      if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.onlyActive && !item.isActive) return false;
      if (search) {
        const haystack = [item.name, item.notes, item.areaCode, getAreaLabel(item.areaCode), getTypeLabel(item.type)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
  );
}

export function buildEstimatedRecord(item, options = {}) {
  const equipment = normalizeEquipment(item);
  const factor = Number.isFinite(Number(options.factor)) ? Number(options.factor) : DEFAULT_ELECTRICITY_FACTOR;
  const targetDate = cleanString(options.dateISO) || new Date().toISOString().slice(0, 10);
  const kwhMonth = computeKwhMonth(equipment);
  const { co2eKg, co2eT } = computeCo2eMonth(equipment, factor);

  return {
    id: `eqr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scope: "scope2",
    category: "electricidad",
    metric: "electricity_consumption",
    area: getAreaLabel(equipment.areaCode),
    areaCode: equipment.areaCode,
    activity: `Estimación por inventario: ${equipment.name}`,
    activityText: `Estimación por inventario: ${equipment.name}`,
    value: Number(kwhMonth.toFixed(4)),
    unit: "kWh",
    factor,
    factorId: options.factorId || null,
    co2e_kg: Number(co2eKg.toFixed(4)),
    co2e_t: Number(co2eT.toFixed(6)),
    isEstimated: true,
    status: "est",
    source: "Inventario",
    dataSource: "inventario",
    hasEvidence: false,
    evidenceUrl: "",
    note: cleanString(options.note),
    by: cleanString(options.by, "Admin") || "Admin",
    dateISO: targetDate,
    createdAt: nowIso(),
  };
}

export function appendEstimatedRecord(record) {
  const current = safeReadJson(RECORDS_KEY, []);
  const items = Array.isArray(current) ? current : [];
  const next = [record, ...items].slice(0, 500);
  safeWriteJson(RECORDS_KEY, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:newrecord", { detail: record }));
  }
  return next;
}
