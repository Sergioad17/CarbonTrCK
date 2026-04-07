import { AppError } from "../../shared/errors/app-error.js";
import { assertPasswordComplexity, generateTemporaryPassword } from "../../shared/utils/password.js";
import { assertEmail, assertRequiredString } from "../../shared/utils/validation.js";
import {
  createUser,
  listRolesCatalog,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "./users.repository.js";

function validateUserPayload(payload) {
  assertRequiredString(payload.firstName, "firstName");
  assertRequiredString(payload.paternalLastName, "paternalLastName");
  assertRequiredString(payload.fullName, "fullName");
  assertRequiredString(payload.campusCode, "campusCode");
  assertRequiredString(payload.role || payload.roleKey, "role");
  assertEmail(payload.email);

  const mode = payload.areaAccess?.mode === "custom" ? "custom" : "all";
  if (mode === "custom" && (!Array.isArray(payload.areaAccess?.areaCodes) || payload.areaAccess.areaCodes.length < 1)) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_AREA_ACCESS",
      message: "Custom area access requires at least one areaCode.",
    });
  }
}

export async function listUsersService(actor, filters) {
  const normalizedFilters = {
    search: String(filters.search || "").trim(),
    campusCode: String(filters.campusCode || "").trim(),
    role: String(filters.role || "").trim().toLowerCase(),
    isActive:
      String(filters.isActive || "").trim() === ""
        ? undefined
        : String(filters.isActive).trim() === "true",
  };

  return listUsers(actor, normalizedFilters);
}

export async function listRolesService(actor) {
  return listRolesCatalog(actor);
}

export async function createUserService(actor, payload, auditContext) {
  validateUserPayload(payload);
  const temporaryPassword = payload.temporaryPassword || generateTemporaryPassword();
  assertPasswordComplexity(temporaryPassword);
  return createUser(actor, { ...payload, temporaryPassword }, auditContext);
}

export async function updateUserService(actor, userId, payload, auditContext) {
  validateUserPayload(payload);
  return updateUser(actor, userId, payload, auditContext);
}

export async function updateUserStatusService(actor, userId, payload, auditContext) {
  if (typeof payload.isActive !== "boolean") {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "isActive must be a boolean.",
    });
  }

  return updateUserStatus(actor, userId, payload.isActive, auditContext);
}

export async function resetUserPasswordService(actor, userId, auditContext) {
  return resetUserPassword(actor, userId, auditContext);
}
