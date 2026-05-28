import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { Button, Field, Modal, Select, Textarea } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useProfile } from "../../profile/api/profile";
import { usePortalPharmacies, type PortalPharmacy } from "../api/pharmacies";
import { useRequestRefill } from "../api/refills";
import type { PortalMedication } from "../api/medications";

type RefillRequestModalProps = {
  medication: PortalMedication;
  onClose: () => void;
};

const NOTE_MAX = 500;

function matchPreferredPharmacy(
  pharmacies: PortalPharmacy[],
  preferredName: string
): PortalPharmacy | null {
  if (!preferredName) return null;
  const target = preferredName.trim().toLowerCase();
  return (
    pharmacies.find((pharmacy) => pharmacy.name.toLowerCase() === target) ??
    null
  );
}

export function RefillRequestModal({
  medication,
  onClose,
}: RefillRequestModalProps) {
  const { t } = useTranslation();
  const pharmaciesQuery = usePortalPharmacies();
  const profileQuery = useProfile();
  const requestRefill = useRequestRefill();

  const pharmacies = useMemo(
    () => pharmaciesQuery.data ?? [],
    [pharmaciesQuery.data]
  );
  const preferredName = profileQuery.data?.preferred_pharmacy_name ?? "";

  const defaultPharmacyId = useMemo(() => {
    const preferred = matchPreferredPharmacy(pharmacies, preferredName);
    if (preferred) return preferred.id;
    return pharmacies[0]?.id ?? null;
  }, [pharmacies, preferredName]);

  const [pharmacyId, setPharmacyId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Seed selection once pharmacies + profile finish loading.
  useEffect(() => {
    if (pharmacyId === null && defaultPharmacyId !== null) {
      setPharmacyId(defaultPharmacyId);
    }
  }, [defaultPharmacyId, pharmacyId]);

  const loading = pharmaciesQuery.isLoading || profileQuery.isLoading;
  const showLoading = useMinimumLoading(loading);
  const isPending = requestRefill.isPending;
  const hasPharmacies = pharmacies.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await requestRefill.mutateAsync({
        medication_id: medication.id,
        patient_note: note.trim() || undefined,
        pharmacy_id: pharmacyId,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  const titleKey = success
    ? "medications.refillSuccessTitle"
    : "medications.refillModalTitle";

  const subtitle = [medication.medication_name, medication.dose ?? ""]
    .filter(Boolean)
    .join(" · ");

  if (success) {
    return (
      <Modal
        open
        onClose={onClose}
        title={t(titleKey)}
        description={subtitle}
        size="sm"
        footer={
          <Button variant="primary" size="md" onClick={onClose}>
            {t("common.done")}
          </Button>
        }
      >
        <div className="flex items-start gap-3 rounded-md bg-success-soft px-3 py-3 text-sm text-success">
          <CheckCircle2
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span>{t("medications.refillSuccessBody")}</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!isPending) onClose();
      }}
      title={t(titleKey)}
      description={subtitle}
      size="md"
      disableBackdropClose={isPending}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="refill-form"
            isLoading={isPending}
            disabled={loading || !hasPharmacies}
          >
            {t("medications.submitRefill")}
          </Button>
        </>
      }
    >
      <form id="refill-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("medications.refillPharmacyLabel")}>
          {showLoading ? (
            <p className="text-sm text-text-muted">
              {t("profile.preferredPharmacyLoading")}
            </p>
          ) : loading ? null : !hasPharmacies ? (
            <p className="text-sm text-text-muted">
              {t("medications.refillNoPharmacies")}
            </p>
          ) : (
            <Select
              value={pharmacyId ?? ""}
              onChange={(event) =>
                setPharmacyId(
                  event.target.value === "" ? null : Number(event.target.value)
                )
              }
            >
              {pharmacies.map((pharmacy) => (
                <option key={pharmacy.id} value={pharmacy.id}>
                  {pharmacy.name}
                  {pharmacy.city ? ` · ${pharmacy.city}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label={t("medications.noteLabel")}
          helperText={`${note.length} / ${NOTE_MAX}`}
        >
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
            rows={3}
            maxLength={NOTE_MAX}
            placeholder={t("medications.notePlaceholder")}
          />
        </Field>

        {submitError ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
