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

  // While auth is still resolving, render nothing for the first 150ms
  // (delay window inside ``useMinimumLoading``), then the LoadingScreen
  // once that delay elapses. Critically: do NOT fall through to the
  // /login routes during this window — that's what caused the brief
  // login flash on reload for already-signed-in users.
  if (status === "loading") {
    return showLoading ? <LoadingScreen /> : null;
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
