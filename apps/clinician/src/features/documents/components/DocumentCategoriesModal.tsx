import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";

import type { FormEvent } from "react";
import type { EntityId } from "../../../shared/api/types";
import type { DocumentCategory, SaveDocumentCategoryPayload } from "../types";

const EMPTY_FORM = { name: "", sort_order: 10 };
type DocumentCategoryForm = typeof EMPTY_FORM;

type DocumentCategoriesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categories?: DocumentCategory[];
  loading?: boolean;
  saving?: boolean;
  error?: string;
  onSave?: (payload: SaveDocumentCategoryPayload) => Promise<unknown> | unknown;
  onDelete?: (categoryId: EntityId) => Promise<unknown> | unknown;
};

function getNextSortOrder(categories: DocumentCategory[]) {
  const orders = categories.map((c) => Number(c.sort_order) || 0);
  return (Math.max(0, ...orders) || 0) + 10;
}

type StatusKind = "system" | "in-use" | "custom";

function getStatusKind(category: DocumentCategory): StatusKind {
  if (category.is_system) return "system";
  if (Number(category.document_count) > 0) return "in-use";
  return "custom";
}

const STATUS_CONFIG: Record<
  StatusKind,
  { label: string; dotClass: string; textClass: string }
> = {
  system: {
    label: "System",
    dotClass: "bg-cf-text-subtle",
    textClass: "text-cf-text-subtle",
  },
  "in-use": {
    label: "In use",
    dotClass: "bg-cf-success-text",
    textClass: "text-cf-success-text",
  },
  custom: {
    label: "Custom",
    dotClass: "bg-cf-text-subtle/40",
    textClass: "text-cf-text-subtle",
  },
};

