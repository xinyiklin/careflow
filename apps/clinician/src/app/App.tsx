import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider";
import useFacility from "../features/facilities/hooks/useFacility";
import LoadingScreen from "../shared/components/LoadingScreen";
import useMinimumLoading from "../shared/hooks/useMinimumLoading";
import { BootReadinessProvider } from "./BootReadinessContext";
import { preloadRouteForPath } from "./routeModules";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { facility, selectedFacilityId } = useFacility();
  const location = useLocation();
  const [isRoutePreloading, setIsRoutePreloading] = useState(false);
  const [isShellReady, setIsShellReady] = useState(false);
  const hasCompletedInitialPreloadRef = useRef(false);
  const isAuthenticated = Boolean(user);
  const canRenderWorkspace = !!user && !!facility && !!selectedFacilityId;
  // We only know a user has *no* assignable facilities once the user
  // object is loaded AND it reports an empty memberships array. While
  // memberships exist, FacilityProvider is still resolving the active
  // selection and the workspace should keep waiting instead of flashing
  // the "no facility" fallback.
  const hasNoFacilities = !!user && !user.memberships?.length;
  // App-level LoadingScreen only covers the cold-start path: auth,
  // facility resolution, route chunk preload, and initial shell layout.
  // Once those resolve, the LoadingScreen is permanently dismissed and
  // any further loading is handled locally by each panel — the panel
  // chrome may render immediately, but its body waits for its primary
  // query so partial/empty fields never flash in.
  const bootLoading =
    authLoading ||
    isRoutePreloading ||
    (!!user && !hasNoFacilities && !canRenderWorkspace) ||
    (canRenderWorkspace && !isShellReady);
  const showBootLoading = useMinimumLoading(bootLoading);

  useEffect(() => {
    let isCurrent = true;

    // An anonymous visit must not wait for a protected route chunk before it
    // can be redirected to login. Reset the preload state on logout so a
    // subsequent authenticated session gets the normal initial preload.
    if (authLoading || !isAuthenticated) {
      hasCompletedInitialPreloadRef.current = false;
      setIsRoutePreloading(false);
      return () => {
        isCurrent = false;
      };
    }

    if (hasCompletedInitialPreloadRef.current) {
      preloadRouteForPath(location.pathname);
      return () => {
        isCurrent = false;
      };
    }

    setIsRoutePreloading(true);
    preloadRouteForPath(location.pathname).finally(() => {
      if (isCurrent) {
        hasCompletedInitialPreloadRef.current = true;
        setIsRoutePreloading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [authLoading, isAuthenticated, location.pathname]);

  if (!bootLoading) {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (hasNoFacilities) {
      return (
        <div className="flex h-[100dvh] items-center justify-center bg-cf-page-bg px-4">
          <div className="w-full max-w-md rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-6 text-sm text-yellow-900 shadow-sm">
            <div className="text-base font-semibold">
              No clinic access on this account
            </div>
            <p className="mt-2 text-yellow-800">
              The account currently signed in isn't assigned to any clinic
              workspace. Try signing in with another account, or contact your
              administrator if you believe this is an error.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center justify-center rounded-lg border border-yellow-300 bg-white px-4 py-2 text-sm font-medium text-yellow-900 shadow-sm transition hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/40"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-cf-page-bg">
      {showBootLoading ? (
        <div className="fixed inset-0 z-[100]">
          {authLoading ? (
            <LoadingScreen
              title="Restoring session"
              message="Checking your CareFlow access and active facility."
            />
          ) : (
            <LoadingScreen
              title="Loading workspace"
              message="Bringing your dashboard into focus."
            />
          )}
        </div>
      ) : null}

      {canRenderWorkspace ? (
        <div
          className={
            bootLoading || showBootLoading ? "hidden" : "h-full w-full"
          }
        >
          <BootReadinessProvider
            isShellReady={isShellReady}
            setShellReady={setIsShellReady}
          >
            <Outlet />
          </BootReadinessProvider>
        </div>
      ) : null}
    </div>
  );
}

export default App;
