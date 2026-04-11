import { meService } from "../auth/auth.service.js";
import { updateOwnPasswordService } from "./profile.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function updateOwnPasswordController(request, response) {
  await updateOwnPasswordService(request.user, request.body, auditContextFromRequest(request));
  response.json({ ok: true });
}

export async function getOwnProfileController(request, response) {
  const profile = await meService(request.user);
  response.json({ profile });
}
