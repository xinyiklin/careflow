import { AlertTriangle } from "lucide-react";

import type { PermissionItem } from "../../constants/permissionUtils";

export default function PermissionRowLabel({
  permission,
  isDestructive,
  destructivePrefix = "sensitive · audited · ",
}: {
  permission: PermissionItem;
  isDestructive: boolean;
  destructivePrefix?: string;
}) {
  return (
    <th className="sticky left-0 z-[5] border-r border-b border-cf-border bg-cf-surface/80 px-3 py-3.5 text-left font-normal backdrop-blur-md group-hover:bg-cf-surface-soft/80">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-cf-text">
          {permission.label}
        </span>
        {isDestructive && (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        )}
      </div>
      <div
        className={[
          "mt-0.5 font-mono text-[9px]",
          isDestructive ? "text-rose-700" : "text-cf-text-subtle",
        ].join(" ")}
      >
        {isDestructive ? destructivePrefix : ""}
        {permission.key}
      </div>
    </th>
  );
}
