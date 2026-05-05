export function permissionSetFromUser(user) {
  return new Set(Array.isArray(user?.permissions) ? user.permissions.map(String) : []);
}

export function canUse(user, permission) {
  if (!permission) return true;
  return permissionSetFromUser(user).has(permission);
}

export function disabledActionStyle(canUseAction, baseStyle = {}) {
  if (canUseAction) return baseStyle;
  return {
    ...baseStyle,
    opacity: 0.45,
    cursor: "not-allowed",
    filter: "grayscale(0.2)",
  };
}

export function denyAction(onDenied, message = "Tu rol no permite realizar esta acción.") {
  onDenied?.({
    title: "Permiso insuficiente",
    message,
  });
}
