import { useAuth } from "../../auth/AuthProvider";
import useFacility from "./useFacility";
import useFacilityConfigData from "./useFacilityConfigData";

export default function useFacilityConfig() {
  const { isAuthenticated } = useAuth();
  const { selectedFacilityId } = useFacility();

  return useFacilityConfigData({
    facilityId: selectedFacilityId,
    enabled: isAuthenticated,
  });
}
