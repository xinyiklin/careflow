import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { APP_NAME } from "../../../shared/constants/app";
import { DEMO_MODE } from "../../../shared/config/appConfig";
import { CareFlowIcon } from "../../../shared/components/icons";
import { Button, Input, Notice } from "../../../shared/components/ui";

export default function LoginForm({ onSubmit, onDemoLogin, error, loading }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [demoLoading, setDemoLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const handleDemoLogin = async () => {
    if (!onDemoLogin) return;
    try {
      setDemoLoading(true);
      await onDemoLogin();
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="cf-app-shell flex h-[100dvh] w-full items-center justify-center bg-cf-page-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface px-7 py-7 shadow-[var(--shadow-panel-lg)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-cf-sidebar-bg)]">
            <CareFlowIcon className="h-5 w-5 text-[var(--color-cf-sidebar-accent)]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Workspace
            </div>
            <div className="text-sm font-semibold tracking-tight text-cf-text">
              {APP_NAME}
            </div>
          </div>
        </div>

        <h1 className="mb-5 text-xl font-semibold tracking-tight text-cf-text">
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Notice tone="danger" title="Sign in failed">
              {error}
            </Notice>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cf-text">
              Username
            </label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cf-text">
              Password
            </label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="pt-1">
            <Button
              variant="primary"
              type="submit"
              disabled={loading || demoLoading}
              className="w-full justify-center"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
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

            <Button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading || demoLoading}
              className="w-full justify-center"
            >
              {demoLoading ? "Opening demo..." : "Continue with Demo"}
              {!demoLoading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="mt-2.5 text-center text-xs text-cf-text-subtle">
              No credentials needed &mdash; built for portfolio and preview use.
            </p>
          </>
        )}

        <p className="mt-5 text-center text-xs text-cf-text-subtle">
          For authorized facility use only.
        </p>
      </div>
    </div>
  );
}
