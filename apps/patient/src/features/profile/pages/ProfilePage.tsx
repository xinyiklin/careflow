import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, PageHeader, cn } from "../../../shared/ui";
import {
  getPortalTabId,
  getPortalTabPanelId,
  usePortalTabs,
} from "../../../shared/ui/portalTabs";
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
  idBase,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  idBase: string;
}) {
  const { t } = useTranslation();
  const { getTabListProps } = usePortalTabs<Tab>({
    values: TAB_ORDER,
    value: activeTab,
    onChange,
  });
  return (
    <Card padded={false} className="overflow-hidden">
      <div
        {...getTabListProps()}
        role="tablist"
        aria-label={t("profile.sectionsLabel")}
        className="flex gap-1 overflow-x-auto p-1.5"
      >
        {TAB_ORDER.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={getPortalTabId(idBase, tab)}
              aria-selected={isActive}
              aria-controls={getPortalTabPanelId(idBase)}
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
  const idBase = useId();

  if (!patient) {
    return (
      <div>
        <PageHeader title={t("profile.pageTitle")} />
        {isError ? (
          <p className="text-sm text-text-muted">{getErrorMessage(error)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("profile.pageTitle")} />

      <ProfileTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        idBase={idBase}
      />

      <div
        role="tabpanel"
        id={getPortalTabPanelId(idBase)}
        aria-labelledby={getPortalTabId(idBase, activeTab)}
        className="mt-5"
      >
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
