import {
  type ConfigurableGroupRole,
  type Group,
  type GroupPermission,
  type GroupRole,
  type RolePermissionsMap,
  DEFAULT_ROLE_PERMISSIONS,
} from "./types";

/**
 * Zwraca informację, czy dana rola w danej grupie posiada określone uprawnienie.
 * Właściciel grupy (owner) zawsze posiada wszystkie uprawnienia.
 */
export const hasGroupPermission = (
  group: Group | null | undefined,
  role: GroupRole | undefined,
  permission: GroupPermission
): boolean => {
  if (!group || !role) return false;
  if (role === "owner") return true;

  if (role === "admin" || role === "moderator" || role === "member") {
    const roleConfig = group.rolePermissions?.[role];
    if (roleConfig && typeof roleConfig[permission] === "boolean") {
      return roleConfig[permission];
    }
    return DEFAULT_ROLE_PERMISSIONS[role][permission];
  }

  return false;
};

/**
 * Zwraca kompletny słownik uprawnień dla określonej roli konfigurowalnej,
 * łącząc zapisane w bazie ustawienia z domyślnymi fallbackami.
 */
export const getGroupRolePermissions = (
  group: Group | null | undefined,
  role: ConfigurableGroupRole
): Record<GroupPermission, boolean> => {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role];
  const stored = group?.rolePermissions?.[role];

  return {
    editGroup: typeof stored?.editGroup === "boolean" ? stored.editGroup : defaults.editGroup,
    manageMembers: typeof stored?.manageMembers === "boolean" ? stored.manageMembers : defaults.manageMembers,
    manageRequests: typeof stored?.manageRequests === "boolean" ? stored.manageRequests : defaults.manageRequests,
    inviteMembers: typeof stored?.inviteMembers === "boolean" ? stored.inviteMembers : defaults.inviteMembers,
  };
};

/**
 * Zwraca pełną mapę uprawnień dla wszystkich ról w grupie.
 */
export const getAllGroupRolePermissions = (
  group: Group | null | undefined
): RolePermissionsMap => {
  return {
    admin: getGroupRolePermissions(group, "admin"),
    moderator: getGroupRolePermissions(group, "moderator"),
    member: getGroupRolePermissions(group, "member"),
  };
};
