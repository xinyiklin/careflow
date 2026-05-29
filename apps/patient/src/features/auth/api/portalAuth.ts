import type { components } from "@careflow/api-types";

import { apiRequest } from "../../../shared/api/client";
import type { AssertSchemaKeys } from "../../../shared/api/types";

export type PortalEmergencyContact = {
  name: string;
  relationship: string;
  phone_number: string;
};

export type PortalAddress = {
  id?: number;
  line_1?: string | null;
  line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
} | null;

export type PortalInsurancePolicy = {
  id: number;
  carrier_name: string;
  plan_name: string;
  member_id: string;
  group_number: string;
  subscriber_name: string;
  relationship_to_subscriber: string;
  effective_date: string | null;
  termination_date: string | null;
  is_primary: boolean;
  notes: string | null;
};

export type PortalPatient = {
  id: number;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  sex_at_birth: string | null;
  race: string | null;
  ethnicity: string | null;
  preferred_language: string | null;
  pronouns: string | null;
  email: string | null;
  primary_phone_number: string;
  address: PortalAddress;
  primary_emergency_contact: PortalEmergencyContact | null;
  preferred_pharmacy_name: string;
  facility_name: string;
  facility_timezone: string;
  insurance_policies?: PortalInsurancePolicy[];
};

/**
 * Drift guard: every field {@link PortalPatient} reads must still exist in the
 * backend `PortalPatient` schema. Note `insurance_policies` intentionally
 * diverges in *value* type — the schema serializes it as a PK list (`number[]`)
 * while the portal expects expanded objects; key-coverage tolerates that, so
 * this only fires if a field name is renamed or removed upstream.
 */
type _AssertPortalPatientKeys = AssertSchemaKeys<
  components["schemas"]["PortalPatient"],
  keyof PortalPatient
>;

export type PortalLoginCredentials = {
  username: string;
  password: string;
};

export type PortalAuthTokenResponse = {
  access?: string | null;
  refresh?: string | null;
  is_demo?: boolean;
};

export function loginPortal(credentials: PortalLoginCredentials) {
  return apiRequest<PortalAuthTokenResponse>("/portal/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function demoLoginPortal() {
  return apiRequest<PortalAuthTokenResponse>("/portal/demo-login/", {
    method: "POST",
  });
}

export function fetchPortalMe() {
  return apiRequest<PortalPatient>("/portal/me/");
}
