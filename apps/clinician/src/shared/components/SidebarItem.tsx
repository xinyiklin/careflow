import { Link } from "react-router-dom";

import type { LucideIcon } from "lucide-react";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  to: string;
  isActive: boolean;
  isCollapsed: boolean;
  badgeCount?: number;
};

export default function SidebarItem({
  icon: Icon,
  label,
  to,
  isActive,
  isCollapsed,
  badgeCount = 0,
}: SidebarItemProps) {
  const showBadge = badgeCount > 0;
  const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);

  return (
    <Link
      to={to}
      data-active={String(Boolean(isActive))}
      aria-current={isActive ? "page" : undefined}
      title={
        isCollapsed
          ? showBadge
            ? `${label} (${badgeLabel} unread)`
            : label
          : undefined
      }
      className={[
        "flex min-h-11 w-full items-center text-left text-sm font-medium transition-[background-color,color,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "cf-sidebar-item",
        isCollapsed ? "gap-0 px-1.5" : "gap-2.5 px-1.5",
      ].join(" ")}
    >
      <span className="cf-sidebar-item-icon relative flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
        {showBadge && isCollapsed ? (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-cf-sidebar-accent)]"
          />
        ) : null}
      </span>

      <span
        className={[
          "flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out",
          isCollapsed
            ? "max-w-0 opacity-0"
            : "max-w-[164px] opacity-100 delay-50",
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        {showBadge ? (
          <span
            aria-label={`${badgeCount} unread`}
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-cf-sidebar-accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--color-cf-sidebar-bg)] tabular-nums"
          >
            {badgeLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
