import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { logoutUser, setAuthTokens } from "../../shared/api/client";
import {
  login as loginApi,
  demoLogin as demoLoginApi,
  fetchUserProfile,
} from "./api/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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
      setUser(data);
    } catch (err) {
      if (err?.status !== 401) {
        console.error("Failed to fetch user:", err);
      }
      logout(false);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(
    async ({ username, password }) => {
      const data = await loginApi({ username, password });

      setAuthTokens({ access: data.access, refresh: data.refresh });

      await fetchCurrentUser();
    },
    [fetchCurrentUser]
  );

  const demoLogin = useCallback(async () => {
    const data = await demoLoginApi();

    setAuthTokens({ access: data.access, refresh: data.refresh });

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
    fetchCurrentUser();
  }, [fetchCurrentUser]);

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
