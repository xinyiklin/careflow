import {
  useApproveRefillRequest,
  useDenyRefillRequest,
  useRefillRequests,
} from "../../../medications/api/refillRequests";

import type {
  RefillRequest,
  RefillRequestStatus,
} from "../../../medications/api/refillRequests";
import type { EntityId } from "../../../../shared/api/types";

type UseFacilityRefillRequestsParams = {
  facilityId?: EntityId | null;
  status?: RefillRequestStatus | "";
};

/**
 * Facility-scoped wrapper around the underlying refill request query +
 * mutations. Mirrors how other admin hooks shape their return value
 * (loading flags, reload callback, save mutations) so the panel reads
 * like the rest of the admin surface.
 */
export default function useFacilityRefillRequests({
  facilityId,
  status,
}: UseFacilityRefillRequestsParams) {
  const refillsQuery = useRefillRequests({
    facilityId,
    status,
    enabled: !!facilityId,
  });
  const approveMutation = useApproveRefillRequest({ facilityId });
  const denyMutation = useDenyRefillRequest({ facilityId });

  return {
    refills: (Array.isArray(refillsQuery.data) ? refillsQuery.data : []) as
      | RefillRequest[]
      | [],
    refillsQuery,
    loading: refillsQuery.isLoading,
    loadError: refillsQuery.error?.message || "",
    saving: approveMutation.isPending || denyMutation.isPending,
    approveError: approveMutation.error?.message || "",
    denyError: denyMutation.error?.message || "",
    reload: () => {
      void refillsQuery.refetch();
    },
    approveRefill: (refillId: EntityId, clinicianNote: string) =>
      approveMutation.mutateAsync({
        refillId,
        values: { clinician_note: clinicianNote },
      }),
    denyRefill: (refillId: EntityId, clinicianNote: string) =>
      denyMutation.mutateAsync({
        refillId,
        values: { clinician_note: clinicianNote },
      }),
    resetMutations: () => {
      approveMutation.reset();
      denyMutation.reset();
    },
  };
}
