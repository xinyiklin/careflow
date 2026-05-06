import { apiRequest } from "../../../shared/api/client";

import type {
  ApiPayload,
  ApiParamValue,
  EntityId,
} from "../../../shared/api/types";

type AppointmentEditSessionStatus = "active" | "available" | "occupied";

export type AppointmentEditSessionActiveEditor = {
  user_id?: EntityId | null;
  user_name?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
} | null;

export type AppointmentEditSessionResponse = {
  status?: AppointmentEditSessionStatus;
  can_override?: boolean;
  active_editor?: AppointmentEditSessionActiveEditor;
};

type FetchAppointmentsParams = {
  facilityId?: EntityId | null;
  date?: ApiParamValue;
  dateTo?: ApiParamValue;
  patientId?: EntityId | null;
};

export function fetchAppointments({
  facilityId,
  date,
  dateTo,
  patientId,
}: FetchAppointmentsParams = {}) {
  return apiRequest("/appointments/", {
    params: {
      facility_id: facilityId,
      date,
      date_to: dateTo,
      patient_id: patientId,
    },
  });
}

export function fetchAppointmentHeatmap({
  facilityId,
  month,
}: {
  facilityId?: EntityId | null;
  month?: ApiParamValue;
} = {}) {
  return apiRequest("/appointments/heatmap/", {
    params: {
      facility_id: facilityId,
      month,
    },
  });
}

export function createAppointment(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest("/appointments/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(data),
  });
}

export function updateAppointment(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest(`/appointments/${id}/`, {
    method: "PUT",
    params: { facility_id: facilityId },
    body: JSON.stringify(data),
  });
}

export function deleteAppointment(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest(`/appointments/${id}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentHistory(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest(`/appointments/${id}/history/`, {
    params: { facility_id: facilityId },
  });
}

export function beginAppointmentEditSession(
  facilityId: EntityId | null | undefined,
  id: EntityId | null | undefined
) {
  return apiRequest<AppointmentEditSessionResponse>(
    `/appointments/${id}/edit-session/`,
    {
      method: "POST",
      params: { facility_id: facilityId },
      body: JSON.stringify({}),
    }
  );
}

export function heartbeatAppointmentEditSession(
  facilityId: EntityId | null | undefined,
  id: EntityId | null | undefined
) {
  return apiRequest<AppointmentEditSessionResponse>(
    `/appointments/${id}/edit-session/`,
    {
      method: "PATCH",
      params: { facility_id: facilityId },
      body: JSON.stringify({}),
    }
  );
}

export function releaseAppointmentEditSession(
  facilityId: EntityId | null | undefined,
  id: EntityId | null | undefined
) {
  return apiRequest(`/appointments/${id}/edit-session/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}
