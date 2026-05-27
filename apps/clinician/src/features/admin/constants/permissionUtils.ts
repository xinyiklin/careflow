export type PermissionItem = {
  readonly key: string;
  readonly label: string;
};

export type PermissionGroup = {
  readonly key: string;
  readonly label: string;
  readonly permissions: readonly PermissionItem[];
};

export function isDestructivePermission(permissionKey: string) {
  return (
    permissionKey.includes(".delete") ||
    permissionKey.includes(".manage") ||
    permissionKey.includes("admin.")
  );
}

export function permissionMatchesSearch(
  group: PermissionGroup,
  permission: PermissionItem,
  query: string
) {
  if (!query) return true;
  const haystack = [
    group.label,
    group.key,
    permission.label,
    permission.key,
    permission.key.includes(".delete") ? "delete destructive audited" : "",
    permission.key.includes(".manage") ? "manage sensitive audited" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function filterPermissionGroups(
  groups: readonly PermissionGroup[],
  query: string
): readonly PermissionGroup[] {
  const trimmed = query.trim();
  if (!trimmed) return groups;

  return groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        permissionMatchesSearch(group, permission, trimmed)
      ),
    }))
    .filter((group) => group.permissions.length > 0);
}
