import { Building2, CalendarDays, FileText, Landmark } from "lucide-react";

export function getSidebarNavItems({
  location,
  navigate,
  canAccessFacilityAdmin,
  canAccessOrganizationAdmin,
  hasAnyAdminAccess,
}) {
  const adminItems =
    canAccessFacilityAdmin && canAccessOrganizationAdmin
      ? [
          {
            key: "organization-admin",
            label: "Org Admin",
            icon: Landmark,
            isActive: location.pathname.startsWith("/admin/organization"),
            onClick: () => navigate("/admin/organization"),
          },
          {
            key: "facility-admin",
            label: "Facility Admin",
            icon: Building2,
            isActive: location.pathname.startsWith("/admin/facility"),
            onClick: () => navigate("/admin/facility"),
          },
        ]
      : [
          {
            key: "admin",
            label: canAccessOrganizationAdmin ? "Org Admin" : "Facility Admin",
            icon: canAccessOrganizationAdmin ? Landmark : Building2,
            isActive: location.pathname.startsWith("/admin"),
            onClick: () => navigate("/admin"),
            isVisible: hasAnyAdminAccess,
          },
        ];

  return [
    {
      key: "schedule",
      label: "Schedule",
      icon: CalendarDays,
      isActive:
        location.pathname.startsWith("/schedule") ||
        location.pathname.startsWith("/appointments"),
      onClick: () => navigate("/schedule"),
    },
    {
      key: "documents",
      label: "Documents",
      icon: FileText,
      isActive: location.pathname.startsWith("/documents"),
      onClick: () => navigate("/documents"),
    },
    ...adminItems,
  ].filter((item) => item.isVisible !== false);
}
