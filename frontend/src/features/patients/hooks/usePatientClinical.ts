import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClinicalEncounter,
  fetchClinicalEncounters,
  signProgressNote,
  updateClinicalEncounter,
  updateProgressNote,
} from "../api/clinical";

import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type {
  ClinicalEncounter,
  ClinicalEncounterPayload,
  ProgressNotePayload,
} from "../types";

type UsePatientClinicalParams = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  enabled?: boolean;
};

export function getPatientClinicalQueryKey(
  facilityId?: EntityId | null,
  patientId?: EntityId | null
) {
  return [
    "patientHub",
    "clinicalEncounters",
    facilityId || null,
    patientId || null,
  ];
}

export default function usePatientClinical({
  facilityId,
  patientId,
  enabled = true,
}: UsePatientClinicalParams) {
  const queryClient = useQueryClient();
  const queryKey = getPatientClinicalQueryKey(facilityId, patientId);

  const encountersQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchClinicalEncounters({
        facilityId,
        patientId,
      }) as Promise<ClinicalEncounter[]>,
    enabled: enabled && !!facilityId && !!patientId,
  });

  const invalidateClinicalEncounters = () =>
    queryClient.invalidateQueries({ queryKey });

  const createEncounterMutation = useMutation({
    mutationFn: (values: ClinicalEncounterPayload) =>
      createClinicalEncounter({ facilityId, values }),
    onSuccess: invalidateClinicalEncounters,
  });

  const updateEncounterMutation = useMutation({
    mutationFn: ({
      encounterId,
      values,
    }: {
      encounterId: EntityId;
      values: ApiPayload;
    }) => updateClinicalEncounter({ facilityId, encounterId, values }),
    onSuccess: invalidateClinicalEncounters,
  });

  const updateProgressNoteMutation = useMutation({
    mutationFn: ({
      noteId,
      values,
    }: {
      noteId: EntityId;
      values: ProgressNotePayload;
    }) => updateProgressNote({ facilityId, noteId, values }),
    onSuccess: invalidateClinicalEncounters,
  });

  const signProgressNoteMutation = useMutation({
    mutationFn: (noteId: EntityId) => signProgressNote({ facilityId, noteId }),
    onSuccess: invalidateClinicalEncounters,
  });

  return {
    encounters: Array.isArray(encountersQuery.data) ? encountersQuery.data : [],
    encountersQuery,
    createEncounterMutation,
    updateEncounterMutation,
    updateProgressNoteMutation,
    signProgressNoteMutation,
    invalidateClinicalEncounters,
  };
}
