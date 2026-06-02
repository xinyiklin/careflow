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
      { key: "clinical.unsign", label: "Unsign progress notes" },
    ],
  },
  {
    key: "medications",
    label: "Medications",
    permissions: [
      { key: "medications.view", label: "View medications" },
      { key: "medications.manage", label: "Manage medications" },
      { key: "medications.refill.approve", label: "Approve refill requests" },
      { key: "medications.prescribe", label: "Prescribe (e-prescribing)" },
    ],
  },
  {
    key: "messaging",
    label: "Messaging",
    permissions: [
      { key: "messaging.view", label: "View messages" },
      { key: "messaging.respond", label: "Reply to messages" },
    ],
  },
  {
    key: "allergies",
    label: "Allergies",
    permissions: [
      { key: "allergies.view", label: "View allergies" },
      { key: "allergies.manage", label: "Manage allergies" },
    ],
  },
  {
    key: "insurance",
    label: "Insurance",
    permissions: [
      { key: "insurance.view", label: "View insurance policies" },
      { key: "insurance.manage", label: "Manage insurance policies" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    permissions: [
      { key: "billing.view", label: "View billing" },
      { key: "billing.manage", label: "Manage charge capture" },
      {
        key: "billing.fee_schedules.manage",
        label: "Manage fee schedules",
      },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    permissions: [
      { key: "documents.view", label: "View documents" },
      { key: "documents.manage", label: "Upload and edit documents" },
      { key: "documents.delete", label: "Delete documents" },
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
      {
        key: "pharmacies.organization.manage",
        label: "Manage organization pharmacies",
      },
      {
        key: "pharmacies.facility.manage",
        label: "Manage facility pharmacies",
      },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    permissions: [
      { key: "admin.facility.manage", label: "Manage facility settings" },
      { key: "admin.security.manage", label: "Manage security permissions" },
    ],
  },
  {
    key: "audit",
    label: "Audit & Compliance",
    permissions: [{ key: "audit.view", label: "View activity log" }],
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
