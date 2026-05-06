import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { AuthProvider } from "../features/auth/AuthProvider";
import { FacilityProvider } from "../features/facilities/FacilityProvider";
import { ThemeProvider } from "../shared/context/ThemeProvider";
import { UserPreferencesProvider } from "../shared/context/UserPreferencesProvider";

import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function AppProviders({ children }: { children: ReactNode }) {
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
