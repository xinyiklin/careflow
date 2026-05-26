import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileImage,
  FileScan,
  FileText,
  FolderOpen,
  Pencil,
  Search,
  Settings,
  Trash2,
  UploadCloud,
  X,
  ChevronDown,
} from "lucide-react";

import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  Button,
  CategoryRail,
  CategoryRailItem,
  Notice,
} from "../../../shared/components/ui";
import useDocumentMutations from "../hooks/useDocumentMutations";
import DocumentMetadataModal from "./DocumentMetadataModal";
import DocumentPreviewPane from "./DocumentPreviewPane";

import type { ReactNode } from "react";
import type { EntityId } from "../../../shared/api/types";
import type { PatientLike } from "../../../shared/types/domain";
import type {
  DocumentCategoryNavItem,
  NormalizedPatientDocument,
  PatientDocument,
} from "../types";

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
] satisfies DocumentCategoryNavItem[];

type DocumentSortMode =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "category";
type FileKind = "pdf" | "image" | "tiff" | "other";
type DocumentTypeFilter = "all" | FileKind;

const DOCUMENT_SORT_OPTIONS: { id: DocumentSortMode; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
  { id: "category", label: "Category" },
];

const DOCUMENT_TYPE_FILTERS: { id: DocumentTypeFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "pdf", label: "PDF" },
  { id: "image", label: "Image" },
  { id: "tiff", label: "TIFF" },
  { id: "other", label: "Other" },
];

export type DocumentsWorkspaceProps = {
  documents?: PatientDocument[];
  categories?: DocumentCategoryNavItem[];
  compact?: boolean;
  title?: string;
  selectedPatient?: PatientLike | null;
  selectedFacilityId?: EntityId | null;
  toolbarAccessory?: ReactNode;
  canManageDocuments?: boolean;
  canManageCategories?: boolean;
  onManageCategories?: (() => void) | null;
  onDocumentUploaded?: ((document: PatientDocument | null) => void) | null;
  onDocumentUpdated?: ((document: PatientDocument | null) => void) | null;
  onDocumentDeleted?: ((documentId: EntityId) => void) | null;
  isLoadingDocuments?: boolean;
  documentLoadError?: string;
  onRetryDocuments?: (() => void) | null;
};

function normalizeDocument(
  document: PatientDocument,
  index: number
): NormalizedPatientDocument {
  return {
    id: String(document.id || document.uuid || `document-${index}`),
    name:
      document.name ||
      document.title ||
      document.file_name ||
      "Untitled document",
    category: document.category || document.category_id || "admin",
    categoryLabel: document.category_name || document.category_label || "",
    documentDate: document.document_date || document.date || "",
    date:
      document.document_date ||
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
    contentType: document.content_type || "",
    originalFilename: document.original_filename || "",
    notes: document.notes || "",
    storageKey: document.storage_key || "",
    url: document.url || document.file_url || document.download_url || "",
  };
}

