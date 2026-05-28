import { useCallback, useState } from "react";

import {
  createEncounterVitals,
  fetchEncounterVitals,
  updateEncounterVitals,
} from "../../billing/api/clinical";
import { getErrorMessage } from "../../../shared/utils/errors";

import type {
  ClinicalEncounter,
  ClinicalVitals,
  ClinicalVitalsFormValues,
} from "../../billing/types";
import type { EntityId } from "../../../shared/api/types";

type VitalsModalState = {
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  vitals: ClinicalVitals | null;
};

const CLOSED_STATE: VitalsModalState = {
  isOpen: false,
  encounter: null,
  vitals: null,
};

type OpenOptions = {
  encounter: ClinicalEncounter;
};

type SubmitOptions = {
  values: ClinicalVitalsFormValues;
};

export type UseVitalsIntakeModalResult = {
  state: VitalsModalState;
  loading: boolean;
  saving: boolean;
  error: string;
  open: (options: OpenOptions) => Promise<void>;
  close: () => void;
  submit: (options: SubmitOptions) => Promise<void>;
};

function toApiNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toApiDecimalString(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? trimmed : null;
}

function buildPayload(encounterId: EntityId, values: ClinicalVitalsFormValues) {
  return {
    encounter: Number(encounterId),
    height_cm: toApiDecimalString(values.height_cm),
    weight_kg: toApiDecimalString(values.weight_kg),
    bp_systolic: toApiNumber(values.bp_systolic),
    bp_diastolic: toApiNumber(values.bp_diastolic),
    heart_rate_bpm: toApiNumber(values.heart_rate_bpm),
    respiratory_rate: toApiNumber(values.respiratory_rate),
    temperature_c: toApiDecimalString(values.temperature_c),
    spo2_percent: toApiNumber(values.spo2_percent),
    pain_score: toApiNumber(values.pain_score),
    notes: values.notes.trim(),
  };
}

export function useVitalsIntakeModal({
  facilityId,
  onSaved,
}: {
  facilityId: EntityId | null;
  onSaved?: () => void;
}): UseVitalsIntakeModalResult {
  const [state, setState] = useState<VitalsModalState>(CLOSED_STATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const open = useCallback(
    async ({ encounter }: OpenOptions) => {
      if (!encounter?.id || !facilityId) return;
      setError("");
      setLoading(true);
      try {
        const list = await fetchEncounterVitals({
          facilityId,
          encounterId: encounter.id,
        });
        const vitals = (list ?? [])[0] ?? null;
        // Open-guard: only flip ``isOpen`` to ``true`` once the
        // existing vitals (or confirmed absence) are in hand. Avoids a
        // flash of empty form state while loading.
        setState({ isOpen: true, encounter, vitals });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  const close = useCallback(() => {
    setState(CLOSED_STATE);
    setError("");
  }, []);

  const submit = useCallback(
    async ({ values }: SubmitOptions) => {
      const encounter = state.encounter;
      if (!encounter?.id || !facilityId) return;
      setError("");
      setSaving(true);
      try {
        const payload = buildPayload(encounter.id, values);
        if (state.vitals?.id) {
          await updateEncounterVitals({
            facilityId,
            vitalsId: state.vitals.id,
            values: payload,
          });
        } else {
          await createEncounterVitals({ facilityId, values: payload });
        }
        onSaved?.();
        setState(CLOSED_STATE);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSaving(false);
      }
    },
    [facilityId, onSaved, state.encounter, state.vitals]
  );

  return { state, loading, saving, error, open, close, submit };
}
