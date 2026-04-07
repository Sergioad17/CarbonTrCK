import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { getUserAuthorizationContext } from "../../domains/users/users.repository.js";

export async function requireAuth(request, _response, next) {
  try {
    const authorization = String(request.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "A valid Bearer token is required.",
      });
    }

    const payload = verifyAccessToken(token);
    const actor = await getUserAuthorizationContext(payload.sub);

    if (!actor) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "The user for this token no longer exists.",
      });
    }

    if (!actor.isActive) {
      throw new AppError({
        statusCode: 401,
        code: "USER_INACTIVE",
        message: "This user is inactive.",
      });
    }

    request.user = actor;
    request.auth = {
      sessionId: payload.sid,
      organizationId: payload.orgId,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return function roleGuard(request, _response, next) {
    const roleKey = request.user?.roleKey;
    if (!roleKey || !allowedRoles.includes(roleKey)) {
      return next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not have the required role.",
        }),
      );
    }

    return next();
  };
}

export function requirePermission(...requiredPermissions) {
  return function permissionGuard(request, _response, next) {
    const permissionSet = new Set(request.user?.permissions || []);
    const hasPermission = requiredPermissions.every((permission) => permissionSet.has(permission));

    if (!hasPermission) {
      return next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not have the required permission.",
        }),
      );
    }

    return next();
  };
}

export function requireActiveUser(request, _response, next) {
  if (!request.user?.isActive) {
    return next(
      new AppError({
        statusCode: 403,
        code: "USER_INACTIVE",
        message: "This user is inactive.",
      }),
    );
  }

  return next();
}
