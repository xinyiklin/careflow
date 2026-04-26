import { createContext, useContext, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "../../../../shared/components/ui";

const AdminToolbarSlotContext = createContext(null);

export const ADMIN_INTERACTIVE_ROW_CLASS =
  "group cursor-pointer outline-none transition hover:bg-cf-surface-soft/50 focus-visible:bg-cf-surface-soft/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30";

export function getAdminRowActionProps({
  disabled = false,
  label,
  onAction,
  className = "",
}) {
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
    onKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onAction?.(event);
    },
    className: [ADMIN_INTERACTIVE_ROW_CLASS, className]
      .filter(Boolean)
      .join(" "),
  };
}

export function AdminWorkspaceShell({
  sections,
  activeSection,
  onSelectSection,
  workspaceLabel = "Facility",
  leadingAccessory = null,
  children,
}) {
  const [toolbarSlot, setToolbarSlot] = useState(null);
  const toolbarContextValue = useMemo(() => toolbarSlot, [toolbarSlot]);
  const activeSectionConfig =
    sections.find((section) => section.key === activeSection) || sections[0];
  const activeLabel = activeSectionConfig?.label || "Admin";

  return (
    <AdminToolbarSlotContext.Provider value={toolbarContextValue}>
      <div className="grid h-full min-h-0 overflow-hidden bg-transparent md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-cf-border bg-cf-surface md:flex">
          <div className="px-5 pt-6 pb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              {workspaceLabel}
            </div>
            {leadingAccessory ? (
              <div className="mt-2">{leadingAccessory}</div>
            ) : null}
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3">
            <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Configuration
            </div>
            {sections.map((section) => {
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onSelectSection(section.key)}
                  className={[
                    "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "bg-gradient-to-r from-cf-text to-slate-800 font-semibold text-white shadow-[var(--shadow-panel)] ring-1 ring-cf-text/30"
                      : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
                  ].join(" ")}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "h-2 w-2 shrink-0 rounded-full transition",
                        isActive
                          ? "bg-white"
                          : "bg-cf-border-strong group-hover:bg-cf-text-muted",
                      ].join(" ")}
                    />
                    <span className="truncate">{section.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="shrink-0 px-4 pt-0 pb-2 sm:px-5 lg:px-6 xl:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                    Admin · {workspaceLabel} · {activeLabel}
                  </div>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cf-text">
                  {activeLabel}
                </h1>
              </div>

              <div
                ref={setToolbarSlot}
                className="flex flex-wrap items-center justify-end gap-2 empty:hidden"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:hidden">
              {leadingAccessory ? (
                <div className="w-full">{leadingAccessory}</div>
              ) : null}

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-cf-border bg-cf-surface-soft p-1 shadow-[var(--shadow-panel)]">
                  {sections.map((section) => {
                    const isActive = activeSection === section.key;
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => onSelectSection(section.key)}
                        className={[
                          "relative inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition",
                          isActive
                            ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
                            : "text-cf-text-muted hover:bg-cf-surface/70 hover:text-cf-text",
                        ].join(" ")}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent px-4 pb-4 sm:px-5 lg:px-6 xl:px-7">
            <div className="space-y-5 pb-2">{children}</div>
          </div>
        </div>
      </div>
    </AdminToolbarSlotContext.Provider>
  );
}

export function AdminTableCard({
  title = "",
  savingLabel = "",
  actions = null,
  children,
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
    <section className="cf-admin-table-card overflow-hidden rounded-3xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]">
      {useSharedToolbar && toolbarContent
        ? createPortal(toolbarContent, toolbarSlot)
        : null}
      {title || (!useSharedToolbar && (savingLabel || actions)) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-gradient-to-b from-cf-surface-soft/70 to-cf-surface px-5 py-3">
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
}) {
  const sortSelectId = useId();
  const hasInteractiveFilters = Boolean(onFilterChange);
  const hasInteractiveSort = Boolean(onSortChange && sortOptions.length);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-gradient-to-b from-cf-surface-soft/70 to-cf-surface px-5 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map(({ key, label, count, active = false }) => {
          const filterKey = key || label;
          const isActive = active || activeFilter === filterKey;
          const className = [
            "rounded-full px-3 py-1 text-xs font-semibold",
            hasInteractiveFilters ? "transition" : "",
            isActive
              ? "bg-cf-text text-white"
              : [
                  "border border-cf-border bg-cf-surface text-cf-text-muted",
                  hasInteractiveFilters ? "hover:bg-cf-surface-soft" : "",
                ].join(" "),
          ].join(" ");

          const content = (
            <>
              {label}{" "}
              {count !== undefined ? (
                <span
                  className={isActive ? "text-white/70" : "text-cf-text-subtle"}
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
              onClick={() => onFilterChange(filterKey)}
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
          <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800 ring-1 ring-amber-200">
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
              onChange={(event) => onSortChange(event.target.value)}
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

export function AdminTableFooter({ shown, total, label = "items" }) {
  return (
    <div className="border-t border-cf-border bg-cf-surface-soft/40 px-5 py-3 text-xs text-cf-text-muted">
      Showing {shown} of {total} {label}
    </div>
  );
}

/* Inline notice banner */
export function AdminInlineNotice({ tone = "warning", children }) {
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
