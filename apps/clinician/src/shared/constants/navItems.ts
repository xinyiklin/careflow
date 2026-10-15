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
import type { Location } from "react-router-dom";

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  to: string;
  group: "workflow" | "admin";
  isVisible?: boolean;
  badgeCount?: number;
};

type SidebarNavOptions = {
  location: Location;
  canAccessFacilityAdmin: boolean;
  canAccessOrganizationAdmin: boolean;
  canViewBilling?: boolean;
  canViewMessaging?: boolean;
  canViewMedications?: boolean;
  inboxUnreadCount?: number;
};

export function getSidebarNavItems({
  location,
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
      to: "/admin/facility",
      group: "admin",
      isVisible: canAccessFacilityAdmin,
    },
    {
      key: "organization-admin",
      label: "Org Admin",
      icon: Building2,
      isActive: location.pathname.startsWith("/admin/organization"),
      to: "/admin/organization",
      group: "admin",
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
      to: "/schedule",
      group: "workflow",
    },
    {
      key: "documents",
      label: "Documents",
      icon: FileText,
      isActive: location.pathname.startsWith("/documents"),
      to: "/documents",
      group: "workflow",
    },
    {
      key: "billing",
      label: "Billing",
      icon: CreditCard,
      isActive: location.pathname.startsWith("/billing"),
      to: "/billing",
      group: "workflow",
      isVisible: canViewBilling,
    },
    {
      key: "inbox",
      label: "Inbox",
      icon: Inbox,
      isActive: location.pathname.startsWith("/inbox"),
      to: "/inbox",
      group: "workflow",
      isVisible: canViewMessaging,
      badgeCount: inboxUnreadCount,
    },
    {
      key: "refills",
      label: "Refills",
      icon: Pill,
      isActive: location.pathname.startsWith("/refills"),
      to: "/refills",
      group: "workflow",
      isVisible: canViewMedications,
    },
    ...adminItems,
  ];

  return navItems.filter((item) => item.isVisible !== false);
}
