import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalMedicationStatus = "active" | "inactive" | "discontinued";

export type PortalMedication = {
  id: number;
  medication_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  status: PortalMedicationStatus;
  status_label: string;
  prescriber_name: string | null;
};

export function useMedications() {
  return useQuery<PortalMedication[]>({
    queryKey: ["portal", "medications"],
    queryFn: async () =>
      (await apiRequest<PortalMedication[]>("/portal/medications/")) ?? [],
  });
}
