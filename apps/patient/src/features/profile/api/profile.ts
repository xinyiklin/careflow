import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import type { PortalPatient } from "../../auth/api/portalAuth";

export type PreferredPharmacyUpdate = {
  pharmacy_id: number | null;
};

export type PreferredPharmacyResponse = {
  pharmacy_id: number | null;
  pharmacy_name: string;
};

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

export function useUpdatePreferredPharmacy() {
  const queryClient = useQueryClient();
  return useMutation<
    PreferredPharmacyResponse | null,
    Error,
    PreferredPharmacyUpdate
  >({
    mutationFn: (payload) =>
      apiRequest<PreferredPharmacyResponse>("/portal/me/preferred-pharmacy/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "me"] });
    },
  });
}
