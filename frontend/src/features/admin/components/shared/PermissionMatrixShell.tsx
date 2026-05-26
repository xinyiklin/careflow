import { Fragment, type ReactNode } from "react";

import PermissionGroupHeader from "./PermissionGroupHeader";

import type {
  PermissionGroup,
  PermissionItem,
} from "../../constants/permissionUtils";

export default function PermissionMatrixShell({
  groups,
  cornerLabel,
  cornerSubtitle,
  columnHeaders,
  columnCount,
  renderRow,
  groupHeaderIconClassName,
}: {
  groups: readonly PermissionGroup[];
  cornerLabel: string;
  cornerSubtitle?: string;
  columnHeaders: ReactNode;
  columnCount: number;
  renderRow: (group: PermissionGroup, permission: PermissionItem) => ReactNode;
  groupHeaderIconClassName?: string;
}) {
  return (
    <div className="min-h-[420px]">
      <div className="min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-cf-surface">
              <tr>
                <th className="sticky left-0 z-20 w-[250px] border-r border-b border-cf-border bg-cf-surface px-5 py-4 text-left align-top">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                    {cornerLabel}
                  </div>
                  {cornerSubtitle && (
                    <div className="mt-0.5 text-xs text-cf-text-muted">
                      {cornerSubtitle}
                    </div>
                  )}
                </th>
                {columnHeaders}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <PermissionGroupHeader
                    group={group}
                    colSpan={columnCount + 1}
                    iconClassName={groupHeaderIconClassName}
                  />
                  {group.permissions.map((permission) => (
                    <Fragment key={permission.key}>
                      {renderRow(group, permission)}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
