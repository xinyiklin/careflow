import { useEffect, useMemo, useRef, useState } from "react";
import { FileImage, FileScan, FileText, UploadCloud, X } from "lucide-react";

import {
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import type {
  DocumentCategoryNavItem,
  NormalizedPatientDocument,
} from "../types";

export type DocumentMetadataSubmitValues = {
  file?: File | null;
  files?: DocumentMetadataUploadItem[];
  name: string;
  category: string;
  documentDate: string;
  notes: string;
};

export type DocumentMetadataUploadItem = {
  id: string;
  file: File;
  name: string;
};

type DocumentMetadataModalMode = "upload" | "edit";

type DocumentMetadataModalProps = {
  isOpen: boolean;
  mode: DocumentMetadataModalMode;
  document?: NormalizedPatientDocument | null;
  categories: DocumentCategoryNavItem[];
  activeCategory: string;
  acceptedExtensions: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: DocumentMetadataSubmitValues) => Promise<void> | void;
  isAcceptedFile: (file: File) => boolean;
};

const EMPTY_VALUES = { name: "", category: "", documentDate: "", notes: "" };
let nextUploadItemId = 0;

function getAssignableCategories(categories: DocumentCategoryNavItem[]) {
  return categories.filter((c) => c.id !== "all");
}

function getDefaultCategory(
  categories: DocumentCategoryNavItem[],
  activeCategory: string
) {
  const assignable = getAssignableCategories(categories);
  if (
    activeCategory !== "all" &&
    assignable.some((c) => c.id === activeCategory)
  ) {
    return activeCategory;
  }
  return (
    assignable.find((c) => c.id === "admin")?.id || assignable[0]?.id || "admin"
  );
}

