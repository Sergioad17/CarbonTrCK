import {
  createFactorNewVersionService,
  createFactorService,
  getDefaultFactorService,
  getFactorUsageCountService,
  listFactorsService,
  updateFactorDefaultService,
  updateFactorService,
  updateFactorStatusService,
} from "./factors.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function listFactorsController(request, response) {
  response.json({ factors: await listFactorsService(request.user) });
}

export async function getDefaultFactorController(request, response) {
  response.json({ factor: await getDefaultFactorService(request.query.scope, request.query.category) });
}

export async function getFactorUsageCountController(request, response) {
  response.json({ count: await getFactorUsageCountService(request.user, request.params.id) });
}

export async function createFactorController(request, response) {
  response.status(201).json({ factor: await createFactorService(request.user, request.body, auditContextFromRequest(request)) });
}

export async function updateFactorController(request, response) {
  response.json({ factor: await updateFactorService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function createFactorNewVersionController(request, response) {
  response
    .status(201)
    .json({ factor: await createFactorNewVersionService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function updateFactorDefaultController(request, response) {
  response.json({ factor: await updateFactorDefaultService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function updateFactorStatusController(request, response) {
  response.json({ factor: await updateFactorStatusService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}
