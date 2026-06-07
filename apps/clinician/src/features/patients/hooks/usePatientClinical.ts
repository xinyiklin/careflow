import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClinicalEncounter,
  fetchClinicalEncounters,
  signProgressNote,
  unsignProgressNote,
  updateClinicalEncounter,
  updateProgressNote,
} from "../../billing/api/clinical";

import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type {
  ClinicalEncounter,
  ClinicalEncounterPayload,
  ProgressNotePayload,
} from "../../billing/types";

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

  const invalidateClinicalEncounters = () => {
    queryClient.invalidateQueries({ queryKey });
    // Creating/signing an encounter moves it in or out of the facility-wide
    // billing "pending coding" queue, which reads a different key prefix.
    queryClient.invalidateQueries({
      queryKey: [
        "clinical",
        "encounters",
        "billing-pending",
        facilityId || null,
      ],
    });
  };

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

  const unsignProgressNoteMutation = useMutation({
    mutationFn: (noteId: EntityId) =>
      unsignProgressNote({ facilityId, noteId }),
    onSuccess: invalidateClinicalEncounters,
  });

  return {
    encounters: Array.isArray(encountersQuery.data) ? encountersQuery.data : [],
    encountersQuery,
    createEncounterMutation,
    updateEncounterMutation,
    updateProgressNoteMutation,
    signProgressNoteMutation,
    unsignProgressNoteMutation,
    invalidateClinicalEncounters,
  };
}
