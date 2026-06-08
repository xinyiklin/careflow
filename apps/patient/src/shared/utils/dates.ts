import { formatDistanceToNow, parseISO } from "date-fns";

import i18n, { getDateFnsLocale } from "../../i18n";

/**
 * Active language for ``Intl`` formatting. Following the selected portal
 * language (not the OS locale) keeps dates consistent with the rest of the UI.
 * ``undefined`` lets ``Intl`` fall back to the runtime default if unset.
 */
function activeLocale(): string | undefined {
  return i18n.resolvedLanguage ?? i18n.language ?? undefined;
}

function safeDate(iso: string): Date | null {
  if (!iso) return null;
  try {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

export function formatFacilityLocalDateTime(
  iso: string,
  timeZone: string
): string {
  const date = safeDate(iso);
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(activeLocale(), {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || undefined,
    })
      .format(date)
      .replace(", ", " · "); // last comma → dot separator before time
  } catch {
    // Fall back to browser-local if the timezone label was unusable.
    return new Intl.DateTimeFormat(activeLocale(), {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = safeDate(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat(activeLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = safeDate(iso);
  if (!date) return "";
  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: getDateFnsLocale(),
    });
  } catch {
    return "";
  }
}
