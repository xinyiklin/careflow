import type { ApiPayload, EntityId } from "../../shared/api/types";

export type ClinicalEncounterStatus = "in_progress" | "signed" | "cancelled";

export type ProgressNoteStatus = "draft" | "signed";

export type ProgressNote = {
  id?: EntityId;
  encounter?: EntityId;
  status?: ProgressNoteStatus | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  created_by?: EntityId | null;
  signed_by?: EntityId | null;
  signed_by_name?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClinicalEncounter = {
  id?: EntityId;
  patient?: EntityId;
  patient_name?: string | null;
  patient_chart_number?: string | number | null;
  facility?: EntityId | null;
  appointment?: EntityId | null;
  appointment_time?: string | null;
  appointment_type_name?: string | null;
  rendering_provider?: EntityId | null;
  rendering_provider_name?: string | null;
  status?: ClinicalEncounterStatus | null;
  reason?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_by?: EntityId | null;
  created_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  progress_note?: ProgressNote | null;
  payer_name?: string | null;
  is_effectively_billable?: boolean | null;
};

export type ProgressNoteFormValues = {
  reason: string;
  rendering_provider: EntityId | "";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type ProgressNotePayload = ApiPayload & {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type ClinicalEncounterPayload = ApiPayload & {
  patient: number;
  appointment: number | null;
  rendering_provider: number | null;
  reason: string;
  progress_note: ProgressNotePayload;
};

export type BillingRecordStatus =
  | "coding_needed"
  | "ready_to_submit"
  | "claim_created";

export type BillingDiagnosis = {
  id?: EntityId;
  code: string;
  description?: string | null;
  sequence?: number | null;
};

export type BillingChargeLine = {
  id?: EntityId;
  service_code: string;
  description?: string | null;
  modifier_1?: string | null;
  modifier_2?: string | null;
  modifier_3?: string | null;
  modifier_4?: string | null;
  units: string;
  charge_amount: string;
  diagnosis_pointers: number[];
  sequence?: number | null;
  line_total?: string | null;
};

export type FeeScheduleItem = {
  id: string;
  organization_item?: EntityId | null;
  facility_override?: EntityId | null;
  catalog_source?:
    | "organization"
    | "facility_override"
    | "facility"
    | string
    | null;
  service_code: string;
  description?: string | null;
  default_units: string;
  charge_amount: string;
  modifier_1?: string | null;
  modifier_2?: string | null;
  modifier_3?: string | null;
  modifier_4?: string | null;
  place_of_service?: string | null;
  is_active?: boolean | null;
  sort_order?: number | string | null;
};

export type EncounterBillingRecord = {
  id?: EntityId;
  encounter?: EntityId;
  encounter_status?: ClinicalEncounterStatus | null;
  patient?: EntityId;
  patient_name?: string | null;
  patient_chart_number?: string | number | null;
  facility?: EntityId | null;
  appointment_time?: string | null;
  appointment_type_name?: string | null;
  rendering_provider_name?: string | null;
  progress_note_status?: ProgressNoteStatus | null;
  status?: BillingRecordStatus | null;
  payer_name?: string | null;
  place_of_service?: string | null;
  notes?: string | null;
  total_charge_amount?: string | null;
  diagnoses?: BillingDiagnosis[];
  charge_lines?: BillingChargeLine[];
  created_by?: EntityId | null;
  updated_by?: EntityId | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EncounterBillingRecordPayload = ApiPayload & {
  encounter?: EntityId;
  status: BillingRecordStatus;
  payer_name: string;
  place_of_service: string;
  notes: string;
  diagnoses: Array<{
    code: string;
    description: string;
    sequence: number;
  }>;
  charge_lines: Array<{
    service_code: string;
    description: string;
    modifier_1: string;
    modifier_2: string;
    modifier_3: string;
    modifier_4: string;
    units: string;
    charge_amount: string;
    diagnosis_pointers: number[];
    sequence: number;
  }>;
};
