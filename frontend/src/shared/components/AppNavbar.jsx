import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "../constants/app";

function getInitials(fullName) {
  if (!fullName) return "U";

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AppNavbar({
  fullName,
  onToggleSidebar,
  onLogout,
}) {
  const initials = getInitials(fullName);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900">
              {APP_NAME}
            </h1>
          </div>
        </div>

        <div ref={menuRef} className="relative flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">
              {fullName || "User"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:opacity-90"
            aria-label="Open user menu"
          >
            {initials}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout?.();
                }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}