import { useEffect, useMemo, useState } from "react";

import { useUserPreferences } from "../../../app/context/UserPreferencesProvider";
import { removeLocalStorageItem } from "../../../shared/utils/browserStorage";

import type { EntityId } from "../../../shared/api/types";
import type { PatientLike } from "../../../shared/types/domain";

const MAX_RECENT_PATIENTS = 10;

type PatientSearchSource = string;
type PatientModalMode = "create" | "edit";
type PatientHubTab = string;

type OpenModalOptions = {
  mode: PatientModalMode;
  patient?: PatientLike | null;
  source?: PatientSearchSource | null;
};

type HubOptions = {
  initialTab?: PatientHubTab;
};

type SelectPatientCallback = (patient: PatientLike) => void;

export default function usePatientFlow(
  facilityId: EntityId | null | undefined
) {
  const { preferences, updatePreferences } = useUserPreferences();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchSource, setSearchSource] = useState("appointment");

  const [searchInjectedPatient, setSearchInjectedPatient] =
    useState<PatientLike | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PatientModalMode>("create");
  const [activePatient, setActivePatient] = useState<PatientLike | null>(null);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [hubPatientId, setHubPatientId] = useState<string | null>(null);
  const [hubInitialTab, setHubInitialTab] = useState("registration");
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  useEffect(() => {
    removeLocalStorageItem("recentPatients");
  }, []);

  const openQuickStart = (source: PatientSearchSource = "navbar") => {
    setSearchSource(source);
    setIsQuickStartOpen(true);
  };

  const closeQuickStart = () => {
    setIsQuickStartOpen(false);
  };

  const openModal = ({
    mode,
    patient = null,
    source = null,
  }: OpenModalOptions) => {
    if (source) {
      setSearchSource(source);
    } else if (mode === "create" && !isSearchOpen) {
      setSearchSource("navbar");
    }

    if (mode === "create") {
      setIsQuickStartOpen(true);
      return;
    }

    setModalMode(mode);
    setActivePatient(patient);
    setIsModalOpen(true);
  };

  const recentPatients = useMemo(() => {
    const allRecentPatients = Array.isArray(preferences.recentPatients)
      ? preferences.recentPatients
      : [];
    if (!facilityId) return allRecentPatients.slice(0, MAX_RECENT_PATIENTS);

    return allRecentPatients
      .filter(
        (patient) =>
          !patient.facility_id ||
          String(patient.facility_id) === String(facilityId)
      )
      .slice(0, MAX_RECENT_PATIENTS);
  }, [facilityId, preferences.recentPatients]);

  const addRecentPatient = (patient: PatientLike | null | undefined) => {
    if (!patient?.id) return;

    updatePreferences((current) => {
      const currentRecentPatients = Array.isArray(current.recentPatients)
        ? current.recentPatients
        : [];
      const filtered = currentRecentPatients.filter(
        (item) =>
          String(item.id) !== String(patient.id) ||
          String(item.facility_id || "") !== String(facilityId || "")
      );

      return {
        recentPatients: [
          {
            id: patient.id,
            facility_id: facilityId || patient.facility_id || "",
            first_name: patient.first_name,
            middle_name: patient.middle_name,
            last_name: patient.last_name,
            preferred_name: patient.preferred_name,
            date_of_birth: patient.date_of_birth,
            chart_number: patient.chart_number,
          },
          ...filtered,
        ].slice(0, MAX_RECENT_PATIENTS),
      };
    });
  };

  const openPatientFromHistory = async (patient: PatientLike) => {
    if (!patient?.id) return;
    addRecentPatient(patient);
    setHubPatientId(String(patient.id));
    setHubInitialTab("registration");
    setIsHubOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const openSearch = (source: PatientSearchSource) => {
    setSearchSource(source);
    setIsSearchOpen(true);
    setSearchInjectedPatient(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode("create");
    setActivePatient(null);
  };

  const openHub = (
    patient: PatientLike | null | undefined,
    options: HubOptions = {}
  ) => {
    if (!patient?.id) return;
    addRecentPatient(patient);
    setHubPatientId(String(patient.id));
    setHubInitialTab(options.initialTab || "registration");
    setIsHubOpen(true);
  };

  const openHubById = (
    patientId: EntityId | null | undefined,
    options: HubOptions = {}
  ) => {
    if (!patientId) return;
    setHubPatientId(String(patientId));
    setHubInitialTab(options.initialTab || "registration");
    setIsHubOpen(true);
  };

  const closeHub = () => {
    setIsHubOpen(false);
  };

  const handlePatientSaved = (
    savedPatient: PatientLike,
    setSelectedPatient?: SelectPatientCallback
  ) => {
    setActivePatient(savedPatient);
    setSelectedPatient?.(savedPatient);
    setSearchInjectedPatient(savedPatient);
    addRecentPatient(savedPatient);

    const shouldOpenHubAfterCreate =
      modalMode === "create" && !setSelectedPatient && savedPatient?.id;

    closeModal();

    if (shouldOpenHubAfterCreate) {
      setHubPatientId(String(savedPatient.id));
      setHubInitialTab("registration");
      setIsHubOpen(true);
    }
  };

  const handleQuickStartCompleted = (
    savedPatient: PatientLike | null | undefined,
    setSelectedPatient?: SelectPatientCallback
  ) => {
    if (!savedPatient?.id) {
      closeQuickStart();
      return;
    }

    addRecentPatient(savedPatient);
    setSearchInjectedPatient(savedPatient);
    setSelectedPatient?.(savedPatient);
    closeQuickStart();
    closeSearch();

    if (!setSelectedPatient) {
      setHubPatientId(String(savedPatient.id));
      setHubInitialTab("registration");
      setIsHubOpen(true);
    }
  };

  return {
    search: {
      isOpen: isSearchOpen,
      source: searchSource,
      injectedPatient: searchInjectedPatient,
      open: openSearch,
      close: closeSearch,
    },

    modal: {
      isOpen: isModalOpen,
      mode: modalMode,
      patient: activePatient,
      open: openModal,
      close: closeModal,
    },
    hub: {
      isOpen: isHubOpen,
      patientId: hubPatientId,
      initialTab: hubInitialTab,
      open: openHub,
      openById: openHubById,
      close: closeHub,
    },
    quickStart: {
      isOpen: isQuickStartOpen,
      source: searchSource,
      open: openQuickStart,
      close: closeQuickStart,
    },

    recentPatients,
    addRecentPatient,
    handlePatientSaved,
    handleQuickStartCompleted,
    openPatientFromHistory,
  };
}
