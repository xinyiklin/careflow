import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import ConfirmDialog from "../../../shared/components/ConfirmDialog";

import { Badge, Button, ModalShell } from "../../../shared/components/ui";
import {
  ProgressNoteSoapWorkspace,
  ProgressNoteVisitPanel,
} from "./ProgressNoteModalSections";
import ProgressNoteReviewRail from "./ProgressNoteReviewRail";
import {
  areProgressNoteValuesEqual,
  getCompletedSoapCount,
  getInitialProgressNoteValues,
  getProviderLabel,
  hasProgressNoteContent,
  noteContentRequiredMessage,
} from "./progressNoteModalUtils";

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

type ProgressNoteModalProps = {
  isOpen: boolean;
  encounter?: ClinicalEncounter | null;
  appointment?: AppointmentLike | null;
  patientName: string;
  providers: PatientCareProvider[];
  canEdit: boolean;
  canSign: boolean;
  canUnsign?: boolean;
  saving?: boolean;
  signing?: boolean;
  unsigning?: boolean;
  error?: string;
  onClose: () => void;
  onSaveDraft: (values: ProgressNoteFormValues) => void | Promise<void>;
  onSign: (values: ProgressNoteFormValues) => void | Promise<void>;
  onUnsign?: () => void | Promise<void>;
};

