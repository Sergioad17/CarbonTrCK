import { fetchEmissionRecords } from "./records";

function inferEquipment(activity = "") {
  const normalized = String(activity).toLowerCase();
  if (normalized.includes("tractor")) return "Tractor";
  if (normalized.includes("planta")) return "Planta";
  if (normalized.includes("camioneta")) return "Camioneta";
  return "";
}

function normalizeFuelRecord(record, fallbackId) {
  const value = Number.isFinite(Number(record?.value)) ? Number(record.value) : 0;
  const factor = Number.isFinite(Number(record?.factor)) && Number(record?.factor) > 0 ? Number(record.factor) : 2.68;
  const co2eKg = Number.isFinite(Number(record?.co2e_kg)) && Number(record?.co2e_kg) > 0 ? Number(record.co2e_kg) : value * factor;

  return {
    id: record?.id || fallbackId,
    dateISO: String(record?.dateISO || ""),
    area: String(record?.area || "Sin area"),
    activity: String(record?.activity || "Sin actividad"),
    category: "combustible",
    fuelType: record?.fuelType === "Gasolina" ? "Gasolina" : "Diesel",
    value,
    unit: "L",
    factor,
    co2e_kg: co2eKg,
    co2e_t: co2eKg / 1000,
    status: record?.status === "est" ? "est" : "real",
    source: String(record?.source || "Medicion"),
    equipment: String(record?.equipment || inferEquipment(record?.activity || "")),
    evidence: String(record?.evidence || record?.evidenceUrl || ""),
  };
}

export async function fetchScopeCombustibleRecords() {
  let storageError = "";

  const records = await fetchEmissionRecords([]).catch(() => {
    storageError = "No se pudieron cargar los registros.";
    return [];
  });

  const filtered = records.filter((record) => {
    if (!record || typeof record !== "object") return false;
    if (record.category === "combustible") return true;
    if (String(record.unit || "").toUpperCase() === "L") return true;
    return record.fuelType === "Diesel" || record.fuelType === "Gasolina";
  });

  const byId = new Map();
  filtered.forEach((record, index) => {
    const id = String(record?.id || `fuel-record-${index + 1}`);
    if (!byId.has(id)) byId.set(id, normalizeFuelRecord(record, id));
  });

  return {
    records: Array.from(byId.values()),
    storageError,
  };
}
