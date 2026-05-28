import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { Button, Card, Field, Select } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  usePortalPharmacies,
  type PortalPharmacy,
} from "../../medications/api/pharmacies";
import { useUpdatePreferredPharmacy } from "../api/profile";
import { SectionHeader } from "./sectionUi";

type PreferredPharmacySectionProps = {
  preferredPharmacyName: string;
};

function matchByName(
  pharmacies: PortalPharmacy[],
  name: string
): PortalPharmacy | null {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return (
    pharmacies.find((pharmacy) => pharmacy.name.toLowerCase() === target) ??
    null
  );
}

export function PreferredPharmacySection({
  preferredPharmacyName,
}: PreferredPharmacySectionProps) {
  const { t } = useTranslation();
  const pharmaciesQuery = usePortalPharmacies();
  const updatePharmacy = useUpdatePreferredPharmacy();
  const showPharmaciesLoading = useMinimumLoading(pharmaciesQuery.isLoading);

  const pharmacies = useMemo(
    () => pharmaciesQuery.data ?? [],
    [pharmaciesQuery.data]
  );

  const currentMatch = useMemo(
    () => matchByName(pharmacies, preferredPharmacyName),
    [pharmacies, preferredPharmacyName]
  );

  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">(
    currentMatch?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-sync local selection if profile changes underneath us (e.g. after save).
  useEffect(() => {
    setSelectedId(currentMatch?.id ?? "");
  }, [currentMatch?.id]);

  // Clear the "Saved" pill after a moment so it doesn't linger.
  useEffect(() => {
    if (!saved) return;
    const handle = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(handle);
  }, [saved]);

  const startEditing = () => {
    setSelectedId(currentMatch?.id ?? "");
    setError(null);
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    try {
      const pharmacyId = selectedId === "" ? null : Number(selectedId);
      await updatePharmacy.mutateAsync({ pharmacy_id: pharmacyId });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClear = async () => {
    setError(null);
    try {
      await updatePharmacy.mutateAsync({ pharmacy_id: null });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const hasPreferred = Boolean(preferredPharmacyName.trim());
  const isPending = updatePharmacy.isPending;

  return (
    <Card padded>
      <div className="space-y-4">
        <SectionHeader
          title={t("profile.preferredPharmacyHeading")}
          actions={
            saved ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 size={12} aria-hidden="true" />
                {t("profile.preferredPharmacySaved")}
              </span>
            ) : null
          }
        />

        {!editing ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-soft text-text-muted">
                <Building2 size={16} aria-hidden="true" />
              </div>
              {hasPreferred ? (
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">
                    {preferredPharmacyName}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t("profile.preferredPharmacyDefaultHelp")}
                  </p>
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">
                    {t("profile.preferredPharmacyEmpty")}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t("profile.preferredPharmacyEmptyHelp")}
                  </p>
                </div>
              )}
            </div>

            <Button variant="secondary" size="sm" onClick={startEditing}>
              {hasPreferred
                ? t("profile.preferredPharmacyChange")
                : t("profile.preferredPharmacyChoose")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {showPharmaciesLoading ? (
              <p className="text-sm text-text-muted">
                {t("profile.preferredPharmacyLoading")}
              </p>
            ) : pharmaciesQuery.isLoading ? null : pharmaciesQuery.isError ? (
              <p className="text-sm text-danger">
                {getErrorMessage(pharmaciesQuery.error)}
              </p>
            ) : pharmacies.length === 0 ? (
              <p className="text-sm text-text-muted">
                {t("profile.preferredPharmacyEmptyFacility")}
              </p>
            ) : (
              <Field label={t("profile.preferredPharmacyHeading")}>
                <Select
                  value={selectedId}
                  onChange={(event) =>
                    setSelectedId(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                    )
                  }
                >
                  <option value="">{t("profile.preferredPharmacyNone")}</option>
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                      {pharmacy.city ? `, ${pharmacy.city}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {hasPreferred ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={isPending}
                  >
                    {t("profile.preferredPharmacyClear")}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={isPending}
                  disabled={isPending || pharmacies.length === 0}
                >
                  {isPending ? t("profile.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
