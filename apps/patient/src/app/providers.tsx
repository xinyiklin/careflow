import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "../features/auth/AuthProvider";
import { ThemeProvider } from "../shared/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
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

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
