import { AppError } from "../../shared/errors/app-error.js";
import { hashPassword, verifyPassword, assertPasswordComplexity } from "../../shared/utils/password.js";
import { getSecurityConfigForOrganization } from "../admin/admin.repository.js";
import { getUserForAuthByEmail, updateOwnPassword } from "../users/users.repository.js";

export async function updateOwnPasswordService(actor, payload, auditContext) {
  const currentPassword = String(payload.currentPassword || "");
  const nextPassword = String(payload.nextPassword || "");

  if (!currentPassword || !nextPassword) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "currentPassword and nextPassword are required.",
    });
  }

  assertPasswordComplexity(nextPassword, await getSecurityConfigForOrganization(actor.organizationId));

  const userRecord = await getUserForAuthByEmail(actor.email);
  const currentPasswordMatches = await verifyPassword(currentPassword, userRecord.password_hash);

  if (!currentPasswordMatches) {
    throw new AppError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Current password is incorrect.",
    });
  }

  const nextPasswordHash = await hashPassword(nextPassword);
  await updateOwnPassword(actor, userRecord.password_hash, nextPasswordHash, auditContext);
}
