import {
  createDeviceReadingService,
  createDeviceService,
  duplicateDeviceService,
  listDeviceReadingsService,
  listDeviceTrainingReadingsService,
  listDevicesService,
  removeDeviceService,
  removeDeviceReadingService,
  updateDeviceService,
  updateDeviceReadingTrainingService,
  updateDeviceStatusService,
} from "./devices.service.js";

function buildAuditContext(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function listDevicesController(request, response) {
  const items = await listDevicesService(request.user);
  response.json({ items });
}

export async function createDeviceController(request, response) {
  const item = await createDeviceService(request.user, request.body, buildAuditContext(request));
  response.status(201).json({ item });
}

export async function updateDeviceController(request, response) {
  const item = await updateDeviceService(request.user, request.params.id, request.body, buildAuditContext(request));
  response.json({ item });
}

export async function updateDeviceStatusController(request, response) {
  const item = await updateDeviceStatusService(request.user, request.params.id, request.body, buildAuditContext(request));
  response.json({ item });
}

export async function duplicateDeviceController(request, response) {
  const item = await duplicateDeviceService(request.user, request.params.id, buildAuditContext(request));
  response.status(201).json({ item });
}

export async function removeDeviceController(request, response) {
  await removeDeviceService(request.user, request.params.id, buildAuditContext(request));
  response.status(204).send();
}

export async function listDeviceReadingsController(request, response) {
  const items = await listDeviceReadingsService(request.user, request.params.id, request.query);
  response.json({ items });
}

export async function listDeviceTrainingReadingsController(request, response) {
  const items = await listDeviceTrainingReadingsService(request.user, request.params.id, request.query);
  response.json({ items });
}

export async function updateDeviceReadingTrainingController(request, response) {
  const item = await updateDeviceReadingTrainingService(
    request.user,
    request.params.id,
    request.params.readingId,
    request.body,
    buildAuditContext(request),
  );
  response.json({ item });
}

export async function removeDeviceReadingController(request, response) {
  await removeDeviceReadingService(request.user, request.params.id, request.params.readingId, buildAuditContext(request));
  response.status(204).send();
}

export async function createDeviceReadingController(request, response) {
  const item = await createDeviceReadingService(request.device, request.body, buildAuditContext(request));
  response.status(201).json(item);
}
