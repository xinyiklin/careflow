import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  logoutUser,
  restoreAuthSession,
  setAuthTokens,
} from "../../shared/api/client";
import {
  login as loginApi,
  demoLogin as demoLoginApi,
  fetchUserProfile,
} from "./api/users";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LoginCredentials } from "./api/users";
import type { UserProfile } from "../../shared/types/domain";

export type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: (setDoneLoading?: boolean) => void;
  setUser: Dispatch<SetStateAction<UserProfile | null>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((setDoneLoading = true) => {
    logoutUser();
    setUser(null);
    if (setDoneLoading) {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await fetchUserProfile();
      setUser(data ?? null);
    } catch (err) {
      if (getErrorStatus(err) !== 401) {
        console.error("Failed to fetch user:", err);
      }
      logout(false);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const restoreCurrentSession = useCallback(async () => {
    try {
      await restoreAuthSession();
      await fetchCurrentUser();
    } catch (err) {
      const status = getErrorStatus(err);
      if (status && status !== 401) {
        console.error("Failed to restore session:", err);
      }
      setUser(null);
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = useCallback(
    async ({ username, password }: LoginCredentials) => {
      const data = await loginApi({ username, password });
      if (!data?.access) {
        throw new Error("Login response did not include an access token.");
      }

      setAuthTokens({ access: data.access, refresh: data.refresh ?? null });

      await fetchCurrentUser();
    },
    [fetchCurrentUser]
  );

  const demoLogin = useCallback(async () => {
    const data = await demoLoginApi();
    if (!data?.access) {
      throw new Error("Demo login response did not include an access token.");
    }

    setAuthTokens({ access: data.access, refresh: data.refresh ?? null });

    if (data.user) {
      setUser(data.user);
      setLoading(false);
      return;
    }

    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  useEffect(() => {
    restoreCurrentSession();
  }, [restoreCurrentSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        demoLogin,
        logout,
        setUser,
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
