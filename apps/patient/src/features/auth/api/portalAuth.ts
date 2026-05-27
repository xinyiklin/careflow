import { apiRequest } from "../../../shared/api/client";

export type PortalEmergencyContact = {
  name: string;
  relationship: string;
  phone_number: string;
};

export type PortalAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null;

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
};

export type PortalLoginCredentials = {
  username: string;
  password: string;
};

export type PortalAuthTokenResponse = {
  access?: string | null;
  refresh?: string | null;
};

export function loginPortal(credentials: PortalLoginCredentials) {
  return apiRequest<PortalAuthTokenResponse>("/users/token/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function fetchPortalMe() {
  return apiRequest<PortalPatient>("/portal/me/");
}