const emptyValues: ProgressNoteFormValues = {
  reason: "",
  rendering_provider: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

function buildFieldIds(prefix: string): ProgressNoteFieldIds {
  return {
    reason: `${prefix}-reason`,
    provider: `${prefix}-provider`,
    subjective: `${prefix}-subjective`,
    objective: `${prefix}-objective`,
    assessment: `${prefix}-assessment`,
    plan: `${prefix}-plan`,
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
  canUnsign = false,
  saving = false,
  signing = false,
  unsigning = false,
  error = "",
  onClose,
  onSaveDraft,
  onSign,
  onUnsign,
}: ProgressNoteModalProps) {
  const [values, setValues] = useState<ProgressNoteFormValues>(emptyValues);
  const [initialValues, setInitialValues] =
    useState<ProgressNoteFormValues>(emptyValues);
  const [activeField, setActiveField] = useState<SoapFieldKey>("subjective");
  const [contentError, setContentError] = useState("");
  const contentRequirementId = useId();
  const contentErrorId = useId();
  const fieldIdPrefix = useId();
  const fieldIds = useMemo(() => buildFieldIds(fieldIdPrefix), [fieldIdPrefix]);
  const isSigned =
    encounter?.status === "signed" ||
    encounter?.progress_note?.status === "signed";
  const isExisting = Boolean(encounter?.id);
  const isBusy = saving || signing || unsigning;
  const [confirmUnsign, setConfirmUnsign] = useState(false);
  const canEditDraft = canEdit && !isSigned && !isBusy;
  const canSignDraft = canSign && !isSigned && !isBusy;
  const hasNoteContent = hasProgressNoteContent(values);
  const completedSoapCount = getCompletedSoapCount(values);
  const isDirty = !areProgressNoteValuesEqual(values, initialValues);
  const canSaveDraft = canEditDraft && hasNoteContent && isDirty;
  const canSubmitSign = canSignDraft && hasNoteContent;
  const textFieldsReadOnly = isSigned;
  const textFieldsDisabled = !isSigned && !canEditDraft;
  const noteFieldsDescription =
    [
      !isSigned && !hasNoteContent ? contentRequirementId : "",
      contentError ? contentErrorId : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const selectedProvider = useMemo(
    () =>
      providers.find(
        (provider) => String(provider.id) === String(values.rendering_provider)
      ),
    [providers, values.rendering_provider]
  );

  useEffect(() => {
    if (!isOpen) return;
    const nextValues = getInitialProgressNoteValues(encounter, appointment);
    setValues(nextValues);
    setInitialValues(nextValues);
    setActiveField("subjective");
    setContentError("");
  }, [appointment, encounter, isOpen]);

  useEffect(() => {
    if (hasNoteContent && contentError) setContentError("");
  }, [contentError, hasNoteContent]);

  const setField = <TField extends keyof ProgressNoteFormValues>(
    field: TField,
    value: ProgressNoteFormValues[TField]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const validateNoteContent = () => {
    if (hasNoteContent) return true;
    setContentError(noteContentRequiredMessage);
    return false;
  };

  const handleResetChanges = () => {
    setValues(initialValues);
    setActiveField("subjective");
    setContentError("");
  };

  const handleSaveDraft = () => {
    if (!canEditDraft || !isDirty || !validateNoteContent()) return;
    void onSaveDraft(values);
  };

  const handleSign = () => {
    if (!canSignDraft || !validateNoteContent()) return;
    void onSign(values);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Clinical Charting"
      title={isSigned ? "Signed Progress Note" : "Progress Note"}
      maxWidth="4xl"
      panelClassName="max-h-[min(96dvh,860px)] max-w-7xl"
      bodyClassName="p-0"
      footerClassName="bg-cf-surface !py-3"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-cf-text-muted">
            <Badge
              variant={isSigned ? "success" : isDirty ? "outline" : "muted"}
            >
              {isSigned
                ? "Signed"
                : isDirty
                  ? "Unsaved Changes"
                  : isExisting
                    ? "Draft Saved"
                    : "New Note"}
            </Badge>
            <span className="truncate">
              {completedSoapCount}/4 SOAP sections filled
            </span>
            {selectedProvider ? (
              <span className="truncate">
                {getProviderLabel(selectedProvider)}
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
            {isSigned ? (
              canUnsign && onUnsign ? (
                <Button
                  type="button"
                  variant="warning"
                  disabled={isBusy}
                  onClick={() => setConfirmUnsign(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {unsigning ? "Unsigning..." : "Unsign"}
                </Button>
              ) : null
            ) : (
              <>
                <Button
                  type="submit"
                  form="progress-note-form"
                  variant="default"
                  disabled={!canSaveDraft}
                  aria-describedby={
                    !hasNoteContent ? contentRequirementId : undefined
                  }
                >
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canSubmitSign}
                  aria-describedby={
                    !hasNoteContent ? contentRequirementId : undefined
                  }
                  onClick={handleSign}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {signing ? "Signing..." : "Sign Note"}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <form
        id="progress-note-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSaveDraft();
        }}
        className="flex min-h-0 flex-col"
      >
        {error ? (
          <div
            className="border-b border-cf-border bg-cf-danger-bg px-5 py-3 text-sm text-cf-danger-text"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-0 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_280px]">
          <ProgressNoteVisitPanel
            values={values}
            fieldIds={fieldIds}
            providers={providers}
            selectedProvider={selectedProvider}
            patientName={patientName}
            appointment={appointment}
            encounter={encounter}
            canEditDraft={canEditDraft}
            textFieldsReadOnly={textFieldsReadOnly}
            textFieldsDisabled={textFieldsDisabled}
            isSigned={isSigned}
            setField={setField}
          />

          <ProgressNoteSoapWorkspace
            values={values}
            fieldIds={fieldIds}
            activeField={activeField}
            setActiveField={setActiveField}
            setField={setField}
            contentRequirementId={contentRequirementId}
            contentErrorId={contentErrorId}
            contentError={contentError}
            noteFieldsDescription={noteFieldsDescription}
            hasNoteContent={hasNoteContent}
            canEditDraft={canEditDraft}
            textFieldsReadOnly={textFieldsReadOnly}
            textFieldsDisabled={textFieldsDisabled}
            isSigned={isSigned}
          />

          <ProgressNoteReviewRail
            values={values}
            encounter={encounter}
            isSigned={isSigned}
            isDirty={isDirty}
            canEditDraft={canEditDraft}
            hasNoteContent={hasNoteContent}
            completedSoapCount={completedSoapCount}
            selectedProvider={selectedProvider}
            onReset={handleResetChanges}
          />
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirmUnsign}
        title="Unsign Progress Note"
        message="This will revert the note to draft status. The note content will be preserved but it will need to be re-signed. This action is audited."
        confirmText="Unsign Note"
        variant="warning"
        onCancel={() => setConfirmUnsign(false)}
        onConfirm={() => {
          setConfirmUnsign(false);
          void onUnsign?.();
        }}
      />
    </ModalShell>
  );
}
