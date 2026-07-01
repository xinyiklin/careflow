import { useId, useMemo, useState } from "react";
import { Pill } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { Card, EmptyState, PageHeader, Skeleton, cn } from "../../../shared/ui";
import {
  getPortalTabId,
  getPortalTabPanelId,
  usePortalTabs,
} from "../../../shared/ui/portalTabs";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useMedications, type PortalMedication } from "../api/medications";
import { useRefillRequests } from "../api/refills";
import { MedicationRow } from "../components/MedicationRow";
import { RefillRequestList } from "../components/RefillRequestList";
import { RefillRequestModal } from "../components/RefillRequestModal";

type TabKey = "active" | "inactive";

type Groups = {
  active: PortalMedication[];
  inactive: PortalMedication[];
};

function splitByStatus(meds: PortalMedication[]): Groups {
  const active: PortalMedication[] = [];
  const inactive: PortalMedication[] = [];
  for (const med of meds) {
    if (med.status === "active") {
      active.push(med);
    } else {
      inactive.push(med);
    }
  }
  return { active, inactive };
}

type SegmentProps = {
  active: boolean;
  count: number;
  label: string;
  id: string;
  controls: string;
  onClick: () => void;
};

function SegmentTab({
  active,
  count,
  label,
  id,
  controls,
  onClick,
}: SegmentProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium tracking-tight",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-muted hover:text-text"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-sm px-1.5 text-xs",
          active ? "bg-surface text-accent" : "bg-surface-soft text-text-subtle"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function MedicationsPage() {
  const { t } = useTranslation();
  const { data, isError, error, isLoading } = useMedications();
  const refillsQuery = useRefillRequests();
  const showLoading = useMinimumLoading(isLoading);

  const { active, inactive } = useMemo(() => splitByStatus(data ?? []), [data]);
  const medications = data ?? [];

  const pendingMedicationIds = useMemo(() => {
    const ids = new Set<number>();
    for (const refill of refillsQuery.data ?? []) {
      if (refill.status === "pending") {
        ids.add(refill.medication_id);
      }
    }
    return ids;
  }, [refillsQuery.data]);

  const [tab, setTab] = useState<TabKey>("active");
  const [refillTarget, setRefillTarget] = useState<PortalMedication | null>(
    null
  );

  const idBase = useId();
  const { getTabListProps } = usePortalTabs<TabKey>({
    values: ["active", "inactive"],
    value: tab,
    onChange: setTab,
  });

  const currentList = tab === "active" ? active : inactive;

  return (
    <div>
      <PageHeader title={t("medications.pageTitle")} />

      {isError ? (
        <Card tone="muted">
          <p className="text-sm text-text-muted">{getErrorMessage(error)}</p>
        </Card>
      ) : showLoading ? (
        <ul className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <li key={row}>
              <Card padded={false}>
                <div className="space-y-2 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-44 max-w-full" />
                    <Skeleton className="h-5 w-14 rounded-sm" />
                  </div>
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-3 w-36 max-w-full" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : isLoading ? null : medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={t("medications.emptyTitle")}
          description={t("medications.emptyBody")}
        />
      ) : (
        <div className="space-y-6">
          <div
            {...getTabListProps()}
            role="tablist"
            aria-label={t("medications.pageTitle")}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
          >
            <SegmentTab
              active={tab === "active"}
              count={active.length}
              label={t("medications.tabActive")}
              id={getPortalTabId(idBase, "active")}
              controls={getPortalTabPanelId(idBase)}
              onClick={() => setTab("active")}
            />
            <SegmentTab
              active={tab === "inactive"}
              count={inactive.length}
              label={t("medications.tabInactive")}
              id={getPortalTabId(idBase, "inactive")}
              controls={getPortalTabPanelId(idBase)}
              onClick={() => setTab("inactive")}
            />
          </div>

          <div
            role="tabpanel"
            id={getPortalTabPanelId(idBase)}
            aria-labelledby={getPortalTabId(idBase, tab)}
            className="space-y-6"
          >
            {currentList.length === 0 ? (
              <EmptyState
                icon={Pill}
                title={
                  tab === "active"
                    ? t("medications.noActiveTitle")
                    : t("medications.noInactiveTitle")
                }
                description={
                  tab === "active"
                    ? t("medications.noActiveBody")
                    : t("medications.noInactiveBody")
                }
              />
            ) : (
              <ul className="space-y-3">
                {currentList.map((medication) => (
                  <li key={medication.id}>
                    <MedicationRow
                      medication={medication}
                      hasPendingRefill={pendingMedicationIds.has(medication.id)}
                      onRequestRefill={
                        tab === "active"
                          ? (med) => setRefillTarget(med)
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            <RefillRequestList />
          </div>
        </div>
      )}

      {refillTarget ? (
        <RefillRequestModal
          medication={refillTarget}
          onClose={() => setRefillTarget(null)}
        />
      ) : null}
    </div>
  );
}
