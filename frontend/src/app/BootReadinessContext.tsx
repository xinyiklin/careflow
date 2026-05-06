import { createContext, useContext } from "react";

import type { ReactNode } from "react";

type BootReadinessContextValue = {
  setShellReady: (isReady: boolean) => void;
  setRouteReady: (isReady: boolean) => void;
};

const BootReadinessContext = createContext<BootReadinessContextValue>({
  setShellReady: () => {},
  setRouteReady: () => {},
});

export function BootReadinessProvider({
  children,
  setShellReady,
  setRouteReady,
}: BootReadinessContextValue & { children: ReactNode }) {
  return (
    <BootReadinessContext.Provider value={{ setShellReady, setRouteReady }}>
      {children}
    </BootReadinessContext.Provider>
  );
}

export function useBootReadiness() {
  return useContext(BootReadinessContext);
}
