import { apiRequest } from "../../../../shared/api/client";
import { facilityParams } from "./scope";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { AdminAppointmentType } from "../../types";

export function fetchAppointmentTypes(facilityId: EntityId | null | undefined) {
  return apiRequest<AdminAppointmentType[]>("/facilities/appointment-types/", {
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
  });
}

export function createAppointmentType(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest<AdminAppointmentType>("/facilities/appointment-types/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateAppointmentType(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminAppointmentType>(
    `/facilities/appointment-types/${id}/`,
    {
      method: "PATCH",
      includeFacilityId: !facilityId,
      params: facilityParams(facilityId),
      body: JSON.stringify(data),
    }
  );
}

export function deleteAppointmentType(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<AdminAppointmentType>(
    `/facilities/appointment-types/${id}/`,
    {
      method: "DELETE",
      includeFacilityId: !facilityId,
      params: facilityParams(facilityId),
    }
  );
}
