import { useCallback, useEffect, useRef, useState } from "react";

import {
  beginAppointmentEditSession,
  heartbeatAppointmentEditSession,
  releaseAppointmentEditSession,
} from "../api/appointments";
import type {
  AppointmentEditSessionActiveEditor,
  AppointmentEditSessionResponse,
} from "../api/appointments";
import { getErrorMessage } from "../../../shared/utils/errors";

const HEARTBEAT_INTERVAL_MS = 45_000;
// Pause the heartbeat once the user has been away (tab hidden or no interaction)
// this long, so an abandoned/forgotten tab stops keeping its lease alive and
// becomes overridable by another editor. Kept below the server's 2-minute
// idle-override threshold so an actively-editing user is never blocked.
const PRESENCE_IDLE_MS = 90_000;

type AppointmentEditSessionStatus =
  | "idle"
  | "checking"
  | "active"
  | "available"
  | "occupied"
  | "error";

type AppointmentEditSessionState = {
  status: AppointmentEditSessionStatus;
  activeEditor: AppointmentEditSessionActiveEditor;
  error: string;
};

type UseAppointmentEditSessionArgs = {
  appointmentId?: number | string | null;
  facilityId?: number | string | null;
  isOpen: boolean;
  mode?: string;
};

const idleState: AppointmentEditSessionState = {
  status: "idle",
  activeEditor: null,
  error: "",
};

export default function useAppointmentEditSession({
  appointmentId,
  facilityId,
  isOpen,
  mode,
}: UseAppointmentEditSessionArgs) {
  const [state, setState] = useState<AppointmentEditSessionState>(idleState);
  const requestIdRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const shouldManageSession = Boolean(
    isOpen && mode === "edit" && appointmentId && facilityId
  );

  const applySessionResult = useCallback(
    (result: AppointmentEditSessionResponse | null) => {
      setState({
        status: result?.status || "idle",
        activeEditor: result?.active_editor || null,
        error: "",
      });
    },
    []
  );

  // Treat tab focus and any pointer/keyboard interaction as presence. When the
  // user goes away the heartbeat below stops, letting the lease go idle.
  useEffect(() => {
    if (!shouldManageSession) return undefined;

    lastActivityRef.current = Date.now();
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const onVisibility = () => {
      if (!document.hidden) lastActivityRef.current = Date.now();
    };

    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [shouldManageSession]);

  const beginSession = useCallback(async () => {
    if (!shouldManageSession) return null;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState((current) => ({
      ...current,
      status: "checking",
      error: "",
    }));

    try {
      const result = await beginAppointmentEditSession(
        facilityId,
        appointmentId
      );
      if (requestIdRef.current === requestId) {
        applySessionResult(result);
      }
      return result;
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setState({
          status: "error",
          activeEditor: null,
          error: getErrorMessage(error, "Could not confirm editing status."),
        });
      }
      return null;
    }
  }, [appointmentId, applySessionResult, facilityId, shouldManageSession]);

  useEffect(() => {
    if (!shouldManageSession) {
      requestIdRef.current += 1;
      setState(idleState);
      return undefined;
    }

    beginSession();

    return () => {
      requestIdRef.current += 1;
      releaseAppointmentEditSession(facilityId, appointmentId).catch(() => {});
    };
  }, [appointmentId, beginSession, facilityId, shouldManageSession]);

  useEffect(() => {
    if (!shouldManageSession || state.status !== "active") return undefined;

    const intervalId = window.setInterval(() => {
      // Skip the keepalive while the user is away so the lease can go idle.
      if (
        document.hidden ||
        Date.now() - lastActivityRef.current > PRESENCE_IDLE_MS
      ) {
        return;
      }

      heartbeatAppointmentEditSession(facilityId, appointmentId)
        .then(applySessionResult)
        .catch((error) => {
          setState({
            status: "error",
            activeEditor: null,
            error: getErrorMessage(
              error,
              "Could not keep editing status current."
            ),
          });
        });
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [
    appointmentId,
    applySessionResult,
    facilityId,
    shouldManageSession,
    state.status,
  ]);

  return {
    ...state,
    beginSession,
    isBlockedByActiveEditor: state.status === "occupied",
    isChecking: state.status === "checking",
  };
}
