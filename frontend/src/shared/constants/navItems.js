import { CalendarDays, FileText, ShieldCheck } from "lucide-react";

export function getSidebarNavItems({
  location,
  navigate,
  canAccessFacilityAdmin,
  canAccessOrganizationAdmin,
  hasAnyAdminAccess,
}) {
  const adminItems = [
    {
      key: "admin",
      label: "Admin",
      icon: ShieldCheck,
      isActive: location.pathname.startsWith("/admin"),
      onClick: () => navigate("/admin"),
      isVisible:
        hasAnyAdminAccess ||
        canAccessFacilityAdmin ||
        canAccessOrganizationAdmin,
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
