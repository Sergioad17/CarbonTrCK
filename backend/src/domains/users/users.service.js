import { AppError } from "../../shared/errors/app-error.js";
import { assertPasswordComplexity, generateTemporaryPassword } from "../../shared/utils/password.js";
import { assertEmail, assertRequiredString } from "../../shared/utils/validation.js";
import { getSecurityConfigForOrganization } from "../admin/admin.repository.js";
import {
  createUser,
  createRole,
  deleteRole,
  deleteUser,
  listPermissionsCatalog,
  listRolesCatalog,
  listUsers,
  resetUserPassword,
  updateRolePermissions,
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

export async function listRolesPermissionsService(actor) {
  const [roles, permissions] = await Promise.all([
    listRolesCatalog(actor, { includeDetails: true }),
    listPermissionsCatalog(),
  ]);

  return { roles, permissions };
}

export async function updateRolePermissionsService(actor, roleId, payload, auditContext) {
  if (!Array.isArray(payload.permissions)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "permissions must be an array.",
    });
  }

  return updateRolePermissions(actor, roleId, payload.permissions, auditContext);
}

export async function createRoleService(actor, payload, auditContext) {
  assertRequiredString(payload.name || payload.label, "name");
  const name = String(payload.name || payload.label || "").trim();

  if (name.length > 80) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "name must be 80 characters or fewer.",
    });
  }

  if (payload.permissions !== undefined && !Array.isArray(payload.permissions)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "permissions must be an array.",
    });
  }

  if (payload.color && !/^#[0-9a-fA-F]{6}$/.test(String(payload.color).trim())) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "color must be a valid hex color.",
    });
  }

  return createRole(actor, { ...payload, name }, auditContext);
}

export async function deleteRoleService(actor, roleId, auditContext) {
  return deleteRole(actor, roleId, auditContext);
}

export async function createUserService(actor, payload, auditContext) {
  validateUserPayload(payload);
  const securityConfig = await getSecurityConfigForOrganization(actor.organizationId);
  const temporaryPassword = payload.temporaryPassword || generateTemporaryPassword(securityConfig);
  assertPasswordComplexity(temporaryPassword, securityConfig);
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

export async function deleteUserService(actor, userId, auditContext) {
  return deleteUser(actor, userId, auditContext);
}

export async function resetUserPasswordService(actor, userId, auditContext) {
  const securityConfig = await getSecurityConfigForOrganization(actor.organizationId);
  const temporaryPassword = generateTemporaryPassword(securityConfig);
  assertPasswordComplexity(temporaryPassword, securityConfig);
  return resetUserPassword(actor, userId, auditContext, temporaryPassword);
}
