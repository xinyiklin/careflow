import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalPatient } from "../../auth/api/portalAuth";
import { getErrorMessage } from "../../../shared/utils/errors";
import { Card, Field, Input } from "../../../shared/ui";
import { useUpdateProfile } from "../api/profile";
import {
  ErrorBanner,
  RowList,
  SectionActions,
  SectionHeader,
  dash,
} from "./sectionUi";

type EmergencyContactSectionProps = {
  patient: PortalPatient;
};

export function EmergencyContactSection({
  patient,
}: EmergencyContactSectionProps) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const emergency = patient.primary_emergency_contact;

  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: emergency?.name || "",
    relationship: emergency?.relationship || "",
    phone_number: emergency?.phone_number || "",
  });

  const startEditing = () => {
    setForm({
      name: emergency?.name || "",
      relationship: emergency?.relationship || "",
      phone_number: emergency?.phone_number || "",
    });
    setEditError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setEditError(null);
    try {
      await updateProfile.mutateAsync({ primary_emergency_contact: form });
      setIsEditing(false);
    } catch (err) {
      setEditError(getErrorMessage(err));
    }
  };

  return (
    <Card padded>
      <div className="space-y-5">
        <SectionHeader
          title={t("profile.sectionEmergencyTitle")}
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("profile.fieldContactName")}>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Field>
            <Field label={t("profile.fieldRelationship")}>
              <Input
                value={form.relationship}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    relationship: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("profile.fieldPhone")}>
              <Input
                type="tel"
                value={form.phone_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    phone_number: e.target.value,
                  }))
                }
                autoComplete="tel"
              />
            </Field>
          </div>
        ) : (
          <RowList
            rows={[
              {
                label: t("profile.fieldContactName"),
                value: dash(emergency?.name),
              },
              {
                label: t("profile.fieldRelationship"),
                value: dash(emergency?.relationship),
              },
              {
                label: t("profile.fieldPhone"),
                value: dash(emergency?.phone_number),
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
