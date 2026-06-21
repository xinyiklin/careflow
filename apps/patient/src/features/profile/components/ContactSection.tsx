import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalPatient } from "../../auth/api/portalAuth";
import { getErrorMessage } from "../../../shared/utils/errors";
import { Card, Field, Input, Select } from "../../../shared/ui";
import { useUpdateProfile } from "../api/profile";
import {
  ErrorBanner,
  RowList,
  SectionActions,
  SectionHeader,
  dash,
} from "./sectionUi";

type ContactSectionProps = {
  patient: PortalPatient;
};

export function ContactSection({ patient }: ContactSectionProps) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: patient.email || "",
    primary_phone_number: patient.primary_phone_number || "",
    address: {
      line_1: patient.address?.line_1 || "",
      line_2: patient.address?.line_2 || "",
      city: patient.address?.city || "",
      state: patient.address?.state || "",
      zip_code: patient.address?.zip_code || "",
    },
  });

  const startEditing = () => {
    setForm({
      email: patient.email || "",
      primary_phone_number: patient.primary_phone_number || "",
      address: {
        line_1: patient.address?.line_1 || "",
        line_2: patient.address?.line_2 || "",
        city: patient.address?.city || "",
        state: patient.address?.state || "",
        zip_code: patient.address?.zip_code || "",
      },
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

  const address = patient.address;
  const cityStateZip = [
    address?.city ? dash(address.city) : null,
    address?.state ? dash(address.state) : null,
    address?.zip_code ? dash(address.zip_code) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const addressLines = [
    address?.line_1 ? dash(address.line_1) : null,
    address?.line_2 ? dash(address.line_2) : null,
    cityStateZip || null,
  ].filter((line): line is string => Boolean(line));

  return (
    <Card padded>
      <div className="space-y-6">
        <SectionHeader
          title={t("profile.sectionContactTitle")}
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
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("profile.fieldEmail")}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </Field>
              <Field label={t("profile.fieldPhone")}>
                <Input
                  type="tel"
                  value={form.primary_phone_number}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      primary_phone_number: e.target.value,
                    }))
                  }
                  autoComplete="tel"
                />
              </Field>
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <h3 className="text-sm font-semibold tracking-tight text-text">
                {t("profile.sectionAddressTitle")}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("profile.fieldAddressLine1")}>
                  <Input
                    value={form.address.line_1}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, line_1: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label={t("profile.fieldAddressLine2")}>
                  <Input
                    value={form.address.line_2}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, line_2: e.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("profile.fieldCity")}>
                  <Input
                    value={form.address.city}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label={t("profile.fieldState")}>
                  <Select
                    value={form.address.state}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value },
                      }))
                    }
                  >
                    <option value="">{t("profile.selectState")}</option>
                    {/* US state names are intentionally not localized — official
                        place names stay in English per standard practice. This is
                        a deliberately partial list (NY/CA/TX/FL) covering the
                        demo dataset; expand values for production deployment. */}
                    <option value="NY">New York</option>
                    <option value="CA">California</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                  </Select>
                </Field>
                <Field label={t("profile.fieldZip")}>
                  <Input
                    value={form.address.zip_code}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, zip_code: e.target.value },
                      }))
                    }
                    autoComplete="postal-code"
                  />
                </Field>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <RowList
              rows={[
                {
                  label: t("profile.fieldEmailAddress"),
                  value: dash(patient.email),
                },
                {
                  label: t("profile.fieldPhone"),
                  value: dash(patient.primary_phone_number),
                },
              ]}
            />
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold tracking-tight text-text">
                {t("profile.sectionAddressTitle")}
              </h3>
              {addressLines.length > 0 ? (
                <div className="space-y-0.5 text-sm text-text">
                  {addressLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">-</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
