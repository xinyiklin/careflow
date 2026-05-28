import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalPharmacy = {
  id: number;
  name: string;
  address_line: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
};

export function usePortalPharmacies() {
  return useQuery<PortalPharmacy[]>({
    queryKey: ["portal", "pharmacies"],
    queryFn: async () =>
      (await apiRequest<PortalPharmacy[]>("/portal/pharmacies/")) ?? [],
  });
}
