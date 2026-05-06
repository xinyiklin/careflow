import type {
  ApiRecord,
  AppointmentLike,
  PatientInsurancePolicy,
  PatientLike,
  ResourceLike,
  StaffLike,
} from "../../shared/types/domain";
import type { EntityId } from "../../shared/api/types";

export type AppointmentMode = "create" | "edit";

export type AppointmentFormData = Partial<AppointmentLike> & {
  id?: EntityId | null;
  patient?: EntityId | null;
  resource?: EntityId | null;
  rendering_provider?: EntityId | null;
  appointment_type?: EntityId | null;
  status?: EntityId | null;
  facility?: EntityId | null;
  appointment_time?: string | Date | null;
  end_time?: string | Date | null;
  duration_minutes?: string | number | null;
};

export type AppointmentFormValues = {
  patient: string;
  resource: string;
  rendering_provider: string;
  appointment_time: Date | null;
  end_time: Date | null;
  room: string;
  reason: string;
  notes: string;
  status: string;
  appointment_type: string;
  facility: string;
};

export type AppointmentResource = ResourceLike &
  ApiRecord & {
    id: EntityId;
    name?: string | null;
  };

export type AppointmentStaff = StaffLike & {
  id: EntityId;
};

export type AppointmentPatient = PatientLike;

export type AppointmentStatusOption = ApiRecord & {
  id: EntityId;
  name?: string | null;
  color?: string | null;
};

export type AppointmentTypeOption = AppointmentStatusOption & {
  duration_minutes?: string | number | null;
};

export type AppointmentPickerOption =
  | AppointmentStatusOption
  | AppointmentTypeOption;

export type AppointmentHistoryEntry = ApiRecord & {
  id: EntityId;
  action?: string | null;
  actor_name?: string | null;
  created_at?: string | Date | null;
  summary?: string | null;
  changed_fields?: string[] | null;
};

export type AppointmentSubmitPayload = Omit<
  AppointmentFormValues,
  "appointment_time" | "end_time" | "facility" | "patient"
> & {
  patient: EntityId | "";
  facility: EntityId | "";
  appointment_time: string;
  end_time: string;
};

export type { PatientInsurancePolicy };
