import { Check, Copy } from "lucide-react";

import PatientSearchField from "../../patients/components/PatientSearchField";
import { formatDOB } from "../../../shared/utils/dateTime";
import { useCopyToClipboard } from "../../../shared/hooks/useCopyToClipboard";
import type { ComponentType, ReactNode } from "react";
import type { FieldErrors } from "react-hook-form";
import type { EntityId } from "../../../shared/api/types";
import type { NormalizedPhoneEntry } from "../../patients/utils/contactValidation";
import type {
  AppointmentFormValues,
  AppointmentMode,
  AppointmentPatient,
  PatientInsurancePolicy,
} from "../types";

type PatientSearchFieldProps = {
  facilityId?: EntityId | null;
  selectedPatient?: AppointmentPatient | null;
  onSelectPatient?: (patient: AppointmentPatient | null) => void;
  onOpenDetailedSearch?: () => void;
  onOpenCreatePatient?: () => void;
  recentPatients?: AppointmentPatient[];
};

type AppointmentPatientLensProps = {
  selectedPatient?: AppointmentPatient | null;
  onOpenPatientHub?: (patient: AppointmentPatient) => void;
  patientDisplayName: string;
  patientSnapshot: AppointmentPatient;
  mode: AppointmentMode;
  facilityId?: EntityId | null;
  onSelectPatient?: (patient: AppointmentPatient | null) => void;
  onOpenDetailedSearch?: () => void;
  onOpenCreatePatient?: () => void;
  recentPatients: AppointmentPatient[];
  errors: FieldErrors<AppointmentFormValues>;
  patientPhones: NormalizedPhoneEntry[];
  patientAddress: string;
  primaryInsurancePolicy?: PatientInsurancePolicy | null;
};

const TypedPatientSearchField =
  PatientSearchField as ComponentType<PatientSearchFieldProps>;

function ZoneLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {children}
      </span>
      {action}
    </div>
  );
}

