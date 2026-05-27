import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export type OrgSecurityRole = {
  id?: EntityId;
  key: string;
  label: string;
  is_system_role: boolean;
  is_deletable?: boolean;
  description?: string;
  security_permissions: Record<string, boolean>;
  member_count: number;
};

export function fetchOrganizationSecurity() {
  return apiRequest<OrgSecurityRole[]>("/organizations/security/");
}

export function updateOrganizationRoleSecurity(
  role: string,
  security_permissions: Record<string, boolean>
) {
  return apiRequest<{
    role: string;
    security_permissions: Record<string, boolean>;
  }>("/organizations/security/update-role/", {
    method: "PATCH",
    body: JSON.stringify({ role, security_permissions }),
  });
}

export function createOrganizationRole(values: ApiPayload) {
  return apiRequest<OrgSecurityRole>("/organizations/roles/", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateOrganizationRole(id: EntityId, values: ApiPayload) {
  return apiRequest<OrgSecurityRole>(`/organizations/roles/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function deleteOrganizationRole(id: EntityId) {
  return apiRequest<void>(`/organizations/roles/${id}/`, {
    method: "DELETE",
  });
}
