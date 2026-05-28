import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, PageHeader, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useAuth } from "../../auth/AuthProvider";
import {
  useBookSlot,
  type PortalSchedulingAppointmentType,
  type PortalSchedulingProvider,
  type PortalSchedulingSlot,
} from "../api/schedule";
import { ConfirmStep } from "../components/ConfirmStep";
import { ProviderStep } from "../components/ProviderStep";
import { SlotStep } from "../components/SlotStep";
import { VisitTypeStep } from "../components/VisitTypeStep";

type StepId = "provider" | "type" | "slot" | "confirm";

const STEP_ORDER: StepId[] = ["provider", "type", "slot", "confirm"];

export function SchedulePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { patient } = useAuth();
  const facilityTimezone = patient?.facility_timezone ?? "";

  const [stepId, setStepId] = useState<StepId>("provider");
  const [provider, setProvider] = useState<PortalSchedulingProvider | null>(
    null
  );
  const [appointmentType, setAppointmentType] =
    useState<PortalSchedulingAppointmentType | null>(null);
  const [slot, setSlot] = useState<PortalSchedulingSlot | null>(null);
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const booking = useBookSlot();

  const stepIndex = STEP_ORDER.indexOf(stepId);

  const canContinue = useMemo(() => {
    if (stepId === "provider") return Boolean(provider);
    if (stepId === "type") return Boolean(appointmentType);
    if (stepId === "slot") return Boolean(slot);
    return true;
  }, [stepId, provider, appointmentType, slot]);

  const handleBack = () => {
    if (stepIndex === 0) {
      navigate("/appointments");
      return;
    }
    setSubmitError(null);
    setStepId(STEP_ORDER[stepIndex - 1]);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    setSubmitError(null);
    setStepId(STEP_ORDER[stepIndex + 1]);
  };

  const handleSelectProvider = (next: PortalSchedulingProvider) => {
    if (provider?.id !== next.id) {
      setAppointmentType(null);
      setSlot(null);
    }
    setProvider(next);
  };

  const handleSelectType = (next: PortalSchedulingAppointmentType) => {
    if (appointmentType?.id !== next.id) {
      setSlot(null);
    }
    setAppointmentType(next);
  };

  const handleSelectSlot = (next: PortalSchedulingSlot) => {
    setSlot(next);
  };

  const handleConfirm = async () => {
    if (!slot) return;
    setSubmitError(null);
    try {
      const result = await booking.mutateAsync({
        slot_id: slot.id,
        reason: reason.trim() || undefined,
      });
      if (!result) {
        setSubmitError(t("schedule.bookingFailed"));
        return;
      }
      navigate("/appointments");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  const stepHeading: Record<StepId, string> = {
    provider: t("schedule.stepProvider"),
    type: t("schedule.stepType"),
    slot: t("schedule.stepSlot"),
    confirm: t("schedule.stepConfirm"),
  };

  return (
    <div>
      <PageHeader title={t("schedule.pageTitle")} />

      <ProgressStrip currentIndex={stepIndex} />

      <Card className="mt-6">
        <h2 className="text-base font-semibold tracking-tight text-text">
          {stepHeading[stepId]}
        </h2>
        <div className="mt-4">
          {stepId === "provider" && (
            <ProviderStep selected={provider} onSelect={handleSelectProvider} />
          )}
          {stepId === "type" && provider && (
            <VisitTypeStep
              providerId={provider.id}
              selected={appointmentType}
              onSelect={handleSelectType}
            />
          )}
          {stepId === "slot" && provider && appointmentType && (
            <SlotStep
              providerId={provider.id}
              typeId={appointmentType.id}
              timeZone={facilityTimezone}
              selected={slot}
              onSelect={handleSelectSlot}
            />
          )}
          {stepId === "confirm" && provider && appointmentType && slot && (
            <ConfirmStep
              provider={provider}
              appointmentType={appointmentType}
              slot={slot}
              timeZone={facilityTimezone}
              reason={reason}
              onReasonChange={setReason}
              submitError={submitError}
            />
          )}
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={booking.isPending}
        >
          {stepIndex === 0
            ? t("schedule.backToAppointments")
            : t("schedule.backLabel")}
        </Button>
        {stepId === "confirm" ? (
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={booking.isPending}
          >
            {t("schedule.confirmBook")}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            {t("schedule.continueLabel")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressStrip({ currentIndex }: { currentIndex: number }) {
  const { t } = useTranslation();
  const steps: { id: StepId; label: string }[] = [
    { id: "provider", label: t("schedule.stepProviderShort") },
    { id: "type", label: t("schedule.stepTypeShort") },
    { id: "slot", label: t("schedule.stepSlotShort") },
    { id: "confirm", label: t("schedule.stepConfirmShort") },
  ];

  return (
    <ol
      aria-label={t("schedule.progressAriaLabel")}
      className="flex items-center gap-2 sm:gap-3"
    >
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                isActive && "border-accent bg-accent-soft text-accent",
                isComplete && "border-accent bg-accent text-accent-contrast",
                !isActive &&
                  !isComplete &&
                  "border-border bg-surface text-text-subtle"
              )}
            >
              {isComplete ? <Check size={13} /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs sm:inline",
                isActive ? "text-text font-medium" : "text-text-muted"
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1",
                  isComplete ? "bg-accent" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
