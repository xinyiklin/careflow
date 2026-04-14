import { Menu, LayoutDashboard } from "lucide-react";

export default function AppSidebar({
  isCollapsed,
  onToggleCollapse,
}) {
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-50 overflow-hidden border-r border-slate-200 bg-white shadow-sm",
        "transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-36",
      ].join(" ")}
    >
      <div className="flex h-14 items-center border-b border-slate-200 px-2 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-label="Toggle sidebar collapse"
          title="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <nav className="p-2 select-none">
        <div className="space-y-1">
          <button
            type="button"
            className="relative flex h-10 w-full items-center rounded-lg px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            title="Dashboard"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <LayoutDashboard className="h-5 w-5" />
            </span>

            <span
              className={[
                "pointer-events-none absolute left-11 whitespace-nowrap transition-[opacity,transform] duration-150 ease-out",
                isCollapsed
                  ? "translate-x-1 opacity-0"
                  : "translate-x-0 opacity-100",
              ].join(" ")}
            >
              Dashboard
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
}