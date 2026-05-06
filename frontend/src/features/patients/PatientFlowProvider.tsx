import { Suspense, createContext, lazy, useContext, useRef } from "react";

import usePatientFlow from "./hooks/usePatientFlow";

import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import type { EntityId } from "../../shared/api/types";
import type { ApiRecord, PatientLike } from "../../shared/types/domain";

type SelectPatientHandler = (patient: PatientLike) => void;

type OpenPatientFlowOptions = {
  onSelectPatient?: SelectPatientHandler | null;
};

type PatientFlowProviderProps = {
  children: ReactNode;
  onSelectPatient?: SelectPatientHandler | null;
  facilityId?: EntityId | null;
  genderOptions?: ApiRecord[];
  careProviders?: ApiRecord[];
  pharmacies?: ApiRecord[];
};

type LazyPatientComponent<TProps> = LazyExoticComponent<ComponentType<TProps>>;

type PatientSearchModalProps = {
  isOpen: boolean;
  facilityId?: EntityId | null;
  onClose: () => void;
  onSelectPatient: (patient: PatientLike) => void;
  onOpenCreatePatient: () => void;
  onOpenPatientProfile: (patient: PatientLike) => void;
  allowSelect: boolean;
  injectedPatient?: PatientLike | null;
  injectedPatientMode?: string;
};

type PatientModalProps = {
  isOpen: boolean;
  mode: string;
  patient?: PatientLike | null;
  facilityId?: EntityId | null;
  genderOptions: ApiRecord[];
  careProviders: ApiRecord[];
  pharmacies: ApiRecord[];
  onClose: () => void;
  onSaved: (patient: PatientLike) => void;
};

type PatientHubModalProps = {
  isOpen: boolean;
  patientId?: EntityId | null;
  initialTab?: string;
  onClose: () => void;
};

type PatientQuickStartModalProps = {
  isOpen: boolean;
  facilityId?: EntityId | null;
  genderOptions: ApiRecord[];
  onClose: () => void;
  onSaved: (patient: PatientLike) => void;
};

export type PatientFlowContextValue = {
  recentPatients: PatientLike[];
  openPatientSearch: (
    source?: string,
    options?: OpenPatientFlowOptions
  ) => void;
  openCreatePatient: (
    source?: string,
    options?: OpenPatientFlowOptions
  ) => void;
  openRecentPatient: (patient: PatientLike) => void;
  patientFlow: ReturnType<typeof usePatientFlow>;
};

const PatientFlowContext = createContext<PatientFlowContextValue | null>(null);
const PatientSearchModal = lazy(
  () => import("./components/PatientSearchModal")
) as LazyPatientComponent<PatientSearchModalProps>;
const PatientModal = lazy(
  () => import("./components/PatientModal")
) as unknown as LazyPatientComponent<PatientModalProps>;
const PatientHubModal = lazy(
  () => import("./components/PatientHubModal")
) as LazyPatientComponent<PatientHubModalProps>;
const PatientQuickStartModal = lazy(
  () => import("./components/PatientQuickStartModal")
) as LazyPatientComponent<PatientQuickStartModalProps>;

export function PatientFlowProvider({
  children,
  onSelectPatient,
  facilityId,
  genderOptions = [],
  careProviders = [],
  pharmacies = [],
}: PatientFlowProviderProps) {
  const patientFlow = usePatientFlow(facilityId);
  const searchSelectHandlerRef = useRef<SelectPatientHandler | null>(null);

  const closePatientSearch = () => {
    searchSelectHandlerRef.current = null;
    patientFlow.search.close();
  };

  const openPatientSearch = (
    source = "navbar",
    options: OpenPatientFlowOptions = {}
  ) => {
    searchSelectHandlerRef.current = options.onSelectPatient || null;
    patientFlow.search.open(source);
  };

  const openCreatePatient = (
    source = "navbar",
    options: OpenPatientFlowOptions = {}
  ) => {
    searchSelectHandlerRef.current = options.onSelectPatient || null;
    patientFlow.quickStart.open(source);
  };

  const openRecentPatient = (patient: PatientLike) => {
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
            onSelectPatient={(patient: PatientLike) => {
              const handleSelect =
                searchSelectHandlerRef.current || onSelectPatient;
              handleSelect?.(patient);
              patientFlow.addRecentPatient(patient);
              closePatientSearch();
            }}
            onOpenCreatePatient={() =>
              patientFlow.quickStart.open(patientFlow.search.source)
            }
            onOpenPatientProfile={(patient: PatientLike) => {
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
            onSaved={(savedPatient: PatientLike) => {
              const selectHandler =
                searchSelectHandlerRef.current ||
                (patientFlow.search.source === "appointment"
                  ? onSelectPatient
                  : null);

              patientFlow.handlePatientSaved(
                savedPatient,
                selectHandler || undefined
              );
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
            initialTab={patientFlow.hub.initialTab}
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
            onSaved={(savedPatient: PatientLike) => {
              const selectHandler =
                searchSelectHandlerRef.current ||
                (patientFlow.quickStart.source === "appointment"
                  ? onSelectPatient
                  : null);

              patientFlow.handleQuickStartCompleted(
                savedPatient,
                selectHandler || undefined
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
