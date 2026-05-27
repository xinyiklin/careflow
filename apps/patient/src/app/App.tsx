import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { Layout } from "./Layout";
import { PortalRoutes } from "./router";

export function App() {
  const { status, patient } = useAuth();

  if (status === "loading") {
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
