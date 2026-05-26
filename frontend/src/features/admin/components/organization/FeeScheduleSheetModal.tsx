import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListPlus,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import ModalShell from "../../../../shared/components/ui/ModalShell";
import { useQuery } from "@tanstack/react-query";
import { fetchCPTCatalog } from "../../api/organization/feeSchedule";
import {
  AdminField,
  AdminFieldGrid,
  AdminToggleField,
} from "../shared/AdminFormModal";
import FeeScheduleItemModal, {
  EMPTY_ITEM_FORM,
  type FeeScheduleItemFormData,
} from "./FeeScheduleItemModal";

import type {
  AdminOrganizationFeeSchedule,
  AdminOrganizationFeeScheduleItem,
} from "../../types";
import type { EntityId } from "../../../../shared/api/types";

type ScheduleFormData = {
  name: string;
  code: string;
  is_default: boolean;
  is_active: boolean;
  notes: string;
  sort_order: string;
};

const EMPTY_SCHEDULE_FORM: ScheduleFormData = {
  name: "",
  code: "",
  is_default: false,
  is_active: true,
  notes: "",
  sort_order: "0",
};

const UNCATEGORIZED = "Other";

function getInitialScheduleForm(
  schedule: AdminOrganizationFeeSchedule | null
): ScheduleFormData {
  return {
    ...EMPTY_SCHEDULE_FORM,
    name: schedule?.name || "",
    code: schedule?.code || "",
    is_default: schedule?.is_default === true,
    is_active: schedule?.is_active !== false,
    notes: schedule?.notes || "",
    sort_order: String(schedule?.sort_order ?? "0"),
  };
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0.00";
}

function getInitialItemForm(
  item: AdminOrganizationFeeScheduleItem | null,
  scheduleId: EntityId | null
): FeeScheduleItemFormData {
  return {
    ...EMPTY_ITEM_FORM,
    schedule: String(item?.schedule || scheduleId || ""),
    service_code: item?.service_code || "",
    description: item?.description || "",
    default_units: String(item?.default_units ?? "1.00"),
    charge_amount: String(item?.charge_amount ?? "0.00"),
    modifier_1: item?.modifier_1 || "",
    modifier_2: item?.modifier_2 || "",
    modifier_3: item?.modifier_3 || "",
    modifier_4: item?.modifier_4 || "",
    place_of_service: item?.place_of_service || "11",
    is_active: item?.is_active !== false,
    sort_order: String(item?.sort_order ?? "0"),
  };
}

