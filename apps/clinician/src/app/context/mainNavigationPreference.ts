import type { UserPreferences } from "../../shared/types/domain";

export function getInitialNavigationCollapsed(preferences: UserPreferences) {
  return preferences.sidebarStartupMode === "remember"
    ? preferences.sidebarLastCollapsed
    : preferences.sidebarStartupMode === "collapsed";
}

export function selectNavigationMode(
  mode: UserPreferences["sidebarStartupMode"],
  collapsed: boolean
) {
  const nextCollapsed = mode === "remember" ? collapsed : mode === "collapsed";
  return {
    collapsed: nextCollapsed,
    preferences: {
      sidebarStartupMode: mode,
      sidebarLastCollapsed: nextCollapsed,
      sidebarCollapsed: nextCollapsed,
    },
  };
}

export function toggleNavigation(
  mode: UserPreferences["sidebarStartupMode"],
  collapsed: boolean
) {
  return {
    collapsed: !collapsed,
    preferences:
      mode === "remember"
        ? { sidebarLastCollapsed: !collapsed, sidebarCollapsed: !collapsed }
        : {},
  };
}
