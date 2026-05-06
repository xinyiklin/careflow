import { apiRequest } from "../../../../shared/api/client";
import { facilityParams } from "./scope";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export function fetchResources(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/resources/", {
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
  });
}

export function createResource(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest("/facilities/resources/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateResource(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest(`/facilities/resources/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function deactivateResource(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest(`/facilities/resources/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
  });
}
