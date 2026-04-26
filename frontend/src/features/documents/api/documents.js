import { apiBlobRequest, apiRequest } from "../../../shared/api/client";

function getFilenameFromDisposition(contentDisposition, fallback) {
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback || "document";
}

function openBlob(blob, filename) {
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

function downloadBlob(blob, filename) {
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
}) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  formData.append("name", file.name);
  formData.append("category", category);

  return apiRequest("/patients/documents/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: formData,
  });
}

export function fetchPatientDocuments({ facilityId, patientId } = {}) {
  return apiRequest("/patients/documents/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
    },
  });
}

export function fetchDocumentCategories({ facilityId } = {}) {
  return apiRequest("/patients/document-categories/", {
    params: { facility_id: facilityId },
  });
}

export function createDocumentCategory({ facilityId, values }) {
  return apiRequest("/patients/document-categories/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function updateDocumentCategory({ facilityId, categoryId, values }) {
  return apiRequest(`/patients/document-categories/${categoryId}/`, {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify(values),
  });
}

export function deleteDocumentCategory({ facilityId, categoryId }) {
  return apiRequest(`/patients/document-categories/${categoryId}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

export async function openPatientDocumentBundle({ facilityId, documents }) {
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

export async function downloadPatientDocumentBundle({ facilityId, documents }) {
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

export async function openPatientDocument({ facilityId, document }) {
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

export async function getPatientDocumentPreview({ facilityId, document }) {
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

export async function downloadPatientDocument({ facilityId, document }) {
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
