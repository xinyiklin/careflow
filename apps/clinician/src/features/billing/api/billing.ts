import { apiRequest } from "../../../shared/api/client";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";
import type {
  BillingRecordStatus,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
  FeeScheduleItem,
} from "../types";

type FetchEncounterBillingRecordsParams = {
  facilityId?: EntityId | null;
  patientId?: ApiParamValue;
  encounterId?: ApiParamValue;
  status?: BillingRecordStatus | "";
};

export function fetchEncounterBillingRecords({
  facilityId,
  patientId,
  encounterId,
  status,
}: FetchEncounterBillingRecordsParams = {}) {
  return apiRequest<EncounterBillingRecord[]>(
    "/billing/encounter-billing-records/",
    {
      params: {
        facility_id: facilityId,
        patient_id: patientId,
        encounter_id: encounterId,
        status,
      },
    }
  );
}

export function createEncounterBillingRecord({
  facilityId,
  values,
}: {
  facilityId?: EntityId | null;
  values: EncounterBillingRecordPayload;
}) {
  return apiRequest<EncounterBillingRecord>(
    "/billing/encounter-billing-records/",
    {
      method: "POST",
      params: { facility_id: facilityId },
      body: JSON.stringify(values),
    }
  );
}

export function updateEncounterBillingRecord({
  facilityId,
  billingRecordId,
  values,
}: {
  facilityId?: EntityId | null;
  billingRecordId: EntityId;
  values: EncounterBillingRecordPayload;
}) {
  return apiRequest<EncounterBillingRecord>(
    `/billing/encounter-billing-records/${billingRecordId}/`,
    {
      method: "PATCH",
      params: { facility_id: facilityId },
      body: JSON.stringify(values),
    }
  );
}

export function fetchFeeScheduleItems({
  facilityId,
}: {
  facilityId?: EntityId | null;
} = {}) {
  return apiRequest<FeeScheduleItem[]>("/billing/fee-schedule-items/", {
    params: { facility_id: facilityId },
  });
}
