import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export type AuthContextValue = {
  status: AuthStatus;
  patient: PortalPatient | null;
  error: string | null;
  login: (credentials: PortalLoginCredentials) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const NO_PORTAL_ACCESS_MESSAGE =
  "This account doesn't have patient portal access.";

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

  const logout = useCallback(() => {
    logoutUser();
    setPatient(null);
    setStatus("anonymous");
    // Drop every cached query so the next patient never sees the prior
    // patient's medications/messages/profile from this browser session.
    queryClient.clear();
  }, [queryClient]);

  const loadPatient = useCallback(async () => {
    const data = await fetchPortalMe();
    if (!data) {
      throw new Error("Portal profile response was empty.");
    }
    setPatient(data);
    setStatus("authenticated");
    setError(null);
    return data;
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      await restoreAuthSession();
    } catch {
      // No refresh cookie / refresh expired — treat as anonymous, no error UI.
      setPatient(null);
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
        setPatient(null);
        setStatus("anonymous");
        return;
      }
      if (errStatus !== 401) {
        console.error("Failed to load portal profile:", err);
      }
      setPatient(null);
      setStatus("anonymous");
    }
  }, [loadPatient]);

  const login = useCallback(
    async ({ username, password }: PortalLoginCredentials) => {
      setError(null);
      const tokens = await loginPortal({ username, password });
      if (!tokens?.access) {
        throw new Error("Login response did not include an access token.");
      }

      setAuthTokens({
        access: tokens.access,
        refresh: tokens.refresh ?? null,
      });

      try {
        await loadPatient();
      } catch (err) {
        const errStatus = getErrorStatus(err);
        if (errStatus === 403) {
          logoutUser();
          setPatient(null);
          setStatus("anonymous");
          setError(NO_PORTAL_ACCESS_MESSAGE);
          throw new Error(NO_PORTAL_ACCESS_MESSAGE);
        }
        throw err;
      }
    },
    [loadPatient]
  );

  const demoLogin = useCallback(async () => {
    setError(null);
    const tokens = await demoLoginPortal();
    if (!tokens?.access) {
      throw new Error("Demo login response did not include an access token.");
    }

    setAuthTokens({
      access: tokens.access,
      refresh: tokens.refresh ?? null,
    });

    await loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setPatient(null);
      setStatus("anonymous");
      queryClient.clear();
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [queryClient]);

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
