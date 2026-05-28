import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import PatientDocumentsWorkspace from "../components/PatientDocumentsWorkspace";
import useFacility from "../../facilities/hooks/useFacility";
import PatientSearchField from "../../patients/components/PatientSearchField";
import WorkspaceShell from "../../../app/components/WorkspaceShell";
import Panel from "../../../shared/components/ui/Panel";

import type { ComponentType } from "react";
import type { EntityId } from "../../../shared/api/types";
import type { PatientLike } from "../../../shared/types/domain";

type PatientSearchFieldProps = {
  facilityId?: EntityId | null;
  selectedPatient?: PatientLike | null;
  onSelectPatient: (patient: PatientLike | null) => void;
  recentPatients?: PatientLike[];
  showDetailedSearch?: boolean;
  showNoResultActions?: boolean;
  compactSelected?: boolean;
  showSelectedAvatar?: boolean;
};

const PatientSearchFieldComponent =
  PatientSearchField as ComponentType<PatientSearchFieldProps>;

export default function DocumentsPage() {
  const { selectedFacilityId, selectedMembership } = useFacility();
  const [selectedPatient, setSelectedPatient] = useState<PatientLike | null>(
    null
  );
  const securityPermissions =
    selectedMembership?.effective_security_permissions || {};
  const canViewDocuments = Boolean(securityPermissions["documents.view"]);
  const canManageDocuments = Boolean(securityPermissions["documents.manage"]);
  const canManageCategories = Boolean(
    securityPermissions["documents.categories.manage"]
  );

  return (
    <WorkspaceShell>
      <div className="min-h-0 flex-1 bg-transparent">
        {canViewDocuments ? (
          <PatientDocumentsWorkspace
            title="Document Center"
            patient={selectedPatient}
            facilityId={selectedFacilityId}
            canManageDocuments={canManageDocuments}
            canManageCategories={canManageCategories}
            toolbarAccessory={
              <PatientSearchFieldComponent
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
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Panel
              icon={ShieldAlert}
              title="Access Denied"
              tone="subtle"
              className="w-full max-w-md"
            >
              <div className="text-sm text-cf-text-muted">
                You do not have permission to view documents.
              </div>
            </Panel>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
