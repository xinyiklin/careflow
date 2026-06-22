export const ORGANIZATION_PERMISSION_GROUPS = [
  {
    key: "profile",
    label: "Organization Profile",
    permissions: [
      { key: "org.profile.view", label: "View organization details" },
      { key: "org.profile.update", label: "Edit organization details" },
    ],
  },
  {
    key: "facilities",
    label: "Facilities",
    permissions: [
      { key: "org.facilities.view", label: "View facilities" },
      { key: "org.facilities.manage", label: "Create and edit facilities" },
    ],
  },
  {
    key: "users",
    label: "User Management",
    permissions: [
      { key: "org.users.view", label: "View organization users" },
      { key: "org.users.manage", label: "Invite and manage users" },
    ],
  },
  {
    key: "payers_pharmacies",
    label: "Payers & Pharmacies",
    permissions: [
      { key: "org.payers.manage", label: "Manage payers preference list" },
      {
        key: "org.pharmacies.manage",
        label: "Manage pharmacies preference list",
      },
    ],
  },
  {
    key: "billing",
    label: "Billing Settings",
    permissions: [
      {
        key: "org.fee_schedules.manage",
        label: "Manage organization fee schedules",
      },
    ],
  },
  {
    key: "audit",
    label: "Audit Logs",
    permissions: [
      { key: "org.audit.view", label: "View organization activity log" },
    ],
  },
  {
    key: "security",
    label: "Security",
    permissions: [
      { key: "org.security.manage", label: "Manage security permissions" },
    ],
  },
] as const;

export const ORGANIZATION_PERMISSION_KEYS =
  ORGANIZATION_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => permission.key)
  );

export type OrganizationPermissionKey =
  (typeof ORGANIZATION_PERMISSION_KEYS)[number];
