import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOrganizationRole,
  deleteOrganizationRole,
  fetchOrganizationSecurity,
  updateOrganizationRole,
  updateOrganizationRoleSecurity,
} from "../../api/organization/security";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

const QUERY_KEY = ["admin", "organization", "security"];

export default function useOrganizationSecurity() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchOrganizationSecurity,
  });

  const permMutation = useMutation({
    mutationFn: ({
      role,
      security_permissions,
    }: {
      role: string;
      security_permissions: Record<string, boolean>;
    }) => updateOrganizationRoleSecurity(role, security_permissions),
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: (values: ApiPayload) => createOrganizationRole(values),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: EntityId; values: ApiPayload }) =>
      updateOrganizationRole(id, values),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: EntityId) => deleteOrganizationRole(id),
    onSuccess: invalidate,
  });

  return {
    roles: Array.isArray(query.data) ? query.data : [],
    loading: query.isLoading,
    error:
      query.error?.message ||
      permMutation.error?.message ||
      createMutation.error?.message ||
      updateMutation.error?.message ||
      deleteMutation.error?.message ||
      "",
    saving:
      permMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    updateRoleSecurity: permMutation.mutateAsync,
    createRole: createMutation.mutateAsync,
    updateRole: (id: EntityId, values: ApiPayload) =>
      updateMutation.mutateAsync({ id, values }),
    deleteRole: deleteMutation.mutateAsync,
  };
}
