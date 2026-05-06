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
  { key: "overview", label: "Overview" },
  { key: "physicians", label: "Physicians" },
  { key: "staff", label: "Staff" },
  { key: "permissions", label: "Permissions & Roles" },
  { key: "resources", label: "Resources" },
  { key: "statuses", label: "Statuses" },
  { key: "types", label: "Types" },
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
