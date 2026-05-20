import type { ApiPayload, EntityId } from "../../shared/api/types";
import type { ApiRecord, PatientLike } from "../../shared/types/domain";

export type PatientDocument = ApiRecord & {
  id: EntityId;
  uuid?: EntityId | null;
  name?: string | null;
  title?: string | null;
  file_name?: string | null;
  category?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_label?: string | null;
  document_date?: string | null;
  date?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  uploaded_by_name?: string | null;
  uploaded_by?: string | null;
  author_name?: string | null;
  size?: string | number | null;
  file_size_display?: string | null;
  content_type?: string | null;
  original_filename?: string | null;
  notes?: string | null;
  storage_key?: string | null;
  url?: string | null;
  file_url?: string | null;
  download_url?: string | null;
};

export type NormalizedPatientDocument = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  date: string;
  documentDate: string;
  uploadedBy: string;
  size: string | number;
  contentType: string;
  originalFilename: string;
  notes: string;
  storageKey: string;
  url: string;
};

export type SavePatientDocumentMetadataPayload = {
  name: string;
  category: string;
  document_date?: string | null;
  notes?: string;
};

export type DocumentCategory = ApiRecord & {
  id: EntityId;
  code: string;
  name: string;
  sort_order?: number | string | null;
  is_system?: boolean | null;
  document_count?: number | null;
  can_delete?: boolean | null;
  delete_block_reason?: string | null;
};

export type DocumentCategoryNavItem = {
  id: string;
  label: string;
  navLabel?: string;
};

export type SaveDocumentCategoryPayload = {
  categoryId?: EntityId | null;
  values: ApiPayload;
};

export type PatientWithDocuments = PatientLike & {
  patient_documents?: PatientDocument[];
  documents?: PatientDocument[];
};
