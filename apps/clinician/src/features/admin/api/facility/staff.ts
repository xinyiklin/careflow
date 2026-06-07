import { apiRequest } from "../../../../shared/api/client";
import { facilityParams } from "./scope";

import type {
  ApiParams,
  ApiPayload,
  EntityId,
} from "../../../../shared/api/types";
import type { ApiRecord } from "../../../../shared/types/domain";
import type { AdminStaff, AdminStaffRole } from "../../types";

export function fetchStaff(
  facilityId: EntityId | null | undefined,
  extraParams: ApiParams = {}
) {
  return apiRequest<AdminStaff[]>("/facilities/staff/", {
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
  return apiRequest<AdminStaff>("/facilities/staff/", {
    method: "POST",
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateStaff(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminStaff>(`/facilities/staff/${id}/`, {
    method: "PATCH",
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function updateStaffRole(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminStaffRole>(`/facilities/staff-roles/${id}/`, {
    method: "PATCH",
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function deactivateStaff(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<ApiRecord>(`/facilities/staff/${id}/`, {
    method: "DELETE",
    params: facilityParams(facilityId),
  });
}

export function createStaffRole(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest<AdminStaffRole>("/facilities/staff-roles/", {
    method: "POST",
    params: facilityParams(facilityId),
    body: JSON.stringify(data),
  });
}

export function deleteStaffRole(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<ApiRecord>(`/facilities/staff-roles/${id}/`, {
    method: "DELETE",
    params: facilityParams(facilityId),
  });
}
