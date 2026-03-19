function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function toLocalDateISO(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseNdjson(rawInput) {
  const lines = String(rawInput || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("Pega el JSON del dispositivo o sube un archivo .json para continuar.");
  }

  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Linea ${index + 1}: no es un JSON valido.`);
    }
  });
}

function normalizeInput(rawInput) {
  const text = String(rawInput || "").trim();
  if (!text) {
    return {
      ok: false,
      errors: ["Pega el JSON del dispositivo o sube un archivo .json para continuar."],
      items: [],
      raw: null,
    };
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { ok: true, errors: [], items: parsed, raw: parsed };
    if (parsed && typeof parsed === "object") return { ok: true, errors: [], items: [parsed], raw: parsed };
    return {
      ok: false,
      errors: ["El contenido JSON debe ser un objeto, un arreglo de objetos o NDJSON."],
      items: [],
      raw: parsed,
    };
  } catch {
    try {
      const parsedNdjson = parseNdjson(text);
      return { ok: true, errors: [], items: parsedNdjson, raw: parsedNdjson };
    } catch (error) {
      return {
        ok: false,
        errors: [error.message || "El JSON no es valido. Revisa comas, llaves y comillas antes de intentarlo de nuevo."],
        items: [],
        raw: null,
      };
    }
  }
}

function validateReading(item, index) {
  const errors = [];
  const schemaVersion = String(item?.schemaVersion || "").trim();
  const deviceId = String(item?.deviceId || "").trim();
  const timestamp = String(item?.timestamp || "").trim();
  const measurementType = String(item?.measurementType || "").trim();
  const unit = String(item?.energy?.unit || "").trim();
  const totalKWh = item?.energy?.totalKWh;
  const deltaKWh = item?.energy?.deltaKWh;
  const intervalSeconds = item?.intervalSeconds;

  if (!schemaVersion) errors.push("falta schemaVersion");
  if (!deviceId) errors.push("falta deviceId");
  if (!timestamp) errors.push("falta timestamp");
  if (timestamp && Number.isNaN(new Date(timestamp).getTime())) errors.push("timestamp no tiene un formato valido");
  if (measurementType !== "electricity") errors.push('measurementType debe ser "electricity"');
  if (unit !== "kWh") errors.push('energy.unit debe ser "kWh"');
  if (!isFiniteNumber(totalKWh)) errors.push("energy.totalKWh debe ser numerico");
  if (deltaKWh != null && !isFiniteNumber(deltaKWh)) errors.push("energy.deltaKWh debe ser numerico cuando se incluye");
  if (!isFiniteNumber(intervalSeconds)) errors.push("intervalSeconds debe ser numerico");

  if (errors.length) {
    return {
      ok: false,
      index,
      errors,
      message: `Item #${index + 1}: ${errors.join(", ")}.`,
      payload: null,
      raw: item,
    };
  }

  return {
    ok: true,
    index,
    errors: [],
    message: "",
    raw: item,
    payload: {
      schemaVersion,
      readingId: String(item?.readingId || ""),
      deviceId,
      timestamp,
      dateISO: toLocalDateISO(timestamp),
      measurementType,
      sensorType: String(item?.sensorType || ""),
      energy: {
        totalKWh: Number(totalKWh),
        deltaKWh: deltaKWh == null ? null : Number(deltaKWh),
        unit,
      },
      electrical: {
        currentA_rms: item?.electrical?.currentA_rms ?? null,
        voltageV_rms_assumed: item?.electrical?.voltageV_rms_assumed ?? null,
        powerFactor_assumed: item?.electrical?.powerFactor_assumed ?? null,
        powerW_est: item?.electrical?.powerW_est ?? null,
      },
      intervalSeconds: Number(intervalSeconds),
      quality: item?.quality || {},
    },
  };
}

export function parseDevicePayload(rawInput) {
  const normalized = normalizeInput(rawInput);
  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors,
      payload: null,
      items: [],
      validItems: [],
      invalidItems: [],
      raw: normalized.raw,
      summary: {
        total: 0,
        valid: 0,
        invalid: 0,
      },
    };
  }

  const validations = normalized.items.map((item, index) => validateReading(item, index));
  const validItems = validations.filter((item) => item.ok);
  const invalidItems = validations.filter((item) => !item.ok);
  const errors = invalidItems.map((item) => item.message);
  const payload = validItems[0]?.payload || null;

  return {
    ok: validItems.length > 0,
    errors,
    payload,
    items: normalized.items,
    validItems,
    invalidItems,
    raw: normalized.raw,
    summary: {
      total: normalized.items.length,
      valid: validItems.length,
      invalid: invalidItems.length,
    },
  };
}
