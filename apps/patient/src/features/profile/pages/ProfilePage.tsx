import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, PageHeader, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useAuth } from "../../auth/AuthProvider";
import { useProfile } from "../api/profile";
import { ContactSection } from "../components/ContactSection";
import { EmergencyContactSection } from "../components/EmergencyContactSection";
import { InsuranceSection } from "../components/InsuranceSection";
import { PersonalSection } from "../components/PersonalSection";
import { PreferencesSection } from "../components/PreferencesSection";

type Tab = "personal" | "contact" | "emergency" | "insurance" | "preferences";

const TAB_ORDER: Tab[] = [
  "personal",
  "contact",
  "emergency",
  "insurance",
  "preferences",
];

const TAB_KEYS: Record<Tab, string> = {
  personal: "profile.tabPersonal",
  contact: "profile.tabContact",
  emergency: "profile.tabEmergency",
  insurance: "profile.tabInsurance",
  preferences: "profile.tabPreferences",
};

function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card padded={false} className="overflow-hidden">
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex gap-1 overflow-x-auto p-1.5"
      >
        {TAB_ORDER.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab)}
              className={cn(
                "shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                "min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-soft hover:text-text"
              )}
            >
              {t(TAB_KEYS[tab])}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { patient: bootstrapPatient } = useAuth();
  const { data, isError, error } = useProfile();
  const patient = data ?? bootstrapPatient;

  const [activeTab, setActiveTab] = useState<Tab>("personal");

  if (!patient) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title={t("profile.pageTitle")} />
        {isError ? (
          <p className="text-sm text-text-muted">{getErrorMessage(error)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title={t("profile.pageTitle")} />

      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "personal" && <PersonalSection patient={patient} />}
        {activeTab === "contact" && <ContactSection patient={patient} />}
        {activeTab === "emergency" && (
          <EmergencyContactSection patient={patient} />
        )}
        {activeTab === "insurance" && <InsuranceSection patient={patient} />}
        {activeTab === "preferences" && (
          <PreferencesSection patient={patient} />
        )}
      </div>
    </div>
  );
}