function getLinkedSummary(schedule: AdminOrganizationFeeSchedule | null) {
  if (!schedule?.linked_entities) return "";
  const parts: string[] = [];
  const { facilities, staff, payers } = schedule.linked_entities;
  if (facilities?.length)
    parts.push(
      `${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"}`
    );
  if (staff?.length) parts.push(`${staff.length} staff`);
  if (payers?.length)
    parts.push(`${payers.length} payer${payers.length === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function InlineChargeCell({
  item,
  saving,
  onSave,
}: {
  item: AdminOrganizationFeeScheduleItem;
  saving: boolean;
  onSave: (id: EntityId, chargeAmount: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.charge_amount ?? "0.00"));

  if (!editing) {
    return (
      <button
        type="button"
        className="rounded px-1 py-0.5 text-left font-mono text-xs tabular-nums text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text transition-colors"
        onClick={() => {
          setValue(String(item.charge_amount ?? "0.00"));
          setEditing(true);
        }}
        disabled={saving}
      >
        {formatCurrency(item.charge_amount)}
      </button>
    );
  }

  const commit = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValue(String(item.charge_amount ?? "0.00"));
      setEditing(false);
      return;
    }
    const formatted = parsed.toFixed(2);
    if (formatted !== String(Number(item.charge_amount ?? 0).toFixed(2))) {
      onSave(item.id, formatted);
    }
    setEditing(false);
  };

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      className="cf-input w-24 px-1 py-0.5 text-xs font-mono tabular-nums"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setValue(String(item.charge_amount ?? "0.00"));
          setEditing(false);
        }
      }}
      autoFocus
      disabled={saving}
    />
  );
}

type GroupedItems = {
  category: string;
  items: AdminOrganizationFeeScheduleItem[];
};

function useCategoryMap() {
  const catalogQuery = useQuery({
    queryKey: ["billing", "cpt-catalog"],
    queryFn: fetchCPTCatalog,
    staleTime: Infinity,
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(catalogQuery.data)) {
      for (const entry of catalogQuery.data) {
        map.set(entry.service_code, entry.category);
      }
    }
    return map;
  }, [catalogQuery.data]);
}

function groupByCategory(
  items: AdminOrganizationFeeScheduleItem[],
  categoryMap: Map<string, string>
): GroupedItems[] {
  const groups = new Map<string, AdminOrganizationFeeScheduleItem[]>();
  const categoryOrder: string[] = [];

  for (const item of items) {
    const category = categoryMap.get(item.service_code || "") || UNCATEGORIZED;
    if (!groups.has(category)) {
      groups.set(category, []);
      categoryOrder.push(category);
    }
    groups.get(category)!.push(item);
  }

  return categoryOrder.map((category) => ({
    category,
    items: groups.get(category)!,
  }));
}

export default function FeeScheduleSheetModal({
  isOpen,
  schedule,
  items,
  saving,
  onClose,
  onSaveSchedule,
  onSaveItem,
  onReload,
  onPopulate,
}: {
  isOpen: boolean;
  schedule: AdminOrganizationFeeSchedule | null;
  items: AdminOrganizationFeeScheduleItem[];
  saving: boolean;
  onClose: () => void;
  onSaveSchedule: (payload: {
    id: EntityId | null;
    values: Record<string, unknown>;
  }) => Promise<{ id?: EntityId } | null | undefined | void>;
  onSaveItem: (payload: {
    id: EntityId | null;
    values: Record<string, unknown>;
  }) => Promise<unknown>;
  onReload: () => Promise<unknown>;
  onPopulate?: (scheduleId: EntityId) => Promise<unknown>;
}) {
  const [form, setForm] = useState<ScheduleFormData>(EMPTY_SCHEDULE_FORM);
  const [savedScheduleId, setSavedScheduleId] = useState<EntityId | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const [editingItem, setEditingItem] =
    useState<AdminOrganizationFeeScheduleItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemForm, setItemForm] =
    useState<FeeScheduleItemFormData>(EMPTY_ITEM_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const categoryMap = useCategoryMap();
  const activeId = schedule?.id || savedScheduleId;
  const isNew = !schedule?.id;

  const sheetItems = useMemo(
    () =>
      activeId
        ? items.filter(
            (item) => String(item.schedule || "") === String(activeId)
          )
        : [],
    [activeId, items]
  );

  const filteredItems = useMemo(() => {
    let filtered = sheetItems;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.service_code || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (item) =>
          (categoryMap.get(item.service_code || "") || UNCATEGORIZED) ===
          categoryFilter
      );
    }

    return filtered;
  }, [sheetItems, searchQuery, categoryFilter, categoryMap]);

  const grouped = useMemo(
    () => groupByCategory(filteredItems, categoryMap),
    [filteredItems, categoryMap]
  );

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of sheetItems) {
      cats.add(categoryMap.get(item.service_code || "") || UNCATEGORIZED);
    }
    return [...cats].sort();
  }, [sheetItems, categoryMap]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(getInitialScheduleForm(schedule));
    setSavedScheduleId(null);
    setSearchQuery("");
    setCategoryFilter("all");
    setDetailsExpanded(!schedule?.id);
    setCollapsedCategories(new Set());
  }, [isOpen, schedule]);

  const updateField = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await onSaveSchedule({
      id: activeId || null,
      values: {
        name: form.name,
        code: form.code || undefined,
        is_default: form.is_default,
        is_active: form.is_active,
        notes: form.notes,
        sort_order: Number(form.sort_order || 0),
      },
    });
    if (saved?.id && !schedule?.id) {
      setSavedScheduleId(saved.id);
      setDetailsExpanded(false);
    }
  };

  const handleClose = () => {
    setSavedScheduleId(null);
    setSearchQuery("");
    setCategoryFilter("all");
    onClose();
  };

  const handlePopulate = async () => {
    if (!activeId || !onPopulate) return;
    await onPopulate(activeId);
    await onReload();
  };

  const handleInlineChargeSave = async (
    itemId: EntityId,
    chargeAmount: string
  ) => {
    await onSaveItem({ id: itemId, values: { charge_amount: chargeAmount } });
    await onReload();
  };

  const openItemModal = (item: AdminOrganizationFeeScheduleItem | null) => {
    setEditingItem(item);
    setItemForm(getInitialItemForm(item, activeId || null));
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(false);
  };

  const handleItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSaveItem({
      id: editingItem?.id || null,
      values: {
        schedule: itemForm.schedule || null,
        service_code: itemForm.service_code,
        description: itemForm.description,
        default_units: itemForm.default_units,
        charge_amount: itemForm.charge_amount,
        modifier_1: itemForm.modifier_1,
        modifier_2: itemForm.modifier_2,
        modifier_3: itemForm.modifier_3,
        modifier_4: itemForm.modifier_4,
        place_of_service: itemForm.place_of_service,
        is_active: itemForm.is_active,
        sort_order: Number(itemForm.sort_order || 0),
      },
    });
    closeItemModal();
    await onReload();
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const linkedLabel = getLinkedSummary(schedule);

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={handleClose}
        eyebrow="Fee schedule"
        title={schedule ? schedule.name || "Fee Schedule" : "New Fee Schedule"}
        maxWidth="4xl"
        panelClassName="cf-admin-record-modal rounded-[var(--radius-cf-shell)] border-cf-border-strong bg-cf-surface shadow-[var(--shadow-panel-lg)] [&>div:first-child_p]:hidden"
        bodyClassName="bg-cf-surface px-0 py-0 border-t border-b border-cf-border/60"
        footerClassName="justify-between bg-cf-surface"
        footer={
          <>
            {linkedLabel ? (
              <p className="text-xs text-cf-text-muted mr-auto truncate max-w-[40%]">
                Linked to: {linkedLabel}
              </p>
            ) : (
              <div />
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="default"
                type="button"
                onClick={handleClose}
                disabled={saving}
              >
                Close
              </Button>
            </div>
          </>
        }
      >
        <div
          className="flex flex-col"
          style={{ maxHeight: "calc(80vh - 120px)" }}
        >
          {/* ── Sheet details bar ────────────────────────────── */}
          {isNew || detailsExpanded ? (
            <div className="border-b border-cf-border/60 bg-cf-surface-soft/30 px-6 py-4">
              <form
                id="fee-schedule-sheet-form"
                className="space-y-3"
                onSubmit={handleSubmit}
              >
                <AdminFieldGrid>
                  <AdminField label="Sheet name">
                    <input
                      className="cf-input"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </AdminField>
                  <AdminField label="Sheet code">
                    <input
                      className="cf-input"
                      value={form.code}
                      onChange={(e) => updateField("code", e.target.value)}
                    />
                  </AdminField>
                  <AdminToggleField
                    label="Default"
                    name="is_default"
                    checked={form.is_default}
                    onChange={(e) =>
                      updateField("is_default", e.target.checked)
                    }
                  />
                  <AdminToggleField
                    label="Active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                  />
                </AdminFieldGrid>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    form="fee-schedule-sheet-form"
                    size="sm"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : isNew
                        ? "Create Sheet"
                        : "Save Details"}
                  </Button>
                  {!isNew && (
                    <Button
                      variant="default"
                      type="button"
                      size="sm"
                      onClick={() => setDetailsExpanded(false)}
                    >
                      Collapse
                    </Button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-cf-border/60 bg-cf-surface-soft/30 px-6 py-2.5">
              <div className="flex items-center gap-3 text-sm min-w-0">
                <span className="font-semibold text-cf-text truncate">
                  {form.name || "Untitled"}
                </span>
                {form.code && (
                  <span className="font-mono text-xs text-cf-text-muted">
                    {form.code}
                  </span>
                )}
                {form.is_default && <Badge variant="outline">Default</Badge>}
                <Badge variant={form.is_active ? "success" : "muted"}>
                  {form.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={() => setDetailsExpanded(true)}
              >
                <Pencil className="h-3 w-3" />
                Edit Details
              </Button>
            </div>
          )}

          {/* ── Toolbar ────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-cf-border/40 bg-cf-surface">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cf-text-subtle pointer-events-none" />
              <input
                type="search"
                placeholder="Search codes..."
                className="cf-input pl-8 text-sm h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {availableCategories.length > 1 && (
              <select
                className="cf-input text-xs h-8 w-auto min-w-[140px]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">
                  All categories ({sheetItems.length})
                </option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-cf-text-muted tabular-nums mr-1">
                {searchQuery || categoryFilter !== "all"
                  ? `${filteredItems.length} of ${sheetItems.length}`
                  : `${sheetItems.length} codes`}
              </span>
              {onPopulate && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => void handlePopulate()}
                  disabled={!activeId || saving}
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  Populate
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => openItemModal(null)}
                disabled={!activeId || saving}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* ── Fee table ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="min-w-full text-sm">
              <thead className="bg-cf-surface-soft/60 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle sticky top-0 z-10">
                <tr>
                  <th className="w-[100px] px-5 py-2 text-left bg-cf-surface-soft/60">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left bg-cf-surface-soft/60">
                    Description
                  </th>
                  <th className="w-[100px] px-4 py-2 text-left bg-cf-surface-soft/60">
                    Charge
                  </th>
                  <th className="w-[70px] px-4 py-2 text-left bg-cf-surface-soft/60">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-border/50 text-cf-text">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-sm text-cf-text-muted"
                    >
                      {!activeId
                        ? "Create the sheet first, then add fees."
                        : searchQuery || categoryFilter !== "all"
                          ? "No fees match the current filter."
                          : "No fees on this sheet yet. Use Populate to add all CPT codes."}
                    </td>
                  </tr>
                ) : grouped.length <= 1 || searchQuery.trim() ? (
                  filteredItems.map((item) => (
                    <FeeRow
                      key={item.id}
                      item={item}
                      saving={saving}
                      onEdit={() => openItemModal(item)}
                      onChargeSave={handleInlineChargeSave}
                    />
                  ))
                ) : (
                  grouped.map((group) => (
                    <CategoryGroup
                      key={group.category}
                      category={group.category}
                      items={group.items}
                      collapsed={collapsedCategories.has(group.category)}
                      saving={saving}
                      onToggle={() => toggleCategory(group.category)}
                      onEdit={openItemModal}
                      onChargeSave={handleInlineChargeSave}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ModalShell>

      <FeeScheduleItemModal
        isOpen={isItemModalOpen}
        isEditing={Boolean(editingItem)}
        form={itemForm}
        saving={saving}
        onClose={closeItemModal}
        onChange={(name, value) =>
          setItemForm((current) => ({ ...current, [name]: value }))
        }
        onSubmit={handleItemSubmit}
      />
    </>
  );
}

function FeeRow({
  item,
  saving,
  onEdit,
  onChargeSave,
}: {
  item: AdminOrganizationFeeScheduleItem;
  saving: boolean;
  onEdit: () => void;
  onChargeSave: (id: EntityId, chargeAmount: string) => void;
}) {
  return (
    <tr
      className="group cursor-pointer hover:bg-cf-surface-soft/40 transition-colors"
      role="button"
      tabIndex={0}
      aria-label={`Edit ${item.service_code || "fee"}`}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <td className="px-5 py-2 font-mono text-xs font-semibold">
        {item.service_code}
      </td>
      <td className="px-4 py-2 text-xs">{item.description}</td>
      <td
        className="px-4 py-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <InlineChargeCell item={item} saving={saving} onSave={onChargeSave} />
      </td>
      <td className="px-4 py-2">
        {item.is_active === false ? (
          <span className="text-[10px] font-medium text-cf-text-subtle">
            Off
          </span>
        ) : (
          <span className="text-[10px] font-medium text-emerald-500">On</span>
        )}
      </td>
    </tr>
  );
}

function CategoryGroup({
  category,
  items,
  collapsed,
  saving,
  onToggle,
  onEdit,
  onChargeSave,
}: {
  category: string;
  items: AdminOrganizationFeeScheduleItem[];
  collapsed: boolean;
  saving: boolean;
  onToggle: () => void;
  onEdit: (item: AdminOrganizationFeeScheduleItem) => void;
  onChargeSave: (id: EntityId, chargeAmount: string) => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer select-none bg-cf-surface-soft/40 hover:bg-cf-surface-soft/70 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${category}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td colSpan={4} className="px-5 py-1.5">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-cf-text-subtle" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-cf-text-subtle" />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cf-text-subtle">
              {category}
            </span>
            <span className="text-[10px] text-cf-text-muted tabular-nums">
              {items.length}
            </span>
          </div>
        </td>
      </tr>
      {!collapsed &&
        items.map((item) => (
          <FeeRow
            key={item.id}
            item={item}
            saving={saving}
            onEdit={() => onEdit(item)}
            onChargeSave={onChargeSave}
          />
        ))}
    </>
  );
}
