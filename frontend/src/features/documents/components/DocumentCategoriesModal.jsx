import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus } from "lucide-react";

import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  Badge,
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminFormSection,
} from "../../admin/components/shared/AdminFormModal";

const EMPTY_FORM = {
  name: "",
  sort_order: 10,
};

function getNextSortOrder(categories) {
  const orders = categories.map((category) => Number(category.sort_order) || 0);
  return (Math.max(0, ...orders) || 0) + 10;
}

function getCategoryStatus(category) {
  if (category.is_system) return <Badge variant="neutral">System</Badge>;
  if (category.document_count > 0) return <Badge variant="muted">In use</Badge>;
  return <Badge variant="outline">Custom</Badge>;
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
}) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [dragCategoryId, setDragCategoryId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

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

  const beginEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      sort_order: Number(category.sort_order) || 0,
    });
    setLocalError("");
    setIsEditorOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setLocalError("Category name is required.");
      return;
    }

    await onSave?.({
      categoryId: editingCategory?.id || null,
      values: {
        name,
        sort_order: Number(form.sort_order) || 0,
      },
    });
    resetEditor();
  };

  const persistOrder = async (nextCategories) => {
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
        onSave?.({
          categoryId: category.id,
          values: { sort_order: sortOrder },
        })
      )
    );
  };

  const handleDrop = async (targetCategory) => {
    const draggedCategory = orderedCategories.find(
      (category) => category.id === dragCategoryId
    );
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDragCategoryId(null);
      setDropTargetId(null);
      return;
    }

    const nextCategories = orderedCategories.filter(
      (category) => category.id !== draggedCategory.id
    );
    const targetIndex = nextCategories.findIndex(
      (category) => category.id === targetCategory.id
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
    if (editingCategory?.id === deleteCandidate.id) {
      resetEditor();
    }
    setDeleteCandidate(null);
  };

  const deleteBlockReason =
    editingCategory?.delete_block_reason ||
    (editingCategory?.is_system ? "System category" : "") ||
    (editingCategory?.document_count > 0 ? "Documents filed" : "");
  const canDeleteEditingCategory =
    Boolean(editingCategory) &&
    editingCategory.can_delete !== false &&
    !deleteBlockReason;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Document Categories"
        eyebrow="Document Center"
        description="Manage the filing categories available for this facility."
        maxWidth="3xl"
        footer={
          <>
            <Button type="button" variant="default" onClick={onClose}>
              Close
            </Button>
            <div className="ml-auto text-xs font-medium text-cf-text-subtle">
              {orderedCategories.length} active categories
            </div>
          </>
        }
      >
        {error || localError ? (
          <Notice tone="danger" className="mb-3">
            {localError || error}
          </Notice>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface-soft/65 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              Categories
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={beginCreate}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              New Category
            </Button>
          </div>

          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] gap-2 border-b border-cf-border bg-cf-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cf-text-subtle sm:grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_3.5rem] sm:px-4">
            <span />
            <span>Category</span>
            <span className="hidden sm:block">Status</span>
            <span className="text-right">Files</span>
          </div>

          <div className="divide-y divide-cf-border">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-cf-text-muted">
                Loading categories...
              </div>
            ) : orderedCategories.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-cf-text-muted">
                No categories yet.
              </div>
            ) : (
              orderedCategories.map((category) => {
                const isDragging = dragCategoryId === category.id;
                const isDropTarget =
                  dropTargetId === category.id &&
                  dragCategoryId !== category.id;

                return (
                  <div
                    key={category.id}
                    role="button"
                    tabIndex={0}
                    draggable={!saving}
                    aria-label={`Edit category ${category.name}`}
                    title="Double-click to edit"
                    onDoubleClick={() => beginEdit(category)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      beginEdit(category);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDragCategoryId(category.id);
                    }}
                    onDragOver={(event) => {
                      if (!dragCategoryId || dragCategoryId === category.id)
                        return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTargetId(category.id);
                    }}
                    onDragLeave={() => {
                      if (dropTargetId === category.id) setDropTargetId(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDrop(category);
                    }}
                    onDragEnd={() => {
                      setDragCategoryId(null);
                      setDropTargetId(null);
                    }}
                    className={[
                      "grid cursor-grab grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 px-3 py-3 outline-none transition hover:bg-cf-surface-soft/55 focus-visible:bg-cf-surface-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30 active:cursor-grabbing sm:grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_3.5rem] sm:px-4",
                      isDragging ? "opacity-45" : "",
                      isDropTarget ? "bg-cf-accent/10" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <GripVertical className="h-4 w-4 text-cf-text-subtle" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-cf-text">
                        {category.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-cf-text-subtle">
                        {category.code}
                      </div>
                      <div className="mt-2 sm:hidden">
                        {getCategoryStatus(category)}
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      {getCategoryStatus(category)}
                    </div>
                    <div className="text-right text-sm font-semibold text-cf-text-muted">
                      {category.document_count || 0}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ModalShell>

      <AdminFormModal
        isOpen={isEditorOpen}
        onClose={resetEditor}
        scope="Document Center"
        title={editingCategory ? "Edit Category" : "New Category"}
        description="Category names can be changed without changing the underlying filing code."
        formId="document-category-form"
        saving={saving}
        deleteLabel={canDeleteEditingCategory ? "Delete" : ""}
        onDelete={
          canDeleteEditingCategory
            ? () => setDeleteCandidate(editingCategory)
            : undefined
        }
      >
        <form id="document-category-form" onSubmit={handleSave}>
          <AdminFormSection title="Category">
            {localError ? (
              <Notice tone="danger" className="mb-4">
                {localError}
              </Notice>
            ) : null}
            {editingCategory && deleteBlockReason ? (
              <Notice tone="info" className="mb-4">
                {deleteBlockReason === "System category"
                  ? "This default category is protected. You can rename it, but it cannot be deleted."
                  : "This category has filed documents, so it cannot be deleted."}
              </Notice>
            ) : null}

            <div className="grid gap-4">
              <AdminField label="Name">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  autoFocus
                />
              </AdminField>

              {editingCategory ? (
                <div className="flex flex-wrap gap-2 text-xs text-cf-text-subtle">
                  <Badge variant="muted">{editingCategory.code}</Badge>
                  {getCategoryStatus(editingCategory)}
                </div>
              ) : null}
            </div>
          </AdminFormSection>
        </form>
      </AdminFormModal>

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Delete Category"
        message={
          deleteCandidate
            ? `Delete ${deleteCandidate.name}? It will no longer be available for filing documents.`
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
