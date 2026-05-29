import type { components } from "@careflow/api-types";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import type { AssertSchemaKeys } from "../../../shared/api/types";

export type PortalSummaryMedication = {
  id: number;
  medication_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start_date: string | null;
  prescriber_name: string | null;
};

export type PortalSummaryAllergy = {
  id: number;
  allergen: string;
  category: string;
  category_label: string;
  severity: string;
  severity_label: string;
  reaction: string;
  onset_date: string | null;
};

export type PortalSummaryVitals = {
  height_cm: string | null;
  weight_kg: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate_bpm: number | null;
  respiratory_rate: number | null;
  temperature_c: string | null;
  spo2_percent: number | null;
  pain_score: number | null;
  measured_at: string;
  bmi: string | null;
};

export type PortalSummaryProgressNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  signed_by_name: string;
  signed_at: string;
};

export type PortalSummaryVisit = {
  id: number;
  started_at: string;
  ended_at: string | null;
  reason: string;
  provider_display_name: string;
  facility_name: string;
  progress_note: PortalSummaryProgressNote | null;
  vitals: PortalSummaryVitals | null;
};

export type PortalMedicalSummary = {
  active_medications: PortalSummaryMedication[];
  active_allergies: PortalSummaryAllergy[];
  visits: PortalSummaryVisit[];
};

/**
 * Drift guard: the top-level {@link PortalMedicalSummary} keys must still exist
 * in the backend schema. Nested medication/allergy/visit shapes are left
 * hand-written — the portal deliberately widens several fields to nullable and
 * treats `progress_note`/`vitals` as optional, which a structural check would
 * reject; this guard fires only if a top-level field is renamed or removed.
 */
type _AssertPortalMedicalSummaryKeys = AssertSchemaKeys<
  components["schemas"]["PortalMedicalSummary"],
  keyof PortalMedicalSummary
>;

export function useMedicalSummary() {
  return useQuery<PortalMedicalSummary>({
    queryKey: ["portal", "medical-summary"],
    queryFn: async () => {
      const data = await apiRequest<PortalMedicalSummary>(
        "/portal/medical-summary/"
      );
      return (
        data ?? { active_medications: [], active_allergies: [], visits: [] }
      );
    },
  });
}
