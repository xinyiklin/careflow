import { apiBlobRequest, apiRequest } from "../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../shared/api/types";

type FacilityScopedParams = {
  facilityId?: EntityId | null;
};

type PatientScopedParams = FacilityScopedParams & {
  patientId?: EntityId | null;
};

type PatientDocumentRef = {
  id: EntityId;
  name?: string | null;
};

type PatientDocumentBundleParams = FacilityScopedParams & {
  documents: PatientDocumentRef[];
};

type PatientDocumentParams = FacilityScopedParams & {
  document: PatientDocumentRef;
};

function getFilenameFromDisposition(
  contentDisposition: string,
  fallback?: string | null
) {
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback || "document";
}

function openBlob(blob: Blob, filename?: string | null) {
  const url = URL.createObjectURL(blob);
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "document";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadBlob(blob: Blob, filename?: string | null) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function uploadPatientDocument({
  facilityId,
  patientId,
  file,
  category = "admin",
}: PatientScopedParams & {
  file: File;
  category?: string;
}) {
  const formData = new FormData();
  formData.append("patient_id", String(patientId));
  formData.append("file", file);
  formData.append("name", file.name);
  formData.append("category", category);

  return apiRequest("/patients/documents/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: formData,
  });
}

export function fetchPatientDocuments({
  facilityId,
  patientId,
}: PatientScopedParams = {}) {
  return apiRequest("/patients/documents/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
    },
  });
}

export function fetchDocumentCategories({
  facilityId,
}: FacilityScopedParams = {}) {
  return apiRequest("/patients/document-categories/", {
    params: { facility_id: facilityId },
  });
}

export function createDocumentCategory({
  facilityId,
  values,
}: FacilityScopedParams & {
  values: ApiPayload;
}) {
  return apiRequest("/patients/document-categories/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updateDocumentCategory({
  facilityId,
  categoryId,
  values,
}: FacilityScopedParams & {
  categoryId: EntityId;
  values: ApiPayload;
}) {
  return apiRequest(`/patients/document-categories/${categoryId}/`, {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function deleteDocumentCategory({
  facilityId,
  categoryId,
}: FacilityScopedParams & {
  categoryId: EntityId;
}) {
  return apiRequest(`/patients/document-categories/${categoryId}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

export async function openPatientDocumentBundle({
  facilityId,
  documents,
}: PatientDocumentBundleParams) {
  const response = await apiBlobRequest("/patients/documents/bundle/view/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify({
      document_ids: documents.map((document) => document.id),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  openBlob(response.blob, "patient-documents.pdf");
}

export async function downloadPatientDocumentBundle({
  facilityId,
  documents,
}: PatientDocumentBundleParams) {
  const response = await apiBlobRequest(
    "/patients/documents/bundle/download/",
    {
      method: "POST",
      params: { facility_id: facilityId },
      body: JSON.stringify({
        document_ids: documents.map((document) => document.id),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  downloadBlob(
    response.blob,
    getFilenameFromDisposition(
      response.contentDisposition,
      "patient-documents.pdf"
    )
  );
}

export async function openPatientDocument({
  facilityId,
  document,
}: PatientDocumentParams) {
  const response = await apiBlobRequest(
    `/patients/documents/${document.id}/view/`,
    {
      params: { facility_id: facilityId },
    }
  );
  openBlob(
    response.blob,
    getFilenameFromDisposition(response.contentDisposition, document.name)
  );
}

export async function getPatientDocumentPreview({
  facilityId,
  document,
}: PatientDocumentParams) {
  const response = await apiBlobRequest(
    `/patients/documents/${document.id}/view/`,
    {
      params: { facility_id: facilityId },
    }
  );

  return {
    blob: response.blob,
    filename: getFilenameFromDisposition(
      response.contentDisposition,
      document.name
    ),
    contentType: response.contentType,
    isExternal: false,
  };
}

export async function downloadPatientDocument({
  facilityId,
  document,
}: PatientDocumentParams) {
  const response = await apiBlobRequest(
    `/patients/documents/${document.id}/download/`,
    {
      params: { facility_id: facilityId },
    }
  );
  downloadBlob(
    response.blob,
    getFilenameFromDisposition(response.contentDisposition, document.name)
  );
}
