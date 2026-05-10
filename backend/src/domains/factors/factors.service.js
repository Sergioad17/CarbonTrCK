import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import {
  createFactor,
  createFactorNewVersion,
  getDefaultFactor,
  getFactorUsageCount,
  listFactors,
  updateFactor,
  updateFactorDefault,
  updateFactorStatus,
} from "./factors.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

function scopeForCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized === "combustible") return "scope1";
  if (normalized === "electricidad") return "scope2";
  if (normalized === "otros") return "scope3";
  return "";
}

function withDerivedScope(payload) {
  const derivedScope = scopeForCategory(payload?.category);
  return derivedScope ? { ...payload, scope: derivedScope } : payload;
}

export async function listFactorsService(actor) {
  return listFactors(actor);
}

export async function getDefaultFactorService(scope, category) {
  assertRequiredString(scope, "scope");
  assertRequiredString(category, "category");
  return getDefaultFactor(scope, category);
}

export async function getFactorUsageCountService(actor, factorId) {
  assertRequiredString(factorId, "factorId");
  return getFactorUsageCount(actor, factorId);
}

export async function createFactorService(actor, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(payload.category, "category");
  payload = withDerivedScope(payload);
  assertRequiredString(payload.scope, "scope");
  assertRequiredString(payload.metric, "metric");
  assertRequiredString(payload.denominatorUnit, "denominatorUnit");
  assertRequiredString(payload.validFrom, "validFrom");
  return createFactor(actor, payload, auditContext);
}

export async function updateFactorService(actor, factorId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(factorId, "factorId");
  return updateFactor(actor, factorId, withDerivedScope(payload), auditContext);
}

export async function createFactorNewVersionService(actor, factorId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(factorId, "factorId");
  assertRequiredString(payload.validFrom, "validFrom");
  return createFactorNewVersion(actor, factorId, withDerivedScope(payload), auditContext);
}

export async function updateFactorDefaultService(actor, factorId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(factorId, "factorId");
  return updateFactorDefault(actor, factorId, Boolean(payload.force), auditContext);
}

export async function updateFactorStatusService(actor, factorId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(factorId, "factorId");
  if (typeof payload.isActive !== "boolean") {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "isActive must be a boolean.",
      details: { field: "isActive" },
    });
  }
  return updateFactorStatus(actor, factorId, payload.isActive, auditContext);
}
