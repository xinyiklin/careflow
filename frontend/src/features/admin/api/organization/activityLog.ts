import { apiRequest } from "../../../../shared/api/client";

import type { AdminAuditEvent, AdminAuditEventQueryParams } from "../../types";

export function fetchOrganizationActivityLog(
  params?: AdminAuditEventQueryParams
) {
  return apiRequest<AdminAuditEvent[]>("/audit/events/", {
    params: params || {},
  });
}
