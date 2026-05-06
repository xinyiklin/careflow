import { useContext, useId } from "react";
import { createPortal } from "react-dom";
import { Badge } from "../../../../shared/components/ui";
import AdminToolbarSlotContext from "./AdminToolbarSlotContext";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { AdminConfirmVariant, AdminListFilterOption } from "../../types";

export { default as AdminWorkspaceShell } from "./AdminWorkspaceShell";

export const ADMIN_INTERACTIVE_ROW_CLASS =
  "group cursor-pointer outline-none transition hover:bg-cf-surface-soft/50 focus-visible:bg-cf-surface-soft/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30";

type AdminRowActionProps = {
  disabled?: boolean;
  label: string;
  onAction?: (event: MouseEvent | KeyboardEvent) => void;
  className?: string;
};

export function getAdminRowActionProps({
  disabled = false,
  label,
  onAction,
  className = "",
}: AdminRowActionProps) {
  if (disabled) {
    return {
      "aria-disabled": true,
      className: ["group transition", className].filter(Boolean).join(" "),
    };
  }

  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: onAction,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onAction?.(event);
    },
    className: [ADMIN_INTERACTIVE_ROW_CLASS, className]
      .filter(Boolean)
      .join(" "),
  };
}

export function AdminTableCard({
  title = "",
  savingLabel = "",
  actions = null,
  children,
}: {
  title?: string;
  description?: string;
  savingLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const toolbarSlot = useContext(AdminToolbarSlotContext);
  const useSharedToolbar = Boolean(toolbarSlot && (savingLabel || actions));

  const toolbarContent =
    savingLabel || actions ? (
      <>
        {savingLabel ? <Badge variant="muted">{savingLabel}</Badge> : null}
        {actions}
      </>
    ) : null;

  return (
    <section className="cf-admin-table-card overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)] ring-1 ring-black/[0.015]">
      {useSharedToolbar && toolbarContent && toolbarSlot
        ? createPortal(toolbarContent, toolbarSlot)
        : null}
      {title || (!useSharedToolbar && (savingLabel || actions)) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface px-5 py-3">
          {title ? (
            <h3 className="text-sm font-semibold tracking-tight text-cf-text">
              {title}
            </h3>
          ) : (
            <div />
          )}

          {!useSharedToolbar && (savingLabel || actions) ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {toolbarContent}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function AdminListToolbar({
  filters = [],
  activeFilter = filters[0]?.key || filters[0]?.label || "",
  onFilterChange,
  sortOptions = [],
  activeSort = sortOptions[0]?.key || "",
  onSortChange,
  sortLabel = "Name",
  savingLabel = "",
  children = null,
}: {
  filters?: AdminListFilterOption[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
  sortOptions?: Array<{ key: string; label: string }>;
  activeSort?: string;
  onSortChange?: (key: string) => void;
  sortLabel?: string;
  savingLabel?: string;
  children?: ReactNode;
}) {
  const sortSelectId = useId();
  const hasInteractiveFilters = Boolean(onFilterChange);
  const hasInteractiveSort = Boolean(onSortChange && sortOptions.length);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface px-5 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map(({ key, label, count, active = false }) => {
          const filterKey = key || label;
          const isActive = active || activeFilter === filterKey;
          const className = [
            "rounded-full px-3 py-1 text-xs font-semibold",
            hasInteractiveFilters ? "transition" : "",
            isActive
              ? "bg-cf-accent text-cf-page-bg shadow-[var(--shadow-panel)]"
              : [
                  "border border-cf-border bg-cf-surface-soft/70 text-cf-text-muted",
                  hasInteractiveFilters ? "hover:bg-cf-surface" : "",
                ].join(" "),
          ].join(" ");

          const content = (
            <>
              {label}{" "}
              {count !== undefined ? (
                <span
                  className={
                    isActive ? "text-cf-page-bg/70" : "text-cf-text-subtle"
                  }
                >
                  {count}
                </span>
              ) : null}
            </>
          );

          return hasInteractiveFilters ? (
            <button
              key={filterKey}
              type="button"
              onClick={() => onFilterChange?.(filterKey)}
              className={className}
              aria-pressed={isActive}
            >
              {content}
            </button>
          ) : (
            <span key={filterKey} className={className}>
              {content}
            </span>
          );
        })}
        {children ? (
          <>
            {filters.length ? (
              <span className="mx-1 h-4 w-px bg-cf-border" />
            ) : null}
            {children}
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-xs">
        {savingLabel ? (
          <span className="rounded-full bg-cf-warning-bg px-2 py-1 font-semibold text-cf-warning-text ring-1 ring-cf-warning-text/20">
            {savingLabel}
          </span>
        ) : null}
        {hasInteractiveSort ? (
          <>
            <label htmlFor={sortSelectId} className="text-cf-text-subtle">
              Sort by:
            </label>
            <select
              id={sortSelectId}
              value={activeSort}
              onChange={(event) => onSortChange?.(event.target.value)}
              className="rounded-lg border border-cf-border bg-cf-surface px-2 py-1 font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-border-strong"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        ) : sortLabel ? (
          <span className="rounded-lg border border-cf-border bg-cf-surface px-2 py-1 font-semibold text-cf-text-muted">
            Sort: {sortLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AdminTableFooter({
  shown,
  total,
  label = "items",
}: {
  shown: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="border-t border-cf-border bg-cf-surface-soft/40 px-5 py-3 text-xs text-cf-text-muted">
      Showing {shown} of {total} {label}
    </div>
  );
}

/* Inline notice banner */
export function AdminInlineNotice({
  tone = "warning",
  children,
}: {
  tone?: Exclude<AdminConfirmVariant, "default">;
  children: ReactNode;
}) {
  const toneClasses = {
    warning: "border-cf-warning-text bg-cf-warning-bg text-cf-warning-text",
    danger: "border-cf-danger-text bg-cf-danger-bg text-cf-danger-text",
  };

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm",
        toneClasses[tone] ?? toneClasses.warning,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
