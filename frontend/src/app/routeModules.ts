import { lazy } from "react";

import type { ComponentType, LazyExoticComponent } from "react";

type ComponentModule = { default: ComponentType<unknown> };
type RouteImporter = () => Promise<ComponentModule>;
type PreloadableComponent = LazyExoticComponent<ComponentType<unknown>> & {
  preload: () => Promise<ComponentModule>;
};

function preloadableLazy(importer: RouteImporter): PreloadableComponent {
  let loadPromise: Promise<ComponentModule> | null = null;

  const load = () => {
    if (!loadPromise) {
      loadPromise = importer();
    }

    return loadPromise;
  };

  const Component = lazy(load) as PreloadableComponent;
  Component.preload = load;

  return Component;
}

export const SchedulePage = preloadableLazy(
  () => import("../features/schedule/pages/SchedulePage")
);
export const DocumentsPage = preloadableLazy(
  () => import("../features/documents/pages/DocumentsPage")
);
export const AdminRedirect = preloadableLazy(
  () => import("../features/admin/pages/AdminRedirect")
);
export const OrganizationAdminPage = preloadableLazy(
  () => import("../features/admin/pages/OrganizationAdminPage")
);
export const FacilityAdminPage = preloadableLazy(
  () => import("../features/admin/pages/FacilityAdminPage")
);

export function preloadRouteForPath(pathname: string) {
  if (
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/appointments")
  ) {
    return SchedulePage.preload();
  }

  if (pathname.startsWith("/documents")) {
    return DocumentsPage.preload();
  }

  if (pathname.startsWith("/admin/organization")) {
    return OrganizationAdminPage.preload();
  }

  if (pathname.startsWith("/admin/facility")) {
    return FacilityAdminPage.preload();
  }

  if (pathname.startsWith("/admin")) {
    return AdminRedirect.preload();
  }

  return SchedulePage.preload();
}
