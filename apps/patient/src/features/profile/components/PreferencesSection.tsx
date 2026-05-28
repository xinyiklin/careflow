import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "../../../i18n";
import { Card, Field, Select } from "../../../shared/ui";
import { ThemeToggle } from "../../../shared/theme";
import type { PortalPatient } from "../../auth/api/portalAuth";
import { PreferredPharmacySection } from "./PreferredPharmacySection";
import { SectionHeader } from "./sectionUi";

type PreferencesSectionProps = {
  patient: PortalPatient;
};

function LanguageCard() {
  const { t, i18n } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <Card padded>
      <div className="space-y-4">
        <SectionHeader
          title={t("profile.languageHeading")}
          description={t("profile.languageDescription")}
        />
        <div className="max-w-sm">
          <Field label={t("common.language")}>
            <Select
              value={i18n.resolvedLanguage ?? i18n.language}
              onChange={handleChange}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Card>
  );
}

function AppearanceCard() {
  const { t } = useTranslation();
  return (
    <Card padded>
      <div className="space-y-4">
        <SectionHeader
          title={t("profile.themeHeading")}
          description={t("profile.themeDescription")}
        />
        <ThemeToggle size="full" />
      </div>
    </Card>
  );
}

export function PreferencesSection({ patient }: PreferencesSectionProps) {
  return (
    <div className="space-y-5">
      <LanguageCard />
      <AppearanceCard />
      <PreferredPharmacySection
        preferredPharmacyName={patient.preferred_pharmacy_name ?? ""}
      />
    </div>
  );
}
