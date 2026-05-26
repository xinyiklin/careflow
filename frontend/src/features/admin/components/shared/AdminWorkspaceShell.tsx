import { useMemo, useState } from "react";

import {
  CategoryRail,
  CategoryRailItem,
  SegmentedControl,
} from "../../../../shared/components/ui";
import AdminScopeSwitch from "./AdminScopeSwitch";
import AdminToolbarSlotContext from "./AdminToolbarSlotContext";
import useFacility from "../../../facilities/hooks/useFacility";

import type { ReactNode } from "react";

export type AdminWorkspaceSection = {
  key: string;
  label: string;
  group?: string;
};

export default function AdminWorkspaceShell({
  sections,
  activeSection,
  onSelectSection,
  workspaceLabel = "Facility",
  leadingAccessory = null,
  children,
}: {
  sections: AdminWorkspaceSection[];
  activeSection: string;
  onSelectSection: (sectionKey: string) => void;
  workspaceLabel?: string;
  leadingAccessory?: ReactNode;
  children: ReactNode;
}) {
  const { facility } = useFacility();
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  const toolbarContextValue = useMemo(() => toolbarSlot, [toolbarSlot]);
  const activeSectionConfig =
    sections.find((section) => section.key === activeSection) || sections[0];
  const activeLabel = activeSectionConfig?.label || "Admin";

  const facilityName = facility?.name || "Clinic";
  const orgName = facility?.organization?.name || "Organization";

  return (
    <AdminToolbarSlotContext.Provider value={toolbarContextValue}>
      <div className="cf-admin-shell h-full min-h-0 bg-transparent">
        <div className="grid h-full min-h-0 overflow-hidden bg-cf-surface md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="cf-admin-sidebar hidden min-h-0 flex-col overflow-hidden border-r border-cf-border bg-cf-surface-muted/70 md:flex">
            <div className="px-3 pt-4 pb-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Admin scope
              </div>
              {workspaceLabel === "Facility" && leadingAccessory ? (
                <div className="mt-2">{leadingAccessory}</div>
              ) : (
                <div className="mt-2 text-sm font-semibold text-cf-text">
                  {workspaceLabel === "Facility" ? facilityName : orgName}
                </div>
              )}
              <div className="mt-2.5">
                <AdminScopeSwitch />
              </div>

              {workspaceLabel !== "Facility" && leadingAccessory ? (
                <div className="mt-3">{leadingAccessory}</div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <CategoryRail label="Admin sections">
                {sections.map((section, i) => {
                  const prevGroup = i > 0 ? sections[i - 1].group : undefined;
                  const showGroupHeader =
                    section.group && section.group !== prevGroup;

                  return (
                    <div key={section.key}>
                      {showGroupHeader ? (
                        <div className="px-2 pb-1 pt-3 first:pt-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                          {section.group}
                        </div>
                      ) : null}
                      <CategoryRailItem
                        onClick={() => onSelectSection(section.key)}
                        active={activeSection === section.key}
                        size="sm"
                      >
                        {section.label}
                      </CategoryRailItem>
                    </div>
                  );
                })}
              </CategoryRail>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-cf-surface">
            <div className="shrink-0 border-b border-cf-border/60 bg-cf-surface px-5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cf-text-subtle leading-none">
                    Admin · {workspaceLabel}
                  </div>
                  <h1 className="mt-1 text-base font-extrabold tracking-tight text-cf-text leading-none">
                    {activeLabel}
                  </h1>
                </div>

                <div
                  ref={setToolbarSlot}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 empty:hidden"
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:hidden">
                <AdminScopeSwitch mobile />

                {leadingAccessory ? (
                  <div className="w-full">{leadingAccessory}</div>
                ) : null}

                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <SegmentedControl
                    options={sections.map((s) => ({
                      value: s.key,
                      label: s.label,
                    }))}
                    value={activeSection}
                    onChange={onSelectSection}
                    className="min-w-max"
                  />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cf-surface">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AdminToolbarSlotContext.Provider>
  );
}
