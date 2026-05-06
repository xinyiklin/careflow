import type { ApiParams, EntityId } from "../../../../shared/api/types";

export function facilityParams(
  facilityId: EntityId | null | undefined
): ApiParams {
  return facilityId ? { facility_id: facilityId } : {};
}
