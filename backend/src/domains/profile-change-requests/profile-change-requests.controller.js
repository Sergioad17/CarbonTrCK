import {
  createProfileChangeRequestService,
  listProfileChangeRequestsService,
  updateProfileChangeRequestService,
} from "./profile-change-requests.service.js";

export async function listProfileChangeRequestsController(request, response) {
  response.json({ requests: await listProfileChangeRequestsService(request.user) });
}

export async function createProfileChangeRequestController(request, response) {
  response.status(201).json({ request: await createProfileChangeRequestService(request.user, request.body) });
}

export async function updateProfileChangeRequestController(request, response) {
  response.json({ request: await updateProfileChangeRequestService(request.user, request.params.id, request.body) });
}
