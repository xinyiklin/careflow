import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { AdminFacilityProvider } from "../AdminFacilityProvider";
import { useBootReadiness } from "../../../app/BootReadinessContext";
import AppointmentTypesPanel from "../components/facility/AppointmentTypesPanel";
import AppointmentStatusesPanel from "../components/facility/AppointmentStatusesPanel";
import ResourcesPanel from "../components/facility/ResourcesPanel";
import StaffPanel from "../components/facility/StaffPanel";
import PhysiciansPanel from "../components/facility/PhysiciansPanel";
import PermissionsRolesPanel from "../components/facility/PermissionsRolesPanel";
import FacilityOverviewPanel from "../components/facility/FacilityOverviewPanel";
import AdminFacilitySwitcher from "../components/facility/AdminFacilitySwitcher";
import { AdminWorkspaceShell } from "../components/shared/AdminSurface";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";

const FACILITY_SECTIONS = [
  {
    key: "overview",
    label: "Overview",
    description:
      "See the selected facility profile, contact details, and notes.",
  },
  {
    key: "physicians",
    label: "Physicians",
    description:
      "Manage physician records, titles, and scheduling availability context.",
  },
  {
    key: "staff",
    label: "Staff",
    description:
      "Maintain non-physician staff members assigned to this facility.",
  },
  {
    key: "permissions",
    label: "Permissions & Roles",
    description: "Manage role defaults and facility-facing access rules.",
  },
  {
    key: "resources",
    label: "Resources",
    description:
      "Manage the schedulable resources available for this facility.",
  },
  {
    key: "statuses",
    label: "Statuses",
    description: "Configure appointment status labels and operational meaning.",
  },
  {
    key: "types",
    label: "Types",
    description:
      "Manage appointment types, durations, and scheduling defaults.",
  },
];

export default function FacilityAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const { setRouteReady } = useBootReadiness();
  const { canAccessFacilityAdmin } = useAdminPermissions();

  useEffect(() => {
    setRouteReady(true);
  }, [setRouteReady]);

  const activeSectionContent = useMemo(() => {
    switch (activeSection) {
      case "physicians":
        return <PhysiciansPanel />;
      case "staff":
        return <StaffPanel />;
      case "permissions":
        return <PermissionsRolesPanel />;
      case "resources":
        return <ResourcesPanel />;
      case "statuses":
        return <AppointmentStatusesPanel />;
      case "types":
        return <AppointmentTypesPanel />;
      case "overview":
      default:
        return <FacilityOverviewPanel />;
    }
  }, [activeSection]);

  if (!canAccessFacilityAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminFacilityProvider>
      <AdminWorkspaceShell
        sections={FACILITY_SECTIONS}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        workspaceLabel="Facility"
        leadingAccessory={<AdminFacilitySwitcher />}
      >
        {activeSectionContent}
      </AdminWorkspaceShell>
    </AdminFacilityProvider>
  );
}
