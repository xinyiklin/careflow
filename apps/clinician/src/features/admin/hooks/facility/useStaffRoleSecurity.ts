import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createStaffRole,
  deleteStaffRole,
  updateStaffRole,
} from "../../api/facility/staff";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type RoleSecurityPayload = {
  roleId: EntityId;
  values: ApiPayload;
};

function getStaffQueryKey(facilityId: EntityId | null | undefined) {
  return ["admin", "facility", facilityId || null, "staff"];
}

function getFacilityConfigQueryKey(
  key: string,
  facilityId: EntityId | null | undefined
) {
  return ["facilityConfig", key, facilityId || null];
}

export default function useStaffRoleSecurity(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();

  const invalidateRoles = () => {
    queryClient.invalidateQueries({
      queryKey: getFacilityConfigQueryKey("staffRoles", facilityId),
    });
    queryClient.invalidateQueries({
      queryKey: getStaffQueryKey(facilityId),
    });
  };

  const roleSecurityMutation = useMutation({
    mutationFn: async ({ roleId, values }: RoleSecurityPayload) => {
      if (!facilityId) return null;
      return updateStaffRole(facilityId, roleId, values);
    },
    onSuccess: invalidateRoles,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ApiPayload) => {
      if (!facilityId) return null;
      return createStaffRole(facilityId, values);
    },
    onSuccess: invalidateRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: EntityId) => {
      if (!facilityId) return null;
      return deleteStaffRole(facilityId, roleId);
    },
    onSuccess: invalidateRoles,
  });

  const updateRoleSecurity = async (roleId: EntityId, values: ApiPayload) => {
    if (!facilityId) return;
    return roleSecurityMutation.mutateAsync({ roleId, values });
  };

  const createRole = async (values: ApiPayload) => {
    if (!facilityId) return;
    return createMutation.mutateAsync(values);
  };

  const deleteRole = async (roleId: EntityId) => {
    if (!facilityId) return;
    return deleteMutation.mutateAsync(roleId);
  };

  return {
    saving:
      roleSecurityMutation.isPending ||
      createMutation.isPending ||
      deleteMutation.isPending,
    error:
      roleSecurityMutation.error?.message ||
      createMutation.error?.message ||
      deleteMutation.error?.message ||
      "",
    updateRoleSecurity,
    createRole,
    deleteRole,
  };
}
