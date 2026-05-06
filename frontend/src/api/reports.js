import { apiRequest } from "./httpClient";

function normalizeReportRecord(record, fallbackId) {
  return {
    id: String(record?.id || fallbackId),
    dateISO: String(record?.dateISO || new Date().toISOString().slice(0, 10)),
    area: String(record?.area || record?.areaCode || "Sin area"),
    areaCode: String(record?.areaCode || ""),
    category: String(record?.category || "otros").toLowerCase(),
    activity: String(record?.activity || "Sin actividad"),
    value: Number(record?.value) || 0,
    unit: String(record?.unit || ""),
    factor: Number(record?.factor) || 0,
    co2e_kg: Number(record?.co2e_kg) || 0,
    co2e_t: Number(record?.co2e_t) || 0,
    status: record?.status === "est" ? "est" : "real",
    source: String(record?.source || ""),
    evidence: String(record?.evidence || record?.evidenceUrl || ""),
  };
}

function normalizeSummary(summary = {}) {
  return {
    total: Number(summary.total) || 0,
    electricidad: Number(summary.electricidad) || 0,
    combustible: Number(summary.combustible) || 0,
    realPct: Number(summary.realPct) || 0,
    estPct: Number(summary.estPct) || 0,
    topAreas: Array.isArray(summary.topAreas) ? summary.topAreas : [],
    byArea: Array.isArray(summary.byArea) ? summary.byArea : [],
    byCategory: Array.isArray(summary.byCategory) ? summary.byCategory : [],
    trend: Array.isArray(summary.trend) ? summary.trend : [],
  };
}

export async function generateEmissionReport(filters) {
  const payload = await apiRequest("/reports/generate", {
    method: "POST",
    body: JSON.stringify({ filters }),
  });
  const report = payload?.report || payload?.data?.report || payload?.data || payload || {};
  const records = Array.isArray(report.records)
    ? report.records.map((record, index) => normalizeReportRecord(record, `report-record-${index + 1}`))
    : [];
  return {
    records,
    areaOptions: Array.isArray(report.areaOptions)
      ? report.areaOptions
          .map((area) => {
            if (typeof area === "string") return { value: area, label: area };
            const value = String(area?.value || area?.code || area?.id || "").trim();
            const label = String(area?.label || area?.name || value).trim();
            return value && label ? { value, label } : null;
          })
          .filter(Boolean)
      : [],
    summary: normalizeSummary(report.summary),
    filters: report.filters || filters || {},
  };
}
