import { useQuery } from "@tanstack/react-query";

import { fetchOrganizationActivityLog } from "../../api/organization/activityLog";
import type { AdminAuditEventQueryParams } from "../../types";

export const ORGANIZATION_ACTIVITY_LOG_QUERY_KEY = [
  "admin",
  "organization",
  "activityLog",
] as const;

type UseOrganizationActivityLogOptions = {
  enabled?: boolean;
};

export default function useOrganizationActivityLog(
  params?: AdminAuditEventQueryParams,
  options: UseOrganizationActivityLogOptions = {}
) {
  const queryKey = [ORGANIZATION_ACTIVITY_LOG_QUERY_KEY, params] as const;

  const logQuery = useQuery({
    queryKey,
    queryFn: () => fetchOrganizationActivityLog(params),
    enabled: options.enabled ?? true,
  });

  return {
    events: Array.isArray(logQuery.data) ? logQuery.data : [],
    loading: logQuery.isLoading,
    loadError: logQuery.error?.message || "",
    reload: logQuery.refetch,
  };
}
