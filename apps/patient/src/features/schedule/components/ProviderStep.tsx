import { UserRound, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { EmptyState, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useScheduleProviders,
  type PortalSchedulingProvider,
} from "../api/schedule";

type ProviderStepProps = {
  selected: PortalSchedulingProvider | null;
  onSelect: (provider: PortalSchedulingProvider) => void;
};

export function ProviderStep({ selected, onSelect }: ProviderStepProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useScheduleProviders();
  const showLoading = useMinimumLoading(isLoading);
  const providers = data ?? [];

  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {getErrorMessage(error)}
      </p>
    );
  }

  if (showLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            aria-hidden="true"
            className="h-20 rounded-lg border border-border bg-surface-soft"
          />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return null;
  }

  if (providers.length === 0) {
    return <EmptyState icon={Users} title={t("schedule.noProviders")} />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {providers.map((provider) => {
        const isSelected = selected?.id === provider.id;
        return (
          <li key={provider.id}>
            <button
              type="button"
              onClick={() => onSelect(provider)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border bg-surface p-4 text-left transition-colors",
                "hover:border-border-strong hover:bg-surface-soft",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                "min-h-[64px]",
                isSelected ? "border-accent bg-accent-soft" : "border-border"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-accent text-accent-contrast"
                    : "bg-surface-soft text-text-muted"
                )}
              >
                <UserRound size={18} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text">
                  {provider.display_name}
                </div>
                {provider.specialty ? (
                  <div className="mt-0.5 truncate text-xs text-text-muted">
                    {provider.specialty}
                  </div>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
