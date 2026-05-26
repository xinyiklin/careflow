import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import DocumentCategoriesModal from "./DocumentCategoriesModal";
import DocumentsWorkspace from "./DocumentsWorkspace";
import useDocumentCategories from "../hooks/useDocumentCategories";
import usePatientDocuments, {
  getPatientDocumentsQueryKey,
} from "../hooks/usePatientDocuments";

import type { EntityId } from "../../../shared/api/types";
import type {
  DocumentCategory,
  DocumentCategoryNavItem,
  PatientDocument,
  PatientWithDocuments,
} from "../types";
import type { DocumentsWorkspaceProps } from "./DocumentsWorkspace";

type PatientDocumentsWorkspaceProps = {
  patient?: PatientWithDocuments | null;
  facilityId?: EntityId | null;
  canManageDocuments?: boolean;
  canManageCategories?: boolean;
  onDocumentUploaded?: (document: PatientDocument | null) => void;
} & Omit<
  DocumentsWorkspaceProps,
  | "documents"
  | "categories"
  | "selectedPatient"
  | "selectedFacilityId"
  | "canManageCategories"
  | "onManageCategories"
  | "isLoadingDocuments"
  | "documentLoadError"
  | "onRetryDocuments"
  | "onDocumentUploaded"
  | "onDocumentUpdated"
  | "onDocumentDeleted"
>;

function getInitialDocuments(patient?: PatientWithDocuments | null) {
  if (Array.isArray(patient?.patient_documents))
    return patient.patient_documents;
  if (Array.isArray(patient?.documents)) return patient.documents;
  return [];
}

function getCategoryNavLabel(category: DocumentCategory) {
  const compactLabels = {
    lab: "Labs",
    imaging: "Imaging",
    referrals: "Referrals",
    admin: "Admin",
    consent: "Consent",
  };

  return (
    compactLabels[category.code as keyof typeof compactLabels] || category.name
  );
}

export default function PatientDocumentsWorkspace({
  patient,
  facilityId,
  canManageDocuments = true,
  canManageCategories = false,
  onDocumentUploaded,
  ...workspaceProps
}: PatientDocumentsWorkspaceProps) {
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

  const categories: DocumentCategoryNavItem[] = [
    { id: "all", label: "All Documents" },
    ...categoriesQuery.categories.map((category) => ({
      ...category,
      id: category.code,
      label: category.name,
      navLabel: getCategoryNavLabel(category),
    })),
  ];

  const handleDocumentUploaded = (document: PatientDocument | null) => {
    if (!document) return;
    queryClient.setQueryData<PatientDocument[]>(queryKey, (current = []) => {
      const currentDocuments = Array.isArray(current) ? current : [];
      if (currentDocuments.some((item) => item.id === document.id)) {
        return currentDocuments;
      }
      return [document, ...currentDocuments];
    });
    queryClient.invalidateQueries({ queryKey });
    categoriesQuery.reload();
    onDocumentUploaded?.(document);
  };

  const handleDocumentUpdated = (document: PatientDocument | null) => {
    if (!document) return;
    queryClient.setQueryData<PatientDocument[]>(queryKey, (current = []) => {
      const currentDocuments = Array.isArray(current) ? current : [];
      return currentDocuments.map((item) =>
        String(item.id) === String(document.id) ? document : item
      );
    });
    queryClient.invalidateQueries({ queryKey });
    categoriesQuery.reload();
  };

  const handleDocumentDeleted = (documentId: EntityId) => {
    queryClient.setQueryData<PatientDocument[]>(queryKey, (current = []) => {
      const currentDocuments = Array.isArray(current) ? current : [];
      return currentDocuments.filter(
        (item) => String(item.id) !== String(documentId)
      );
    });
    queryClient.invalidateQueries({ queryKey });
    categoriesQuery.reload();
  };

  return (
    <>
      <DocumentsWorkspace
        {...workspaceProps}
        documents={documentsQuery.documents}
        categories={categories}
        selectedPatient={patient}
        selectedFacilityId={facilityId}
        canManageDocuments={canManageDocuments}
        canManageCategories={canManageCategories}
        onManageCategories={() => setIsCategoryModalOpen(true)}
        isLoadingDocuments={documentsQuery.loading}
        documentLoadError={documentsQuery.error || categoriesQuery.error}
        onRetryDocuments={() => {
          documentsQuery.refetch();
          categoriesQuery.reload();
        }}
        onDocumentUploaded={handleDocumentUploaded}
        onDocumentUpdated={handleDocumentUpdated}
        onDocumentDeleted={handleDocumentDeleted}
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
