import { useLocation, useNavigate } from "react-router-dom";

import useAdminPermissions from "../../features/admin/hooks/shared/useAdminPermissions";
import { APP_NAME } from "../constants/app";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
} from "../constants/layout";
import { getSidebarNavItems } from "../constants/navItems";
import { CareFlowIcon } from "./icons";
import SidebarItem from "./SidebarItem";

export default function AppSidebar({ isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canAccessFacilityAdmin,
    canAccessOrganizationAdmin,
    hasAnyAdminAccess,
  } = useAdminPermissions();

  const navItems = getSidebarNavItems({
    location,
    navigate,
    canAccessFacilityAdmin,
    canAccessOrganizationAdmin,
    hasAnyAdminAccess,
  });

  return (
    <aside
      className="relative h-full shrink-0 will-change-[width] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
      }}
    >
      <div className="h-full">
        <div className="cf-sidebar flex h-full flex-col px-3 py-3">
          <div
            className={[
              "cf-sidebar-brand flex min-h-14 items-center",
              isCollapsed ? "justify-center px-1" : "gap-3 px-2.5",
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
                "min-w-0 overflow-hidden text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isCollapsed
                  ? "max-w-0 translate-x-1 opacity-0"
                  : "max-w-[140px] translate-x-0 opacity-100 delay-75",
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
                />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}
