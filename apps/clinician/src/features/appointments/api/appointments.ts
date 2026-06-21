import { apiRequest } from "../../../shared/api/client";

import type {
  ApiParams,
  ApiPayload,
  ApiParamValue,
  EntityId,
} from "../../../shared/api/types";
import type { ApiRecord, AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentHistoryEntry } from "../types";

type AppointmentEditSessionStatus =
  | "active"
  | "available"
  | "occupied"
  | "released";

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

export type AppointmentHeatmapResponse = {
  month?: string;
  counts?: Record<string, number>;
};

export function fetchAppointments({
  facilityId,
  date,
  dateTo,
  patientId,
}: FetchAppointmentsParams = {}) {
  return apiRequest<AppointmentLike[]>("/appointments/", {
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
  return apiRequest<AppointmentHeatmapResponse>("/appointments/heatmap/", {
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
  return apiRequest<AppointmentLike>("/appointments/", {
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
  return apiRequest<AppointmentLike>(`/appointments/${id}/`, {
    method: "PUT",
    params: { facility_id: facilityId },
    body: JSON.stringify(data),
  });
}

export function deleteAppointment(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<ApiRecord>(`/appointments/${id}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentHistory(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest<AppointmentHistoryEntry[]>(`/appointments/${id}/history/`, {
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentEditSession(
  facilityId: EntityId | null | undefined,
  id: EntityId | null | undefined
) {
  return apiRequest<AppointmentEditSessionResponse>(
    `/appointments/${id}/edit-session/`,
    {
      params: { facility_id: facilityId },
    }
  );
}

export function beginAppointmentEditSession(
  facilityId: EntityId | null | undefined,
  id: EntityId | null | undefined,
  options: { override?: boolean } = {}
) {
  return apiRequest<AppointmentEditSessionResponse>(
    `/appointments/${id}/edit-session/`,
    {
      method: "POST",
      params: { facility_id: facilityId },
      body: JSON.stringify({ override: Boolean(options.override) }),
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
  return apiRequest<ApiRecord>(`/appointments/${id}/edit-session/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

type SlotHoldStatus = "active" | "available" | "occupied" | "released";

export type SlotHoldActiveUser = {
  user_id?: EntityId | null;
  user_name?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
} | null;

export type SlotHoldResponse = {
  status?: SlotHoldStatus;
  can_override?: boolean;
  active_user?: SlotHoldActiveUser;
};

// Identifies the schedule cell being booked: a facility-local `${date}T${time24}`
// start and the column's resource (null for resource-agnostic columns).
export type SlotHoldKey = {
  startTime: string;
  resource?: EntityId | null;
};

// The slot is identified by query params (not a body) so PATCH/DELETE stay
// documentable in OpenAPI; `appendParams` drops the null resource.
function slotHoldParams(
  facilityId: EntityId | null | undefined,
  key: SlotHoldKey,
  extra: ApiParams = {}
): ApiParams {
  return {
    facility_id: facilityId,
    start_time: key.startTime,
    resource: key.resource ?? null,
    ...extra,
  };
}

export function acquireSlotHold(
  facilityId: EntityId | null | undefined,
  key: SlotHoldKey,
  options: { override?: boolean } = {}
) {
  return apiRequest<SlotHoldResponse>("/appointments/slot-hold/", {
    method: "POST",
    params: slotHoldParams(
      facilityId,
      key,
      options.override ? { override: "true" } : {}
    ),
  });
}

export function heartbeatSlotHold(
  facilityId: EntityId | null | undefined,
  key: SlotHoldKey
) {
  return apiRequest<SlotHoldResponse>("/appointments/slot-hold/", {
    method: "PATCH",
    params: slotHoldParams(facilityId, key),
  });
}

export function releaseSlotHold(
  facilityId: EntityId | null | undefined,
  key: SlotHoldKey
) {
  return apiRequest<ApiRecord>("/appointments/slot-hold/", {
    method: "DELETE",
    params: slotHoldParams(facilityId, key),
  });
}
