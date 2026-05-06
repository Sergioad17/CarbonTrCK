import { listRecords } from "../records/records.repository.js";
import { listAreas } from "../areas/areas.repository.js";

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CATEGORY_COLORS = {
  electricidad: "#22C55E",
  combustible: "#EAB308",
  otros: "#64748B",
};

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeCategory(record) {
  const category = cleanString(record?.category).toLowerCase();
  const unit = cleanString(record?.unit).toLowerCase();
  if (category.includes("elec") || unit === "kwh") return "electricidad";
  if (category.includes("comb") || unit === "l" || unit === "lt" || unit.includes("lit")) return "combustible";
  return category === "otros" ? "otros" : "electricidad";
}

function normalizeSource(value, status) {
  const source = cleanString(value).toLowerCase();
  if (source.includes("recibo") || source.includes("cfe")) return "Recibo";
  if (source.includes("medi")) return "Medicion";
  if (source.includes("encu")) return "Encuesta";
  if (source.includes("inven")) return "Inventario";
  if (source.includes("estim")) return "Estimacion";
  return status === "est" ? "Estimacion" : "Medicion";
}

function monthKey(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_ES[(month || 1) - 1]} ${year}`;
}

function normalizeRecord(record, index) {
  const status = record?.status === "est" || record?.isEstimated ? "est" : "real";
  const category = normalizeCategory(record);
  const factor = Number(record?.factor) || (category === "combustible" ? 2.68 : category === "electricidad" ? 0.435 : 1);
  const value = Number(record?.value) || 0;
  const co2eKg = Number(record?.co2e_kg) > 0 ? Number(record.co2e_kg) : value * factor;
  const co2eT = Number(record?.co2e_t) > 0 ? Number(record.co2e_t) : co2eKg / 1000;

  return {
    id: cleanString(record?.id) || `record-${index + 1}`,
    dateISO: cleanString(record?.dateISO) || new Date().toISOString().slice(0, 10),
    area: cleanString(record?.area || record?.areaCode || record?.area_code) || "Sin area",
    areaCode: cleanString(record?.areaCode || record?.area_code),
    category,
    activity: cleanString(record?.activity || record?.activityText) || "Sin actividad",
    value,
    unit: cleanString(record?.unit) || (category === "combustible" ? "L" : "kWh"),
    factor,
    co2e_kg: co2eKg,
    co2e_t: co2eT,
    status,
    source: normalizeSource(record?.source, status),
    evidence: cleanString(record?.evidenceUrl || record?.evidence),
  };
}

function resolveDateFilters(filters = {}) {
  if (filters.periodMode === "mes") {
    const year = Number(filters.year) || new Date().getFullYear();
    const month = Number(filters.month) || new Date().getMonth() + 1;
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
  }

  if (filters.periodMode === "rango") {
    return {
      from: cleanString(filters.fromDate),
      to: cleanString(filters.toDate),
    };
  }

  return { from: "", to: "" };
}

function matchArea(record, area) {
  if (!area || area === "all") return true;
  return record.area === area || record.areaCode === area;
}

function buildSummary(records) {
  const total = records.reduce((acc, row) => acc + row.co2e_t, 0);
  const electricity = records.filter((row) => row.category === "electricidad").reduce((acc, row) => acc + row.co2e_t, 0);
  const fuel = records.filter((row) => row.category === "combustible").reduce((acc, row) => acc + row.co2e_t, 0);
  const real = records.filter((row) => row.status === "real").reduce((acc, row) => acc + row.co2e_t, 0);
  const estimated = records.filter((row) => row.status === "est").reduce((acc, row) => acc + row.co2e_t, 0);

  const byAreaMap = records.reduce((acc, row) => {
    acc[row.area] = (acc[row.area] || 0) + row.co2e_t;
    return acc;
  }, {});
  const byArea = Object.entries(byAreaMap)
    .map(([area, co2e]) => ({ area, co2e, pct: total > 0 ? (co2e / total) * 100 : 0 }))
    .sort((left, right) => right.co2e - left.co2e);

  const byCategoryMap = records.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + row.co2e_t;
    return acc;
  }, {});
  const byCategory = Object.entries(byCategoryMap)
    .map(([name, co2e]) => ({
      name,
      label: name === "electricidad" ? "Electricidad" : name === "combustible" ? "Combustible" : "Otros",
      co2e,
      pct: total > 0 ? (co2e / total) * 100 : 0,
      color: CATEGORY_COLORS[name] || "#94A3B8",
    }))
    .sort((left, right) => right.co2e - left.co2e);

  const byMonthMap = records.reduce((acc, row) => {
    const key = monthKey(row.dateISO);
    if (key) acc[key] = (acc[key] || 0) + row.co2e_t;
    return acc;
  }, {});
  const trend = Object.entries(byMonthMap)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, co2e]) => ({ key, label: monthLabel(key), co2e }));

  return {
    total,
    electricidad: electricity,
    combustible: fuel,
    realPct: total > 0 ? (real / total) * 100 : 0,
    estPct: total > 0 ? (estimated / total) * 100 : 0,
    topAreas: byArea.slice(0, 3),
    byArea,
    byCategory,
    trend,
  };
}

export async function generateReport(actor, filters = {}) {
  const dates = resolveDateFilters(filters);
  const category = cleanString(filters.category);
  const source = cleanString(filters.source);
  const status = filters.realMode === "real" ? "real" : filters.realMode === "est" ? "est" : "";

  const [records, areas] = await Promise.all([
    listRecords(actor, {
      from: dates.from,
      to: dates.to,
      category: category === "all" ? "" : category,
      source: source === "all" ? "" : source,
      status,
    }).then((items) => items.map(normalizeRecord)),
    listAreas(actor),
  ]);

  const filtered = records.filter((record) => matchArea(record, cleanString(filters.area)));
  const areaOptions = areas.map((area) => ({ value: area.code, label: area.name || area.code }));

  return {
    records: filtered,
    areaOptions,
    summary: buildSummary(filtered),
    filters: {
      ...filters,
      from: dates.from,
      to: dates.to,
    },
  };
}
