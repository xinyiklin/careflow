import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, CheckCircle2 } from "lucide-react";

import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import {
  formatDateOnly,
  formatFacilityLocalDateTime,
} from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useBookSlot,
  useScheduleAppointmentTypes,
  useScheduleProviders,
  useScheduleSlots,
  type PortalSchedulingProvider,
  type PortalSchedulingAppointmentType,
  type PortalSchedulingSlot,
} from "../api/schedule";
import { useAuth } from "../../auth/AuthProvider";

type Step = "provider" | "type" | "slot" | "confirm";

export function SchedulePage() {
  const navigate = useNavigate();
  const { patient } = useAuth();
  const facilityTimezone = patient?.facility_timezone ?? "";

  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<PortalSchedulingProvider | null>(
    null
  );
  const [appointmentType, setAppointmentType] =
    useState<PortalSchedulingAppointmentType | null>(null);
  const [slot, setSlot] = useState<PortalSchedulingSlot | null>(null);
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const providers = useScheduleProviders();
  const types = useScheduleAppointmentTypes(provider?.id ?? null);
  const slots = useScheduleSlots(
    provider?.id ?? null,
    appointmentType?.id ?? null
  );
  const booking = useBookSlot();

  const reset = () => {
    setStep("provider");
    setProvider(null);
    setAppointmentType(null);
    setSlot(null);
    setReason("");
    setSubmitError(null);
  };

  const goBack = () => {
    if (step === "type") {
      setStep("provider");
      setProvider(null);
    } else if (step === "slot") {
      setStep("type");
      setAppointmentType(null);
    } else if (step === "confirm") {
      setStep("slot");
      setSlot(null);
    }
  };

  const handleBook = async () => {
    if (!slot) return;
    setSubmitError(null);
    try {
      const result = await booking.mutateAsync({
        slot_id: slot.id,
        reason: reason.trim() || undefined,
      });
      if (!result) {
        setSubmitError("Could not confirm booking.");
        return;
      }
      navigate("/appointments");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-5">
      <PageHeader title="Schedule an appointment" />

      <StepBreadcrumb step={step} provider={provider} type={appointmentType} />

      {step === "provider" && (
        <section>
          {providers.isError ? (
            <p className="py-2 text-sm text-cf-text-muted">
              {getErrorMessage(providers.error)}
            </p>
          ) : (providers.data ?? []).length === 0 ? (
            <EmptyState message="No providers are accepting online bookings right now. Please call the office to schedule." />
          ) : (
            <ul className="divide-y divide-cf-border rounded-cf-card border border-cf-border bg-cf-surface">
              {(providers.data ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setStep("type");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-cf-surface-soft"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-cf-text">
                        {p.display_name}
                      </div>
                      {p.specialty ? (
                        <div className="mt-0.5 text-xs text-cf-text-muted">
                          {p.specialty}
                        </div>
                      ) : null}
                    </div>
                    <ArrowRight size={14} className="text-cf-text-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "type" && provider && (
        <section className="space-y-3">
          <BackLink onClick={goBack} label={`Back to providers`} />
          {types.isError ? (
            <p className="py-2 text-sm text-cf-text-muted">
              {getErrorMessage(types.error)}
            </p>
          ) : (types.data ?? []).length === 0 ? (
            <EmptyState message="This provider isn't offering any appointment types online right now." />
          ) : (
            <ul className="divide-y divide-cf-border rounded-cf-card border border-cf-border bg-cf-surface">
              {(types.data ?? []).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAppointmentType(t);
                      setStep("slot");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-cf-surface-soft"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-cf-text">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-xs text-cf-text-muted">
                        {t.duration_minutes} min
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-cf-text-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "slot" && provider && appointmentType && (
        <section className="space-y-3">
          <BackLink
            onClick={goBack}
            label={`Back to ${provider.display_name}`}
          />
          {slots.isError ? (
            <p className="py-2 text-sm text-cf-text-muted">
              {getErrorMessage(slots.error)}
            </p>
          ) : (slots.data ?? []).length === 0 ? (
            <EmptyState message="No open slots for this appointment type. Try a different type or check back later." />
          ) : (
            <ul className="space-y-2">
              {(slots.data ?? []).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSlot(s);
                      setStep("confirm");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-cf-card border border-cf-border bg-cf-surface px-4 py-3 text-left transition hover:bg-cf-surface-soft"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-cf-text">
                        {formatFacilityLocalDateTime(
                          s.start_time,
                          facilityTimezone
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-cf-text-subtle">
                        {s.auto_confirms
                          ? "Confirmed instantly"
                          : "Pending staff review"}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-cf-text-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "confirm" && provider && appointmentType && slot && (
        <section className="space-y-4">
          <BackLink onClick={goBack} label="Pick a different time" />
          <div className="rounded-cf-card border border-cf-border bg-cf-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-cf-accent" />
              <span className="text-sm font-semibold text-cf-text">
                {formatFacilityLocalDateTime(slot.start_time, facilityTimezone)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <dt className="font-semibold uppercase tracking-[0.1em] text-cf-text-subtle">
                Provider
              </dt>
              <dd className="text-cf-text">{provider.display_name}</dd>
              <dt className="font-semibold uppercase tracking-[0.1em] text-cf-text-subtle">
                Visit type
              </dt>
              <dd className="text-cf-text">
                {appointmentType.name} · {appointmentType.duration_minutes} min
              </dd>
              <dt className="font-semibold uppercase tracking-[0.1em] text-cf-text-subtle">
                Confirmation
              </dt>
              <dd className="text-cf-text">
                {slot.auto_confirms ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-cf-accent" />
                    Confirmed instantly
                  </span>
                ) : (
                  "Pending staff review"
                )}
              </dd>
            </dl>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
              Reason for visit (optional)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Share anything your provider should know before the visit"
              className="w-full rounded-xl border border-cf-border-strong bg-cf-surface px-3 py-2 text-sm text-cf-text shadow-sm outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20"
            />
          </label>

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-cf-danger-bg bg-cf-danger-bg px-3 py-2 text-sm text-cf-danger-text"
            >
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reset}
              disabled={booking.isPending}
              className="inline-flex items-center justify-center rounded-xl border border-cf-border bg-cf-surface px-4 py-2.5 text-sm font-medium text-cf-text-muted shadow-[var(--shadow-panel)] transition hover:bg-cf-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={handleBook}
              disabled={booking.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cf-accent bg-cf-accent px-4 py-2.5 text-sm font-medium text-cf-page-bg shadow-[var(--shadow-panel)] transition hover:bg-cf-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {booking.isPending ? "Booking..." : "Confirm booking"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepBreadcrumb({
  step,
  provider,
}: {
  step: Step;
  provider: PortalSchedulingProvider | null;
  type: PortalSchedulingAppointmentType | null;
}) {
  const items: { label: string; active: boolean }[] = [
    { label: "Provider", active: step === "provider" },
    { label: "Visit type", active: step === "type" },
    { label: "Time", active: step === "slot" },
    { label: "Confirm", active: step === "confirm" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.1em]">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={
              item.active
                ? "text-cf-text"
                : index < items.findIndex((entry) => entry.active)
                  ? "text-cf-text-muted"
                  : "text-cf-text-subtle"
            }
          >
            {item.label}
          </span>
          {index < items.length - 1 ? (
            <span className="text-cf-text-subtle">›</span>
          ) : null}
        </span>
      ))}
      {provider ? (
        <span className="ml-auto text-[10px] font-normal normal-case text-cf-text-subtle">
          {formatDateOnly(new Date().toISOString())}
        </span>
      ) : null}
    </div>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-cf-text-muted hover:text-cf-text transition"
    >
      ‹ {label}
    </button>
  );
}
