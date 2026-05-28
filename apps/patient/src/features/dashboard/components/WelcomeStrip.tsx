import { useTranslation } from "react-i18next";

type WelcomeStripProps = {
  firstName: string;
  initials: string;
};

/**
 * Compact greeting strip at the top of the dashboard. Avatar on the left,
 * "Welcome back, …" + a calm muted subline on the right.
 */
export function WelcomeStrip({ firstName, initials }: WelcomeStripProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="dashboard-welcome-heading"
      className="flex items-center gap-3"
    >
      <div
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <h1
          id="dashboard-welcome-heading"
          className="text-lg font-semibold tracking-tight text-text sm:text-xl"
        >
          {t("dashboard.welcomeBack", { name: firstName })}
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          {t("dashboard.greeting")}
        </p>
      </div>
    </section>
  );
}
