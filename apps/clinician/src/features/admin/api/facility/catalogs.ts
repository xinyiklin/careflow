import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type {
  AdminFacilityPayerOverride,
  AdminFacilityPharmacyOverride,
  AdminOrganizationFeeSchedule,
  AdminOrganizationFeeScheduleItem,
} from "../../types";

function withFacility(path: string, facilityId: EntityId | null | undefined) {
  const params = new URLSearchParams();
  if (facilityId) params.set("facility_id", String(facilityId));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function fetchFacilityPayerOverrides(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<AdminFacilityPayerOverride[]>(
    withFacility("/insurance/facility-carrier-overrides/", facilityId)
  );
}

export function updateFacilityPayerOverride(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminFacilityPayerOverride>(
    withFacility(`/insurance/facility-carrier-overrides/${id}/`, facilityId),
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function createFacilityPayerOverride(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest<AdminFacilityPayerOverride>(
    withFacility("/insurance/facility-carrier-overrides/", facilityId),
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function fetchFacilityPharmacyOverrides(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<AdminFacilityPharmacyOverride[]>(
    withFacility("/organizations/facility-pharmacy-overrides/", facilityId)
  );
}

export function updateFacilityPharmacyOverride(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminFacilityPharmacyOverride>(
    withFacility(
      `/organizations/facility-pharmacy-overrides/${id}/`,
      facilityId
    ),
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function createFacilityPharmacyOverride(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest<AdminFacilityPharmacyOverride>(
    withFacility("/organizations/facility-pharmacy-overrides/", facilityId),
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function fetchFacilityFeeSchedules(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<AdminOrganizationFeeSchedule[]>(
    withFacility("/billing/facility-fee-schedules/", facilityId)
  );
}

export function updateFacilityFeeSchedule(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminOrganizationFeeSchedule>(
    withFacility(`/billing/facility-fee-schedules/${id}/`, facilityId),
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function copyOrgScheduleToFacility(
  facilityId: EntityId | null | undefined,
  sourceScheduleId: EntityId
) {
  return apiRequest<AdminOrganizationFeeSchedule>(
    withFacility("/billing/facility-fee-schedules/copy-from-org/", facilityId),
    {
      method: "POST",
      body: JSON.stringify({ source_schedule_id: sourceScheduleId }),
    }
  );
}

export function populateFacilityFeeSchedule(
  facilityId: EntityId | null | undefined,
  scheduleId: EntityId
) {
  return apiRequest<{ added: number }>(
    withFacility(
      `/billing/facility-fee-schedules/${scheduleId}/populate/`,
      facilityId
    ),
    { method: "POST" }
  );
}

export function fetchFacilityFeeScheduleItems(
  facilityId: EntityId | null | undefined,
  scheduleId?: EntityId | null
) {
  const path = scheduleId
    ? withFacility("/billing/facility-fee-schedule-items/", facilityId) +
      (facilityId ? "&" : "?") +
      `schedule_id=${scheduleId}`
    : withFacility("/billing/facility-fee-schedule-items/", facilityId);
  return apiRequest<AdminOrganizationFeeScheduleItem[]>(path);
}

export function updateFacilityFeeScheduleItem(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminOrganizationFeeScheduleItem>(
    withFacility(`/billing/facility-fee-schedule-items/${id}/`, facilityId),
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}
