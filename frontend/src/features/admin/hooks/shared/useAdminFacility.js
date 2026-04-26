import { useContext } from "react";
import { AdminFacilityContext } from "../../AdminFacilityProvider";

export default function useAdminFacility() {
  const context = useContext(AdminFacilityContext);

  if (!context) {
    throw new Error(
      "useAdminFacility must be used within AdminFacilityProvider"
    );
  }

  return context;
}
