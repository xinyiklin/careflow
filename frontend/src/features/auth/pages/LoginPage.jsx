import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import LoginForm from "../components/LoginForm";
import { useAuth } from "../AuthProvider";
import LoadingScreen from "../../../shared/components/LoadingScreen";
import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { getErrorMessage } from "../../../shared/utils/errors";

export default function LoginPage() {
  const { user, loading, login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const showSessionLoading = useMinimumLoading(loading);

  const handleLoginSubmit = async (credentials) => {
    setAuthSubmitting(true);
    setAuthError("");

    try {
      await login(credentials);
      navigate("/schedule", { replace: true });
    } catch (err) {
      setAuthError(getErrorMessage(err, "Invalid username or password."));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthSubmitting(true);
    setAuthError("");

    try {
      await demoLogin();
      navigate("/schedule", { replace: true });
    } catch (err) {
      setAuthError(getErrorMessage(err, "Demo login failed."));
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (showSessionLoading) {
    return (
      <LoadingScreen
        title="Checking session"
        message="Making sure your workspace is ready before sign in."
      />
    );
  }

  if (user) {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <LoginForm
      onSubmit={handleLoginSubmit}
      onDemoLogin={handleDemoLogin}
      error={authError}
      loading={authSubmitting}
    />
  );
}
