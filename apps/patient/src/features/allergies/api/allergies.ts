import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalAllergySeverity =
  | "unknown"
  | "mild"
  | "moderate"
  | "severe"
  | "life_threatening";

export type PortalAllergyCategory =
  | "medication"
  | "food"
  | "environmental"
  | "latex"
  | "contrast"
  | "other";

export type PortalAllergyStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "entered_in_error";

export type PortalAllergy = {
  id: number;
  allergen: string;
  category: PortalAllergyCategory;
  category_label: string;
  reaction: string | null;
  severity: PortalAllergySeverity;
  severity_label: string;
  onset_date: string | null;
  status: PortalAllergyStatus;
  status_label: string;
};

export function useAllergies() {
  return useQuery<PortalAllergy[]>({
    queryKey: ["portal", "allergies"],
    queryFn: async () =>
      (await apiRequest<PortalAllergy[]>("/portal/allergies/")) ?? [],
  });
}
