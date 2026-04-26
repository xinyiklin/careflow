import { useEffect, useMemo, useState } from "react";

import { useUserPreferences } from "../../../shared/context/UserPreferencesProvider";

const MAX_RECENT_PATIENTS = 10;

export default function usePatientFlow(facilityId) {
  const { preferences, updatePreferences } = useUserPreferences();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchSource, setSearchSource] = useState("appointment");

  const [searchInjectedPatient, setSearchInjectedPatient] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activePatient, setActivePatient] = useState(null);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [hubPatientId, setHubPatientId] = useState(null);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  useEffect(() => {
    localStorage.removeItem("recentPatients");
  }, []);

  const openQuickStart = (source = "navbar") => {
    setSearchSource(source);
    setIsQuickStartOpen(true);
  };

  const closeQuickStart = () => {
    setIsQuickStartOpen(false);
  };

  const openModal = ({ mode, patient = null, source = null }) => {
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

  const addRecentPatient = (patient) => {
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
            last_name: patient.last_name,
            date_of_birth: patient.date_of_birth,
            chart_number: patient.chart_number,
          },
          ...filtered,
        ].slice(0, MAX_RECENT_PATIENTS),
      };
    });
  };

  const openPatientFromHistory = async (patient) => {
    if (!patient?.id) return;
    addRecentPatient(patient);
    setHubPatientId(String(patient.id));
    setIsHubOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const openSearch = (source) => {
    setSearchSource(source);
    setIsSearchOpen(true);
    setSearchInjectedPatient(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode("create");
    setActivePatient(null);
  };

  const openHub = (patient) => {
    if (!patient?.id) return;
    addRecentPatient(patient);
    setHubPatientId(String(patient.id));
    setIsHubOpen(true);
  };

  const openHubById = (patientId) => {
    if (!patientId) return;
    setHubPatientId(String(patientId));
    setIsHubOpen(true);
  };

  const closeHub = () => {
    setIsHubOpen(false);
  };

  const handlePatientSaved = (savedPatient, setSelectedPatient) => {
    setActivePatient(savedPatient);
    setSelectedPatient?.(savedPatient);
    setSearchInjectedPatient(savedPatient);
    addRecentPatient(savedPatient);

    const shouldOpenHubAfterCreate =
      modalMode === "create" && !setSelectedPatient && savedPatient?.id;

    closeModal();

    if (shouldOpenHubAfterCreate) {
      setHubPatientId(String(savedPatient.id));
      setIsHubOpen(true);
    }
  };

  const handleQuickStartCompleted = (savedPatient, setSelectedPatient) => {
    if (!savedPatient?.id) {
      closeQuickStart();
      return;
    }

    addRecentPatient(savedPatient);
    setSearchInjectedPatient(savedPatient);
    setSelectedPatient?.(savedPatient);
    closeQuickStart();

    if (!setSelectedPatient) {
      setHubPatientId(String(savedPatient.id));
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
