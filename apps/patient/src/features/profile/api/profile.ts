import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import type { PortalPatient } from "../../auth/api/portalAuth";

export function useProfile() {
  return useQuery<PortalPatient | null>({
    queryKey: ["portal", "me"],
    queryFn: () => apiRequest<PortalPatient>("/portal/me/"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<PortalPatient | null, Error, Partial<PortalPatient>>({
    mutationFn: (data) =>
      apiRequest<PortalPatient>("/portal/me/", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["portal", "me"], updated);
    },
  });
}