function formatDocumentDate(value: string | number | null | undefined) {
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
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isAcceptedDocumentFile(file: File) {
  const name = (file.name || "").toLowerCase();
  const hasAcceptedExtension = ACCEPTED_DOCUMENT_EXTENSIONS.split(",").some(
    (extension) => name.endsWith(extension)
  );
  return hasAcceptedExtension && ACCEPTED_DOCUMENT_TYPES.has(file.type);
}

function getFileKind(doc: NormalizedPatientDocument): FileKind {
  const ct = (doc.contentType || "").toLowerCase();
  const fn = (doc.originalFilename || doc.name || "").toLowerCase();
  if (ct === "application/pdf" || fn.endsWith(".pdf")) return "pdf";
  if (ct.startsWith("image/") && !ct.includes("tiff")) return "image";
  if (ct.includes("tiff") || fn.endsWith(".tif") || fn.endsWith(".tiff"))
    return "tiff";
  if (fn.match(/\.(png|jpg|jpeg)$/)) return "image";
  return "other";
}

function FileKindBadge({ doc }: { doc: NormalizedPatientDocument }) {
  const kind = getFileKind(doc);
  const config: Record<
    FileKind,
    { label: string; icon: typeof FileText; classes: string }
  > = {
    pdf: {
      label: "PDF",
      icon: FileText,
      classes: "bg-red-50 text-red-500 border-red-100",
    },
    image: {
      label: "IMG",
      icon: FileImage,
      classes: "bg-blue-50 text-blue-500 border-blue-100",
    },
    tiff: {
      label: "TIFF",
      icon: FileScan,
      classes: "bg-purple-50 text-purple-500 border-purple-100",
    },
    other: {
      label: "DOC",
      icon: FileText,
      classes: "bg-cf-surface-soft text-cf-text-subtle border-cf-border",
    },
  };
  const { label, icon: Icon, classes } = config[kind];
  return (
    <div
      className={[
        "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border",
        classes,
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider leading-none">
        {label}
      </span>
    </div>
  );
}

function getDocumentTimestamp(document: NormalizedPatientDocument) {
  const value = document.documentDate || document.date;
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getDocumentCategoryLabel(
  document: NormalizedPatientDocument,
  categories: DocumentCategoryNavItem[]
) {
  return (
    document.categoryLabel ||
    categories.find((category) => category.id === document.category)?.label ||
    document.category
  );
}

function compareDocumentText(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" });
}

function matchesDocumentSearch(
  document: NormalizedPatientDocument,
  query: string,
  categories: DocumentCategoryNavItem[]
) {
  if (!query) return true;
  const categoryLabel = getDocumentCategoryLabel(document, categories);
  const searchableText = [
    document.name,
    document.originalFilename,
    categoryLabel,
    document.uploadedBy,
    document.notes,
    document.documentDate,
    document.date ? formatDocumentDate(document.date) : "",
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function sortDocuments(
  documents: NormalizedPatientDocument[],
  sortMode: DocumentSortMode,
  categories: DocumentCategoryNavItem[]
) {
  return [...documents].sort((first, second) => {
    if (sortMode === "oldest") {
      return (
        getDocumentTimestamp(first) - getDocumentTimestamp(second) ||
        compareDocumentText(first.name, second.name)
      );
    }

    if (sortMode === "name-asc") {
      return compareDocumentText(first.name, second.name);
    }

    if (sortMode === "name-desc") {
      return compareDocumentText(second.name, first.name);
    }

    if (sortMode === "category") {
      return (
        compareDocumentText(
          getDocumentCategoryLabel(first, categories),
          getDocumentCategoryLabel(second, categories)
        ) || compareDocumentText(first.name, second.name)
      );
    }

    return (
      getDocumentTimestamp(second) - getDocumentTimestamp(first) ||
      compareDocumentText(first.name, second.name)
    );
  });
}

function DocumentSkeleton() {
  return null;
}

export default function DocumentsWorkspace({
  documents = [],
  categories = DEFAULT_CATEGORIES,
  compact = false,
  title = "Documents",
  selectedPatient = null,
  selectedFacilityId = null,
  toolbarAccessory = null,
  canManageDocuments = true,
  canManageCategories = false,
  onManageCategories = null,
  onDocumentUploaded = null,
  onDocumentUpdated = null,
  onDocumentDeleted = null,
  isLoadingDocuments = false,
  documentLoadError = "",
  onRetryDocuments = null,
}: DocumentsWorkspaceProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("all");
  const [sortMode, setSortMode] = useState<DocumentSortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedDocumentId, setFocusedDocumentId] = useState("");

  const normalizedDocuments = useMemo(
    () => documents.map(normalizeDocument),
    [documents]
  );
  const categoryDocuments = useMemo(
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

  const mutations = useDocumentMutations({
    facilityId: selectedFacilityId,
    selectedPatient,
    focusedDocumentId,
    setFocusedDocumentId,
    setSelectedIds,
    selectedDocuments,
    canManageDocuments,
    onDocumentUploaded,
    onDocumentUpdated,
    onDocumentDeleted,
  });

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchedDocuments = categoryDocuments.filter((document) => {
      const matchesType =
        typeFilter === "all" || getFileKind(document) === typeFilter;
      return matchesType && matchesDocumentSearch(document, query, categories);
    });

    return sortDocuments(matchedDocuments, sortMode, categories);
  }, [categories, categoryDocuments, searchTerm, sortMode, typeFilter]);

  const activeLabel =
    categories.find((category) => category.id === activeCategory)?.label ||
    "Documents";
  const focusedDocument = normalizedDocuments.find(
    (document) => document.id === focusedDocumentId
  );
  const inspectorDocument = focusedDocument || null;
  const showManageCategories =
    Boolean(canManageCategories) && typeof onManageCategories === "function";
  const hasActiveDocumentFilters =
    searchTerm.trim().length > 0 || typeFilter !== "all";
  const hasFilteredOutDocuments =
    hasActiveDocumentFilters && categoryDocuments.length > 0;
  const visibleDocumentCountLabel = hasActiveDocumentFilters
    ? `${filteredDocuments.length} of ${categoryDocuments.length} ${
        categoryDocuments.length === 1 ? "file" : "files"
      }`
    : `${filteredDocuments.length} ${
        filteredDocuments.length === 1 ? "file" : "files"
      }`;

  const toggleDocument = (documentId: string) => {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  };

  const handlePreviewDocument = (document: NormalizedPatientDocument) => {
    setFocusedDocumentId(document.id);
    mutations.setErrorMessage("");
  };

  const clearDocumentFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
  };

  return (
    <>
      <div
        className={
          compact
            ? "grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(560px,1fr)_minmax(400px,1.15fr)]"
            : "grid h-full min-h-0 grid-cols-1 overflow-y-auto bg-cf-surface xl:grid-cols-[minmax(580px,1fr)_minmax(420px,1.15fr)] xl:overflow-hidden"
        }
      >
        {/* Left panel: list + toolbar */}
        <section className="flex min-h-0 min-w-0 flex-col border-b border-cf-border bg-cf-page-bg xl:border-r xl:border-b-0">
          {/* Header */}
          {!compact ? (
            <div className="shrink-0 border-b border-cf-border bg-cf-surface px-5 py-1.5 transition-[background-color,border-color] duration-150">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 text-sm font-extrabold tracking-tight text-cf-text leading-none">
                    {title}
                  </div>
                  {normalizedDocuments.length > 0 && (
                    <span className="text-[11px] text-cf-text-subtle font-medium leading-none">
                      {normalizedDocuments.length}{" "}
                      {normalizedDocuments.length === 1
                        ? "document"
                        : "documents"}
                      {activeCategory !== "all" ? ` in ${activeLabel}` : ""}
                    </span>
                  )}
                </div>
                {toolbarAccessory ? (
                  <div className="min-w-[200px] flex-1 md:max-w-[280px]">
                    {toolbarAccessory}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {mutations.errorMessage ? (
            <div className="shrink-0 px-4 pt-3">
              <Notice tone="danger">{mutations.errorMessage}</Notice>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[196px_minmax(0,1fr)]">
            {/* Sidebar: categories */}
            <div className="flex min-h-0 min-w-0 flex-col border-b border-cf-border bg-cf-surface-muted/70 md:border-r md:border-b-0">
              <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1.5 md:block">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                    File cabinet
                  </p>
                </div>
                {showManageCategories ? (
                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text md:mt-2 md:w-full md:gap-1.5 md:px-2 md:text-[11px] md:font-semibold"
                    aria-label="Manage document categories"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Manage</span>
                  </button>
                ) : null}
              </div>

              <CategoryRail
                label="Document categories"
                className="flex min-w-0 gap-1 overflow-x-auto px-3 pb-2 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain"
              >
                {categories.map((category) => (
                  <CategoryRailItem
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    active={activeCategory === category.id}
                  >
                    {category.navLabel || category.label}
                  </CategoryRailItem>
                ))}
              </CategoryRail>
            </div>

            {/* Main panel: document list */}
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="shrink-0 border-b border-cf-border bg-cf-surface px-5 py-1.5 transition-[background-color,border-color] duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Left Side: Search and Selectors */}
                  <div className="flex flex-1 min-w-[20rem] items-center gap-2">
                    <label className="relative flex-1 max-w-md">
                      <span className="sr-only">Search documents</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cf-text-subtle" />
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search documents"
                        className="h-8 w-full rounded-lg border border-cf-border bg-cf-surface py-1 pr-8 pl-9 text-xs text-cf-text outline-none transition placeholder:text-cf-text-subtle focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10"
                      />
                      {searchTerm ? (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
                          aria-label="Clear document search"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </label>

                    <label className="sr-only" htmlFor="document-type-filter">
                      Filter document type
                    </label>
                    <div className="relative flex items-center">
                      <select
                        id="document-type-filter"
                        value={typeFilter}
                        onChange={(event) =>
                          setTypeFilter(
                            event.target.value as DocumentTypeFilter
                          )
                        }
                        className="h-8 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-8 pl-3 text-xs font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer"
                      >
                        {DOCUMENT_TYPE_FILTERS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-cf-text-subtle/80" />
                    </div>

                    <label className="sr-only" htmlFor="document-sort">
                      Sort documents
                    </label>
                    <div className="relative flex items-center">
                      <select
                        id="document-sort"
                        value={sortMode}
                        onChange={(event) =>
                          setSortMode(event.target.value as DocumentSortMode)
                        }
                        className="h-8 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-8 pl-3 text-xs font-semibold text-cf-text-muted outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer"
                      >
                        {DOCUMENT_SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-cf-text-subtle/80" />
                    </div>
                  </div>

                  {/* Right Side: Count and Actions */}
                  <div className="flex items-center gap-3">
                    {selectedDocuments.length > 0 ? (
                      <span className="text-xs font-bold text-cf-text-muted">
                        {selectedDocuments.length} selected
                      </span>
                    ) : (
                      <span className="hidden text-[11px] font-semibold text-cf-text-subtle md:block">
                        {visibleDocumentCountLabel}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {selectedDocuments.length > 0 ? (
                        <Button
                          size="sm"
                          className="px-2.5 py-1 text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          onClick={mutations.handleBatchDownload}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download {selectedDocuments.length}
                        </Button>
                      ) : null}
                      {canManageDocuments ? (
                        <Button
                          size="sm"
                          variant="primary"
                          className="px-2.5 py-1 text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          onClick={mutations.handleUploadClick}
                          disabled={!mutations.canUpload}
                          title={
                            !selectedPatient
                              ? "Select a patient first"
                              : !selectedFacilityId
                                ? "No facility selected"
                                : undefined
                          }
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document list */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-cf-surface-muted/30 p-5">
                {isLoadingDocuments && filteredDocuments.length === 0 ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((item) => (
                      <DocumentSkeleton key={item} />
                    ))}
                  </div>
                ) : documentLoadError ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface text-cf-text-subtle">
                        <FileText className="h-5 w-5" />
                      </div>
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
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-[220px]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface text-cf-text-subtle">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-cf-text">
                        No patient selected
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-cf-text-muted">
                        Search for a patient above to view their documents.
                      </p>
                    </div>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-[220px]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-surface text-cf-text-subtle">
                        {hasFilteredOutDocuments ? (
                          <Search className="h-5 w-5" />
                        ) : (
                          <UploadCloud className="h-5 w-5" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-cf-text">
                        {hasFilteredOutDocuments
                          ? "No matching documents"
                          : "No documents yet"}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-cf-text-muted">
                        {hasFilteredOutDocuments
                          ? "Try a different search or file type."
                          : activeCategory === "all" && canManageDocuments
                            ? "Upload the first document for this patient."
                            : `No files in ${activeLabel} yet.`}
                      </p>
                      {hasFilteredOutDocuments ? (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          onClick={clearDocumentFilters}
                        >
                          Clear filters
                        </Button>
                      ) : mutations.canUpload && canManageDocuments ? (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          onClick={mutations.handleUploadClick}
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredDocuments.map((document) => {
                      const isSelected = selectedIds.includes(document.id);
                      const isFocused = focusedDocumentId === document.id;

                      return (
                        <div
                          key={document.id}
                          className={[
                            "group rounded-xl border bg-cf-surface transition-all duration-150 hover:-translate-y-[0.5px] hover:border-cf-border-strong hover:shadow-[var(--shadow-panel)]",
                            isSelected
                              ? "border-cf-accent/30 bg-cf-surface ring-1 ring-inset ring-cf-accent/10"
                              : isFocused
                                ? "border-cf-border-strong"
                                : "border-cf-border",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3 px-3 py-2.5">
                            {/* Checkbox */}
                            <div className="flex h-10 w-5 shrink-0 items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleDocument(document.id)}
                                className="h-3.5 w-3.5 rounded border-cf-border"
                                aria-label={`Select ${document.name}`}
                              />
                            </div>

                            {/* File type badge */}
                            <FileKindBadge doc={document} />

                            {/* Document info */}
                            <div className="min-w-0 flex-1">
                              <div className="min-w-0 truncate text-sm font-semibold text-cf-text leading-tight">
                                {document.name}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-cf-text-muted">
                                {document.categoryLabel || activeLabel ? (
                                  <span className="font-medium text-cf-text-subtle">
                                    {document.categoryLabel || activeLabel}
                                  </span>
                                ) : null}
                                {document.date ? (
                                  <>
                                    <span className="text-cf-border-strong">
                                      -
                                    </span>
                                    <span>
                                      {formatDocumentDate(document.date)}
                                    </span>
                                  </>
                                ) : null}
                                {document.uploadedBy ? (
                                  <>
                                    <span className="text-cf-border-strong">
                                      -
                                    </span>
                                    <span>{document.uploadedBy}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {/* Action buttons revealed on hover */}
                            <div className="grid shrink-0 grid-cols-2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition hover:border-cf-border-strong hover:text-cf-text"
                                onClick={() => handlePreviewDocument(document)}
                                aria-label={`Preview ${document.name}`}
                                title="Preview"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {canManageDocuments ? (
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition hover:border-cf-border-strong hover:text-cf-text"
                                  onClick={() =>
                                    mutations.handleEditDocument(document)
                                  }
                                  aria-label={`Edit ${document.name}`}
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition hover:border-cf-border-strong hover:text-cf-text"
                                onClick={() =>
                                  mutations.handleDownloadDocument(document)
                                }
                                aria-label={`Download ${document.name}`}
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {canManageDocuments ? (
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-cf-danger-bg bg-cf-surface text-cf-danger-text transition hover:bg-cf-danger-bg"
                                  onClick={() =>
                                    mutations.setDeleteCandidate(document)
                                  }
                                  aria-label={`Delete ${document.name}`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right panel: preview */}
        <aside className="flex min-h-0 min-w-0 flex-col border-t border-cf-border xl:border-t-0">
          <DocumentPreviewPane
            document={inspectorDocument}
            facilityId={selectedFacilityId}
            onDownload={mutations.handleDownloadDocument}
            flush
          />
        </aside>
      </div>

      <DocumentMetadataModal
        isOpen={mutations.metadataModalMode !== null}
        mode={mutations.metadataModalMode || "upload"}
        document={mutations.editingDocument}
        categories={categories}
        activeCategory={activeCategory}
        acceptedExtensions={ACCEPTED_DOCUMENT_EXTENSIONS}
        saving={mutations.isSavingMetadata}
        error={mutations.metadataError}
        onClose={mutations.closeMetadataModal}
        onSubmit={mutations.handleMetadataSubmit}
        isAcceptedFile={isAcceptedDocumentFile}
      />

      <ConfirmDialog
        isOpen={mutations.deleteCandidate !== null}
        title="Delete Document"
        message={
          mutations.deleteCandidate
            ? `Delete "${mutations.deleteCandidate.name}"? This action cannot be undone and the file will be permanently removed.`
            : ""
        }
        confirmText={mutations.isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
        onConfirm={
          mutations.isDeleting ? undefined : mutations.handleDeleteDocument
        }
        onCancel={() =>
          mutations.isDeleting ? undefined : mutations.setDeleteCandidate(null)
        }
      />
    </>
  );
}