function toDateInputValue(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatFileSize(file: File | null) {
  if (!file) return "";
  if (file.size < 1024) return `${file.size} B`;
  if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
  return `${(file.size / 1024 / 1024).toFixed(1)} MB`;
}

type FileMeta = {
  ext: string;
  icon: typeof FileText;
  bgClass: string;
  textClass: string;
  label: string;
};

function getFileMeta(file: File | null): FileMeta {
  if (!file) {
    return {
      ext: "",
      icon: FileText,
      bgClass: "",
      textClass: "text-cf-text-subtle",
      label: "",
    };
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return {
      ext: "PDF",
      icon: FileText,
      bgClass: "bg-red-50 border-red-100",
      textClass: "text-red-500",
      label: "PDF Document",
    };
  }
  if (
    name.match(/\.(png|jpg|jpeg)$/) ||
    (file.type.startsWith("image/") && !file.type.includes("tiff"))
  ) {
    return {
      ext: "IMG",
      icon: FileImage,
      bgClass: "bg-blue-50 border-blue-100",
      textClass: "text-blue-500",
      label: "Image",
    };
  }
  if (name.match(/\.(tif|tiff)$/)) {
    return {
      ext: "TIFF",
      icon: FileScan,
      bgClass: "bg-purple-50 border-purple-100",
      textClass: "text-purple-500",
      label: "TIFF Scan",
    };
  }
  return {
    ext: "DOC",
    icon: FileText,
    bgClass: "bg-cf-surface-soft border-cf-border",
    textClass: "text-cf-text-subtle",
    label: "Document",
  };
}

function getFileSignature(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function createUploadItem(file: File): DocumentMetadataUploadItem {
  nextUploadItemId += 1;
  return {
    id: `upload-${nextUploadItemId}`,
    file,
    name: file.name,
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-xs font-semibold text-cf-text">{label}</span>
        {hint ? (
          <span className="text-[11px] text-cf-text-subtle">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function DocumentMetadataModal({
  isOpen,
  mode,
  document = null,
  categories,
  activeCategory,
  acceptedExtensions,
  saving = false,
  error = "",
  onClose,
  onSubmit,
  isAcceptedFile,
}: DocumentMetadataModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [uploadItems, setUploadItems] = useState<DocumentMetadataUploadItem[]>(
    []
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState("");

  const assignableCategories = useMemo(
    () => getAssignableCategories(categories),
    [categories]
  );
  const isUploadMode = mode === "upload";
  const formId = isUploadMode
    ? "patient-document-upload-form"
    : "patient-document-edit-form";
  const uploadCount = uploadItems.length;

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && document) {
      setValues({
        name: document.name || "",
        category:
          document.category || getDefaultCategory(categories, activeCategory),
        documentDate: toDateInputValue(document.documentDate),
        notes: document.notes || "",
      });
    } else {
      setValues({
        ...EMPTY_VALUES,
        category: getDefaultCategory(categories, activeCategory),
      });
    }
    setUploadItems([]);
    setLocalError("");
    setIsDragOver(false);
  }, [activeCategory, categories, document, isOpen, mode]);

  const updateValue = (field: keyof typeof EMPTY_VALUES, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const selectFiles = (files: File[]) => {
    if (!files.length) return;

    const acceptedFiles = files.filter(isAcceptedFile);
    const rejectedCount = files.length - acceptedFiles.length;

    if (!acceptedFiles.length) {
      setLocalError("Please upload a PDF, TIFF, PNG, or JPG file.");
      return;
    }

    setUploadItems((current) => {
      const existingSignatures = new Set(
        current.map((item) => getFileSignature(item.file))
      );
      const nextItems = acceptedFiles
        .filter((file) => !existingSignatures.has(getFileSignature(file)))
        .map(createUploadItem);

      return nextItems.length ? [...current, ...nextItems] : current;
    });

    setLocalError(
      rejectedCount
        ? `${rejectedCount} unsupported ${
            rejectedCount === 1 ? "file was" : "files were"
          } skipped.`
        : ""
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    selectFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files || []);
    selectFiles(files);
  };

  const updateUploadItemName = (itemId: string, name: string) => {
    setUploadItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, name } : item))
    );
  };

  const removeUploadItem = (itemId: string) => {
    setUploadItems((current) => current.filter((item) => item.id !== itemId));
  };

  const clearUploadItems = () => {
    setUploadItems([]);
    setLocalError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const category = values.category.trim();
    if (!category) {
      setLocalError("Please select a category.");
      return;
    }

    if (isUploadMode) {
      if (!uploadItems.length) {
        setLocalError("Please choose at least one document file first.");
        return;
      }
      const files = uploadItems.map((item) => ({
        ...item,
        name: item.name.trim(),
      }));
      if (files.some((item) => !item.name)) {
        setLocalError("Each file needs a document name.");
        return;
      }
      setLocalError("");
      await onSubmit({
        file: files[0]?.file || null,
        files,
        name: files[0]?.name || "",
        category,
        documentDate: values.documentDate,
        notes: values.notes.trim(),
      });
      return;
    }

    const name = values.name.trim();
    if (!name) {
      setLocalError("Document name is required.");
      return;
    }
    setLocalError("");
    await onSubmit({
      file: null,
      name,
      category,
      documentDate: values.documentDate,
      notes: values.notes.trim(),
    });
  };

  const categorySelector = (
    <Field label="Category" hint={isUploadMode ? "applies to all" : undefined}>
      {assignableCategories.length <= 8 ? (
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {assignableCategories.map((category) => {
            const isSelected = values.category === category.id;
            return (
              <button
                key={category.id}
                type="button"
                disabled={saving}
                onClick={() => updateValue("category", category.id)}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                  isSelected
                    ? "border-cf-accent bg-cf-accent text-cf-surface"
                    : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
                ].join(" ")}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      ) : (
        <Input
          as="select"
          value={values.category}
          onChange={(e) => updateValue("category", e.target.value)}
          disabled={saving}
        >
          {assignableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </Input>
      )}
    </Field>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      title={isUploadMode ? "Upload Documents" : "Edit Document"}
      maxWidth={isUploadMode ? "4xl" : "2xl"}
      bodyClassName="p-0"
      footer={
        <>
          <Button
            type="button"
            variant="default"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={saving || (isUploadMode && uploadCount === 0)}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                {isUploadMode && uploadCount > 1
                  ? `Uploading ${uploadCount}...`
                  : isUploadMode
                    ? "Uploading..."
                    : "Saving..."}
              </span>
            ) : isUploadMode ? (
              uploadCount > 1 ? (
                `Upload ${uploadCount} files`
              ) : (
                "Upload"
              )
            ) : (
              "Save changes"
            )}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        {error || localError ? (
          <div className="px-6 pt-5">
            <Notice tone="danger">{localError || error}</Notice>
          </div>
        ) : null}

        {isUploadMode ? (
          <div className="grid min-h-[23rem] items-stretch lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
            <div className="flex min-h-0 flex-col px-6 py-5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={acceptedExtensions}
                multiple
                onChange={handleFileChange}
              />

              {uploadItems.length ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-cf-text">
                      {uploadItems.length}{" "}
                      {uploadItems.length === 1 ? "file" : "files"} ready
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                        className="text-xs font-semibold text-cf-text-subtle transition hover:text-cf-text disabled:opacity-40"
                      >
                        Add files
                      </button>
                      <button
                        type="button"
                        onClick={clearUploadItems}
                        disabled={saving}
                        className="text-xs font-semibold text-cf-text-subtle transition hover:text-cf-danger-text disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="divide-y divide-cf-border">
                      {uploadItems.map((item) => {
                        const fileMeta = getFileMeta(item.file);
                        const FileIcon = fileMeta.icon;

                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 py-3 first:pt-0"
                          >
                            <div
                              className={[
                                "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border text-[9px] font-bold tracking-wider",
                                fileMeta.bgClass,
                                fileMeta.textClass,
                              ].join(" ")}
                            >
                              <FileIcon className="mb-0.5 h-3.5 w-3.5" />
                              {fileMeta.ext}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Input
                                value={item.name}
                                onChange={(event) =>
                                  updateUploadItemName(
                                    item.id,
                                    event.target.value
                                  )
                                }
                                disabled={saving}
                                aria-label={`Document name for ${item.file.name}`}
                              />
                              <p className="mt-1 text-[11px] text-cf-text-muted">
                                {fileMeta.label} &middot;{" "}
                                {formatFileSize(item.file)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUploadItem(item.id)}
                              disabled={saving}
                              className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cf-border text-cf-text-subtle transition hover:border-cf-border-strong hover:text-cf-text disabled:opacity-40"
                              aria-label={`Remove ${item.file.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload documents - click or drag and drop"
                  className={[
                    "flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all",
                    isDragOver
                      ? "border-cf-accent bg-cf-accent-soft/20"
                      : "border-cf-border hover:border-cf-border-strong hover:bg-cf-surface-soft/50",
                  ].join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center rounded-xl border transition-all",
                        isDragOver
                          ? "border-cf-accent bg-cf-accent text-cf-surface"
                          : "border-cf-border bg-cf-surface text-cf-text-muted",
                      ].join(" ")}
                    >
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cf-text">
                        {isDragOver ? "Release to upload" : "Drop files here"}
                      </p>
                      <p className="mt-1 text-xs text-cf-text-muted">
                        or{" "}
                        <span className="font-semibold text-cf-text underline underline-offset-2">
                          browse files
                        </span>{" "}
                        &mdash; PDF, PNG, JPG, TIFF
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 border-t border-cf-border lg:border-t-0 lg:border-l">
              <div className="space-y-5 px-6 py-5">
                <div className="max-w-xs">
                  <Field label="Document date" hint="optional, applies to all">
                    <Input
                      type="date"
                      value={values.documentDate}
                      onChange={(e) =>
                        updateValue("documentDate", e.target.value)
                      }
                      disabled={saving}
                    />
                  </Field>
                </div>

                {categorySelector}

                <Field label="Notes" hint="optional, applies to all">
                  <Input
                    as="textarea"
                    rows={5}
                    value={values.notes}
                    onChange={(e) => updateValue("notes", e.target.value)}
                    disabled={saving}
                  />
                </Field>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(10rem,0.7fr)]">
              <Field label="Document name">
                <Input
                  value={values.name}
                  onChange={(e) => updateValue("name", e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Document date" hint="optional">
                <Input
                  type="date"
                  value={values.documentDate}
                  onChange={(e) => updateValue("documentDate", e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            {categorySelector}

            <Field label="Notes" hint="optional">
              <Input
                as="textarea"
                rows={3}
                value={values.notes}
                onChange={(e) => updateValue("notes", e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>
        )}
      </form>
    </ModalShell>
  );
}
