export const SECURITY_PERMISSION_GROUPS = [
  {
    key: "schedule",
    label: "Schedule",
    permissions: [
      { key: "schedule.view", label: "View schedule" },
      { key: "schedule.create", label: "Create appointments" },
      { key: "schedule.update", label: "Edit appointments" },
      { key: "schedule.delete", label: "Delete appointments" },
    ],
  },
  {
    key: "patients",
    label: "Patients",
    permissions: [
      { key: "patients.view", label: "View patients" },
      { key: "patients.create", label: "Create patients" },
      { key: "patients.update", label: "Edit patients" },
      { key: "patients.delete", label: "Delete patients" },
    ],
  },
  {
    key: "clinical",
    label: "Clinical Charting",
    permissions: [
      { key: "clinical.view", label: "View clinical charting" },
      { key: "clinical.create", label: "Start encounters" },
      { key: "clinical.update", label: "Edit draft notes" },
      { key: "clinical.sign", label: "Sign progress notes" },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    permissions: [
      {
        key: "documents.categories.manage",
        label: "Manage document categories",
      },
    ],
  },
  {
    key: "pharmacies",
    label: "Pharmacies",
    permissions: [
      { key: "pharmacies.manage", label: "Manage organization pharmacies" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    permissions: [
      { key: "admin.facility.manage", label: "Manage facility settings" },
    ],
  },
] as const;

export const SECURITY_PERMISSION_KEYS = SECURITY_PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((permission) => permission.key)
);

export type SecurityPermissionKey = (typeof SECURITY_PERMISSION_KEYS)[number];

export type SecurityPermissions = Record<SecurityPermissionKey, boolean>;

export function normalizeSecurityPermissions(
  value: Partial<Record<SecurityPermissionKey, boolean>> = {}
): SecurityPermissions {
  return Object.fromEntries(
    SECURITY_PERMISSION_KEYS.map((permission) => [
      permission,
      Boolean(value?.[permission]),
    ])
  ) as SecurityPermissions;
}
