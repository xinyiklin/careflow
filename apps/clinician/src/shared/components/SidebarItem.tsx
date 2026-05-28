import type { LucideIcon } from "lucide-react";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  badgeCount?: number;
};

export default function SidebarItem({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  badgeCount = 0,
}: SidebarItemProps) {
  const showBadge = badgeCount > 0;
  const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);

  return (
    <button
      onClick={onClick}
      data-active={String(Boolean(isActive))}
      title={
        isCollapsed
          ? showBadge
            ? `${label} (${badgeLabel} unread)`
            : label
          : undefined
      }
      className={[
        "flex min-h-11 w-full items-center text-left text-sm font-medium will-change-transform transition-[background-color,color,transform,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "cf-sidebar-item",
        isCollapsed ? "gap-0 px-1.5" : "gap-2.5 px-1.5",
      ].join(" ")}
    >
      <span className="cf-sidebar-item-icon relative flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon className="h-4.5 w-4.5 shrink-0" />
        {showBadge && isCollapsed ? (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-cf-accent"
          />
        ) : null}
      </span>

      <span
        className={[
          "flex min-w-0 flex-1 items-center justify-between gap-2 origin-left overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isCollapsed
            ? "max-w-0 -translate-x-1 scale-x-95 opacity-0"
            : "max-w-[164px] translate-x-0 scale-x-100 opacity-100 delay-75",
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        {showBadge ? (
          <span
            aria-label={`${badgeCount} unread`}
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-cf-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-cf-page-bg"
          >
            {badgeLabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}
