import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalRefillStatus =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

export type PortalRefillRequest = {
  id: number;
  medication_id: number;
  medication_name: string;
  dose: string | null;
  frequency: string | null;
  pharmacy_id: number | null;
  pharmacy_name: string;
  status: PortalRefillStatus;
  status_label: string;
  patient_note: string;
  requested_at: string;
  resolved_at: string | null;
};

export type CreateRefillPayload = {
  medication_id: number;
  patient_note?: string;
  pharmacy_id?: number | null;
};

const REFILL_QUERY_KEY = ["portal", "refill-requests"] as const;
const MEDICATIONS_QUERY_KEY = ["portal", "medications"] as const;

export function useRefillRequests() {
  return useQuery<PortalRefillRequest[]>({
    queryKey: REFILL_QUERY_KEY,
    queryFn: async () =>
      (await apiRequest<PortalRefillRequest[]>("/portal/refill-requests/")) ??
      [],
  });
}

export function useRequestRefill() {
  const queryClient = useQueryClient();
  return useMutation<PortalRefillRequest | null, Error, CreateRefillPayload>({
    mutationFn: (payload) =>
      apiRequest<PortalRefillRequest>("/portal/refill-requests/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFILL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MEDICATIONS_QUERY_KEY });
    },
  });
}

export function useCancelRefill() {
  const queryClient = useQueryClient();
  return useMutation<PortalRefillRequest | null, Error, number>({
    mutationFn: (refillId) =>
      apiRequest<PortalRefillRequest>(
        `/portal/refill-requests/${refillId}/cancel/`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFILL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MEDICATIONS_QUERY_KEY });
    },
  });
}
