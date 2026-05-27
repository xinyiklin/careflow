import useAdminFacility from "../shared/useAdminFacility";
import useFacilityConfigData from "../../../facilities/hooks/useFacilityConfigData";

import type { EntityId } from "../../../../shared/api/types";

export default function useAdminFacilityConfig(
  facilityIdArg: EntityId | null = null
) {
  const { selectedAdminFacilityId } = useAdminFacility();
  const facilityId = facilityIdArg || selectedAdminFacilityId;

  return useFacilityConfigData({
    facilityId,
    enabled: true,
  });
}
