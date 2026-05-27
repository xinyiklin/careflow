import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPatientMedication,
  discontinuePatientMedication,
  fetchPatientMedications,
  updatePatientMedication,
} from "../api/medications";

import type { EntityId } from "../../../shared/api/types";
import type { MedicationPayload, PatientMedication } from "../api/medications";

type UsePatientMedicationsParams = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  enabled?: boolean;
};

export function getPatientMedicationsQueryKey(
  facilityId?: EntityId | null,
  patientId?: EntityId | null
) {
  return ["patientHub", "medications", facilityId || null, patientId || null];
}

export default function usePatientMedications({
  facilityId,
  patientId,
  enabled = true,
}: UsePatientMedicationsParams) {
  const queryClient = useQueryClient();
  const queryKey = getPatientMedicationsQueryKey(facilityId, patientId);

  const medicationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchPatientMedications({
        facilityId,
        patientId,
      }) as Promise<PatientMedication[]>,
    enabled: enabled && !!facilityId && !!patientId,
  });

  const invalidateMedications = () =>
    queryClient.invalidateQueries({ queryKey });

  const createMedicationMutation = useMutation({
    mutationFn: (values: MedicationPayload) =>
      createPatientMedication({ facilityId, values }),
    onSuccess: invalidateMedications,
  });

  const updateMedicationMutation = useMutation({
    mutationFn: ({
      medicationId,
      values,
    }: {
      medicationId: EntityId;
      values: MedicationPayload;
    }) => updatePatientMedication({ facilityId, medicationId, values }),
    onSuccess: invalidateMedications,
  });

  const discontinueMedicationMutation = useMutation({
    mutationFn: (medicationId: EntityId) =>
      discontinuePatientMedication({ facilityId, medicationId }),
    onSuccess: invalidateMedications,
  });

  return {
    medications: Array.isArray(medicationsQuery.data)
      ? medicationsQuery.data
      : [],
    medicationsQuery,
    createMedicationMutation,
    updateMedicationMutation,
    discontinueMedicationMutation,
    invalidateMedications,
  };
}
