import { useMemo, useState } from "react";

import {
  CategoryRail,
  CategoryRailItem,
} from "../../../../shared/components/ui";
import AdminScopeSwitch from "./AdminScopeSwitch";
import AdminToolbarSlotContext from "./AdminToolbarSlotContext";

export default function AdminWorkspaceShell({
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
      <div className="grid h-full min-h-0 overflow-hidden bg-cf-page-bg md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-cf-border bg-cf-page-bg md:flex">
          <div className="border-b border-cf-border px-3 pt-0 pb-3">
            <div className="rounded-b-[1.15rem] border-x border-b border-cf-border bg-cf-page-bg p-3 shadow-[var(--shadow-panel)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Admin console
              </div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-cf-text">
                {workspaceLabel}
              </div>
              <AdminScopeSwitch />
            </div>

            {leadingAccessory ? (
              <div className="mt-3 rounded-2xl border border-cf-border bg-cf-page-bg p-1.5 shadow-[var(--shadow-panel)]">
                {leadingAccessory}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Sections
            </div>
            <CategoryRail label="Admin sections">
              {sections.map((section) => (
                <CategoryRailItem
                  key={section.key}
                  onClick={() => onSelectSection(section.key)}
                  active={activeSection === section.key}
                  size="md"
                >
                  {section.label}
                </CategoryRailItem>
              ))}
            </CategoryRail>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="shrink-0 px-4 pt-0 pb-3 sm:px-5 lg:px-6 xl:px-7">
            <div className="rounded-b-[1.75rem] border-x border-b border-cf-border bg-cf-surface/88 px-4 py-4 shadow-[var(--shadow-panel)] backdrop-blur sm:px-5">
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
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:hidden">
              <AdminScopeSwitch mobile />

              {leadingAccessory ? (
                <div className="w-full">{leadingAccessory}</div>
              ) : null}

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-cf-border bg-cf-surface-muted/70 p-1 shadow-[var(--shadow-panel)]">
                  {sections.map((section) => {
                    const isActive = activeSection === section.key;
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => onSelectSection(section.key)}
                        className={[
                          "relative inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition",
                          isActive
                            ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
                            : "text-cf-text-muted hover:bg-cf-surface hover:text-cf-text",
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
