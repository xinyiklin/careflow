import type { ReactNode } from "react";

import type { ApiPayload, EntityId } from "../../shared/api/types";
import type {
  Facility,
  OrganizationLike,
  SecurityPermissions,
  StaffLike,
  UserProfile,
} from "../../shared/types/domain";

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
  is_active?: boolean | null;
  operating_days?: Array<string | number> | null;
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
  visible_on_schedule?: boolean | null;
  sort_order?: number | string | null;
  schedule_days?: Array<string | number> | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
};

export type AdminStaff = StaffLike & {
  id: EntityId;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  role?: EntityId | string | null;
  role_id?: EntityId | null;
  security_role?: EntityId | null;
  is_provider?: boolean | null;
};

export type AdminStaffRole = {
  id: EntityId;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  security_permissions?: SecurityPermissions | null;
  staff_count?: number | string | null;
  is_system?: boolean | null;
  is_protected?: boolean | null;
};

export type AdminOrganizationUser = UserProfile & {
  id: EntityId;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  facility_ids?: EntityId[];
};

export type AdminOrganizationPharmacy = {
  id: EntityId;
  name?: string | null;
  ncpdp_id?: string | null;
  phone?: string | null;
  fax?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  is_active?: boolean | null;
};

export type AdminOrganizationOverview = OrganizationLike & {
  id: EntityId;
  legal_name?: string | null;
  phone?: string | null;
  fax?: string | null;
  website?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  tax_id?: string | null;
  npi?: string | null;
};
