import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import {
  activateModelForRun,
  createTrainingRun,
  deactivateModelForRun,
  deleteTrainingRun,
  getTrainingRunById,
  getTrainingSummary,
  listTrainingRuns,
  transitionStatus,
} from "./ai-training.repository.js";

const ALLOWED_MODEL_TYPES = new Set(["consumption_prediction", "anomaly_detection", "pattern_classification"]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseDate(value, field) {
  const trimmed = cleanString(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} debe tener formato YYYY-MM-DD.`,
      details: { field },
    });
  }
  return trimmed;
}

function parseRatio(value, field, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} debe ser un número entre 0 y 100.`,
      details: { field },
    });
  }
  return parsed;
}

function parsePositiveInteger(value, field, { allowEmpty = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (allowEmpty) return null;
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} es obligatorio.`,
      details: { field },
    });
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} debe ser un entero positivo.`,
      details: { field },
    });
  }
  return parsed;
}

function normalizeDeviceIds(value) {
  const list = Array.isArray(value) ? value : [];
  const ids = Array.from(new Set(list.map((item) => cleanString(item)).filter(Boolean)));
  if (ids.length === 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "Debes seleccionar al menos un dispositivo.",
      details: { field: "deviceIds" },
    });
  }
  for (const id of ids) {
    if (!UUID_PATTERN.test(id)) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "Cada dispositivo debe enviarse como un UUID válido.",
        details: { field: "deviceIds" },
      });
    }
  }
  return ids;
}

function normalizeModelType(value) {
  const modelType = cleanString(value || "consumption_prediction").toLowerCase();
  if (!ALLOWED_MODEL_TYPES.has(modelType)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "El tipo de modelo no es válido.",
      details: { field: "modelType" },
    });
  }
  return modelType;
}

function normalizeCreatePayload(payload = {}) {
  assertRequiredString(payload.name, "name", "El nombre del entrenamiento es obligatorio.");
  if (payload.useReadyOnly === false) {
    throw new AppError({
      statusCode: 422,
      code: "READY_ONLY_REQUIRED",
      message: "El entrenamiento solo puede usar lecturas listas e incluidas desde Preparación IA.",
    });
  }

  const dateFrom = parseDate(payload.dateFrom, "dateFrom");
  const dateTo = parseDate(payload.dateTo, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "La fecha desde no puede ser posterior a la fecha hasta.",
      details: { field: "dateFrom" },
    });
  }

  const trainRatio = parseRatio(payload.trainRatio, "trainRatio", 70);
  const validationRatio = parseRatio(payload.validationRatio, "validationRatio", 20);
  if (trainRatio + validationRatio > 100) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "trainRatio + validationRatio no puede exceder 100.",
      details: { field: "validationRatio" },
    });
  }

  const maxReadings = parsePositiveInteger(payload.maxReadings, "maxReadings");
  const deviceIds = normalizeDeviceIds(payload.deviceIds);

  return {
    name: cleanString(payload.name).slice(0, 160),
    description: cleanString(payload.description).slice(0, 2000),
    modelType: normalizeModelType(payload.modelType),
    dateFrom,
    dateTo,
    trainRatio,
    validationRatio,
    maxReadings,
    deviceIds,
    parameters: payload.parameters && typeof payload.parameters === "object" && !Array.isArray(payload.parameters) ? payload.parameters : {},
  };
}

export async function listTrainingRunsService(actor) {
  return listTrainingRuns(actor);
}

export async function getTrainingRunService(actor, runId) {
  return getTrainingRunById(actor, runId);
}

export async function getTrainingSummaryService(actor) {
  return getTrainingSummary(actor);
}

export async function createTrainingRunService(actor, payload, auditContext) {
  const normalized = normalizeCreatePayload(payload);
  return createTrainingRun(actor, normalized, auditContext);
}

export async function startTrainingRunService(actor, runId, auditContext) {
  return transitionStatus(
    actor,
    runId,
    "ai_training.start",
    {
      allowedFrom: ["pending"],
      nextStatus: "running",
      touchStartedAt: "set",
      touchFinishedAt: "clear",
      clearError: true,
      invalidMessage: "Solo se puede iniciar un entrenamiento pendiente.",
    },
    auditContext,
  );
}

export async function cancelTrainingRunService(actor, runId, auditContext) {
  return transitionStatus(
    actor,
    runId,
    "ai_training.cancel",
    {
      allowedFrom: ["pending", "running"],
      nextStatus: "cancelled",
      touchFinishedAt: "set",
      invalidMessage: "Solo se puede cancelar un entrenamiento pendiente o en ejecución.",
    },
    auditContext,
  );
}

export async function retryTrainingRunService(actor, runId, auditContext) {
  return transitionStatus(
    actor,
    runId,
    "ai_training.retry",
    {
      allowedFrom: ["failed", "cancelled"],
      nextStatus: "pending",
      touchStartedAt: "clear",
      touchFinishedAt: "clear",
      clearError: true,
      invalidMessage: "Solo se puede reintentar un entrenamiento fallido o cancelado.",
    },
    auditContext,
  );
}

export async function activateTrainingRunService(actor, runId, auditContext) {
  return activateModelForRun(actor, runId, auditContext);
}

export async function deactivateTrainingRunService(actor, runId, auditContext) {
  return deactivateModelForRun(actor, runId, auditContext);
}

export async function deleteTrainingRunService(actor, runId, auditContext) {
  return deleteTrainingRun(actor, runId, auditContext);
}
