import { apiRequest } from "../../../../shared/api/client";
import { facilityParams } from "./scope";

import type {
  ApiParams,
  ApiPayload,
  EntityId,
} from "../../../../shared/api/types";

export function fetchStaff(
  facilityId: EntityId | null | undefined,
  extraParams: ApiParams = {}
) {
  return apiRequest("/facilities/staff/", {
    includeFacilityId: !facilityId,
    params: {
      ...facilityParams(facilityId),
      ...extraParams,
    },
  });
}

export function createStaff(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest("/facilities/staff/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateStaff(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest(`/facilities/staff/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateStaffRole(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest(`/facilities/staff-roles/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function deactivateStaff(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest(`/facilities/staff/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
  });
}
