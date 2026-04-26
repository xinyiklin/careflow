import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import DocumentCategoriesModal from "./DocumentCategoriesModal";
import DocumentsWorkspace from "./DocumentsWorkspace";
import useDocumentCategories from "../hooks/useDocumentCategories";
import usePatientDocuments, {
  getPatientDocumentsQueryKey,
} from "../hooks/usePatientDocuments";

function getInitialDocuments(patient) {
  if (Array.isArray(patient?.patient_documents))
    return patient.patient_documents;
  if (Array.isArray(patient?.documents)) return patient.documents;
  return [];
}

function getCategoryNavLabel(category) {
  const compactLabels = {
    lab: "Labs",
    imaging: "Imaging",
    referrals: "Referrals",
    admin: "Admin",
    consent: "Consent",
  };

  return compactLabels[category.code] || category.name;
}

export default function PatientDocumentsWorkspace({
  patient,
  facilityId,
  canManageCategories = false,
  onDocumentUploaded,
  ...workspaceProps
}) {
  const queryClient = useQueryClient();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const patientId = patient?.id || null;
  const queryKey = getPatientDocumentsQueryKey(facilityId, patientId);
  const documentsQuery = usePatientDocuments({
    facilityId,
    patientId,
    initialDocuments: getInitialDocuments(patient),
  });
  const categoriesQuery = useDocumentCategories({ facilityId });

  const categories = [
    { id: "all", label: "All Documents" },
    ...categoriesQuery.categories.map((category) => ({
      ...category,
      id: category.code,
      label: category.name,
      navLabel: getCategoryNavLabel(category),
    })),
  ];

  const handleDocumentUploaded = (document) => {
    queryClient.setQueryData(queryKey, (current = []) => {
      const currentDocuments = Array.isArray(current) ? current : [];
      if (currentDocuments.some((item) => item.id === document.id)) {
        return currentDocuments;
      }
      return [document, ...currentDocuments];
    });
    queryClient.invalidateQueries({ queryKey });
    onDocumentUploaded?.(document);
  };

  return (
    <>
      <DocumentsWorkspace
        {...workspaceProps}
        documents={documentsQuery.documents}
        categories={categories}
        selectedPatient={patient}
        selectedFacilityId={facilityId}
        canManageCategories={canManageCategories}
        onManageCategories={() => setIsCategoryModalOpen(true)}
        isLoadingDocuments={documentsQuery.loading}
        documentLoadError={documentsQuery.error || categoriesQuery.error}
        onRetryDocuments={() => {
          documentsQuery.refetch();
          categoriesQuery.reload();
        }}
        onDocumentUploaded={handleDocumentUploaded}
      />
      <DocumentCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categoriesQuery.categories}
        loading={categoriesQuery.loading}
        saving={categoriesQuery.saving}
        error={categoriesQuery.error}
        onSave={categoriesQuery.saveCategory}
        onDelete={categoriesQuery.deleteCategory}
      />
    </>
  );
}
