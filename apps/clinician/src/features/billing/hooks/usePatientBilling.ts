import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEncounterBillingRecord,
  fetchEncounterBillingRecords,
  updateEncounterBillingRecord,
} from "../api/billing";

import type { EntityId } from "../../../shared/api/types";
import type {
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
} from "../types";

type UsePatientBillingParams = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  enabled?: boolean;
};

export function getPatientBillingQueryKey(
  facilityId?: EntityId | null,
  patientId?: EntityId | null
) {
  return [
    "patientHub",
    "billingRecords",
    facilityId || null,
    patientId || null,
  ];
}

export default function usePatientBilling({
  facilityId,
  patientId,
  enabled = true,
}: UsePatientBillingParams) {
  const queryClient = useQueryClient();
  const queryKey = getPatientBillingQueryKey(facilityId, patientId);

  const billingRecordsQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchEncounterBillingRecords({
        facilityId,
        patientId,
      }) as Promise<EncounterBillingRecord[]>,
    enabled: enabled && !!facilityId && !!patientId,
  });

  const invalidateBillingRecords = () => {
    queryClient.invalidateQueries({ queryKey });
    // A new/updated billing record changes the facility billing workspace and
    // removes the encounter from its pending-coding queue.
    queryClient.invalidateQueries({
      queryKey: ["billing", "records", facilityId || null],
    });
    queryClient.invalidateQueries({
      queryKey: [
        "clinical",
        "encounters",
        "billing-pending",
        facilityId || null,
      ],
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
    createBillingRecordMutation,
    updateBillingRecordMutation,
    invalidateBillingRecords,
  };
}
