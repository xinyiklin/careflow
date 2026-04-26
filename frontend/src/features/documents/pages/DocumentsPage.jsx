import { useEffect, useState } from "react";

import PatientDocumentsWorkspace from "../components/PatientDocumentsWorkspace";
import useFacility from "../../facilities/hooks/useFacility";
import PatientSearchField from "../../patients/components/PatientSearchField";
import { useBootReadiness } from "../../../app/BootReadinessContext";
import WorkspaceShell from "../../../shared/components/WorkspaceShell";

export default function DocumentsPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();
  const { setRouteReady } = useBootReadiness();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const canManageCategories = Boolean(
    selectedMembership?.effective_security_permissions?.[
      "documents.categories.manage"
    ]
  );

  useEffect(() => {
    setRouteReady(true);
  }, [setRouteReady]);

  return (
    <WorkspaceShell>
      <div className="min-h-0 flex-1 bg-transparent px-0 pt-0 pb-4">
        <PatientDocumentsWorkspace
          title="Document Center"
          patient={selectedPatient}
          facilityId={selectedFacilityId}
          canManageCategories={canManageCategories}
          toolbarAccessory={
            <PatientSearchField
              facilityId={selectedFacilityId}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              recentPatients={[]}
              showDetailedSearch={false}
              showNoResultActions={false}
              compactSelected
              showSelectedAvatar={false}
            />
          }
        />
      </div>
    </WorkspaceShell>
  );
}
