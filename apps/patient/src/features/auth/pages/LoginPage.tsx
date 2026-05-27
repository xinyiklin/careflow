import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { CareFlowIcon } from "@careflow/ui-icons";

import type { ChangeEvent, FormEvent } from "react";

import { DEMO_MODE } from "../../../shared/config/appConfig";
import { useAuth } from "../AuthProvider";

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback;
}

export function LoginPage() {
  const { login, demoLogin, error: providerError } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Surface bootstrap errors (e.g. clinician account hitting /portal/me/).
  useEffect(() => {
    if (providerError) {
      setFormError(providerError);
    }
  }, [providerError]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (credentials: {
    username: string;
    password: string;
  }) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await login(credentials);
    } catch (err) {
      setFormError(getErrorMessage(err, "Invalid username or password."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(formData);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setFormError(null);
    try {
      await demoLogin();
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Demo login is currently unavailable.")
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const loading = submitting || demoLoading;

  return (
    <div className="cf-app-shell flex h-[100dvh] w-full items-center justify-center bg-cf-page-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface px-7 py-7 shadow-[var(--shadow-panel-lg)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-cf-sidebar-bg)]">
            <CareFlowIcon className="h-5 w-5 text-[var(--color-cf-sidebar-accent)]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Patient Portal
            </div>
            <div className="text-sm font-semibold tracking-tight text-cf-text">
              CareFlow
            </div>
          </div>
        </div>

        <h1 className="mb-5 text-xl font-semibold tracking-tight text-cf-text">
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-cf-danger-bg bg-cf-danger-bg px-4 py-3 text-sm text-cf-danger-text"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold">Sign in failed</div>
                <div className="mt-0.5">{formError}</div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-cf-text"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
              className="w-full rounded-xl border border-cf-border-strong bg-cf-surface px-3 py-2.5 text-sm text-cf-text shadow-sm outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-cf-text"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-cf-border-strong bg-cf-surface px-3 py-2.5 text-sm text-cf-text shadow-sm outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cf-accent bg-cf-accent px-4 py-2.5 text-sm font-medium leading-none text-cf-page-bg shadow-[var(--shadow-panel)] transition hover:border-cf-accent-hover hover:bg-cf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>

        {DEMO_MODE && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-cf-border" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                or
              </span>
              <div className="h-px flex-1 bg-cf-border" />
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cf-border bg-cf-surface px-4 py-2.5 text-sm font-medium leading-none text-cf-text-muted shadow-[var(--shadow-panel)] transition hover:border-cf-border-strong hover:bg-cf-surface-soft hover:text-cf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {demoLoading ? "Opening demo..." : "Continue with Demo"}
              {!demoLoading && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="mt-2.5 text-center text-xs text-cf-text-subtle">
              No credentials needed &mdash; built for portfolio and preview use.
            </p>
          </>
        )}

        <p className="mt-5 text-center text-xs text-cf-text-subtle">
          For authorized patient use only.
        </p>
      </div>
    </div>
  );
}
