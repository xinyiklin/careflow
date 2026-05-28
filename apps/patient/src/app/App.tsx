import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import useMinimumLoading from "../shared/hooks/useMinimumLoading";
import { Layout } from "./Layout";
import { PortalRoutes } from "./router";

export function App() {
  const { status, patient } = useAuth();
  // ``useMinimumLoading`` swallows sub-150ms transitions and forces a
  // minimum 300ms display once shown — keeps the LoadingScreen from
  // flashing on quick auth restores.
  const showLoading = useMinimumLoading(status === "loading");

  if (showLoading) {
    return <LoadingScreen />;
  }

  if (status === "anonymous" || !patient) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <PortalRoutes />
    </Layout>
  );
}
