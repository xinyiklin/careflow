import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateStaffRole } from "../../api/facility/staff";

function getStaffQueryKey(facilityId) {
  return ["admin", "facility", facilityId || null, "staff"];
}

function getFacilityConfigQueryKey(key, facilityId) {
  return ["facilityConfig", key, facilityId || null];
}

export default function useStaffRoleSecurity(facilityId) {
  const queryClient = useQueryClient();

  const roleSecurityMutation = useMutation({
    mutationFn: async ({ roleId, values }) => {
      if (!facilityId) return null;
      return updateStaffRole(facilityId, roleId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("staffRoles", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getStaffQueryKey(facilityId),
      });
    },
  });

  const updateRoleSecurity = async (roleId, values) => {
    if (!facilityId) return;
    return roleSecurityMutation.mutateAsync({ roleId, values });
  };

  return {
    saving: roleSecurityMutation.isPending,
    error: roleSecurityMutation.error?.message || "",
    updateRoleSecurity,
  };
}
