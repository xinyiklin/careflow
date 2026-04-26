import useAdminFacility from "../shared/useAdminFacility";
import useFacilityConfigData from "../../../facilities/hooks/useFacilityConfigData";

export default function useAdminFacilityConfig(facilityIdArg = null) {
  const { selectedAdminFacilityId } = useAdminFacility();
  const facilityId = facilityIdArg || selectedAdminFacilityId;

  return useFacilityConfigData({
    facilityId,
    enabled: true,
  });
}
