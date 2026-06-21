import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CareFlowIcon } from "@careflow/ui-icons";

import type { ChangeEvent, FormEvent } from "react";

import { DEMO_MODE } from "../../../shared/config/appConfig";
import { Button, Card, Field, Input } from "../../../shared/ui";
import { NO_PORTAL_ACCESS, useAuth } from "../AuthProvider";

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
  const { t } = useTranslation();
  const { login, demoLogin, error: providerError } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // The provider signals the 403 "no portal access" case with a stable code
  // (never display copy). Localize it here, where useTranslation is available.
  const localizeAuthError = (message: string) =>
    message === NO_PORTAL_ACCESS ? t("auth.noPortalAccess") : message;

  // Surface bootstrap errors (e.g. clinician account hitting /portal/me/).
  useEffect(() => {
    if (providerError) {
      setFormError(localizeAuthError(providerError));
    }
    // localizeAuthError depends only on t, which is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setFormError(
        localizeAuthError(getErrorMessage(err, t("auth.invalidCredentials")))
      );
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
      setFormError(getErrorMessage(err, t("auth.demoUnavailable")));
    } finally {
      setDemoLoading(false);
    }
  };

  const loading = submitting || demoLoading;

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-bg px-4 py-10">
      <Card
        as="div"
        padded={false}
        className="w-full max-w-sm px-6 py-7 sm:px-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft">
            <CareFlowIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
              {t("auth.portalLabel")}
            </div>
            <div className="text-sm font-semibold tracking-tight text-text">
              {t("common.appName")}
            </div>
          </div>
        </div>

        <h1 className="mb-5 text-xl font-semibold tracking-tight text-text">
          {t("auth.signInHeading")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md border border-border bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-semibold">{t("auth.signInFailed")}</div>
                <div className="mt-0.5">{formError}</div>
              </div>
            </div>
          ) : null}

          <Field label={t("auth.usernameLabel")} required>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={loading}
            />
          </Field>

          <Field label={t("auth.passwordLabel")} required>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={submitting}
            disabled={loading}
          >
            {submitting ? t("auth.signingIn") : t("auth.signInButton")}
          </Button>
        </form>

        {DEMO_MODE ? (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                {t("auth.or")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={demoLoading}
              disabled={loading}
              onClick={handleDemoLogin}
            >
              {demoLoading ? t("auth.demoOpening") : t("auth.demoButton")}
            </Button>

            <p className="mt-2.5 text-center text-xs text-text-subtle">
              {t("auth.demoNote")}
            </p>
          </>
        ) : null}

        <p className="mt-5 text-center text-xs text-text-subtle">
          {t("auth.footerNote")}
        </p>
      </Card>
    </div>
  );
}
