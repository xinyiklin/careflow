import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchPatients } from "../api/patients";

const DEBOUNCE_MS = 300;

function isDateOfBirthLikelyValid(value) {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() >= 1900 && parsed <= new Date();
}

function buildSearchTerm({ firstName, lastName, dateOfBirth }) {
  const trimmedFirst = (firstName || "").trim();
  const trimmedLast = (lastName || "").trim();
  if (!trimmedFirst && !trimmedLast && !dateOfBirth) return "";

  return [trimmedLast, trimmedFirst].filter(Boolean).join(" ").trim();
}

/**
 * Live duplicate-check for the Quick Start intake. Debounces input and runs
 * a facility-scoped patient search whenever the candidate fields look real
 * enough to be useful (any name + a plausible DOB).
 */
export default function usePatientDuplicateCheck({
  facilityId,
  firstName,
  lastName,
  dateOfBirth,
  phone,
}) {
  const [debouncedKey, setDebouncedKey] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKey({
        firstName: (firstName || "").trim(),
        lastName: (lastName || "").trim(),
        dateOfBirth: dateOfBirth || "",
        phone: (phone || "").trim(),
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [firstName, lastName, dateOfBirth, phone]);

  const hasUsefulName =
    debouncedKey.firstName.length >= 2 || debouncedKey.lastName.length >= 2;
  const hasUsefulDob = isDateOfBirthLikelyValid(debouncedKey.dateOfBirth);
  const enabled = Boolean(facilityId) && (hasUsefulName || hasUsefulDob);

  const searchTerm = buildSearchTerm(debouncedKey);

  const query = useQuery({
    queryKey: [
      "patientQuickStart",
      "duplicateCheck",
      facilityId || null,
      searchTerm,
      debouncedKey.dateOfBirth,
    ],
    queryFn: () =>
      searchPatients({
        facilityId,
        search: searchTerm || undefined,
        date_of_birth: debouncedKey.dateOfBirth || undefined,
      }),
    enabled,
    staleTime: 15_000,
  });

  const candidates = Array.isArray(query.data) ? query.data : [];

  return {
    isLoading: query.isLoading || query.isFetching,
    enabled,
    candidates,
    error: query.error,
  };
}
