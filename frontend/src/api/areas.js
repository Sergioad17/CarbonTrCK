import { fetchEmissionRecords } from "./records";

const AREA_DEFS = [
  { id: "cc1", label: "Centro de computo 1", aliases: ["cc 1", "cc1", "centro de computo 1"] },
  { id: "cc2", label: "Centro de computo 2", aliases: ["cc 2", "cc2", "centro de computo 2"] },
  { id: "redes", label: "Taller de redes", aliases: ["redes", "taller de redes"] },
  { id: "aulas", label: "Aulas (16)", aliases: ["aulas", "aula"] },
  { id: "juntas", label: "Sala de juntas", aliases: ["juntas", "sala de juntas"] },
  { id: "admin", label: "Areas administrativas", aliases: ["admin", "administracion", "areas administrativas"] },
  { id: "agricola", label: "Innovacion agricola (tractor y vivero)", aliases: ["agricola", "tractor", "vivero"] },
  { id: "industrial", label: "Talleres Industrial y Calidad", aliases: ["industrial", "calidad", "industrial/calidad"] },
];

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

function normalizeArea(rawArea) {
  const area = String(rawArea || "").toLowerCase().trim();
  return AREA_DEFS.find((item) => item.aliases.some((alias) => area.includes(alias))) || AREA_DEFS[0];
}

function normalizeAreaRecord(input, fallbackId) {
  const area = normalizeArea(input?.area);
  const category = normalizeCategory(input);
  const unit = String(input?.unit || (category === "combustible" ? "L" : category === "electricidad" ? "kWh" : "unidad"));
  const value = Number(input?.value) || 0;
  const factor = Number(input?.factor) > 0 ? Number(input.factor) : category === "combustible" ? 2.68 : category === "electricidad" ? 0.435 : 1;
  const co2eKg = Number(input?.co2e_kg) > 0 ? Number(input.co2e_kg) : value * factor;
  const isEstimated = Boolean(input?.isEstimated) || input?.status === "est";

  return {
    id: String(input?.id || fallbackId),
    dateISO: String(input?.dateISO || new Date().toISOString().slice(0, 10)),
    areaId: area.id,
    areaLabel: area.label,
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

export async function fetchAreasRecords() {
  let error = "";

  const records = await fetchEmissionRecords([]).catch(() => {
    error = "No se pudieron cargar los datos.";
    return [];
  });

  const byId = new Map();
  records.forEach((record, index) => {
    const id = String(record?.id || `area-record-${index + 1}`);
    if (!byId.has(id)) byId.set(id, normalizeAreaRecord(record, id));
  });

  return {
    records: Array.from(byId.values()),
    error,
  };
}
