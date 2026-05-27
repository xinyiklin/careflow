import { apiRequest } from "../../../shared/api/client";

import type {
  ApiPayload,
  ApiParamValue,
  EntityId,
} from "../../../shared/api/types";
import type {
  ClinicalEncounter,
  ClinicalEncounterPayload,
  ProgressNote,
  ProgressNotePayload,
} from "../types";

type FetchClinicalEncountersParams = {
  facilityId?: EntityId | null;
  patientId?: ApiParamValue;
  appointmentId?: ApiParamValue;
  status?: ApiParamValue;
};

export function fetchClinicalEncounters({
  facilityId,
  patientId,
  appointmentId,
  status,
}: FetchClinicalEncountersParams = {}) {
  return apiRequest<ClinicalEncounter[]>("/clinical/encounters/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
      appointment_id: appointmentId,
      status,
    },
  });
}

export function createClinicalEncounter({
  facilityId,
  values,
}: {
  facilityId?: EntityId | null;
  values: ClinicalEncounterPayload;
}) {
  return apiRequest<ClinicalEncounter>("/clinical/encounters/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updateClinicalEncounter({
  facilityId,
  encounterId,
  values,
}: {
  facilityId?: EntityId | null;
  encounterId: EntityId;
  values: ApiPayload;
}) {
  return apiRequest<ClinicalEncounter>(`/clinical/encounters/${encounterId}/`, {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updateProgressNote({
  facilityId,
  noteId,
  values,
}: {
  facilityId?: EntityId | null;
  noteId: EntityId;
  values: ProgressNotePayload;
}) {
  return apiRequest<ProgressNote>(`/clinical/progress-notes/${noteId}/`, {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function signProgressNote({
  facilityId,
  noteId,
}: {
  facilityId?: EntityId | null;
  noteId: EntityId;
}) {
  return apiRequest<ProgressNote>(`/clinical/progress-notes/${noteId}/sign/`, {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify({}),
  });
}

export function unsignProgressNote({
  facilityId,
  noteId,
}: {
  facilityId?: EntityId | null;
  noteId: EntityId;
}) {
  return apiRequest<ProgressNote>(
    `/clinical/progress-notes/${noteId}/unsign/`,
    {
      method: "POST",
      params: { facility_id: facilityId },
      body: JSON.stringify({}),
    }
  );
}