function StatusPip({ category }: { category: DocumentCategory }) {
  const kind = getStatusKind(category);
  const { label, dotClass, textClass } = STATUS_CONFIG[kind];
  return (
    <span
      className={`flex items-center gap-1.5 text-[11px] font-medium ${textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

type EditorPanelProps = {
  editing: DocumentCategory | null;
  form: DocumentCategoryForm;
  saving: boolean;
  localError: string;
  onNameChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDelete: (() => void) | null;
  deleteBlockReason: string;
};

function EditorPanel({
  editing,
  form,
  saving,
  localError,
  onNameChange,
  onSave,
  onClose,
  onDelete,
  deleteBlockReason,
}: EditorPanelProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // focus name field when panel opens
    const t = setTimeout(() => nameRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [editing]);

  const isSystem = Boolean(editing?.is_system);
  const isInUse = Number(editing?.document_count) > 0;

  return (
    <div className="border-t border-cf-border">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-cf-border bg-cf-surface-muted/40 px-6 py-3">
        <div>
          <p className="text-sm font-semibold text-cf-text">
            {editing ? "Edit category" : "New category"}
          </p>
          {editing ? (
            <p className="mt-0.5 text-[11px] text-cf-text-muted">
              Code:{" "}
              <span className="font-mono font-semibold text-cf-text-subtle">
                {editing.code}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-cf-text-muted">
              Names can be changed later without affecting the filing code.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition hover:border-cf-border-strong hover:text-cf-text disabled:opacity-40"
          aria-label="Close editor"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Notices */}
      {localError ? (
        <div className="px-6 pt-3">
          <div className="flex items-start gap-2 rounded-xl border border-cf-danger-bg bg-cf-danger-bg px-3 py-2.5 text-xs font-medium text-cf-danger-text">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {localError}
          </div>
        </div>
      ) : null}

      {editing && deleteBlockReason ? (
        <div className="px-6 pt-3">
          <div className="flex items-start gap-2 rounded-xl border border-cf-border bg-cf-surface-soft px-3 py-2.5 text-xs font-medium text-cf-text-muted">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
            {isSystem
              ? "System category - rename only, cannot be deleted."
              : isInUse
                ? "This category has filed documents and cannot be deleted while in use."
                : deleteBlockReason}
          </div>
        </div>
      ) : null}

      {/* Form */}
      <form id="document-category-form" onSubmit={onSave} className="px-6 py-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-cf-text-subtle">
            Category name
          </span>
          <Input
            ref={nameRef}
            value={form.name}
            placeholder="e.g. Pre-Op Clearance"
            onChange={(e) => onNameChange(e.target.value)}
            disabled={saving}
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Delete left side */}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-cf-danger-bg bg-cf-danger-bg px-3 py-1.5 text-xs font-semibold text-cf-danger-text transition hover:opacity-80 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          ) : (
            <span />
          )}

          {/* Save / Cancel right side */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="document-category-form"
              size="sm"
              variant="primary"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-1.5">Saving...</span>
              ) : editing ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add category
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function DocumentCategoriesModal({
  isOpen,
  onClose,
  categories = [],
  loading = false,
  saving = false,
  error = "",
  onSave,
  onDelete,
}: DocumentCategoriesModalProps) {
  const [editingCategory, setEditingCategory] =
    useState<DocumentCategory | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<DocumentCategoryForm>(EMPTY_FORM);
  const [localError, setLocalError] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<DocumentCategory | null>(null);
  const [dragCategoryId, setDragCategoryId] = useState<EntityId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<EntityId | null>(null);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
          String(a.name || "").localeCompare(String(b.name || ""))
      ),
    [categories]
  );

  useEffect(() => {
    if (!isOpen) return;
    setEditingCategory(null);
    setIsEditorOpen(false);
    setForm({ ...EMPTY_FORM, sort_order: getNextSortOrder(categories) });
    setLocalError("");
    setDragCategoryId(null);
    setDropTargetId(null);
  }, [categories, isOpen]);

  const resetEditor = () => {
    setEditingCategory(null);
    setForm({ ...EMPTY_FORM, sort_order: getNextSortOrder(orderedCategories) });
    setLocalError("");
    setIsEditorOpen(false);
  };

  const beginCreate = () => {
    setEditingCategory(null);
    setForm({ ...EMPTY_FORM, sort_order: getNextSortOrder(orderedCategories) });
    setLocalError("");
    setIsEditorOpen(true);
  };

  const beginEdit = (category: DocumentCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      sort_order: Number(category.sort_order) || 0,
    });
    setLocalError("");
    setIsEditorOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setLocalError("Category name is required.");
      return;
    }
    await onSave?.({
      categoryId: editingCategory?.id || null,
      values: { name, sort_order: Number(form.sort_order) || 0 },
    });
    resetEditor();
  };

  const persistOrder = async (nextCategories: DocumentCategory[]) => {
    const updates = nextCategories
      .map((category, index) => ({
        category,
        sortOrder: (index + 1) * 10,
      }))
      .filter(
        ({ category, sortOrder }) =>
          Number(category.sort_order) !== Number(sortOrder)
      );
    await Promise.all(
      updates.map(({ category, sortOrder }) =>
        onSave?.({ categoryId: category.id, values: { sort_order: sortOrder } })
      )
    );
  };

  const handleDrop = async (targetCategory: DocumentCategory) => {
    const draggedCategory = orderedCategories.find(
      (c) => c.id === dragCategoryId
    );
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDragCategoryId(null);
      setDropTargetId(null);
      return;
    }
    const nextCategories = orderedCategories.filter(
      (c) => c.id !== draggedCategory.id
    );
    const targetIndex = nextCategories.findIndex(
      (c) => c.id === targetCategory.id
    );
    nextCategories.splice(targetIndex, 0, draggedCategory);
    try {
      await persistOrder(nextCategories);
    } catch {
      setLocalError("Could not reorder categories. Please try again.");
    } finally {
      setDragCategoryId(null);
      setDropTargetId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    await onDelete?.(deleteCandidate.id);
    if (editingCategory?.id === deleteCandidate.id) resetEditor();
    setDeleteCandidate(null);
  };

  const deleteBlockReason =
    editingCategory?.delete_block_reason ||
    (editingCategory?.is_system ? "System category" : "") ||
    (Number(editingCategory?.document_count) > 0 ? "Documents filed" : "");
  const canDeleteEditingCategory =
    editingCategory !== null &&
    editingCategory.can_delete !== false &&
    !deleteBlockReason;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Categories"
        eyebrow="Document Center"
        maxWidth="2xl"
        bodyClassName="p-0"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs font-medium text-cf-text-subtle">
              {orderedCategories.length}{" "}
              {orderedCategories.length === 1 ? "category" : "categories"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={
                  isEditorOpen && !editingCategory ? resetEditor : beginCreate
                }
                disabled={saving}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
              <Button type="button" variant="default" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        }
      >
        {error ? (
          <Notice tone="danger" className="mx-6 mt-4">
            {error}
          </Notice>
        ) : null}

        {/* Column labels */}
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_5rem_2rem] items-center gap-2 border-b border-cf-border bg-cf-surface-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cf-text-subtle sm:px-6">
          <span />
          <span>Name</span>
          <span>Status</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-cf-border">
          {loading ? null : orderedCategories.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-cf-text">
                No categories yet
              </p>
              <p className="text-xs text-cf-text-muted">
                Add your first category to start filing documents.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={beginCreate}
              >
                <Plus className="h-3.5 w-3.5" />
                Add category
              </Button>
            </div>
          ) : (
            orderedCategories.map((category) => {
              const isDragging = dragCategoryId === category.id;
              const isDropTarget =
                dropTargetId === category.id && dragCategoryId !== category.id;
              const isEditing =
                isEditorOpen && editingCategory?.id === category.id;

              return (
                <div
                  key={category.id}
                  className={[
                    "group transition-colors",
                    isEditing
                      ? "bg-cf-accent/5"
                      : isDropTarget
                        ? "bg-cf-accent/8"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    draggable={!saving}
                    aria-label={`Edit category ${category.name}`}
                    onDoubleClick={() => beginEdit(category)}
                    onClick={() => beginEdit(category)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      beginEdit(category);
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragCategoryId(category.id);
                    }}
                    onDragOver={(e) => {
                      if (!dragCategoryId || dragCategoryId === category.id)
                        return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDropTargetId(category.id);
                    }}
                    onDragLeave={() => {
                      if (dropTargetId === category.id) setDropTargetId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(category);
                    }}
                    onDragEnd={() => {
                      setDragCategoryId(null);
                      setDropTargetId(null);
                    }}
                    className={[
                      "grid cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_5rem_2rem] items-center gap-2 px-4 py-3 outline-none transition sm:px-6",
                      "hover:bg-cf-surface-soft/55 focus-visible:bg-cf-surface-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30",
                      isDragging ? "opacity-40" : "",
                      isEditing ? "bg-cf-accent/5" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Drag handle */}
                    <GripVertical className="h-4 w-4 cursor-grab text-cf-text-subtle/50 active:cursor-grabbing" />

                    {/* Name + code */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-cf-text">
                          {category.name}
                        </span>
                        {category.is_system ? (
                          <Lock className="h-3 w-3 shrink-0 text-cf-text-subtle/60" />
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-cf-text-subtle/70">
                        {category.code}
                      </div>
                    </div>

                    {/* Status pip */}
                    <StatusPip category={category} />

                    {/* Edit icon revealed on hover */}
                    <div className="flex justify-end">
                      <Pencil className="h-3.5 w-3.5 text-cf-text-subtle opacity-0 transition group-hover:opacity-60" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inline editor sits flush below the list */}
        {isEditorOpen ? (
          <EditorPanel
            editing={editingCategory}
            form={form}
            saving={saving}
            localError={localError}
            onNameChange={(value) =>
              setForm((current) => ({ ...current, name: value }))
            }
            onSave={handleSave}
            onClose={resetEditor}
            onDelete={
              canDeleteEditingCategory
                ? () => setDeleteCandidate(editingCategory)
                : null
            }
            deleteBlockReason={deleteBlockReason}
          />
        ) : null}
      </ModalShell>

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Delete Category"
        message={
          deleteCandidate
            ? `Delete "${deleteCandidate.name}"? It will no longer be available for filing documents.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </>
  );
}
