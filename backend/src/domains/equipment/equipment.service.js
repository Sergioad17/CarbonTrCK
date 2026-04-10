import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import {
  createEquipment,
  duplicateEquipment,
  listEquipment,
  updateEquipment,
  updateEquipmentStatus,
} from "./equipment.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

export async function listEquipmentService(actor) {
  return listEquipment(actor);
}

export async function createEquipmentService(actor, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(payload.campusCode, "campusCode");
  assertRequiredString(payload.areaCode, "areaCode");
  assertRequiredString(payload.name, "name");
  return createEquipment(actor, payload, auditContext);
}

export async function updateEquipmentService(actor, equipmentId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(equipmentId, "equipmentId");
  return updateEquipment(actor, equipmentId, payload, auditContext);
}

export async function updateEquipmentStatusService(actor, equipmentId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(equipmentId, "equipmentId");
  if (typeof payload.isActive !== "boolean") {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "isActive must be a boolean.", details: { field: "isActive" } });
  }
  return updateEquipmentStatus(actor, equipmentId, payload.isActive, auditContext);
}

export async function duplicateEquipmentService(actor, equipmentId, auditContext) {
  assertRequiredString(equipmentId, "equipmentId");
  return duplicateEquipment(actor, equipmentId, auditContext);
}
