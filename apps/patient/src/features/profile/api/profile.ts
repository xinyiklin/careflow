import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import type { PortalPatient } from "../../auth/api/portalAuth";

export function useProfile() {
  return useQuery<PortalPatient | null>({
    queryKey: ["portal", "me"],
    queryFn: () => apiRequest<PortalPatient>("/portal/me/"),
  });
}
