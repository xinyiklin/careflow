import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider";
import useFacility from "../features/facilities/hooks/useFacility";
import LoadingScreen from "../shared/components/LoadingScreen";
import useMinimumLoading from "../shared/hooks/useMinimumLoading";
import { BootReadinessProvider } from "./BootReadinessContext";
import { preloadRouteForPath } from "./routeModules";

function App() {
  const { user, loading: authLoading } = useAuth();
  const { facility, selectedFacilityId } = useFacility();
  const location = useLocation();
  const [isRoutePreloading, setIsRoutePreloading] = useState(true);
  const [isShellReady, setIsShellReady] = useState(false);
  const [, setIsRouteReady] = useState(false);
  const hasCompletedInitialPreloadRef = useRef(false);
  const hasCompletedInitialBootRef = useRef(false);
  const canRenderWorkspace = !!user && !!facility && !!selectedFacilityId;
  const bootLoading =
    authLoading || isRoutePreloading || (canRenderWorkspace && !isShellReady);
  const showBootLoading = useMinimumLoading(bootLoading);

  useEffect(() => {
    let isCurrent = true;

    if (!hasCompletedInitialBootRef.current) {
      setIsRouteReady(false);
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
  }, [location.pathname]);

  useEffect(() => {
    if (!canRenderWorkspace || showBootLoading) return;
    hasCompletedInitialBootRef.current = true;
  }, [canRenderWorkspace, showBootLoading]);

  if (!bootLoading) {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (!canRenderWorkspace) {
      return (
        <div className="flex h-[100dvh] items-center justify-center bg-cf-page-bg px-4">
          <div className="w-full max-w-lg rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            No facility is selected or available for this account.
          </div>
        </div>
      );
    }
  }

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-cf-page-bg">
      {showBootLoading ? (
        <div className="fixed inset-0 z-[100]">
          <LoadingScreen
            title="Restoring session"
            message="Checking your CareFlow access and active facility."
          />
        </div>
      ) : null}

      {canRenderWorkspace ? (
        <div
          className={
            bootLoading || showBootLoading ? "hidden" : "h-full w-full"
          }
        >
          <BootReadinessProvider
            setShellReady={setIsShellReady}
            setRouteReady={setIsRouteReady}
          >
            <Outlet />
          </BootReadinessProvider>
        </div>
      ) : null}
    </div>
  );
}

export default App;
