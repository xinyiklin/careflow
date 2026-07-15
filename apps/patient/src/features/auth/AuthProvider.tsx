import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  logoutUser,
  restoreAuthSession,
  setAuthTokens,
} from "../../shared/api/client";
import {
  demoLoginPortal,
  fetchPortalMe,
  loginPortal,
  type PortalLoginCredentials,
  type PortalPatient,
} from "./api/portalAuth";

import type { ReactNode } from "react";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthSessionSnapshot = {
  generation: number;
  patientId: number | null;
};

export type AuthContextValue = {
  status: AuthStatus;
  patient: PortalPatient | null;
  error: string | null;
  login: (credentials: PortalLoginCredentials) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  getSessionSnapshot: () => AuthSessionSnapshot;
  updatePatient: (
    patient: PortalPatient,
    expectedSession: AuthSessionSnapshot
  ) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Stable, non-display sentinel for the 403 "no portal access" case. The
// display layer (LoginPage) recognizes this code and renders the localized
// auth.noPortalAccess copy; never surface this string to the user.
export const NO_PORTAL_ACCESS = "no_portal_access";

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const sessionGenerationRef = useRef(0);
  const activePatientIdRef = useRef<number | null>(null);

  const setActivePatient = useCallback((nextPatient: PortalPatient | null) => {
    sessionGenerationRef.current += 1;
    activePatientIdRef.current = nextPatient?.id ?? null;
    setPatient(nextPatient);
  }, []);

  const logout = useCallback(() => {
    void logoutUser();
    setActivePatient(null);
    setStatus("anonymous");
    // Drop every cached query so the next patient never sees the prior
    // patient's medications/messages/profile from this browser session.
    queryClient.clear();
  }, [queryClient, setActivePatient]);

  const getSessionSnapshot = useCallback(
    (): AuthSessionSnapshot => ({
      generation: sessionGenerationRef.current,
      patientId: activePatientIdRef.current,
    }),
    []
  );

  const updatePatient = useCallback(
    (nextPatient: PortalPatient, expectedSession: AuthSessionSnapshot) => {
      if (
        expectedSession.generation !== sessionGenerationRef.current ||
        expectedSession.patientId !== activePatientIdRef.current ||
        nextPatient.id !== activePatientIdRef.current
      ) {
        return false;
      }

      activePatientIdRef.current = nextPatient.id;
      setPatient(nextPatient);
      return true;
    },
    []
  );

  const loadPatient = useCallback(async () => {
    const data = await fetchPortalMe();
    if (!data) {
      throw new Error("Portal profile response was empty.");
    }
    setActivePatient(data);
    setStatus("authenticated");
    setError(null);
    return data;
  }, [setActivePatient]);

  const bootstrap = useCallback(async () => {
    try {
      await restoreAuthSession();
    } catch {
      // No refresh cookie / refresh expired — treat as anonymous, no error UI.
      setActivePatient(null);
      setStatus("anonymous");
      return;
    }

    try {
      await loadPatient();
    } catch (err) {
      const errStatus = getErrorStatus(err);
      if (errStatus === 403) {
        // Authenticated user without portal access (e.g. clinician
        // cookie left over on the same browser). Stay silent on the
        // login screen — the user hasn't tried to sign in yet, so we
        // shouldn't surface "Sign in failed" out of nowhere. Just
        // clear the stale session and fall through to anonymous.
        logoutUser();
        setActivePatient(null);
        setStatus("anonymous");
        return;
      }
      if (errStatus !== 401) {
        console.error("Failed to load portal profile:", err);
      }
      setActivePatient(null);
      setStatus("anonymous");
    }
  }, [loadPatient, setActivePatient]);

  const login = useCallback(
    async ({ username, password }: PortalLoginCredentials) => {
      setError(null);
      const tokens = await loginPortal({ username, password });
      if (!tokens?.access) {
        throw new Error("Login response did not include an access token.");
      }

      setAuthTokens({ access: tokens.access });

      try {
        await loadPatient();
      } catch (err) {
        const errStatus = getErrorStatus(err);
        if (errStatus === 403) {
          logoutUser();
          setActivePatient(null);
          setStatus("anonymous");
          setError(NO_PORTAL_ACCESS);
          throw new Error(NO_PORTAL_ACCESS);
        }
        throw err;
      }
    },
    [loadPatient, setActivePatient]
  );

  const demoLogin = useCallback(async () => {
    setError(null);
    const tokens = await demoLoginPortal();
    if (!tokens?.access) {
      throw new Error("Demo login response did not include an access token.");
    }

    setAuthTokens({ access: tokens.access });

    await loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setActivePatient(null);
      setStatus("anonymous");
      queryClient.clear();
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [queryClient, setActivePatient]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <AuthContext.Provider
      value={{
        status,
        patient,
        error,
        login,
        demoLogin,
        logout,
        getSessionSnapshot,
        updatePatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
