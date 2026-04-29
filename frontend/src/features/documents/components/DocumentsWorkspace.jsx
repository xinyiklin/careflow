import { useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Printer,
  Settings,
  Send,
  UploadCloud,
} from "lucide-react";

import { Button, Notice } from "../../../shared/components/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  downloadPatientDocumentBundle,
  downloadPatientDocument,
  uploadPatientDocument,
} from "../api/documents";
import DocumentPreviewPane from "./DocumentPreviewPane";

const ACCEPTED_DOCUMENT_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.tif,.tiff";
const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
]);

const DEFAULT_CATEGORIES = [
  { id: "all", label: "All Documents" },
  { id: "lab", label: "Lab Reports" },
  { id: "imaging", label: "Radiology & Imaging", navLabel: "Imaging" },
  { id: "referrals", label: "Referrals & Consults", navLabel: "Referrals" },
  { id: "admin", label: "Administrative", navLabel: "Admin" },
  { id: "consent", label: "Consent Forms", navLabel: "Consent" },
];

function normalizeDocument(document, index) {
  return {
    id: String(document.id || document.uuid || `document-${index}`),
    name:
      document.name ||
      document.title ||
      document.file_name ||
      "Untitled document",
    category: document.category || document.category_id || "admin",
    categoryLabel: document.category_name || document.category_label || "",
    date:
      document.date ||
      document.uploaded_at ||
      document.created_at ||
      document.updated_at ||
      "",
    uploadedBy:
      document.uploaded_by_name ||
      document.uploaded_by ||
      document.author_name ||
      "",
    size: document.size || document.file_size_display || "",
    storageKey: document.storage_key || "",
    url: document.url || document.file_url || document.download_url || "",
  };
}

