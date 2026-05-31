import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPrescriberDelegation,
  deletePrescriberDelegation,
  fetchPrescriberDelegations,
} from "../../api/facility/prescriberDelegations";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { PrescriberDelegation } from "../../api/facility/prescriberDelegations";

function getDelegationsQueryKey(facilityId: EntityId | null | undefined) {
  return ["admin", "facility", facilityId || null, "prescriber-delegations"];
}

export default function usePrescriberDelegations(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const queryKey = getDelegationsQueryKey(facilityId);

  const delegationsQuery = useQuery({
    queryKey,
    queryFn: () => fetchPrescriberDelegations(facilityId),
    enabled: !!facilityId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ApiPayload) => {
      if (!facilityId) return null;
      return createPrescriberDelegation(facilityId, values);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: EntityId) => {
      if (!facilityId) return null;
      return deletePrescriberDelegation(facilityId, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    delegations: (Array.isArray(delegationsQuery.data)
      ? delegationsQuery.data
      : []) as PrescriberDelegation[],
    loading: delegationsQuery.isLoading,
    loadError: delegationsQuery.error?.message || "",
    saving: createMutation.isPending || removeMutation.isPending,
    saveError: createMutation.error?.message || "",
    reload: () => {
      void delegationsQuery.refetch();
    },
    createDelegation: (values: ApiPayload) =>
      createMutation.mutateAsync(values),
    removeDelegation: (id: EntityId) => removeMutation.mutateAsync(id),
    resetMutations: () => {
      createMutation.reset();
      removeMutation.reset();
    },
  };
}