function CopyIndicator({
  copied,
  className = "self-center",
}: {
  copied: boolean;
  className?: string;
}) {
  const base = `h-3 w-3 shrink-0 ${className}`;
  return copied ? (
    <Check className={`${base} text-cf-success-text`} />
  ) : (
    <Copy
      className={`${base} opacity-0 transition-opacity group-hover/row:opacity-50 group-focus-within/row:opacity-50`}
    />
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  copyable = false,
  copyValue,
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  copyable?: boolean;
  copyValue?: string;
}) {
  const { copied, copy } = useCopyToClipboard();
  const text = copyValue ?? (typeof value === "string" ? value : undefined);
  const canCopy = copyable && Boolean(text);
  const valueClassName = ["min-w-0 truncate", mono ? "font-mono" : ""].join(
    " "
  );

  return (
    <div className="group/row flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] text-cf-text-subtle">{label}</span>
      {canCopy ? (
        <button
          type="button"
          onClick={() => copy(text)}
          title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
          className="inline-flex min-w-0 cursor-pointer items-baseline justify-end gap-1.5 text-right text-xs font-medium text-cf-text transition-colors hover:text-cf-accent"
        >
          <span className={valueClassName}>{value}</span>
          <CopyIndicator copied={copied} />
        </button>
      ) : (
        <span
          className={`text-right text-xs font-medium text-cf-text ${valueClassName}`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function CopyableAddress({ address }: { address: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="py-1.5">
      <span className="text-[11px] text-cf-text-subtle">Address</span>
      {address ? (
        <button
          type="button"
          onClick={() => copy(address)}
          title={copied ? "Copied" : "Copy address"}
          className="group/row mt-1 flex w-full cursor-pointer items-start gap-1.5 text-left text-xs font-medium leading-snug text-cf-text transition-colors hover:text-cf-accent"
        >
          <span className="min-w-0 flex-1">{address}</span>
          <CopyIndicator copied={copied} className="mt-0.5" />
        </button>
      ) : (
        <div className="mt-1 text-xs font-medium leading-snug text-cf-text">
          —
        </div>
      )}
    </div>
  );
}

function CopyableInline({
  value,
  label,
  mono = false,
}: {
  value: string;
  label: string;
  mono?: boolean;
}) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => copy(value)}
      title={copied ? "Copied" : `Copy ${label}`}
      className={[
        "group/row inline-flex cursor-pointer items-center gap-1 text-cf-text transition-colors hover:text-cf-accent",
        mono ? "font-mono" : "",
      ].join(" ")}
    >
      <span>{value}</span>
      <CopyIndicator copied={copied} />
    </button>
  );
}

function CopyableHeading({ value }: { value: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => copy(value)}
      title={copied ? "Copied" : "Copy name"}
      className="group/row flex w-full cursor-pointer items-center gap-1.5 text-left text-sm font-semibold text-cf-text transition-colors hover:text-cf-accent"
    >
      <span className="min-w-0 truncate">{value}</span>
      <CopyIndicator copied={copied} />
    </button>
  );
}

export default function AppointmentPatientLens({
  selectedPatient,
  onOpenPatientHub,
  patientDisplayName,
  patientSnapshot,
  mode,
  facilityId,
  onSelectPatient,
  onOpenDetailedSearch,
  onOpenCreatePatient,
  recentPatients,
  errors,
  patientPhones,
  patientAddress,
  primaryInsurancePolicy,
}: AppointmentPatientLensProps) {
  const dobValue = patientSnapshot.date_of_birth
    ? formatDOB(patientSnapshot.date_of_birth)
    : "";
  const mrnValue = patientSnapshot.chart_number
    ? String(patientSnapshot.chart_number)
    : "";
  const hasPatient = Boolean(
    selectedPatient || patientSnapshot?.id || dobValue || mrnValue
  );

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-cf-border bg-cf-page-bg px-4 py-5 lg:order-2 lg:border-b-0 lg:border-l">
      <ZoneLabel
        action={
          selectedPatient ? (
            <button
              type="button"
              onClick={() => onOpenPatientHub?.(selectedPatient)}
              className="cursor-pointer text-xs font-semibold text-cf-text hover:underline"
            >
              Open hub →
            </button>
          ) : null
        }
      >
        Patient lens
      </ZoneLabel>

      <div className="mt-4">
        {patientDisplayName ? (
          <CopyableHeading value={patientDisplayName} />
        ) : (
          <div className="truncate text-sm font-semibold text-cf-text">
            No patient selected
          </div>
        )}
        {dobValue || mrnValue ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-cf-text-muted">
            {dobValue ? (
              <span className="inline-flex items-baseline gap-1">
                DOB <CopyableInline value={dobValue} label="DOB" />
              </span>
            ) : null}
            {mrnValue ? (
              <span className="inline-flex items-baseline gap-1">
                {dobValue ? (
                  <span className="text-cf-border-strong">·</span>
                ) : null}
                MRN <CopyableInline value={mrnValue} label="MRN" mono />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode !== "edit" ? (
        <div className="mt-4">
          <TypedPatientSearchField
            facilityId={facilityId}
            selectedPatient={selectedPatient}
            onSelectPatient={onSelectPatient}
            onOpenDetailedSearch={onOpenDetailedSearch}
            onOpenCreatePatient={onOpenCreatePatient}
            recentPatients={recentPatients}
          />
        </div>
      ) : null}

      {errors.patient ? (
        <p className="mt-3 text-xs text-cf-danger-text">
          {errors.patient.message}
        </p>
      ) : null}

      {hasPatient ? (
        <div className="mt-6 space-y-6">
          <section>
            <ZoneLabel>Contact</ZoneLabel>
            <div className="mt-3">
              {patientPhones.length ? (
                patientPhones.map((phone) => (
                  <DetailRow
                    key={`${phone.label}-${phone.number}`}
                    label={`${phone.labelTitle} phone`}
                    value={phone.formattedNumber}
                    copyValue={phone.formattedNumber}
                    mono
                    copyable
                  />
                ))
              ) : (
                <DetailRow label="Phone" />
              )}
              <CopyableAddress address={patientAddress} />
            </div>
          </section>

          <section>
            <ZoneLabel
              action={
                primaryInsurancePolicy ? (
                  <span className="rounded-full bg-cf-accent-soft px-2 py-0.5 text-[10px] font-semibold text-cf-text">
                    Active
                  </span>
                ) : null
              }
            >
              Primary insurance
            </ZoneLabel>
            <div className="mt-3">
              <DetailRow
                label="Carrier"
                value={primaryInsurancePolicy?.carrier_name}
              />
              <DetailRow
                label="Plan"
                value={primaryInsurancePolicy?.plan_name}
              />
              <DetailRow
                label="Member ID"
                value={primaryInsurancePolicy?.member_id}
                mono
                copyable
              />
              <DetailRow
                label="Group"
                value={primaryInsurancePolicy?.group_number}
                mono
                copyable
              />
            </div>
          </section>

          <section>
            <ZoneLabel>Care team</ZoneLabel>
            <div className="mt-3">
              <DetailRow
                label="PCP"
                value={patientSnapshot.pcp_name}
                copyable
              />
              <DetailRow
                label="Referring"
                value={patientSnapshot.referring_provider_name}
                copyable
              />
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
