import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrganizationPeople,
  createOrganizationPerson,
  updateOrganizationPerson,
} from "../../api/organization/people";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SavePersonPayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

const ORGANIZATION_PEOPLE_QUERY_KEY = ["admin", "organization", "people"];

export default function useOrganizationPeople() {
  const queryClient = useQueryClient();

  const peopleQuery = useQuery({
    queryKey: ORGANIZATION_PEOPLE_QUERY_KEY,
    queryFn: fetchOrganizationPeople,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: SavePersonPayload) => {
      if (id) {
        return updateOrganizationPerson(id, values);
      }
      return createOrganizationPerson(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_PEOPLE_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "organization", "overview"],
      });
    },
  });

  return {
    people: Array.isArray(peopleQuery.data) ? peopleQuery.data : [],
    loading: peopleQuery.isLoading,
    error: peopleQuery.error?.message || "",
    loadError: peopleQuery.error?.message || "",
    reload: peopleQuery.refetch,
    saving: saveMutation.isPending,
    savePerson: ({ id, values }: SavePersonPayload) =>
      saveMutation.mutateAsync({ id, values }),
  };
}
