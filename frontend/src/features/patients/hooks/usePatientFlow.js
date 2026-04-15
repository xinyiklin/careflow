import { useEffect, useState } from "react";
import { fetchPatientById } from "../api/patients";

const RECENT_PATIENTS_KEY = "recentPatients";
const MAX_RECENT_PATIENTS = 10;

export default function usePatientFlow() {
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [patientSearchSource, setPatientSearchSource] = useState("appointment");

  const [patientSearchInjectedPatient, setPatientSearchInjectedPatient] =
    useState(null);

  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false);
  const [patientDetailMode, setPatientDetailMode] = useState("create");
  const [activePatient, setActivePatient] = useState(null);

  const [recentPatients, setRecentPatients] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_PATIENTS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load recent patients.", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(recentPatients));
    } catch (error) {
      console.error("Failed to save recent patients.", error);
    }
  }, [recentPatients]);

  const addRecentPatient = (patient) => {
    if (!patient?.id) return;

    setRecentPatients((prev) => {
      const filtered = prev.filter((item) => item.id !== patient.id);

      return [
        {
          id: patient.id,
          full_name: patient.full_name,
          display_name: patient.display_name,
          date_of_birth: patient.date_of_birth,
          chart_number: patient.chart_number,
        },
        ...filtered,
      ].slice(0, MAX_RECENT_PATIENTS);
    });
  };

  const openCreatePatient = () => {
    setPatientDetailMode("create");
    setActivePatient(null);
    setIsPatientDetailOpen(true);
  };

  const openEditPatient = (patient) => {
    setPatientDetailMode("edit");
    setActivePatient(patient);
    setIsPatientDetailOpen(true);
  };

  const openPatientFromHistory = async (patient) => {
    if (!patient?.id) return;

    try {
      const fullPatient = await fetchPatientById(patient.id);
      addRecentPatient(patient);
      openEditPatient(fullPatient);
    } catch (error) {
      console.error("Failed to load full patient details.", error);
    }
  };

  const closePatientSearch = () => {
    setIsPatientSearchOpen(false);
  };

  const openPatientSearch = (source) => {
    setPatientSearchSource(source);
    setIsPatientSearchOpen(true);
    setPatientSearchInjectedPatient(null);
  };

  const closePatientDetail = () => {
    setIsPatientDetailOpen(false);
    setActivePatient(null);
  };

  const handlePatientSaved = (savedPatient, setSelectedPatient) => {
    setActivePatient(savedPatient);
    setSelectedPatient(savedPatient);
    setPatientSearchInjectedPatient(savedPatient);
    setIsPatientDetailOpen(false);

    if (patientDetailMode === "edit") {
      addRecentPatient(savedPatient);
    }
  };

  return {
    isPatientSearchOpen,
    setIsPatientSearchOpen,
    closePatientSearch,
    patientSearchSource,
    setPatientSearchSource,
    patientSearchInjectedPatient,
    isPatientDetailOpen,
    setIsPatientDetailOpen,
    patientDetailMode,
    activePatient,
    recentPatients,
    addRecentPatient,
    openCreatePatient,
    openEditPatient,
    openPatientFromHistory,
    handlePatientSaved,
    openPatientSearch,
    closePatientDetail,
  };
}
