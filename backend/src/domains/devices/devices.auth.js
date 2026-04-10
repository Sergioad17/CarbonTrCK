import { AppError } from "../../shared/errors/app-error.js";
import { getDeviceAuthContext } from "./devices.repository.js";

export async function requireDeviceAuth(request, _response, next) {
  try {
    const authorization = String(request.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "A valid device Bearer token is required.",
      });
    }

    const device = await getDeviceAuthContext(token);
    if (!device) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "The device credential is invalid.",
      });
    }

    if (!device.is_active) {
      throw new AppError({
        statusCode: 403,
        code: "DEVICE_INACTIVE",
        message: "This device is inactive.",
      });
    }

    request.device = device;
    next();
  } catch (error) {
    next(error);
  }
}
