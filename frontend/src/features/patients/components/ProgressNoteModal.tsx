import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Stethoscope,
} from "lucide-react";

import { FormLabel as Label } from "./PatientFormFields";
import {
  Badge,
  Button,
  Input,
  ModalShell,
} from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";

import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  ClinicalEncounter,
  PatientCareProvider,
  ProgressNoteFormValues,
} from "../types";

type ProgressNoteModalProps = {
  isOpen: boolean;
  encounter?: ClinicalEncounter | null;
  appointment?: AppointmentLike | null;
  patientName: string;
  providers: PatientCareProvider[];
  canEdit: boolean;
  canSign: boolean;
  saving?: boolean;
  signing?: boolean;
  error?: string;
  onClose: () => void;
  onSaveDraft: (values: ProgressNoteFormValues) => void | Promise<void>;
  onSign: (values: ProgressNoteFormValues) => void | Promise<void>;
};

const emptyValues: ProgressNoteFormValues = {
  reason: "",
  rendering_provider: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

function getProviderLabel(provider: PatientCareProvider) {
  const userName = [provider.user?.first_name, provider.user?.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    provider.display_name ||
    [provider.title_name, userName].filter(Boolean).join(" ") ||
    [provider.first_name, provider.last_name].filter(Boolean).join(" ") ||
    "Provider"
  );
}

function getInitialValues(
  encounter?: ClinicalEncounter | null,
  appointment?: AppointmentLike | null
): ProgressNoteFormValues {
  const note = encounter?.progress_note;

  return {
    reason: encounter?.reason || appointment?.reason || "",
    rendering_provider:
      encounter?.rendering_provider || appointment?.rendering_provider || "",
    subjective: note?.subjective || "",
    objective: note?.objective || "",
    assessment: note?.assessment || "",
    plan: note?.plan || "",
  };
}

export default function ProgressNoteModal({
  isOpen,
  encounter = null,
  appointment = null,
  patientName,
  providers,
  canEdit,
  canSign,
  saving = false,
  signing = false,
  error = "",
  onClose,
  onSaveDraft,
  onSign,
}: ProgressNoteModalProps) {
  const [values, setValues] = useState<ProgressNoteFormValues>(emptyValues);
  const isSigned =
    encounter?.status === "signed" ||
    encounter?.progress_note?.status === "signed";
  const isExisting = Boolean(encounter?.id);
  const isBusy = saving || signing;
  const canEditDraft = canEdit && !isSigned && !isBusy;
  const canSignDraft = canSign && !isSigned && !isBusy;
  const hasNoteContent = [
    values.subjective,
    values.objective,
    values.assessment,
    values.plan,
  ].some((value) => value.trim());
  const selectedProvider = useMemo(
    () =>
      providers.find(
        (provider) => String(provider.id) === String(values.rendering_provider)
      ),
    [providers, values.rendering_provider]
  );

  useEffect(() => {
    if (!isOpen) return;
    setValues(getInitialValues(encounter, appointment));
  }, [appointment, encounter, isOpen]);

  const setField = <TField extends keyof ProgressNoteFormValues>(
    field: TField,
    value: ProgressNoteFormValues[TField]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Clinical Charting"
      title={isSigned ? "Signed Progress Note" : "Progress Note"}
      maxWidth="4xl"
      panelClassName="max-h-[min(94dvh,760px)] max-w-5xl"
      bodyClassName="overflow-hidden p-0"
      footerClassName="bg-cf-surface !py-3"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-cf-text-muted">
            <Badge variant={isSigned ? "success" : "outline"}>
              {isSigned ? "Signed" : isExisting ? "Draft" : "New"}
            </Badge>
            {encounter?.progress_note?.signed_at ? (
              <span className="truncate">
                Signed {formatDateTime(encounter.progress_note.signed_at)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={isBusy}
            >
              Close
            </Button>
            {!isSigned ? (
              <>
                <Button
                  type="submit"
                  form="progress-note-form"
                  variant="default"
                  disabled={!canEditDraft}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canSignDraft || !hasNoteContent}
                  onClick={() => void onSign(values)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {signing ? "Signing..." : "Sign Note"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      }
    >
      <form
        id="progress-note-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSaveDraft(values);
        }}
        className="flex min-h-0 flex-col"
      >
        <div className="shrink-0 border-b border-cf-border bg-cf-surface-muted/50 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-cf-text">
              <ClipboardList className="h-4 w-4 text-cf-text-subtle" />
              <span className="truncate">{patientName}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-cf-text-muted">
              <Stethoscope className="h-3.5 w-3.5" />
              {selectedProvider
                ? getProviderLabel(selectedProvider)
                : "Provider not set"}
            </span>
            {appointment?.appointment_time || encounter?.appointment_time ? (
              <span className="inline-flex items-center gap-1 text-cf-text-muted">
                <FileText className="h-3.5 w-3.5" />
                {formatDateTime(
                  encounter?.appointment_time || appointment?.appointment_time
                )}
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="border-b border-cf-border bg-cf-danger-bg px-5 py-3 text-sm text-cf-danger-text">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-cf-border bg-cf-surface px-5 py-4 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <div>
                <Label compact>Visit Reason</Label>
                <Input
                  as="textarea"
                  rows={4}
                  value={values.reason}
                  disabled={!canEditDraft}
                  onChange={(event) => setField("reason", event.target.value)}
                />
              </div>
              <div>
                <Label compact>Rendering Provider</Label>
                <Input
                  as="select"
                  value={String(values.rendering_provider || "")}
                  disabled={!canEditDraft}
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

          <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
            <div>
              <Label compact>Subjective</Label>
              <Input
                as="textarea"
                rows={7}
                value={values.subjective}
                disabled={!canEditDraft}
                onChange={(event) => setField("subjective", event.target.value)}
              />
            </div>
            <div>
              <Label compact>Objective</Label>
              <Input
                as="textarea"
                rows={7}
                value={values.objective}
                disabled={!canEditDraft}
                onChange={(event) => setField("objective", event.target.value)}
              />
            </div>
            <div>
              <Label compact>Assessment</Label>
              <Input
                as="textarea"
                rows={7}
                value={values.assessment}
                disabled={!canEditDraft}
                onChange={(event) => setField("assessment", event.target.value)}
              />
            </div>
            <div>
              <Label compact>Plan</Label>
              <Input
                as="textarea"
                rows={7}
                value={values.plan}
                disabled={!canEditDraft}
                onChange={(event) => setField("plan", event.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
