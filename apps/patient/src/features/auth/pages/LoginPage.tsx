import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { CareFlowIcon } from "../../../shared/components/icons";
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
    setSubmitting(true);
    setFormError(null);
    try {
      await demoLogin();
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Demo login is currently unavailable.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-cf-page-bg px-4">
      <div className="w-full max-w-sm rounded-cf-shell border border-cf-border bg-cf-surface px-7 py-7 shadow-[var(--shadow-panel-lg)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cf-accent-soft">
            <CareFlowIcon className="h-5 w-5 text-cf-accent" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              CareFlow
            </div>
            <div className="text-sm font-semibold tracking-tight text-cf-text">
              Patient Portal
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
              className="rounded-cf-control border border-cf-danger-text/30 bg-cf-danger-bg px-3 py-2 text-sm text-cf-danger-text"
            >
              {formError}
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
              className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
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
              className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-cf-control bg-cf-accent px-4 py-2 text-sm font-medium text-cf-surface transition-colors hover:bg-cf-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
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
              disabled={submitting}
              className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-4 py-2 text-sm font-medium text-cf-text transition-colors hover:bg-cf-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with demo patient
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
