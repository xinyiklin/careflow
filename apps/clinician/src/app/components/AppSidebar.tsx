import { useLocation } from "react-router-dom";

import useAdminPermissions from "../../features/admin/hooks/shared/useAdminPermissions";
import useFacility from "../../features/facilities/hooks/useFacility";
import { useMessageThreads } from "../../features/messaging/api/messaging";
import { APP_NAME } from "../../shared/constants/app";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
} from "../../shared/constants/layout";
import { getSidebarNavItems } from "../../shared/constants/navItems";
import { CareFlowIcon } from "@careflow/ui-icons";
import SidebarItem from "../../shared/components/SidebarItem";

type AppSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export default function AppSidebar({
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const location = useLocation();
  const { canAccessFacilityAdmin, canAccessOrganizationAdmin } =
    useAdminPermissions();
  const { selectedFacilityId, selectedMembership } = useFacility();
  const permissions = selectedMembership?.effective_security_permissions || {};
  const canViewBilling = Boolean(permissions["billing.view"]);
  const canViewMessaging = Boolean(permissions["messaging.view"]);
  const canViewMedications = Boolean(permissions["medications.view"]);

  // Poll open threads so the sidebar badge reflects new patient messages
  // without a hard refresh. Disabled when the user lacks messaging access.
  const messagingThreadsQuery = useMessageThreads({
    facilityId: selectedFacilityId,
    status: "open",
    enabled: canViewMessaging,
    refetchInterval: 30_000,
  });
  const inboxUnreadCount = canViewMessaging
    ? (messagingThreadsQuery.data ?? []).filter(
        (thread) => thread.unread_for_clinician
      ).length
    : 0;

  const navItems = getSidebarNavItems({
    location,
    canAccessFacilityAdmin,
    canAccessOrganizationAdmin,
    canViewBilling,
    canViewMessaging,
    canViewMedications,
    inboxUnreadCount,
  });
  const workflowItems = navItems.filter((item) => item.group === "workflow");
  const adminItems = navItems.filter((item) => item.group === "admin");

  const renderItem = (item: (typeof navItems)[number]) => (
    <SidebarItem
      key={item.key}
      icon={item.icon}
      label={item.label}
      to={item.to}
      isActive={item.isActive}
      isCollapsed={isCollapsed}
      badgeCount={item.badgeCount}
    />
  );

  return (
    <aside
      className="cf-sidebar-motion relative h-full shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
      }}
    >
      <div className="h-full">
        <div className="cf-sidebar flex h-full flex-col px-2.5 py-3">
          <div
            className={[
              "cf-sidebar-brand flex min-h-14 items-center",
              isCollapsed ? "gap-0 px-0.5" : "gap-2.5 px-0.5",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              className="cf-sidebar-brand-mark flex h-10 w-10 shrink-0 items-center justify-center"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CareFlowIcon className="block h-5 w-5 shrink-0 text-[var(--color-cf-sidebar-accent)]" />
            </button>

            <div
              className={[
                "min-w-0 overflow-hidden text-left transition-[max-width,opacity] duration-150 ease-out",
                isCollapsed
                  ? "max-w-0 opacity-0"
                  : "max-w-[124px] opacity-100 delay-50",
              ].join(" ")}
            >
              <div className="truncate text-sm font-semibold text-[var(--color-cf-sidebar-text)]">
                {APP_NAME}
              </div>
            </div>
          </div>

          <nav aria-label="Primary" className="mt-4 flex-1">
            <div className="space-y-1">{workflowItems.map(renderItem)}</div>
            {adminItems.length ? (
              <>
                <div aria-hidden="true" className="cf-sidebar-divider" />
                <div className="space-y-1">{adminItems.map(renderItem)}</div>
              </>
            ) : null}
          </nav>
        </div>
      </div>
    </aside>
  );
}
