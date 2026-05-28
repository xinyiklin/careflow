import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";

export type RefillRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

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
  patientId?: ApiParamValue;
  enabled?: boolean;
};

export function getRefillRequestsQueryKey({
  facilityId,
  status,
  patientId,
}: {
  facilityId?: EntityId | null;
  status?: RefillRequestStatus | "";
  patientId?: ApiParamValue;
}) {
  return [
    "medications",
    "refill-requests",
    {
      facilityId: facilityId || null,
      status: status || null,
      patientId: patientId ?? null,
    },
  ] as const;
}

export function getRefillRequestQueryKey(refillId: EntityId) {
  return ["medications", "refill-requests", "detail", refillId] as const;
}

export function useRefillRequests({
  facilityId,
  status,
  patientId,
  enabled = true,
}: UseRefillRequestsParams) {
  return useQuery<RefillRequest[]>({
    queryKey: getRefillRequestsQueryKey({ facilityId, status, patientId }),
    queryFn: async () =>
      (await apiRequest<RefillRequest[]>("/medications/refill-requests/", {
        params: {
          facility_id: facilityId,
          status: status || null,
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
