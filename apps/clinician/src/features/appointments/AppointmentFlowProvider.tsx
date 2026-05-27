import { createContext, useContext } from "react";
import useFacility from "../facilities/hooks/useFacility";
import useFacilityConfig from "../facilities/hooks/useFacilityConfig";
import useAppointmentFlow from "./hooks/useAppointmentFlow";

import type { ReactNode } from "react";

type AppointmentFlowContextValue = ReturnType<typeof useAppointmentFlow>;

const AppointmentFlowContext =
  createContext<AppointmentFlowContextValue | null>(null);

export function AppointmentFlowProvider({ children }: { children: ReactNode }) {
  const { facility } = useFacility();
  const { physicians, staffs, resources, statusOptions, typeOptions } =
    useFacilityConfig();

  const flow = useAppointmentFlow({
    facility,
    physicians,
    staffs,
    resources,
    statusOptions,
    typeOptions,
  });

  return (
    <AppointmentFlowContext.Provider value={flow}>
      {children}
    </AppointmentFlowContext.Provider>
  );
}

export function useAppointmentFlowContext() {
  const context = useContext(AppointmentFlowContext);
  if (!context) {
    throw new Error(
      "useAppointmentFlowContext must be used within AppointmentFlowProvider"
    );
  }
  return context;
}
