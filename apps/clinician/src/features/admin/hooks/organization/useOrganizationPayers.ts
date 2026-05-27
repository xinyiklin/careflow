import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationPayer,
  fetchOrganizationPayers,
  updateOrganizationPayer,
} from "../../api/organization/payers";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SaveOrganizationPayerPayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

const ORGANIZATION_PAYERS_QUERY_KEY = ["admin", "organization", "payers"];

export default function useOrganizationPayers() {
  const queryClient = useQueryClient();

  const payersQuery = useQuery({
    queryKey: ORGANIZATION_PAYERS_QUERY_KEY,
    queryFn: fetchOrganizationPayers,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: SaveOrganizationPayerPayload) => {
      if (id) return updateOrganizationPayer(id, values);
      return createOrganizationPayer(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_PAYERS_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ["insurance", "carriers"] });
    },
  });

  return {
    payers: Array.isArray(payersQuery.data) ? payersQuery.data : [],
    loading: payersQuery.isLoading,
    saving: saveMutation.isPending,
    error: saveMutation.error?.message || payersQuery.error?.message || "",
    loadError: payersQuery.error?.message || "",
    reload: payersQuery.refetch,
    savePayer: (payload: SaveOrganizationPayerPayload) =>
      saveMutation.mutateAsync(payload),
  };
}
