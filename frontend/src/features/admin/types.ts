import type { ReactNode } from "react";

import type { ApiPayload, EntityId } from "../../shared/api/types";
import type {
  Facility,
  OrganizationLike,
  StaffLike,
  UserProfile,
} from "../../shared/types/domain";
import type { SecurityPermissions } from "./constants/securityPermissions";

export type AdminEntityId = EntityId;

export type AdminSavePayload<TValues extends ApiPayload = ApiPayload> = {
  id?: EntityId | null;
  values: TValues;
};

export type AdminConfirmVariant = "default" | "danger" | "warning";

export type AdminConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: AdminConfirmVariant;
  onConfirm: (() => Promise<void> | void) | null;
};

export type AdminListFilterOption = {
  key: string;
  label: string;
  count?: number;
  active?: boolean;
};

export type AdminSortOption<TRecord> = {
  key: string;
  label: string;
  compare: (first: TRecord, second: TRecord) => number;
};

export type AdminRecordMeta = string | number;

export type AdminRenderable = ReactNode;

export type AdminFacility = Facility & {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  fax?: string | null;
  tax_id?: string | null;
  npi?: string | null;
  clia_number?: string | null;
  facility_code?: string | null;
  phone_number?: string | null;
  fax_number?: string | null;
  email?: string | null;
  notes?: string | null;
  address?: AdminAddress | null;
  is_active?: boolean | null;
  operating_days?: Array<string | number> | null;
};

export type AdminFacilityForm = ApiPayload & {
  name: string;
  facility_code: string;
  timezone: string;
  operating_start_time: string;
  operating_end_time: string;
  operating_days: number[];
  phone_number: string;
  fax_number: string;
  email: string;
  notes: string;
  is_active: boolean;
  address: AdminAddressForm;
};

export type AdminAppointmentType = {
  id: EntityId;
  code?: string | null;
  name?: string | null;
  color?: string | null;
  duration_minutes?: number | string | null;
  is_active?: boolean | null;
  is_deletable?: boolean | null;
};

export type AdminAppointmentStatus = {
  id: EntityId;
  code?: string | null;
  name?: string | null;
  color?: string | null;
  is_active?: boolean | null;
  is_deletable?: boolean | null;
  counts_as_checked_in?: boolean | null;
  counts_as_checked_out?: boolean | null;
  counts_as_cancelled?: boolean | null;
  counts_as_no_show?: boolean | null;
};

export type AdminResource = {
  id: EntityId;
  key?: string | null;
  name?: string | null;
  description?: string | null;
  default_room?: string | null;
  linked_staff?: EntityId | null;
  linked_staff_name?: string | null;
  is_active?: boolean | null;
  is_deletable?: boolean | null;
  visible_on_schedule?: boolean | null;
  sort_order?: number | string | null;
  schedule_days?: Array<string | number> | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
  operating_start_time?: string | null;
  operating_end_time?: string | null;
};

export type AdminStaff = StaffLike & {
  id: EntityId;
  email?: string | null;
  phone?: string | null;
  title?:
    | { id?: EntityId; code?: string | null; name?: string | null }
    | string
    | null;
  role?:
    | { id?: EntityId; code?: string | null; name?: string | null }
    | EntityId
    | string
    | null;
  role_id?: EntityId | null;
  security_role?: EntityId | null;
  is_provider?: boolean | null;
  security_overrides?: SecurityPermissions | null;
  resource_operating_start_time?: string | null;
  resource_operating_end_time?: string | null;
  user?: {
    id?: EntityId;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

export type AdminStaffRole = {
  id: EntityId;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  security_permissions?: SecurityPermissions | null;
  staff_count?: number | string | null;
  is_active?: boolean | null;
  is_system?: boolean | null;
  is_system_role?: boolean | null;
  is_protected?: boolean | null;
};

export type AdminOrganizationUser = UserProfile & {
  id: EntityId;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  role?: "owner" | "admin" | "member" | string | null;
  facility_ids?: EntityId[];
};

export type AdminOrganizationUserForm = ApiPayload & {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "owner" | "admin" | "member";
  is_active: boolean;
};

export type AdminOrganizationPharmacy = {
  id: EntityId;
  name?: string | null;
  legal_business_name?: string | null;
  source?: "custom" | "imported" | "directory" | string | null;
  directory_status?: "active" | "inactive" | "unknown" | string | null;
  service_type?: string | null;
  ncpdp_id?: string | null;
  npi?: string | null;
  dea_number?: string | null;
  tax_id?: string | null;
  store_number?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  fax?: string | null;
  fax_number?: string | null;
  accepts_erx?: boolean | null;
  is_24_hour?: boolean | null;
  address?: AdminAddress | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  is_active?: boolean | null;
};

export type AdminOrganizationPharmacyPreference = {
  id: EntityId;
  pharmacy?: AdminOrganizationPharmacy | null;
  notes?: string | null;
  is_preferred?: boolean | null;
  is_hidden?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | string | null;
};

export type AdminOrganizationPharmacyForm = ApiPayload & {
  name: string;
  legal_business_name: string;
  ncpdp_id: string;
  npi: string;
  dea_number: string;
  tax_id: string;
  store_number: string;
  service_type: string;
  phone_number: string;
  fax_number: string;
  accepts_erx: boolean;
  is_24_hour: boolean;
  notes: string;
  is_preferred: boolean;
  is_hidden: boolean;
  is_active: boolean;
  sort_order: number | string;
  address: AdminAddressForm;
};

export type AdminAddress = {
  line_1?: string | null;
  line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
};

export type AdminAddressForm = ApiPayload & {
  line_1: string;
  line_2: string;
  city: string;
  state: string;
  zip_code: string;
};

export type AdminOrganizationOverview = OrganizationLike & {
  id: EntityId;
  slug?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  email?: string | null;
  fax?: string | null;
  website?: string | null;
  notes?: string | null;
  address?: AdminAddress | null;
  members?: AdminOrganizationUser[] | null;
  active_people_count?: number | string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  tax_id?: string | null;
  npi?: string | null;
};

export type AdminOrganizationOverviewForm = ApiPayload & {
  name: string;
  slug: string;
  legal_name: string;
  phone_number: string;
  email: string;
  website: string;
  tax_id: string;
  notes: string;
  address: AdminAddressForm;
};
