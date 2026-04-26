import { useContext } from "react";
import { FacilityContext } from "../FacilityProvider";

export default function useFacility() {
  const context = useContext(FacilityContext);

  if (!context) {
    throw new Error("useFacility must be used within FacilityProvider");
  }

  return context;
}
