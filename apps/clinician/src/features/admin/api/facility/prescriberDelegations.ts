import { apiRequest } from "../../../../shared/api/client";
import { facilityParams } from "./scope";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export type PrescriberDelegation = {
  id: number;
  facility: number;
  prescriber: number;
  prescriber_display: string;
  delegate: number;
  delegate_name: string;
  is_active: boolean;
  created_at: string;
};

export function fetchPrescriberDelegations(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<PrescriberDelegation[]>(
    "/medications/prescriber-delegations/",
    {
      includeFacilityId: !facilityId,
      params: facilityParams(facilityId),
    }
  );
}

export function createPrescriberDelegation(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest<PrescriberDelegation>(
    "/medications/prescriber-delegations/",
    {
      method: "POST",
      includeFacilityId: !facilityId,
      params: facilityParams(facilityId),
      body: JSON.stringify(data),
    }
  );
}

export function deletePrescriberDelegation(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<void>(`/medications/prescriber-delegations/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityParams(facilityId),
  });
}
