const rolePriorityMap = new Map([
  ["admin", 300],
  ["directivo", 200],
  ["operativo", 100],
]);

export function normalizeRoleKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "administrador") {
    return "admin";
  }

  if (normalized === "capturista") {
    return "operativo";
  }

  return normalized;
}

export function rolePriority(roleKey) {
  return rolePriorityMap.get(normalizeRoleKey(roleKey)) || 0;
}

export function pickPrimaryRole(roles = []) {
  const sortedRoles = [...roles].sort((left, right) => {
    const diff = rolePriority(right.key) - rolePriority(left.key);
    return diff !== 0 ? diff : String(left.label).localeCompare(String(right.label), "es");
  });

  return sortedRoles[0] || { key: "operativo", label: "Operativo" };
}
