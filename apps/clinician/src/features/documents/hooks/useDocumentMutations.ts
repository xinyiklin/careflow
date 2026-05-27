import { useState } from "react";

import { getErrorMessage } from "../../../shared/utils/errors";
import {
  deletePatientDocument,
  downloadPatientDocumentBundle,
  downloadPatientDocument,
  updatePatientDocument,
  uploadPatientDocument,
} from "../api/documents";

import type { Dispatch, SetStateAction } from "react";
import type { EntityId } from "../../../shared/api/types";
import type { PatientLike } from "../../../shared/types/domain";
import type { DocumentMetadataSubmitValues } from "../components/DocumentMetadataModal";
import type { NormalizedPatientDocument, PatientDocument } from "../types";

type UseDocumentMutationsOptions = {
  facilityId?: EntityId | null;
  selectedPatient?: PatientLike | null;
  focusedDocumentId: string;
  setFocusedDocumentId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectedDocuments: NormalizedPatientDocument[];
  canManageDocuments?: boolean;
  onDocumentUploaded?: ((document: PatientDocument | null) => void) | null;
  onDocumentUpdated?: ((document: PatientDocument | null) => void) | null;
  onDocumentDeleted?: ((documentId: EntityId) => void) | null;
};

export default function useDocumentMutations({
  facilityId,
  selectedPatient,
  focusedDocumentId,
  setFocusedDocumentId,
  setSelectedIds,
  selectedDocuments,
  canManageDocuments = true,
  onDocumentUploaded,
  onDocumentUpdated,
  onDocumentDeleted,
}: UseDocumentMutationsOptions) {
  const [errorMessage, setErrorMessage] = useState("");
  const [metadataModalMode, setMetadataModalMode] = useState<
    "upload" | "edit" | null
  >(null);
  const [editingDocument, setEditingDocument] =
    useState<NormalizedPatientDocument | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [deleteCandidate, setDeleteCandidate] =
    useState<NormalizedPatientDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canUpload =
    Boolean(canManageDocuments) &&
    Boolean(selectedPatient) &&
    Boolean(facilityId) &&
    !isSavingMetadata;

  const handleUploadClick = () => {
    if (!canUpload) return;
    setMetadataModalMode("upload");
    setEditingDocument(null);
    setMetadataError("");
  };

  const handleEditDocument = (document: NormalizedPatientDocument) => {
    if (!canManageDocuments) return;
    setEditingDocument(document);
    setMetadataModalMode("edit");
    setMetadataError("");
  };

  const closeMetadataModal = () => {
    if (isSavingMetadata) return;
    setMetadataModalMode(null);
    setEditingDocument(null);
    setMetadataError("");
  };

  const handleMetadataSubmit = async (values: DocumentMetadataSubmitValues) => {
    if (!facilityId) return;
    if (!canManageDocuments) return;

    try {
      setIsSavingMetadata(true);
      setMetadataError("");
      setErrorMessage("");

      if (metadataModalMode === "upload") {
        const uploadItems =
          values.files && values.files.length > 0
            ? values.files
            : values.file
              ? [{ id: "upload-1", file: values.file, name: values.name }]
              : [];

        if (!selectedPatient || uploadItems.length === 0) return;

        const uploadResults = await Promise.allSettled(
          uploadItems.map((item) =>
            uploadPatientDocument({
              facilityId,
              patientId: selectedPatient.id,
              file: item.file,
              name: item.name || item.file.name,
              category: values.category,
              documentDate: values.documentDate,
              notes: values.notes,
            })
          )
        );
        const uploadedDocuments = uploadResults
          .filter(
            (result): result is PromiseFulfilledResult<PatientDocument> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value);
        const failedCount = uploadResults.length - uploadedDocuments.length;

        if (uploadedDocuments.length === 0) {
          const failedResult = uploadResults.find(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected"
          );
          throw (
            failedResult?.reason || new Error("Failed to upload documents.")
          );
        }

        uploadedDocuments.forEach((uploadedDocument) => {
          onDocumentUploaded?.(uploadedDocument);
        });

        const lastUploadedDocument =
          uploadedDocuments[uploadedDocuments.length - 1];
        if (lastUploadedDocument?.id) {
          setFocusedDocumentId(String(lastUploadedDocument.id));
        }

        if (failedCount > 0) {
          setErrorMessage(
            `Uploaded ${uploadedDocuments.length} of ${uploadItems.length} documents. ${failedCount} failed.`
          );
        }
      }

      if (metadataModalMode === "edit" && editingDocument) {
        const updatedDocument = await updatePatientDocument({
          facilityId,
          documentId: editingDocument.id,
          values: {
            name: values.name,
            category: values.category,
            document_date: values.documentDate || null,
            notes: values.notes,
          },
        });
        onDocumentUpdated?.(updatedDocument);
        if (updatedDocument?.id) {
          setFocusedDocumentId(String(updatedDocument.id));
        }
      }

      setMetadataModalMode(null);
      setEditingDocument(null);
    } catch (error) {
      setMetadataError(getErrorMessage(error, "Failed to save document."));
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleDownloadDocument = async (
    document: PatientDocument | NormalizedPatientDocument
  ) => {
    if (!facilityId) return;
    try {
      setErrorMessage("");
      await downloadPatientDocument({ facilityId, document });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to download document."));
    }
  };

  const handleBatchDownload = async () => {
    if (!selectedDocuments.length) return;
    try {
      setErrorMessage("");
      await downloadPatientDocumentBundle({
        facilityId,
        documents: selectedDocuments,
      });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Failed to download document bundle.")
      );
    }
  };

  const handleDeleteDocument = async () => {
    if (!facilityId || !deleteCandidate) return;
    if (!canManageDocuments) return;
    try {
      setIsDeleting(true);
      setErrorMessage("");
      await deletePatientDocument({
        facilityId,
        documentId: deleteCandidate.id,
      });
      onDocumentDeleted?.(deleteCandidate.id);
      setSelectedIds((current) =>
        current.filter((documentId) => documentId !== deleteCandidate.id)
      );
      if (focusedDocumentId === deleteCandidate.id) {
        setFocusedDocumentId("");
      }
      setDeleteCandidate(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete document."));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    errorMessage,
    setErrorMessage,
    metadataModalMode,
    editingDocument,
    metadataError,
    isSavingMetadata,
    deleteCandidate,
    setDeleteCandidate,
    isDeleting,
    canUpload,
    handleUploadClick,
    handleEditDocument,
    closeMetadataModal,
    handleMetadataSubmit,
    handleDownloadDocument,
    handleBatchDownload,
    handleDeleteDocument,
  };
}
