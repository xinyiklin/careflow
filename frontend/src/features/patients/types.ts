import type {
  FieldPath,
  RegisterOptions,
  UseFormRegisterReturn,
} from "react-hook-form";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import type { ApiPayload, EntityId } from "../../shared/api/types";
import type {
  AppointmentLike,
  PatientAddress,
  PatientInsurancePolicy,
  PatientLike,
  PatientPhoneEntryLike,
  StaffLike,
} from "../../shared/types/domain";

export type PatientSelectOption = {
  id: EntityId;
  name: string;
};

export type PatientCareProvider = StaffLike & {
  id: EntityId;
};

export type EmergencyContactFormValues = {
  name: string;
  relationship: string;
  phone_number: string;
  is_primary: boolean;
  notes: string;
};

export type PatientFormValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  date_of_birth: string;
  gender: string;
  sex_at_birth: string;
  race: string;
  race_declined: boolean;
  ethnicity: string;
  ethnicity_declined: boolean;
  preferred_language: string;
  preferred_language_declined: boolean;
  pronouns: string;
  email: string;
  address_line_1: string;
  address_line_2: string;
  address_city: string;
  address_state: string;
  address_zip_code: string;
  phone_cell: string;
  phone_home: string;
  phone_work: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contacts: EmergencyContactFormValues[];
  ssn: string;
  ssn_last4: string;
  pcp: string;
  referring_provider: string;
  preferred_pharmacy: string;
  is_active: boolean;
};

export type PatientRecord = PatientLike & {
  gender?: EntityId | null;
  gender_name?: string | null;
  sex_at_birth?: string | null;
  race?: string | null;
  race_declined?: boolean | null;
  ethnicity?: string | null;
  ethnicity_declined?: boolean | null;
  preferred_language?: string | null;
  preferred_language_declined?: boolean | null;
  pronouns?: string | null;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contacts?: EmergencyContactFormValues[] | null;
  ssn?: string | null;
  ssn_last4?: string | null;
  pcp?: EntityId | null;
  referring_provider?: EntityId | null;
  preferred_pharmacy?: EntityId | null;
  preferred_pharmacy_name?: string | null;
  is_active?: boolean | null;
  phones?: PatientPhoneEntryLike[] | null;
  address?: PatientAddress | null;
};

export type RegisterFormattedField = <
  TName extends FieldPath<PatientFormValues>,
>(
  name: TName,
  options?: RegisterOptions<PatientFormValues, TName>
) => UseFormRegisterReturn<TName>;

export type PatientHubTabKey =
  | "registration"
  | "insurance"
  | "medications"
  | "allergies"
  | "documents"
  | "notes"
  | "appointments";

export type PatientHubTab = {
  key: PatientHubTabKey;
  label: string;
  icon: LucideIcon;
};

export type PatientHubInsurancePolicy = PatientInsurancePolicy & {
  carrier?: EntityId | null;
  coverage_order?: InsuranceCoverageOrder | null;
  effective_date?: string | null;
  termination_date?: string | null;
  relationship_to_subscriber?: InsuranceRelationship | null;
  subscriber_name?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
};

export type InsuranceCoverageOrder =
  | "primary"
  | "secondary"
  | "tertiary"
  | "other";

export type InsuranceRelationship =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "other";

export type InsurancePolicyFormValues = {
  carrier: EntityId | "";
  plan_name: string;
  member_id: string;
  group_number: string;
  subscriber_name: string;
  relationship_to_subscriber: InsuranceRelationship;
  effective_date: string | null;
  termination_date: string | null;
  coverage_order: InsuranceCoverageOrder;
  is_primary: boolean;
  is_active: boolean;
  notes: string;
};

export type InsuranceCarrier = {
  id: EntityId;
  name?: string | null;
};

export type InsurancePolicyPayload = ApiPayload & {
  carrier: number;
  plan_name: string;
  member_id: string;
  group_number: string;
  subscriber_name: string;
  relationship_to_subscriber: InsuranceRelationship;
  effective_date: string | null;
  termination_date: string | null;
  coverage_order: InsuranceCoverageOrder;
  is_primary: boolean;
  is_active: boolean;
  notes: string;
};

export type AppointmentGroup = {
  upcoming: AppointmentLike[];
  recent: AppointmentLike[];
};

export type PatientEmergencyContact = EmergencyContactFormValues & {
  id?: EntityId | null;
};

export type PatientPatchPayload = ApiPayload;

export type PatientGenderOption = {
  id: EntityId;
  name: string;
};

export type PharmacyRecord = {
  id: EntityId;
  name?: string | null;
  phone_number?: string | null;
  address?: PatientAddress | null;
  accepts_erx?: boolean | null;
};

export type PatientHubEmptyTab = {
  title: string;
  description: string;
  action: string;
  icon: LucideIcon;
  variant?: "default" | "warning";
};

export type PatientHubEmptyTabs = Partial<
  Record<PatientHubTabKey, PatientHubEmptyTab>
>;

export type PatientHubSidebarFactProps = {
  icon?: LucideIcon | null;
  prefix?: string | null;
  value?: ReactNode;
};

export type PatientHubSidebarSectionProps = {
  title: string;
  children: ReactNode;
};

export type PatientPharmacyPreference = {
  id?: EntityId;
  pharmacy_name?: string | null;
  is_default?: boolean | null;
  is_active?: boolean | null;
  notes?: string | null;
  pharmacy?: {
    name?: string | null;
    accepts_erx?: boolean | null;
    service_type?: string | null;
    ncpdp_id?: string | null;
    npi?: string | null;
    phone_number?: string | null;
    fax_number?: string | null;
    address?: PatientAddress | null;
  } | null;
};
