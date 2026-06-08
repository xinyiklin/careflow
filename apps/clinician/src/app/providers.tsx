import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { AuthProvider } from "../features/auth/AuthProvider";
import { FacilityProvider } from "../features/facilities/FacilityProvider";
import { ThemeProvider } from "../shared/context/ThemeProvider";
import { UserPreferencesProvider } from "./context/UserPreferencesProvider";

import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      // Don't retry 401s: the API client already refreshes once and emits
      // auth:logout on failure, so retrying just repeats a doomed request.
      retry: (failureCount, error) => {
        const status =
          error && typeof error === "object" && "status" in error
            ? (error as { status?: unknown }).status
            : undefined;
        return status !== 401 && failureCount < 1;
      },
    },
  },
});

export default function AppProviders({ children }: { children: ReactNode }) {
  // Drop all cached data on logout so a second user on a shared workstation
  // never sees the previous user's patient/message/billing data. logoutUser()
  // and the API client's session-expiry path both dispatch auth:logout.
  useEffect(() => {
    const handleAuthLogout = () => {
      queryClient.clear();
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <UserPreferencesProvider>
              <FacilityProvider>{children}</FacilityProvider>
            </UserPreferencesProvider>
          </AuthProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
