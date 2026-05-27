import { type ReactNode } from "react";
import { useAuth } from "../features/auth/AuthProvider";

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-cf-page-bg">
      <header className="border-b border-cf-border bg-cf-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-cf-text">CareFlow Portal</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-cf-control px-3 py-1.5 text-sm text-cf-text-muted transition-colors hover:bg-cf-surface-soft"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl">{children}</main>
    </div>
  );
}
