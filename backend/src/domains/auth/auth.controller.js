import { env } from "../../shared/config/env.js";
import { forgotPasswordService, loginService, meService, refreshService } from "./auth.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function loginController(request, response) {
  const payload = await loginService(request.body, auditContextFromRequest(request), env);
  response.json(payload);
}

export async function meController(request, response) {
  const user = await meService(request.user);
  response.json({ user });
}

export async function refreshController(request, response) {
  const payload = await refreshService(request.body.refreshToken, auditContextFromRequest(request), env);
  response.json(payload);
}

export async function forgotPasswordController(request, response) {
  const payload = await forgotPasswordService(request.body, auditContextFromRequest(request), env);
  response.json(payload);
}
