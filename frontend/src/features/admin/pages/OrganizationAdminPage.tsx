import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useBootReadiness } from "../../../app/BootReadinessContext";
import OrganizationOverviewPanel from "../components/organization/OrganizationOverviewPanel";
import FacilitiesPanel from "../components/organization/FacilitiesPanel";
import OrganizationFeeSchedulePanel from "../components/organization/OrganizationFeeSchedulePanel";
import OrganizationPharmaciesPanel from "../components/organization/OrganizationPharmaciesPanel";
import OrganizationPayersPanel from "../components/organization/OrganizationPayersPanel";
import UsersPanel from "../components/organization/UsersPanel";
import OrganizationActivityLogPanel from "../components/organization/OrganizationActivityLogPanel";
import OrganizationSecurityPanel from "../components/organization/OrganizationSecurityPanel";
import { AdminWorkspaceShell } from "../components/shared/AdminSurface";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";

const ORGANIZATION_SECTIONS = [
  { key: "overview", label: "Overview", group: "General" },
  { key: "facilities", label: "Facilities", group: "General" },
  { key: "users", label: "Users", group: "General" },
  { key: "pharmacies", label: "Pharmacies", group: "General" },
  { key: "security", label: "Security", group: "General" },
  { key: "payers", label: "Payers", group: "Billing" },
  { key: "fee-schedule", label: "Fee Schedule", group: "Billing" },
  { key: "activity-log", label: "Activity Log", group: "Monitoring" },
];

export default function OrganizationAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const {
    isOrgAdmin,
    canAccessOrganizationAdmin,
    canManageOrganizationPharmacies,
  } = useAdminPermissions();
  const { setRouteReady } = useBootReadiness();

  useEffect(() => {
    setRouteReady(true);
  }, [setRouteReady]);

  const availableSections = useMemo(() => {
    if (isOrgAdmin) return ORGANIZATION_SECTIONS;
    if (canManageOrganizationPharmacies) {
      return ORGANIZATION_SECTIONS.filter(
        (section) => section.key === "pharmacies"
      );
    }
    return [];
  }, [canManageOrganizationPharmacies, isOrgAdmin]);

  useEffect(() => {
    if (!availableSections.length) return;
    if (!availableSections.some((section) => section.key === activeSection)) {
      setActiveSection(availableSections[0].key);
    }
  }, [activeSection, availableSections]);

  const resolvedActiveSection = availableSections.some(
    (section) => section.key === activeSection
  )
    ? activeSection
    : availableSections[0]?.key;

  const activeSectionContent = useMemo(() => {
    switch (resolvedActiveSection) {
      case "facilities":
        return <FacilitiesPanel />;
      case "users":
        return <UsersPanel />;
      case "security":
        return <OrganizationSecurityPanel />;
      case "payers":
        return <OrganizationPayersPanel />;
      case "pharmacies":
        return <OrganizationPharmaciesPanel />;
      case "fee-schedule":
        return <OrganizationFeeSchedulePanel />;
      case "activity-log":
        return (
          <OrganizationActivityLogPanel
            scope="organization"
            scopeLabel="organization"
            showFacilityFilter={false}
          />
        );
      case "overview":
      default:
        return <OrganizationOverviewPanel />;
    }
  }, [resolvedActiveSection]);

  if (!canAccessOrganizationAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminWorkspaceShell
      sections={availableSections}
      activeSection={resolvedActiveSection}
      onSelectSection={setActiveSection}
      workspaceLabel="Organization"
    >
      {activeSectionContent}
    </AdminWorkspaceShell>
  );
}
