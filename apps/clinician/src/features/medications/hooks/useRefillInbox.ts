import {
  useApproveRefillRequest,
  useDenyRefillRequest,
  useRefillRequests,
} from "../api/refillRequests";

import type {
  RefillRequest,
  RefillRequestSource,
  RefillRequestStatus,
} from "../api/refillRequests";
import type { ApiParamValue, EntityId } from "../../../shared/api/types";

type UseRefillInboxParams = {
  facilityId?: EntityId | null;
  status?: RefillRequestStatus | "";
  source?: RefillRequestSource | "";
  prescriberId?: ApiParamValue;
  mine?: boolean;
  enabled?: boolean;
};

/**
 * Facility-scoped refill inbox: the underlying refill-request query plus
 * the approve/deny mutations, shaped like the rest of our list surfaces
 * (loading flags, reload callback, save mutations). The refill workspace
 * reads from a shared facility queue. Clinicians resolve through
 * ``medications.refill.approve`` plus the server-side prescriber/delegation
 * gate.
 */
export default function useRefillInbox({
  facilityId,
  status,
  source,
  prescriberId,
  mine,
  enabled = true,
}: UseRefillInboxParams) {
  const refillsQuery = useRefillRequests({
    facilityId,
    status,
    source,
    prescriberId,
    mine,
    enabled: enabled && !!facilityId,
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
