import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEncounterBillingRecord,
  fetchFeeScheduleItems,
  fetchEncounterBillingRecords,
  updateEncounterBillingRecord,
} from "../api/billing";
import { fetchClinicalEncounters } from "../api/clinical";

import type { EntityId } from "../../../shared/api/types";
import type {
  ClinicalEncounter,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
  FeeScheduleItem,
} from "../types";

type UseBillingRecordsParams = {
  facilityId?: EntityId | null;
  enabled?: boolean;
};

export function getBillingRecordsQueryKey(facilityId?: EntityId | null) {
  return ["billing", "records", facilityId || null];
}

export default function useBillingRecords({
  facilityId,
  enabled = true,
}: UseBillingRecordsParams) {
  const queryClient = useQueryClient();
  const queryKey = getBillingRecordsQueryKey(facilityId);

  const billingRecordsQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchEncounterBillingRecords({
        facilityId,
      }) as Promise<EncounterBillingRecord[]>,
    enabled: enabled && !!facilityId,
  });

  const clinicalEncountersQuery = useQuery({
    queryKey: ["clinical", "encounters", "billing-pending", facilityId || null],
    queryFn: () =>
      fetchClinicalEncounters({
        facilityId,
      }) as Promise<ClinicalEncounter[]>,
    enabled: enabled && !!facilityId,
  });

  const feeScheduleQuery = useQuery({
    queryKey: ["billing", "fee-schedule", facilityId || null],
    queryFn: () =>
      fetchFeeScheduleItems({
        facilityId,
      }) as Promise<FeeScheduleItem[]>,
    enabled: enabled && !!facilityId,
  });

  const invalidateBillingRecords = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({
      queryKey: [
        "clinical",
        "encounters",
        "billing-pending",
        facilityId || null,
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["billing", "fee-schedule", facilityId || null],
    });
  };

  const createBillingRecordMutation = useMutation({
    mutationFn: (values: EncounterBillingRecordPayload) =>
      createEncounterBillingRecord({ facilityId, values }),
    onSuccess: invalidateBillingRecords,
  });

  const updateBillingRecordMutation = useMutation({
    mutationFn: ({
      billingRecordId,
      values,
    }: {
      billingRecordId: EntityId;
      values: EncounterBillingRecordPayload;
    }) =>
      updateEncounterBillingRecord({
        facilityId,
        billingRecordId,
        values,
      }),
    onSuccess: invalidateBillingRecords,
  });

  return {
    billingRecords: Array.isArray(billingRecordsQuery.data)
      ? billingRecordsQuery.data
      : [],
    billingRecordsQuery,
    clinicalEncounters: Array.isArray(clinicalEncountersQuery.data)
      ? clinicalEncountersQuery.data
      : [],
    clinicalEncountersQuery,
    feeScheduleItems: Array.isArray(feeScheduleQuery.data)
      ? feeScheduleQuery.data
      : [],
    feeScheduleQuery,
    createBillingRecordMutation,
    updateBillingRecordMutation,
    invalidateBillingRecords,
  };
}
