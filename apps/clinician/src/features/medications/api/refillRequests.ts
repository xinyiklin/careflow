import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";

export type RefillRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

export type RefillRequestSource = "patient" | "pharmacy";

export type RefillRequest = {
  id: number;
  patient_id: number;
  patient_display_name: string;
  medication_id: number;
  medication_name: string;
  dose: string | null;
  frequency: string | null;
  pharmacy_id: number | null;
  pharmacy_name: string;
  prescriber_id: number | null;
  prescriber_display: string;
  source: RefillRequestSource;
  source_label: string;
  status: RefillRequestStatus;
  status_label: string;
  patient_note: string;
  clinician_note: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by_name: string;
};

export type RefillRequestActionPayload = {
  clinician_note?: string;
};

type UseRefillRequestsParams = {
  facilityId?: EntityId | null;
  status?: RefillRequestStatus | "";
  source?: RefillRequestSource | "";
  prescriberId?: ApiParamValue;
  mine?: boolean;
  patientId?: ApiParamValue;
  enabled?: boolean;
};

export function getRefillRequestsQueryKey({
  facilityId,
  status,
  source,
  prescriberId,
  mine,
  patientId,
}: {
  facilityId?: EntityId | null;
  status?: RefillRequestStatus | "";
  source?: RefillRequestSource | "";
  prescriberId?: ApiParamValue;
  mine?: boolean;
  patientId?: ApiParamValue;
}) {
  return [
    "medications",
    "refill-requests",
    {
      facilityId: facilityId || null,
      status: status || null,
      source: source || null,
      prescriberId: prescriberId ?? null,
      mine: mine ? true : null,
      patientId: patientId ?? null,
    },
  ] as const;
}

function getRefillRequestQueryKey(refillId: EntityId) {
  return ["medications", "refill-requests", "detail", refillId] as const;
}

export function useRefillRequests({
  facilityId,
  status,
  source,
  prescriberId,
  mine,
  patientId,
  enabled = true,
}: UseRefillRequestsParams) {
  return useQuery<RefillRequest[]>({
    queryKey: getRefillRequestsQueryKey({
      facilityId,
      status,
      source,
      prescriberId,
      mine,
      patientId,
    }),
    queryFn: async () =>
      (await apiRequest<RefillRequest[]>("/medications/refill-requests/", {
        params: {
          facility_id: facilityId,
          status: status || null,
          source: source || null,
          prescriber_id: prescriberId ?? null,
          mine: mine ? "true" : null,
          patient_id: patientId ?? null,
        },
      })) ?? [],
    enabled: enabled && !!facilityId,
  });
}

type RefillMutationVariables = {
  refillId: EntityId;
  values?: RefillRequestActionPayload;
};

function buildInvalidator(queryClient: ReturnType<typeof useQueryClient>) {
  return (refillId: EntityId) => {
    queryClient.invalidateQueries({
      queryKey: ["medications", "refill-requests"],
    });
    queryClient.invalidateQueries({
      queryKey: getRefillRequestQueryKey(refillId),
    });
  };
}

export function useApproveRefillRequest({
  facilityId,
}: { facilityId?: EntityId | null } = {}) {
  const queryClient = useQueryClient();
  const invalidate = buildInvalidator(queryClient);

  return useMutation<RefillRequest | null, Error, RefillMutationVariables>({
    mutationFn: ({ refillId, values }) =>
      apiRequest<RefillRequest>(
        `/medications/refill-requests/${refillId}/approve/`,
        {
          method: "POST",
          params: { facility_id: facilityId },
          body: JSON.stringify({
            clinician_note: values?.clinician_note ?? "",
          }),
        }
      ),
    onSuccess: (_data, variables) => invalidate(variables.refillId),
  });
}

export function useDenyRefillRequest({
  facilityId,
}: { facilityId?: EntityId | null } = {}) {
  const queryClient = useQueryClient();
  const invalidate = buildInvalidator(queryClient);

  return useMutation<RefillRequest | null, Error, RefillMutationVariables>({
    mutationFn: ({ refillId, values }) =>
      apiRequest<RefillRequest>(
        `/medications/refill-requests/${refillId}/deny/`,
        {
          method: "POST",
          params: { facility_id: facilityId },
          body: JSON.stringify({
            clinician_note: values?.clinician_note ?? "",
          }),
        }
      ),
    onSuccess: (_data, variables) => invalidate(variables.refillId),
  });
}
