import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import { useAuth } from "../../auth/AuthProvider";
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
  const { getSessionSnapshot, updatePatient } = useAuth();
  return useMutation<
    {
      session: ReturnType<typeof getSessionSnapshot>;
      updated: PortalPatient | null;
    },
    Error,
    Partial<PortalPatient>
  >({
    mutationFn: async (data) => {
      const session = getSessionSnapshot();
      const updated = await apiRequest<PortalPatient>("/portal/me/", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return { session, updated };
    },
    onSuccess: ({ session, updated }) => {
      if (updated && updatePatient(updated, session)) {
        queryClient.setQueryData(["portal", "me"], updated);
      }
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
