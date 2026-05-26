import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPatientAllergy,
  deletePatientAllergy,
  fetchPatientAllergies,
  updatePatientAllergy,
} from "../api/allergies";

import type { EntityId } from "../../../shared/api/types";
import type { PatientAllergy, PatientAllergyPayload } from "../api/allergies";

type UsePatientAllergiesParams = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  enabled?: boolean;
};

export function getPatientAllergiesQueryKey(
  facilityId?: EntityId | null,
  patientId?: EntityId | null
) {
  return ["patientHub", "allergies", facilityId || null, patientId || null];
}

export default function usePatientAllergies({
  facilityId,
  patientId,
  enabled = true,
}: UsePatientAllergiesParams) {
  const queryClient = useQueryClient();
  const queryKey = getPatientAllergiesQueryKey(facilityId, patientId);

  const allergiesQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchPatientAllergies({
        facilityId,
        patientId,
      }) as Promise<PatientAllergy[]>,
    enabled: enabled && !!facilityId && !!patientId,
  });

  const invalidatePatientAllergies = () =>
    queryClient.invalidateQueries({ queryKey });

  const createAllergyMutation = useMutation({
    mutationFn: (values: PatientAllergyPayload) =>
      createPatientAllergy({ facilityId, values }),
    onSuccess: invalidatePatientAllergies,
  });

  const updateAllergyMutation = useMutation({
    mutationFn: ({
      allergyId,
      values,
    }: {
      allergyId: EntityId;
      values: PatientAllergyPayload;
    }) => updatePatientAllergy({ facilityId, allergyId, values }),
    onSuccess: invalidatePatientAllergies,
  });

  const deleteAllergyMutation = useMutation({
    mutationFn: (allergyId: EntityId) =>
      deletePatientAllergy({ facilityId, allergyId }),
    onSuccess: invalidatePatientAllergies,
  });

  return {
    allergies: Array.isArray(allergiesQuery.data) ? allergiesQuery.data : [],
    allergiesQuery,
    createAllergyMutation,
    updateAllergyMutation,
    deleteAllergyMutation,
    invalidatePatientAllergies,
  };
}
