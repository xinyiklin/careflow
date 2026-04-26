import { useQuery } from "@tanstack/react-query";

import { fetchPatientDocuments } from "../api/documents";

export function getPatientDocumentsQueryKey(facilityId, patientId) {
  return ["patientDocuments", facilityId || null, patientId || null];
}

export default function usePatientDocuments({
  facilityId,
  patientId,
  initialDocuments = [],
}) {
  const documentsQuery = useQuery({
    queryKey: getPatientDocumentsQueryKey(facilityId, patientId),
    queryFn: () => fetchPatientDocuments({ facilityId, patientId }),
    enabled: !!facilityId && !!patientId,
    initialData: initialDocuments.length ? initialDocuments : undefined,
  });

  return {
    documents: documentsQuery.data || [],
    error: documentsQuery.error?.message || "",
    loading: documentsQuery.isLoading,
    refetch: documentsQuery.refetch,
  };
}
