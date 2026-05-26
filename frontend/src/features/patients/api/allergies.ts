import { apiRequest } from "../../../shared/api/client";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";

export type PatientAllergyCategory =
  | "medication"
  | "food"
  | "environmental"
  | "latex"
  | "contrast"
  | "other";

export type PatientAllergySeverity =
  | "unknown"
  | "mild"
  | "moderate"
  | "severe"
  | "life_threatening";

export type PatientAllergyStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "entered_in_error";

export type PatientAllergy = {
  id?: EntityId;
  patient?: EntityId;
  patient_name?: string | null;
  patient_chart_number?: string | number | null;
  facility?: EntityId | null;
  allergen?: string | null;
  category?: PatientAllergyCategory | null;
  category_label?: string | null;
  reaction?: string | null;
  severity?: PatientAllergySeverity | null;
  severity_label?: string | null;
  onset_date?: string | null;
  status?: PatientAllergyStatus | null;
  status_label?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_by?: EntityId | null;
  updated_by?: EntityId | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PatientAllergyPayload = {
  patient: number;
  allergen: string;
  category: PatientAllergyCategory;
  reaction: string;
  severity: PatientAllergySeverity;
  onset_date: string | null;
  status: PatientAllergyStatus;
  notes: string;
};

type FetchPatientAllergiesParams = {
  facilityId?: EntityId | null;
  patientId?: ApiParamValue;
  status?: PatientAllergyStatus | "";
  category?: PatientAllergyCategory | "";
  isActive?: boolean | null;
};

export function fetchPatientAllergies({
  facilityId,
  patientId,
  status,
  category,
  isActive,
}: FetchPatientAllergiesParams = {}) {
  return apiRequest<PatientAllergy[]>("/allergies/patient-allergies/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
      status,
      category,
      is_active: isActive,
    },
  });
}

export function createPatientAllergy({
  facilityId,
  values,
}: {
  facilityId?: EntityId | null;
  values: PatientAllergyPayload;
}) {
  return apiRequest<PatientAllergy>("/allergies/patient-allergies/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updatePatientAllergy({
  facilityId,
  allergyId,
  values,
}: {
  facilityId?: EntityId | null;
  allergyId: EntityId;
  values: PatientAllergyPayload;
}) {
  return apiRequest<PatientAllergy>(
    `/allergies/patient-allergies/${allergyId}/`,
    {
      method: "PATCH",
      params: { facility_id: facilityId },
      body: JSON.stringify(values),
    }
  );
}

export function deletePatientAllergy({
  facilityId,
  allergyId,
}: {
  facilityId?: EntityId | null;
  allergyId: EntityId;
}) {
  return apiRequest(`/allergies/patient-allergies/${allergyId}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}
