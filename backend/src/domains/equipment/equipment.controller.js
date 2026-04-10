import {
  createEquipmentService,
  duplicateEquipmentService,
  listEquipmentService,
  updateEquipmentService,
  updateEquipmentStatusService,
} from "./equipment.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function listEquipmentController(request, response) {
  response.json({ items: await listEquipmentService(request.user) });
}

export async function createEquipmentController(request, response) {
  response.status(201).json({ item: await createEquipmentService(request.user, request.body, auditContextFromRequest(request)) });
}

export async function updateEquipmentController(request, response) {
  response.json({ item: await updateEquipmentService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function updateEquipmentStatusController(request, response) {
  response.json({ item: await updateEquipmentStatusService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function duplicateEquipmentController(request, response) {
  response.status(201).json({ item: await duplicateEquipmentService(request.user, request.params.id, auditContextFromRequest(request)) });
}
