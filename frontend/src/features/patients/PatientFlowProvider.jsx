import { Suspense, createContext, lazy, useContext, useRef } from "react";

import usePatientFlow from "./hooks/usePatientFlow";

const PatientFlowContext = createContext(null);
const PatientSearchModal = lazy(
  () => import("./components/PatientSearchModal")
);
const PatientModal = lazy(() => import("./components/PatientModal"));
const PatientHubModal = lazy(() => import("./components/PatientHubModal"));
const PatientQuickStartModal = lazy(
  () => import("./components/PatientQuickStartModal")
);

export function PatientFlowProvider({
  children,
  onSelectPatient,
  facilityId,
  genderOptions,
  careProviders,
  pharmacies,
}) {
  const patientFlow = usePatientFlow(facilityId);
  const searchSelectHandlerRef = useRef(null);

  const closePatientSearch = () => {
    searchSelectHandlerRef.current = null;
    patientFlow.search.close();
  };

  const openPatientSearch = (source = "navbar", options = {}) => {
    searchSelectHandlerRef.current = options.onSelectPatient || null;
    patientFlow.search.open(source);
  };

  const openCreatePatient = (source = "navbar", options = {}) => {
    searchSelectHandlerRef.current = options.onSelectPatient || null;
    patientFlow.quickStart.open(source);
  };

  const openRecentPatient = (patient) => {
    if (!patient?.id) return;
    patientFlow.openPatientFromHistory(patient);
  };

  const value = {
    recentPatients: patientFlow.recentPatients,
    openPatientSearch,
    openCreatePatient,
    openRecentPatient,
    patientFlow,
  };

  return (
    <PatientFlowContext.Provider value={value}>
      {children}

      {patientFlow.search.isOpen ? (
        <Suspense fallback={null}>
          <PatientSearchModal
            isOpen={patientFlow.search.isOpen}
            facilityId={facilityId}
            onClose={closePatientSearch}
            onSelectPatient={(patient) => {
              const handleSelect =
                searchSelectHandlerRef.current || onSelectPatient;
              handleSelect?.(patient);
              patientFlow.addRecentPatient(patient);
              closePatientSearch();
            }}
            onOpenCreatePatient={() =>
              patientFlow.quickStart.open(patientFlow.search.source)
            }
            onOpenPatientProfile={(patient) => {
              closePatientSearch();
              patientFlow.hub.open(patient);
            }}
            allowSelect={
              patientFlow.search.source === "appointment" ||
              Boolean(searchSelectHandlerRef.current)
            }
            injectedPatient={patientFlow.search.injectedPatient}
            injectedPatientMode={patientFlow.modal.mode}
          />
        </Suspense>
      ) : null}

      {patientFlow.modal.isOpen ? (
        <Suspense fallback={null}>
          <PatientModal
            isOpen={patientFlow.modal.isOpen}
            mode={patientFlow.modal.mode}
            patient={patientFlow.modal.patient}
            facilityId={facilityId}
            genderOptions={genderOptions}
            careProviders={careProviders}
            pharmacies={pharmacies}
            onClose={patientFlow.modal.close}
            onSaved={(savedPatient) => {
              const selectHandler =
                searchSelectHandlerRef.current ||
                (patientFlow.search.source === "appointment"
                  ? onSelectPatient
                  : null);

              patientFlow.handlePatientSaved(savedPatient, selectHandler);
              searchSelectHandlerRef.current = null;
            }}
          />
        </Suspense>
      ) : null}

      {patientFlow.hub.isOpen ? (
        <Suspense fallback={null}>
          <PatientHubModal
            isOpen={patientFlow.hub.isOpen}
            patientId={patientFlow.hub.patientId}
            onClose={patientFlow.hub.close}
          />
        </Suspense>
      ) : null}

      {patientFlow.quickStart.isOpen ? (
        <Suspense fallback={null}>
          <PatientQuickStartModal
            isOpen={patientFlow.quickStart.isOpen}
            facilityId={facilityId}
            genderOptions={genderOptions}
            onClose={patientFlow.quickStart.close}
            onSaved={(savedPatient) => {
              const selectHandler =
                searchSelectHandlerRef.current ||
                (patientFlow.quickStart.source === "appointment"
                  ? onSelectPatient
                  : null);

              patientFlow.handleQuickStartCompleted(
                savedPatient,
                selectHandler
              );
              searchSelectHandlerRef.current = null;
            }}
          />
        </Suspense>
      ) : null}
    </PatientFlowContext.Provider>
  );
}

export function usePatientFlowContext() {
  const context = useContext(PatientFlowContext);

  if (!context) {
    throw new Error(
      "usePatientFlowContext must be used within PatientFlowProvider"
    );
  }

  return context;
}
