import { useCallback, useRef, useState } from "react";
import {
  getInitialNavigationCollapsed,
  selectNavigationMode,
  toggleNavigation,
} from "./mainNavigationPreference";
import type { UserPreferences } from "../../shared/types/domain";

export default function useMainNavigationPreference(
  preferences: UserPreferences,
  update: (patch: Partial<UserPreferences>) => void
) {
  const [isSidebarCollapsed, setCollapsed] = useState(() =>
    getInitialNavigationCollapsed(preferences)
  );
  const collapsedRef = useRef(isSidebarCollapsed);
  const applyCollapsed = useCallback((collapsed: boolean) => {
    collapsedRef.current = collapsed;
    setCollapsed(collapsed);
  }, []);
  const setSidebarStartupMode = useCallback(
    (mode: UserPreferences["sidebarStartupMode"]) => {
      const next = selectNavigationMode(mode, collapsedRef.current);
      applyCollapsed(next.collapsed);
      update(next.preferences);
    },
    [applyCollapsed, update]
  );
  const toggleSidebar = useCallback(() => {
    const next = toggleNavigation(
      preferences.sidebarStartupMode,
      collapsedRef.current
    );
    applyCollapsed(next.collapsed);
    update(next.preferences);
  }, [applyCollapsed, preferences.sidebarStartupMode, update]);
  return {
    isSidebarCollapsed,
    setSidebarStartupMode,
    toggleSidebar,
    applyCollapsed,
  };
}
