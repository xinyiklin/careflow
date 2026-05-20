import type { LucideIcon } from "lucide-react";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
};

export default function SidebarItem({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      data-active={String(Boolean(isActive))}
      title={isCollapsed ? label : undefined}
      className={[
        "flex min-h-11 w-full items-center text-left text-sm font-medium will-change-transform transition-[background-color,color,transform,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "cf-sidebar-item",
        isCollapsed ? "gap-0 px-1.5" : "gap-2.5 px-1.5",
      ].join(" ")}
    >
      <span className="cf-sidebar-item-icon flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon className="h-4.5 w-4.5 shrink-0" />
      </span>

      <span
        className={[
          "origin-left overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isCollapsed
            ? "max-w-0 -translate-x-1 scale-x-95 opacity-0"
            : "max-w-[116px] translate-x-0 scale-x-100 opacity-100 delay-75",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
