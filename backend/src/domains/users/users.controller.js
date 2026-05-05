import {
  createUserService,
  createRoleService,
  deleteRoleService,
  deleteUserService,
  listRolesPermissionsService,
  listRolesService,
  listUsersService,
  resetUserPasswordService,
  updateRolePermissionsService,
  updateUserService,
  updateUserStatusService,
} from "./users.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function listUsersController(request, response) {
  const users = await listUsersService(request.user, request.query);
  response.json({ users });
}

export async function listRolesController(request, response) {
  const roles = await listRolesService(request.user);
  response.json({ roles });
}

export async function listRolesPermissionsController(request, response) {
  response.json(await listRolesPermissionsService(request.user));
}

export async function createUserController(request, response) {
  const result = await createUserService(request.user, request.body, auditContextFromRequest(request));
  response.status(201).json({
    user: result.user,
    temporaryPassword: result.temporaryPassword,
  });
}

export async function updateUserController(request, response) {
  const user = await updateUserService(request.user, request.params.id, request.body, auditContextFromRequest(request));
  response.json({ user });
}

export async function updateUserStatusController(request, response) {
  const user = await updateUserStatusService(request.user, request.params.id, request.body, auditContextFromRequest(request));
  response.json({ user });
}

export async function updateRolePermissionsController(request, response) {
  response.json(await updateRolePermissionsService(
    request.user,
    request.params.id,
    request.body,
    auditContextFromRequest(request),
  ));
}

export async function createRoleController(request, response) {
  response.status(201).json(await createRoleService(
    request.user,
    request.body,
    auditContextFromRequest(request),
  ));
}

export async function deleteRoleController(request, response) {
  response.json(await deleteRoleService(
    request.user,
    request.params.id,
    auditContextFromRequest(request),
  ));
}

export async function deleteUserController(request, response) {
  const result = await deleteUserService(request.user, request.params.id, auditContextFromRequest(request));
  response.json(result);
}

export async function resetUserPasswordController(request, response) {
  const temporaryPassword = await resetUserPasswordService(request.user, request.params.id, auditContextFromRequest(request));
  response.json({
    ok: true,
    temporaryPassword,
  });
}
