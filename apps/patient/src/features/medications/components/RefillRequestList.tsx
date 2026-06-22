import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, Modal, type BadgeTone } from "../../../shared/ui";
import { formatDateOnly } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useCancelRefill,
  useRefillRequests,
  type PortalRefillRequest,
  type PortalRefillStatus,
} from "../api/refills";

const STATUS_TONE: Record<PortalRefillStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  denied: "danger",
  cancelled: "neutral",
};

function RefillRow({ refill }: { refill: PortalRefillRequest }) {
  const { t } = useTranslation();
  const cancel = useCancelRefill();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setError(null);
    try {
      await cancel.mutateAsync(refill.id);
      setConfirmOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const pharmacy =
    refill.pharmacy_name?.trim() || t("medications.unknownPharmacy");
  const requested = formatDateOnly(refill.requested_at);

  return (
    <li className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text">
            {refill.medication_name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
            <span>{t("medications.requestedOn", { date: requested })}</span>
            <span aria-hidden="true">·</span>
            <span>{pharmacy}</span>
            {refill.days_supply ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {t("medications.daysSupplyOption", {
                    count: refill.days_supply,
                  })}
                </span>
              </>
            ) : null}
          </div>
          {refill.patient_note ? (
            <p className="mt-1.5 text-xs text-text-subtle">
              &ldquo;{refill.patient_note}&rdquo;
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={STATUS_TONE[refill.status]}>{refill.status_label}</Badge>
          {refill.status === "pending" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={cancel.isPending}
            >
              {t("medications.cancelRefill")}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!cancel.isPending) setConfirmOpen(false);
        }}
        title={t("medications.cancelRefillTitle")}
        description={t("medications.cancelRefillBody")}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setConfirmOpen(false)}
              disabled={cancel.isPending}
            >
              {t("medications.keepRequest")}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleCancel}
              isLoading={cancel.isPending}
            >
              {t("medications.confirmCancelRefill")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          <span className="font-medium text-text">
            {refill.medication_name}
          </span>
          <br />
          {t("medications.requestedOn", { date: requested })}
        </p>
      </Modal>
    </li>
  );
}

export function RefillRequestList() {
  const { t } = useTranslation();
  const { data, isError, error } = useRefillRequests();
  const refills = data ?? [];

  if (isError) {
    return (
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
          {t("medications.refillsRecent")}
        </h2>
        <Card tone="muted" className="mt-2">
          <p className="text-sm text-text-muted">{getErrorMessage(error)}</p>
        </Card>
      </section>
    );
  }

  if (refills.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
        {t("medications.refillsRecent")}
      </h2>
      <Card>
        <ul>
          {refills.map((refill) => (
            <RefillRow key={refill.id} refill={refill} />
          ))}
        </ul>
      </Card>
    </section>
  );
}
