import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import useFacility from "../facilities/hooks/useFacility";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import {
  createSaveAttemptScope,
  type SaveConflictKind,
} from "./utils/appointmentSaveAttempt";

type ConfirmationContext = {
  readonly isConfirming: boolean;
  invalidateConfirmations: () => void;
  beginAttempt: () => {
    isCurrent: () => boolean;
    confirm: (kind: SaveConflictKind) => Promise<boolean>;
  };
};

const Context = createContext<ConfirmationContext | null>(null);

export function AppointmentSaveConfirmationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { selectedFacilityId } = useFacility();
  const facilityRef = useRef(selectedFacilityId);
  facilityRef.current = selectedFacilityId;
  const scope = useRef(createSaveAttemptScope());
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const [kind, setKind] = useState<SaveConflictKind | null>(null);

  const resolve = useCallback((accepted: boolean) => {
    const finish = pending.current;
    pending.current = null;
    setKind(null);
    finish?.(accepted);
  }, []);

  const invalidateConfirmations = useCallback(() => {
    scope.current.invalidate();
    resolve(false);
  }, [resolve]);

  useEffect(() => {
    invalidateConfirmations();
    return invalidateConfirmations;
  }, [selectedFacilityId, invalidateConfirmations]);

  const beginAttempt = useCallback(() => {
    resolve(false);
    const sameGeneration = scope.current.begin();
    const facilityId = facilityRef.current;
    const isCurrent = () =>
      sameGeneration() && facilityRef.current === facilityId;
    return {
      isCurrent,
      confirm: (conflict: SaveConflictKind) => {
        if (!isCurrent()) return Promise.resolve(false);
        return new Promise<boolean>((finish) => {
          pending.current = finish;
          setKind(conflict);
        });
      },
    };
  }, [resolve]);

  const value = useMemo(
    () => ({
      beginAttempt,
      invalidateConfirmations,
      isConfirming: kind !== null,
    }),
    [beginAttempt, invalidateConfirmations, kind]
  );
  return (
    <Context.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={kind !== null}
        title={
          kind === "schedule_overlap"
            ? "Schedule overlap"
            : "Same-day appointment"
        }
        message={
          kind === "schedule_overlap"
            ? "This time overlaps another appointment for the selected resource or provider."
            : "This patient already has an appointment on this day."
        }
        confirmText="Book Anyway"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => resolve(true)}
        onCancel={() => resolve(false)}
      />
    </Context.Provider>
  );
}

export function useAppointmentSaveConfirmation() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "Appointment saves require AppointmentSaveConfirmationProvider"
    );
  return value;
}
