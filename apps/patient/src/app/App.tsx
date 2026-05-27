import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../features/auth/AuthProvider";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { Layout } from "./Layout";

function DashboardPlaceholder() {
  const { patient } = useAuth();
  return (
    <div className="px-6 py-10">
      <h1 className="text-2xl font-semibold text-cf-text">
        Welcome, {patient?.first_name ?? "Patient"}
      </h1>
      <p className="mt-2 text-sm text-cf-text-muted">
        Your portal is in scaffolding. Appointments, medications, and allergies
        land in the next change.
      </p>
    </div>
  );
}

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
      <Routes>
        <Route path="/" element={<DashboardPlaceholder />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
