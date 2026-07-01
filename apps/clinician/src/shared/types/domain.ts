import type { EntityId } from "../api/types";

import type { AppointmentBlockDisplay } from "../constants/appointmentBlockDisplay";

export type ApiRecord = Record<string, unknown>;

export type ThemePreference = "light" | "dark" | "system";

export type ScheduleStartMode = "resources" | "days";

export type ScheduleViewMode = "slot" | "agenda";

export type DefaultLandingPage = "schedule" | "admin";

export type ScheduleHeatmapMode = "auto" | "target";

export type QuickActionAssignment = {
  code: string;
  actionKey: string;
};

export type CustomOperatingHoursBlock = {
  days: number[];
  start_time: string;
  end_time: string;
};

export type FacilityLike = {
  id?: EntityId;
  name?: string | null;
  timezone?: string | null;
  operating_start_time?: string | null;
  operating_end_time?: string | null;
  operating_days?: Array<string | number> | null;
  custom_operating_hours?: CustomOperatingHoursBlock[] | null;
};

export type OrganizationLike = ApiRecord & {
  id?: EntityId;
  name?: string | null;
};

export type Facility = ApiRecord &
  FacilityLike & {
    id: EntityId;
    organization?: OrganizationLike | null;
  };

export type ResourceLike = {
  id?: EntityId;
  key?: string;
  name?: string | null;
  linked_staff_name?: string | null;
  linked_staff?: EntityId | null;
  default_room?: string | null;
  resourceId?: EntityId;
};

export type StaffLike = ApiRecord & {
  id?: EntityId;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title_code?: string | null;
  title_name?: string | null;
  role_code?: string | null;
  role_name?: string | null;
  can_render_claims?: boolean | null;
  is_active?: boolean | null;
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null;
};

export type SecurityPermissions = Record<string, boolean | undefined>;

export type UserMembership = ApiRecord & {
  id?: EntityId;
  facility: Facility;
  role?: ApiRecord | string | null;
  effective_security_permissions?: SecurityPermissions | null;
  can_eprescribe?: boolean | null;
};

export type UserPreferences = {
  defaultLandingPage: DefaultLandingPage;
  lastFacilityId: string;
  defaultFacilityId?: EntityId | null;
  sidebarCollapsed: boolean;
  overviewDensity: string;
  scheduleStartMode: ScheduleStartMode;
  scheduleViewMode: ScheduleViewMode;
  showScheduleSlotDividers: boolean;
  appointmentBlockDisplay: AppointmentBlockDisplay;
  theme: ThemePreference;
  clearRecentPatientsOnLogout: boolean;
  recentPatients: ApiRecord[];
  clearPersonalNotesOnLogout: boolean;
  personalNotes: string;
  showDemoBadge: boolean;
  quickActionAssignments: QuickActionAssignment[];
  showScheduleHeatmap: boolean;
  scheduleHeatmapMode: ScheduleHeatmapMode;
  scheduleHeatmapDailyTarget: number;
};

export type UserProfile = ApiRecord & {
  id?: EntityId;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  is_org_admin?: boolean;
  organization?: OrganizationLike | null;
  memberships?: UserMembership[];
  current_membership?: UserMembership | null;
  admin_facility_ids?: EntityId[];
  preferences?: Partial<UserPreferences> | ApiRecord | null;
};

export type ResourceDefinition = {
  key: string;
  label: string;
  resourceId?: EntityId;
};

export type PatientAddress = {
  line_1?: string | null;
  line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
};

export type PatientPhoneEntryLike = {
  label?: string | null;
  number?: string | number | null;
  phone_number?: string | number | null;
  is_primary?: boolean | null;
};

export type PatientLike = {
  id?: EntityId;
  facility_id?: EntityId | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  patient_first_name?: string | null;
  patient_middle_name?: string | null;
  patient_last_name?: string | null;
  patient_preferred_name?: string | null;
  patient_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  date_of_birth?: string | null;
  chart_number?: string | number | null;
  address?: PatientAddress | null;
  phones?: PatientPhoneEntryLike[] | null;
  primary_phone_label?: string | null;
  primary_phone_number?: string | number | null;
  phone_cell?: string | number | null;
  phone_home?: string | number | null;
  phone_work?: string | number | null;
  pcp_name?: string | null;
  referring_provider_name?: string | null;
};

export type PatientInsurancePolicy = ApiRecord & {
  id?: EntityId;
  is_primary?: boolean | null;
  carrier_name?: string | null;
  plan_name?: string | null;
  member_id?: string | null;
  group_number?: string | null;
};

export type AppointmentLike = PatientLike & {
  id?: EntityId;
  patient_id?: EntityId | null;
  patient_date_of_birth?: string | null;
  patient_chart_number?: string | number | null;
  resource?: EntityId | null;
  resource_name?: string | null;
  rendering_provider?: EntityId | null;
  rendering_provider_name?: string | null;
  rendering_provider_role_name?: string | null;
  rendering_provider_title_name?: string | null;
  room?: string | null;
  reason?: string | null;
  notes?: string | null;
  status?: EntityId | null;
  status_name?: string | null;
  status_code?: string | null;
  status_color?: string | null;
  appointment_type?: EntityId | null;
  appointment_type_name?: string | null;
  appointment_type_code?: string | null;
  appointment_type_color?: string | null;
  is_billable?: boolean | null;
  facility?: EntityId | null;
  created_by_name?: string | null;
  appointment_time?: string | null;
  duration_minutes?: number | string | null;
  end_time?: string | null;
  date?: string | null;
  time?: string | null;
  end_date?: string | null;
  end_time_str?: string | null;
};

export type ScheduleWindow = {
  startMinute: number;
  endMinute: number;
};

export type StaffRecord = StaffLike & {
  id: EntityId;
};

export type CareProviderRecord = StaffRecord;

export type ResourceRecord = ApiRecord &
  ResourceLike & {
    id: EntityId;
    name?: string | null;
    is_active?: boolean | null;
  };

export type AppointmentStatusOption = ApiRecord & {
  id: EntityId;
  name?: string | null;
  code?: string | null;
  color?: string | null;
  is_active?: boolean | null;
};

export type AppointmentTypeOption = AppointmentStatusOption & {
  duration_minutes?: string | number | null;
};

export type PatientGenderOption = ApiRecord & {
  id: EntityId;
  name: string;
  is_active?: boolean | null;
};

export type PharmacyRecord = ApiRecord & {
  id: EntityId;
  name?: string | null;
  phone_number?: string | null;
  address?: PatientAddress | null;
  accepts_erx?: boolean | null;
  is_active?: boolean | null;
};

export type StaffRoleRecord = ApiRecord & {
  id: EntityId;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

export type StaffTitleRecord = StaffRoleRecord;
