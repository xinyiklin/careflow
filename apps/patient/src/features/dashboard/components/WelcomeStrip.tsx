import { useTranslation } from "react-i18next";

type WelcomeStripProps = {
  firstName: string;
  initials: string;
};

/**
 * Greeting strip at the top of the dashboard. Avatar on the left; a
 * locale-formatted date eyebrow orients the patient, then a prominent
 * "Welcome back, …" heading. The date replaces the previous filler subline.
 */
export function WelcomeStrip({ firstName, initials }: WelcomeStripProps) {
  const { t, i18n } = useTranslation();

  const today = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  ).format(new Date());

  return (
    <section
      aria-labelledby="dashboard-welcome-heading"
      className="flex items-center gap-3.5"
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-inset ring-accent/15"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
          {today}
        </p>
        <h1
          id="dashboard-welcome-heading"
          className="mt-1 text-xl font-semibold tracking-tight text-text sm:text-2xl"
        >
          {t("dashboard.welcomeBack", { name: firstName })}
        </h1>
      </div>
    </section>
  );
}
