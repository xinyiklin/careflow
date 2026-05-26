import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type {
  AdminOrganizationFeeSchedule,
  AdminOrganizationFeeScheduleItem,
  CPTCatalogEntry,
} from "../../types";

export function fetchOrganizationFeeSchedules() {
  return apiRequest<AdminOrganizationFeeSchedule[]>(
    "/billing/organization-fee-schedules/"
  );
}

export function fetchOrganizationFeeSchedule() {
  return apiRequest<AdminOrganizationFeeScheduleItem[]>(
    "/billing/organization-fee-schedule-items/"
  );
}

export function createOrganizationFeeSchedule(data: ApiPayload) {
  return apiRequest<AdminOrganizationFeeSchedule>(
    "/billing/organization-fee-schedules/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function updateOrganizationFeeSchedule(id: EntityId, data: ApiPayload) {
  return apiRequest<AdminOrganizationFeeSchedule>(
    `/billing/organization-fee-schedules/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function createOrganizationFeeScheduleItem(data: ApiPayload) {
  return apiRequest<AdminOrganizationFeeScheduleItem>(
    "/billing/organization-fee-schedule-items/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function updateOrganizationFeeScheduleItem(
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest<AdminOrganizationFeeScheduleItem>(
    `/billing/organization-fee-schedule-items/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function populateFeeScheduleFromCatalog(scheduleId: EntityId) {
  return apiRequest<{ added: number }>(
    `/billing/organization-fee-schedules/${scheduleId}/populate/`,
    { method: "POST" }
  );
}

export function fetchCPTCatalog() {
  return apiRequest<CPTCatalogEntry[]>("/billing/cpt-catalog/");
}
