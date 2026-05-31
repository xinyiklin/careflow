import {
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Hospital,
  Inbox,
  Pill,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { Location, NavigateFunction } from "react-router-dom";

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  isVisible?: boolean;
  badgeCount?: number;
};

type SidebarNavOptions = {
  location: Location;
  navigate: NavigateFunction;
  canAccessFacilityAdmin: boolean;
  canAccessOrganizationAdmin: boolean;
  canViewBilling?: boolean;
  canViewMessaging?: boolean;
  canViewMedications?: boolean;
  inboxUnreadCount?: number;
};

export function getSidebarNavItems({
  location,
  navigate,
  canAccessFacilityAdmin,
  canAccessOrganizationAdmin,
  canViewBilling = false,
  canViewMessaging = false,
  canViewMedications = false,
  inboxUnreadCount = 0,
}: SidebarNavOptions): SidebarNavItem[] {
  const adminItems = [
    {
      key: "facility-admin",
      label: "Facility Admin",
      icon: Hospital,
      isActive: location.pathname.startsWith("/admin/facility"),
      onClick: () => navigate("/admin/facility"),
      isVisible: canAccessFacilityAdmin,
    },
    {
      key: "organization-admin",
      label: "Org Admin",
      icon: Building2,
      isActive: location.pathname.startsWith("/admin/organization"),
      onClick: () => navigate("/admin/organization"),
      isVisible: canAccessOrganizationAdmin,
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
    {
      key: "inbox",
      label: "Inbox",
      icon: Inbox,
      isActive: location.pathname.startsWith("/inbox"),
      onClick: () => navigate("/inbox"),
      isVisible: canViewMessaging,
      badgeCount: inboxUnreadCount,
    },
    {
      key: "refills",
      label: "Refills",
      icon: Pill,
      isActive: location.pathname.startsWith("/refills"),
      onClick: () => navigate("/refills"),
      isVisible: canViewMedications,
    },
    ...adminItems,
  ];

  return navItems.filter((item) => item.isVisible !== false);
}
