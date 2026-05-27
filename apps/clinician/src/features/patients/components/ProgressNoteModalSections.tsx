import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LockKeyhole,
  Stethoscope,
} from "lucide-react";

import { FormLabel as Label } from "./PatientFormFields";
import { Button, Input } from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";
import {
  SOAP_FIELDS,
  getProviderLabel,
  noteContentRequiredMessage,
} from "./progressNoteModalUtils";

import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  ClinicalEncounter,
  ProgressNoteFormValues,
} from "../../billing/types";
import type { PatientCareProvider } from "../types";
import type {
  ProgressNoteFieldIds,
  SoapFieldKey,
} from "./progressNoteModalUtils";

function getNoteDate(
  encounter?: ClinicalEncounter | null,
  appointment?: AppointmentLike | null
) {
  return (
    encounter?.progress_note?.signed_at ||
    encounter?.progress_note?.updated_at ||
    encounter?.updated_at ||
    encounter?.started_at ||
    appointment?.appointment_time ||
    ""
  );
}

function FieldStatus({ isComplete }: { isComplete: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
        isComplete
          ? "bg-cf-success-bg text-cf-success-text"
          : "bg-cf-surface-muted text-cf-text-subtle",
      ].join(" ")}
    >
      {isComplete ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {isComplete ? "Filled" : "Missing"}
    </span>
  );
}

export function ProgressNoteVisitPanel({
  values,
  fieldIds,
  providers,
  selectedProvider,
  patientName,
  appointment,
  encounter,
  canEditDraft,
  textFieldsReadOnly,
  textFieldsDisabled,
  isSigned,
  setField,
}: {
  values: ProgressNoteFormValues;
  fieldIds: ProgressNoteFieldIds;
  providers: PatientCareProvider[];
  selectedProvider?: PatientCareProvider;
  patientName: string;
  appointment?: AppointmentLike | null;
  encounter?: ClinicalEncounter | null;
  canEditDraft: boolean;
  textFieldsReadOnly: boolean;
  textFieldsDisabled: boolean;
  isSigned: boolean;
  setField: <TField extends keyof ProgressNoteFormValues>(
    field: TField,
    value: ProgressNoteFormValues[TField]
  ) => void;
}) {
  const noteDate = getNoteDate(encounter, appointment);

  return (
    <aside className="border-b border-cf-border bg-cf-surface px-5 py-4 lg:border-b-0 lg:border-r">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
            Visit
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-cf-text-subtle" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-cf-text">
                  {patientName}
                </div>
                <div className="text-cf-text-muted">
                  {encounter?.appointment_type_name ||
                    appointment?.appointment_type_name ||
                    "Clinical visit"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-cf-text-muted">
              <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-cf-text-subtle" />
              <span className="min-w-0 truncate">
                {selectedProvider
                  ? getProviderLabel(selectedProvider)
                  : "Provider not set"}
              </span>
            </div>
            {noteDate ? (
              <div className="flex items-start gap-2 text-cf-text-muted">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cf-text-subtle" />
                <span>{formatDateTime(noteDate)}</span>
              </div>
            ) : null}
            {isSigned ? (
              <div className="flex items-start gap-2 text-cf-success-text">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Read-only signed note</span>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <Label compact htmlFor={fieldIds.reason}>
            Visit Reason
          </Label>
          <Input
            id={fieldIds.reason}
            as="textarea"
            rows={5}
            value={values.reason}
            readOnly={textFieldsReadOnly}
            disabled={textFieldsDisabled}
            aria-readonly={textFieldsReadOnly || undefined}
            onChange={(event) => setField("reason", event.target.value)}
          />
        </div>

        <div>
          <Label compact htmlFor={fieldIds.provider}>
            Rendering Provider
          </Label>
          <Input
            id={fieldIds.provider}
            as="select"
            value={String(values.rendering_provider || "")}
            disabled={!canEditDraft}
            className={isSigned ? "disabled:opacity-100" : ""}
            onChange={(event) =>
              setField(
                "rendering_provider",
                event.target.value as EntityId | ""
              )
            }
          >
            <option value="">Not set</option>
            {providers.map((provider) => (
              <option key={provider.id} value={String(provider.id)}>
                {getProviderLabel(provider)}
              </option>
            ))}
          </Input>
        </div>
      </div>
    </aside>
  );
}

export function ProgressNoteSoapWorkspace({
  values,
  fieldIds,
  activeField,
  setActiveField,
  setField,
  contentRequirementId,
  contentErrorId,
  contentError,
  noteFieldsDescription,
  hasNoteContent,
  canEditDraft,
  textFieldsReadOnly,
  textFieldsDisabled,
  isSigned,
}: {
  values: ProgressNoteFormValues;
  fieldIds: ProgressNoteFieldIds;
  activeField: SoapFieldKey;
  setActiveField: (field: SoapFieldKey) => void;
  setField: <TField extends keyof ProgressNoteFormValues>(
    field: TField,
    value: ProgressNoteFormValues[TField]
  ) => void;
  contentRequirementId: string;
  contentErrorId: string;
  contentError: string;
  noteFieldsDescription?: string;
  hasNoteContent: boolean;
  canEditDraft: boolean;
  textFieldsReadOnly: boolean;
  textFieldsDisabled: boolean;
  isSigned: boolean;
}) {
  const focusField = (field: SoapFieldKey) => {
    setActiveField(field);
    window.requestAnimationFrame(() => {
      document.getElementById(fieldIds[field])?.focus();
    });
  };

  return (
    <section className="min-h-0 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
          SOAP Note
        </div>
        {!isSigned && !hasNoteContent ? (
          <span
            id={contentRequirementId}
            className="text-xs font-semibold text-cf-warning-text"
          >
            {noteContentRequiredMessage}
          </span>
        ) : null}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {SOAP_FIELDS.map((field) => {
          const isActive = activeField === field.key;
          const isComplete = Boolean(values[field.key].trim());
          return (
            <button
              key={field.key}
              type="button"
              onClick={() => focusField(field.key)}
              className={[
                "rounded-xl border px-3 py-2 text-left text-xs transition",
                isActive
                  ? "border-cf-accent bg-cf-accent/10 text-cf-text"
                  : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:bg-cf-surface-muted/60",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{field.label}</span>
                <span
                  className={
                    isComplete ? "text-cf-success-text" : "text-cf-text-subtle"
                  }
                >
                  {isComplete ? "Done" : "Open"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {contentError ? (
        <p
          id={contentErrorId}
          className="mb-3 text-sm text-cf-danger-text"
          role="alert"
        >
          {contentError}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {SOAP_FIELDS.map((field) => {
          const value = values[field.key];
          const isComplete = Boolean(value.trim());
          return (
            <div
              key={field.key}
              className={[
                "min-w-0 border-t border-cf-border pt-3",
                activeField === field.key ? "bg-cf-surface-muted/30" : "",
              ].join(" ")}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label compact htmlFor={fieldIds[field.key]}>
                  {field.label}
                </Label>
                <div className="flex items-center gap-2">
                  <FieldStatus isComplete={isComplete} />
                  {!isSigned && canEditDraft && value ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() => setField(field.key, "")}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
              <Input
                id={fieldIds[field.key]}
                as="textarea"
                rows={7}
                value={value}
                placeholder={field.placeholder}
                readOnly={textFieldsReadOnly}
                disabled={textFieldsDisabled}
                aria-readonly={textFieldsReadOnly || undefined}
                aria-invalid={Boolean(contentError) || undefined}
                aria-describedby={noteFieldsDescription}
                onFocus={() => setActiveField(field.key)}
                onChange={(event) => setField(field.key, event.target.value)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
