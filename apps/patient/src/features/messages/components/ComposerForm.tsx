import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Field, Input, Modal, Textarea } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useStartThread,
  type PortalMessageThreadDetail,
} from "../api/messaging";

const SUBJECT_MAX = 150;
const BODY_MAX = 4000;

type ComposerFormProps = {
  onClose: () => void;
  onCreated: (thread: PortalMessageThreadDetail) => void;
};

export function ComposerForm({ onClose, onCreated }: ComposerFormProps) {
  const { t } = useTranslation();
  const startThread = useStartThread();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  const canSubmit =
    trimmedSubject.length > 0 &&
    trimmedBody.length > 0 &&
    !startThread.isPending;
  const isPending = startThread.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await startThread.mutateAsync({
        subject: trimmedSubject,
        body: trimmedBody,
      });
      if (!result) {
        setSubmitError(t("messages.startFailed"));
        return;
      }
      onCreated(result);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <Modal
      open
      onClose={handleClose}
      title={t("messages.newConversation")}
      description={t("messages.newConversationSubtitle")}
      size="md"
      disableBackdropClose={isPending}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isPending}
          >
            {t("messages.cancel")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="new-thread-form"
            disabled={!canSubmit}
            isLoading={isPending}
          >
            {t("messages.send")}
          </Button>
        </>
      }
    >
      <form
        id="new-thread-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <Field
          label={t("messages.subjectLabel")}
          helperText={`${subject.length}/${SUBJECT_MAX}`}
          required
        >
          <Input
            type="text"
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value.slice(0, SUBJECT_MAX))
            }
            maxLength={SUBJECT_MAX}
            placeholder={t("messages.subjectPlaceholder")}
            autoFocus
          />
        </Field>

        <Field
          label={t("messages.messageLabel")}
          helperText={`${body.length}/${BODY_MAX}`}
          required
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
            rows={6}
            maxLength={BODY_MAX}
            placeholder={t("messages.bodyPlaceholder")}
          />
        </Field>

        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
