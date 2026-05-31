import { ShieldCheck } from "lucide-react";

import type { PermissionGroup } from "../../constants/permissionUtils";

export default function PermissionGroupHeader({
  group,
  colSpan,
  iconClassName,
}: {
  group: PermissionGroup;
  colSpan: number;
  iconClassName?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b border-cf-border bg-cf-surface-soft/60 px-3 py-2.5"
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck
              className={["h-3.5 w-3.5", iconClassName]
                .filter(Boolean)
                .join(" ")}
            />
            {group.label}
          </span>
          <span className="font-mono normal-case tracking-normal">
            {group.permissions.length} permissions
          </span>
        </div>
      </td>
    </tr>
  );
}
