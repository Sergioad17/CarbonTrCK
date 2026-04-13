import { apiRequest } from "./httpClient";
import { fetchEmissionRecords } from "./records";

function normalizeSource(source) {
  const value = String(source || "").toLowerCase();
  if (value.includes("recibo") || value.includes("cfe")) return "Recibo";
  if (value.includes("medi")) return "Medicion";
  if (value.includes("encu")) return "Encuesta";
  if (value.includes("inven")) return "Inventario";
  if (value.includes("estim")) return "Estimacion";
  return "Medicion";
}

function normalizeCategory(record) {
  const category = String(record?.category || "").toLowerCase();
  const unit = String(record?.unit || "").toLowerCase();
  if (category.includes("elec") || unit === "kwh") return "electricidad";
  if (category.includes("comb") || unit === "l" || unit === "lt" || unit === "litros") return "combustible";
  return category === "otros" ? "otros" : "electricidad";
}

function normalizeAreaRecord(input, fallbackId) {
  const areaCode = String(input?.areaCode || input?.area_code || input?.area || "sin-area").trim();
  const areaLabel = String(input?.area || areaCode);
  const category = normalizeCategory(input);
  const unit = String(input?.unit || (category === "combustible" ? "L" : category === "electricidad" ? "kWh" : "unidad"));
  const value = Number(input?.value) || 0;
  const factor = Number(input?.factor) > 0 ? Number(input.factor) : category === "combustible" ? 2.689 : category === "electricidad" ? 0.444 : 1;
  const co2eKg = Number(input?.co2e_kg) > 0 ? Number(input.co2e_kg) : value * factor;
  const isEstimated = Boolean(input?.isEstimated) || input?.status === "est";

  return {
    id: String(input?.id || fallbackId),
    dateISO: String(input?.dateISO || new Date().toISOString().slice(0, 10)),
    areaId: areaCode,
    areaLabel,
    category,
    unit,
    value,
    factor,
    co2e_kg: co2eKg,
    co2e_t: co2eKg / 1000,
    isEstimated,
    status: isEstimated ? "est" : "real",
    source: normalizeSource(input?.source),
    activity: String(input?.activity || "Sin actividad"),
    note: String(input?.note || ""),
    evidenceUrl: String(input?.evidenceUrl || input?.evidence || ""),
    fuelType: String(input?.fuelType || ""),
  };
}

export async function fetchAreas() {
  const data = await apiRequest("/areas");
  return Array.isArray(data) ? data : (data?.items || data?.areas || data?.data || []);
}

export async function fetchAreasRecords() {
  let error = "";

  const [records, areas] = await Promise.all([
    fetchEmissionRecords([]).catch(() => { error = "No se pudieron cargar los datos."; return []; }),
    fetchAreas().catch(() => []),
  ]);

  const byId = new Map();
  records.forEach((record, index) => {
    const id = String(record?.id || `area-record-${index + 1}`);
    if (!byId.has(id)) byId.set(id, normalizeAreaRecord(record, id));
  });

  return {
    records: Array.from(byId.values()),
    areas,
    error,
  };
}
