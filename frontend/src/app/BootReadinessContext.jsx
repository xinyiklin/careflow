import { createContext, useContext } from "react";

const BootReadinessContext = createContext({
  setShellReady: () => {},
  setRouteReady: () => {},
});

export function BootReadinessProvider({
  children,
  setShellReady,
  setRouteReady,
}) {
  return (
    <BootReadinessContext.Provider value={{ setShellReady, setRouteReady }}>
      {children}
    </BootReadinessContext.Provider>
  );
}

export function useBootReadiness() {
  return useContext(BootReadinessContext);
}
