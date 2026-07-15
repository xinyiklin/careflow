import { useLocation, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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
    navigate,
    canAccessFacilityAdmin,
    canAccessOrganizationAdmin,
    canViewBilling,
    canViewMessaging,
    canViewMedications,
    inboxUnreadCount,
  });

  return (
    <aside
      className="relative h-full shrink-0 will-change-[width] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
                "min-w-0 origin-left overflow-hidden text-left transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isCollapsed
                  ? "max-w-0 -translate-x-1 scale-x-95 opacity-0"
                  : "max-w-[124px] translate-x-0 scale-x-100 opacity-100 delay-75",
              ].join(" ")}
            >
              <div className="truncate text-sm font-semibold text-[var(--color-cf-sidebar-text)]">
                {APP_NAME}
              </div>
            </div>
          </div>

          <nav className="mt-4 flex-1">
            <div
              className={[
                "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-cf-sidebar-text-muted)] transition-opacity",
                isCollapsed ? "opacity-0" : "opacity-100",
              ].join(" ")}
            >
              Navigate
            </div>
            <div className="space-y-1">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  isActive={item.isActive}
                  isCollapsed={isCollapsed}
                  onClick={item.onClick}
                  badgeCount={item.badgeCount}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}
