import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/AuthProvider";
import {
  fetchOrganization,
  updateOrganization,
} from "../../api/organization/overview";

function getCurrentOrganizationId(user) {
  if (user?.organization?.id) return user.organization.id;

  const membership = Array.isArray(user?.memberships)
    ? user.memberships[0]
    : null;
  return membership?.facility?.organization?.id || null;
}

export default function useOrganizationOverview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = getCurrentOrganizationId(user);
  const queryKey = [
    "admin",
    "organization",
    "overview",
    organizationId || null,
  ];

  const overviewQuery = useQuery({
    queryKey,
    queryFn: () => fetchOrganization(organizationId),
    enabled: Boolean(organizationId),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }) => updateOrganization(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  return {
    organization: overviewQuery.data || null,
    loading: overviewQuery.isLoading,
    error: overviewQuery.error?.message || "",
    reload: overviewQuery.refetch,
    saving: updateMutation.isPending,
    updateOrganization: (payload) => updateMutation.mutateAsync(payload),
  };
}
