export default function AppSidebar({
  isOpen,
  onClose,
  onOpenPatientSearch,
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-sm font-semibold text-slate-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700  lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={onOpenPatientSearch}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Patients
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}