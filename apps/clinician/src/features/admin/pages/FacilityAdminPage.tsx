import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { AdminFacilityProvider } from "../AdminFacilityProvider";
import { useBootReadiness } from "../../../app/BootReadinessContext";
import AppointmentTypesPanel from "../components/facility/AppointmentTypesPanel";
import AppointmentStatusesPanel from "../components/facility/AppointmentStatusesPanel";
import ResourcesPanel from "../components/facility/ResourcesPanel";
import StaffPanel from "../components/facility/StaffPanel";
import ProvidersPanel from "../components/facility/ProvidersPanel";
import FacilityActivityLogPanel from "../components/facility/FacilityActivityLogPanel";
import FacilityOverviewPanel from "../components/facility/FacilityOverviewPanel";
import FacilityFeeSchedulePanel from "../components/facility/FacilityFeeSchedulePanel";
import FacilityPayersPanel from "../components/facility/FacilityPayersPanel";
import FacilityPharmaciesPanel from "../components/facility/FacilityPharmaciesPanel";
import SecurityPanel from "../components/facility/SecurityPanel";
import AdminFacilitySwitcher from "../components/facility/AdminFacilitySwitcher";
import { AdminWorkspaceShell } from "../components/shared/AdminSurface";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";

const FACILITY_SECTIONS = [
  { key: "overview", label: "Overview", group: "General" },
  { key: "providers", label: "Providers", group: "People" },
  { key: "staff", label: "Staff", group: "People" },
  { key: "resources", label: "Resources", group: "Scheduling" },
  { key: "statuses", label: "Statuses", group: "Scheduling" },
  { key: "types", label: "Types", group: "Scheduling" },
  { key: "pharmacies", label: "Pharmacies", group: "Network" },
  { key: "payers", label: "Payers", group: "Billing" },
  { key: "fee-schedule", label: "Fee Schedule", group: "Billing" },
  { key: "security", label: "Security", group: "Security & Audit" },
  { key: "activity-log", label: "Activity Log", group: "Security & Audit" },
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
      case "providers":
        return <ProvidersPanel />;
      case "staff":
        return <StaffPanel />;
      case "activity-log":
        return <FacilityActivityLogPanel />;
      case "resources":
        return <ResourcesPanel />;
      case "payers":
        return <FacilityPayersPanel />;
      case "pharmacies":
        return <FacilityPharmaciesPanel />;
      case "fee-schedule":
        return <FacilityFeeSchedulePanel />;
      case "security":
        return <SecurityPanel />;
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
