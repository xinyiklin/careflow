import type { ReactNode } from "react";

import { Badge } from "../../../../shared/components/ui";

export function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0.00";
}

export function FacilitySourceBadge({
  active,
  source = "Inherited",
}: {
  active: boolean;
  source?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={active ? "success" : "muted"}>
        {active ? "Active" : "Inactive"}
      </Badge>
      <span className="text-xs text-cf-text-subtle">{source}</span>
    </span>
  );
}

export function FacilityListTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
          <tr>
            {columns.map((heading) => (
              <th key={heading || "actions"} className="px-5 py-3 text-left">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cf-border text-cf-text">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyRow({
  colSpan,
  label,
}: {
  colSpan: number;
  label: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-8 text-center text-sm text-cf-text-muted"
      >
        {label}
      </td>
    </tr>
  );
}
