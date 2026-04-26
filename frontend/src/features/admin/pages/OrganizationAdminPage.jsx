import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useBootReadiness } from "../../../app/BootReadinessContext";
import OrganizationOverviewPanel from "../components/organization/OrganizationOverviewPanel";
import FacilitiesPanel from "../components/organization/FacilitiesPanel";
import OrganizationPharmaciesPanel from "../components/organization/OrganizationPharmaciesPanel";
import UsersPanel from "../components/organization/UsersPanel";
import { AdminWorkspaceShell } from "../components/shared/AdminSurface";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";

const ORGANIZATION_SECTIONS = [
  {
    key: "overview",
    label: "Overview",
    description:
      "Core organization profile, contact details, and identity settings.",
  },
  {
    key: "facilities",
    label: "Facilities",
    description:
      "Review and manage the facilities that belong to this organization.",
  },
  {
    key: "users",
    label: "Users",
    description: "Manage organization users, access, and role assignments.",
  },
  {
    key: "pharmacies",
    label: "Pharmacies",
    description:
      "Curate organization pharmacy preferences from the global directory.",
  },
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
      case "pharmacies":
        return <OrganizationPharmaciesPanel />;
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
