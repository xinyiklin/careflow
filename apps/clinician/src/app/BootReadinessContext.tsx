import { createContext, useContext } from "react";

import type { ReactNode } from "react";

/**
 * Tracks the cold-start readiness signal that gates the App-level
 * :class:`LoadingScreen`.
 *
 * ``shellReady`` flips true once auth + facility + initial shell
 * layout has resolved. After that, the LoadingScreen is permanently
 * dismissed for the session and any further loading happens inside
 * the shell.
 *
 * Per-route and per-panel loading is handled locally by each
 * component. Panels gate their body content behind their primary
 * query's ``loading`` flag so they don't render with partial or empty
 * data — no route-level coordination required.
 */
type BootReadinessContextValue = {
  isShellReady: boolean;
  setShellReady: (isReady: boolean) => void;
};

const BootReadinessContext = createContext<BootReadinessContextValue>({
  isShellReady: false,
  setShellReady: () => {},
});

export function BootReadinessProvider({
  children,
  isShellReady,
  setShellReady,
}: BootReadinessContextValue & { children: ReactNode }) {
  return (
    <BootReadinessContext.Provider value={{ isShellReady, setShellReady }}>
      {children}
    </BootReadinessContext.Provider>
  );
}

export function useBootReadiness() {
  return useContext(BootReadinessContext);
}