function formatDocumentDate(value) {
  if (!value) return "";
  const dateOnlyMatch =
    typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isAcceptedDocumentFile(file) {
  const name = (file.name || "").toLowerCase();
  const hasAcceptedExtension = ACCEPTED_DOCUMENT_EXTENSIONS.split(",").some(
    (extension) => name.endsWith(extension)
  );
  return hasAcceptedExtension && ACCEPTED_DOCUMENT_TYPES.has(file.type);
}

export default function DocumentsWorkspace({
  documents = [],
  categories = DEFAULT_CATEGORIES,
  compact = false,
  title = "Documents",
  selectedPatient = null,
  selectedFacilityId = null,
  toolbarAccessory = null,
  canManageCategories = false,
  onManageCategories = null,
  onDocumentUploaded = null,
  isLoadingDocuments = false,
  documentLoadError = "",
  onRetryDocuments = null,
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [focusedDocumentId, setFocusedDocumentId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const normalizedDocuments = useMemo(
    () => documents.map(normalizeDocument),
    [documents]
  );
  const filteredDocuments = useMemo(
    () =>
      activeCategory === "all"
        ? normalizedDocuments
        : normalizedDocuments.filter(
            (document) => document.category === activeCategory
          ),
    [activeCategory, normalizedDocuments]
  );
  const selectedDocuments = normalizedDocuments.filter((document) =>
    selectedIds.includes(document.id)
  );
  const activeLabel =
    categories.find((category) => category.id === activeCategory)?.label ||
    "Documents";
  const focusedDocument = normalizedDocuments.find(
    (document) => document.id === focusedDocumentId
  );
  const inspectorDocument =
    focusedDocument || selectedDocuments[0] || filteredDocuments[0] || null;
  const showManageCategories =
    Boolean(canManageCategories) && typeof onManageCategories === "function";
  const selectionBlockedReason = !selectedDocuments.length
    ? "Select one or more documents first."
    : "";

  const toggleDocument = (documentId) => {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  };

  const handlePreviewDocument = (document) => {
    setFocusedDocumentId(document.id);
    setErrorMessage("");
  };

  const handleUploadClick = () => {
    if (!selectedPatient || !selectedFacilityId || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";
    if (!file || !selectedPatient || !selectedFacilityId) return;
    if (!isAcceptedDocumentFile(file)) {
      setErrorMessage("Upload a PDF, TIFF, PNG, or JPG document.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage("");
      const uploadedDocument = await uploadPatientDocument({
        facilityId: selectedFacilityId,
        patientId: selectedPatient.id,
        file,
        category:
          activeCategory === "all"
            ? categories.find((category) => category.id !== "all")?.id ||
              "admin"
            : activeCategory,
      });
      onDocumentUploaded?.(uploadedDocument);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to upload document."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (document) => {
    if (!selectedFacilityId) return;

    try {
      setErrorMessage("");
      await downloadPatientDocument({
        facilityId: selectedFacilityId,
        document,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to download document."));
    }
  };

  const handleBatchAction = async (action) => {
    if (!selectedDocuments.length) return;
    if (action === "download") {
      try {
        setErrorMessage("");
        await downloadPatientDocumentBundle({
          facilityId: selectedFacilityId,
          documents: selectedDocuments,
        });
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Failed to download document bundle.")
        );
      }
      return;
    }
  };

  const handlePlaceholderAction = () => {};

  return (
    <div
      className={
        compact
          ? "grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(560px,1fr)_minmax(340px,0.95fr)]"
          : "cf-preview-surface grid h-full min-h-0 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(580px,1fr)_minmax(360px,0.95fr)] xl:overflow-hidden"
      }
    >
      <section className="flex min-h-0 min-w-0 flex-col border-b border-cf-border bg-cf-page-bg xl:border-r xl:border-b-0">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_DOCUMENT_EXTENSIONS}
          onChange={handleFileSelected}
        />
        <div className="shrink-0 border-b border-cf-border bg-gradient-to-br from-cf-surface to-cf-surface-muted/70 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <div className="shrink-0 text-xl font-semibold tracking-tight text-cf-text">
                  {compact ? activeLabel : title}
                </div>
              </div>
            </div>
            {toolbarAccessory ? (
              <div className="min-w-[200px] flex-1 md:max-w-[280px]">
                {toolbarAccessory}
              </div>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <div className="shrink-0 px-4 pt-3">
            <Notice tone="danger">{errorMessage}</Notice>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[196px_minmax(0,1fr)]">
          <div className="flex min-h-0 min-w-0 flex-col border-b border-cf-border bg-cf-surface-muted/70 md:border-r md:border-b-0">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 md:block">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                  File cabinet
                </p>
                <p className="mt-0.5 hidden text-xs font-medium text-cf-text-muted md:block">
                  Filter files
                </p>
              </div>
              {showManageCategories ? (
                <button
                  type="button"
                  onClick={onManageCategories}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-muted transition hover:text-cf-text md:mt-2 md:w-full md:gap-1.5 md:px-2 md:text-[11px] md:font-semibold"
                  aria-label="Manage document categories"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Manage</span>
                </button>
              ) : null}
            </div>

            <div className="flex min-w-0 gap-1 overflow-x-auto px-3 pb-3 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={[
                    "group flex shrink-0 items-center rounded-lg px-3 py-1.5 text-left text-xs transition md:w-full md:shrink md:text-[13px]",
                    activeCategory === category.id
                      ? "bg-cf-surface font-semibold text-cf-text shadow-[var(--shadow-panel)]"
                      : "text-cf-text-muted hover:bg-cf-surface/70 hover:text-cf-text",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mr-2 h-2 w-2 shrink-0 rounded-full transition",
                      activeCategory === category.id
                        ? "bg-cf-accent"
                        : "bg-cf-border-strong group-hover:bg-cf-text-subtle",
                    ].join(" ")}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {category.navLabel || category.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="flex min-h-10 shrink-0 items-center border-b border-cf-border bg-cf-page-bg/95 px-2.5 py-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  className="px-2.5 py-1 text-xs"
                  onClick={handleUploadClick}
                  disabled={
                    !selectedPatient || !selectedFacilityId || isUploading
                  }
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
                <Button
                  size="sm"
                  className="px-2.5 py-1 text-xs"
                  onClick={() => handleBatchAction("download")}
                  disabled={!selectedDocuments.length}
                  title={selectionBlockedReason || undefined}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  size="sm"
                  className="px-2.5 py-1 text-xs"
                  onClick={handlePlaceholderAction}
                  disabled={!selectedDocuments.length}
                  title={selectionBlockedReason || undefined}
                >
                  <Send className="h-3.5 w-3.5" />
                  Fax
                </Button>
                <Button
                  size="sm"
                  className="px-2.5 py-1 text-xs"
                  onClick={handlePlaceholderAction}
                  disabled={!selectedDocuments.length}
                  title={selectionBlockedReason || undefined}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {isLoadingDocuments && filteredDocuments.length === 0 ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="cf-loading-skeleton h-24 rounded-[1.15rem] bg-cf-surface-soft"
                    />
                  ))}
                </div>
              ) : documentLoadError ? (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <div className="max-w-sm">
                    <p className="text-sm font-semibold text-cf-text">
                      Documents could not load
                    </p>
                    <p className="mt-1 text-sm text-cf-text-muted">
                      {documentLoadError}
                    </p>
                    {onRetryDocuments ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4"
                        onClick={onRetryDocuments}
                      >
                        Retry
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : !selectedPatient ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-cf-text-muted">
                  Select a patient to view documents.
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-cf-text-muted">
                  No documents in this category yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className={[
                        "group rounded-lg border bg-cf-surface transition hover:border-cf-border-strong hover:bg-cf-surface-soft/55",
                        selectedIds.includes(document.id)
                          ? "border-cf-accent/35 bg-cf-surface-soft"
                          : "border-cf-border",
                      ].join(" ")}
                    >
                      <div className="grid gap-1.5 px-2.5 py-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(document.id)}
                            onChange={() => toggleDocument(document.id)}
                            className="h-3.5 w-3.5 rounded border-cf-border"
                            aria-label={`Select ${document.name}`}
                          />
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cf-border bg-cf-surface text-cf-text-subtle">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="min-w-0 truncate text-sm font-semibold text-cf-text">
                              {document.name}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-cf-text-muted">
                              <span className="font-medium text-cf-text-subtle">
                                {document.categoryLabel || activeLabel}
                              </span>
                              {document.date ? (
                                <span>{formatDocumentDate(document.date)}</span>
                              ) : null}
                              {document.uploadedBy ? (
                                <span>{document.uploadedBy}</span>
                              ) : null}
                              {document.size ? (
                                <span>{document.size}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            className="px-2 py-1 text-xs"
                            onClick={() => handlePreviewDocument(document)}
                            aria-label={`Preview ${document.name}`}
                            title={`Preview ${document.name}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="px-2 py-1 text-xs"
                            onClick={() => handleDownloadDocument(document)}
                            aria-label={`Download ${document.name}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 min-w-0 flex-col border-t border-cf-border xl:border-t-0">
        <DocumentPreviewPane
          document={inspectorDocument}
          facilityId={selectedFacilityId}
          onDownload={handleDownloadDocument}
          flush
        />
      </aside>
    </div>
  );
}
