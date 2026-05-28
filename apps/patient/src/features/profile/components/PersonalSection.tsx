import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalPatient } from "../../auth/api/portalAuth";
import { formatDateOnly } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import { Card, Field, Input } from "../../../shared/ui";
import { useUpdateProfile } from "../api/profile";
import {
  ErrorBanner,
  ReadField,
  RowList,
  SectionActions,
  SectionHeader,
  dash,
} from "./sectionUi";

type PersonalSectionProps = {
  patient: PortalPatient;
};

export function PersonalSection({ patient }: PersonalSectionProps) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState({
    preferred_name: patient.preferred_name || "",
    pronouns: patient.pronouns || "",
    preferred_language: patient.preferred_language || "",
  });

  const startEditing = () => {
    setForm({
      preferred_name: patient.preferred_name || "",
      pronouns: patient.pronouns || "",
      preferred_language: patient.preferred_language || "",
    });
    setEditError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setEditError(null);
    try {
      await updateProfile.mutateAsync(form);
      setIsEditing(false);
    } catch (err) {
      setEditError(getErrorMessage(err));
    }
  };

  return (
    <Card padded>
      <div className="space-y-5">
        <SectionHeader
          title={t("profile.sectionPersonalTitle")}
          actions={
            <SectionActions
              isEditing={isEditing}
              isSaving={updateProfile.isPending}
              onEdit={startEditing}
              onCancel={() => setIsEditing(false)}
              onSave={handleSave}
              editLabel={t("profile.editSection")}
              cancelLabel={t("common.cancel")}
              saveLabel={t("profile.saveChanges")}
              savingLabel={t("profile.saving")}
            />
          }
        />

        {isEditing && editError ? <ErrorBanner message={editError} /> : null}

        {isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadField
              label={t("profile.fieldLegalName")}
              value={dash(fullName)}
            />
            <Field label={t("profile.fieldPreferredName")}>
              <Input
                value={form.preferred_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    preferred_name: e.target.value,
                  }))
                }
              />
            </Field>
            <ReadField
              label={t("profile.fieldDateOfBirth")}
              value={formatDateOnly(patient.date_of_birth)}
            />
            <ReadField
              label={t("profile.fieldSexAtBirth")}
              value={dash(patient.sex_at_birth)}
            />
            <Field label={t("profile.fieldPronouns")}>
              <Input
                value={form.pronouns}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pronouns: e.target.value }))
                }
              />
            </Field>
            <Field label={t("profile.fieldPreferredLanguage")}>
              <Input
                value={form.preferred_language}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    preferred_language: e.target.value,
                  }))
                }
              />
            </Field>
            <ReadField
              label={t("profile.fieldRace")}
              value={dash(patient.race)}
            />
            <ReadField
              label={t("profile.fieldEthnicity")}
              value={dash(patient.ethnicity)}
            />
          </div>
        ) : (
          <RowList
            rows={[
              { label: t("profile.fieldLegalName"), value: dash(fullName) },
              {
                label: t("profile.fieldPreferredName"),
                value: dash(patient.preferred_name),
              },
              {
                label: t("profile.fieldDateOfBirth"),
                value: formatDateOnly(patient.date_of_birth),
              },
              {
                label: t("profile.fieldSexAtBirth"),
                value: dash(patient.sex_at_birth),
              },
              {
                label: t("profile.fieldPronouns"),
                value: dash(patient.pronouns),
              },
              { label: t("profile.fieldRace"), value: dash(patient.race) },
              {
                label: t("profile.fieldEthnicity"),
                value: dash(patient.ethnicity),
              },
              {
                label: t("profile.fieldLanguage"),
                value: dash(patient.preferred_language),
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
