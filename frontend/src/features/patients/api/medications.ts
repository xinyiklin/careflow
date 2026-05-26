import { apiRequest } from "../../../shared/api/client";

import type {
  ApiParamValue,
  ApiPayload,
  EntityId,
} from "../../../shared/api/types";

export type MedicationStatus = "active" | "inactive" | "discontinued";

export type PatientMedication = {
  id: EntityId;
  patient: EntityId;
  patient_name?: string | null;
  patient_chart_number?: string | null;
  facility: EntityId;
  status: MedicationStatus;
  status_label?: string | null;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  start_date?: string | null;
  end_date?: string | null;
  prescriber_name?: string | null;
  notes?: string | null;
  created_by?: EntityId | null;
  created_by_name?: string | null;
  updated_by?: EntityId | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MedicationPayload = ApiPayload & {
  patient: number;
  status: MedicationStatus;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  prescriber_name: string;
  notes: string;
};

type FetchMedicationsParams = {
  facilityId?: EntityId | null;
  patientId?: ApiParamValue;
  status?: ApiParamValue;
};

export function fetchPatientMedications({
  facilityId,
  patientId,
  status,
}: FetchMedicationsParams = {}) {
  return apiRequest<PatientMedication[]>("/medications/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
      status,
    },
  });
}

export function createPatientMedication({
  facilityId,
  values,
}: {
  facilityId?: EntityId | null;
  values: MedicationPayload;
}) {
  return apiRequest<PatientMedication>("/medications/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updatePatientMedication({
  facilityId,
  medicationId,
  values,
}: {
  facilityId?: EntityId | null;
  medicationId: EntityId;
  values: MedicationPayload;
}) {
  return apiRequest<PatientMedication>(`/medications/${medicationId}/`, {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function discontinuePatientMedication({
  facilityId,
  medicationId,
}: {
  facilityId?: EntityId | null;
  medicationId: EntityId;
}) {
  return apiRequest<null>(`/medications/${medicationId}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}
