import crypto from "node:crypto";

export function requestIdMiddleware(request, response, next) {
  const requestId = request.headers["x-request-id"] || crypto.randomUUID();
  request.requestId = String(requestId);
  response.setHeader("x-request-id", request.requestId);
  next();
}
