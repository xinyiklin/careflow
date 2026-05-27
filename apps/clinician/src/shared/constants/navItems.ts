import { CalendarDays, FileText, ShieldCheck, CreditCard } from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { Location, NavigateFunction } from "react-router-dom";

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  isVisible?: boolean;
};

type SidebarNavOptions = {
  location: Location;
  navigate: NavigateFunction;
  canAccessFacilityAdmin: boolean;
  canAccessOrganizationAdmin: boolean;
  hasAnyAdminAccess: boolean;
  canViewBilling?: boolean;
};

export function getSidebarNavItems({
  location,
  navigate,
  canAccessFacilityAdmin,
  canAccessOrganizationAdmin,
  hasAnyAdminAccess,
  canViewBilling = false,
}: SidebarNavOptions): SidebarNavItem[] {
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
  ] satisfies SidebarNavItem[];

  const navItems: SidebarNavItem[] = [
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
    {
      key: "billing",
      label: "Billing",
      icon: CreditCard,
      isActive: location.pathname.startsWith("/billing"),
      onClick: () => navigate("/billing"),
      isVisible: canViewBilling,
    },
    ...adminItems,
  ];

  return navItems.filter((item) => item.isVisible !== false);
}
