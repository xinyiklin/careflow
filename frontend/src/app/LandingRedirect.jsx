import { Navigate } from "react-router-dom";

import useAdminPermissions from "../features/admin/hooks/shared/useAdminPermissions";
import { getAdminLandingPath } from "../features/admin/utils/adminRoutes";
import { useUserPreferences } from "../shared/context/UserPreferencesProvider";

function getLandingPath(preferences, adminPermissions) {
  if (preferences.defaultLandingPage === "schedule") return "/schedule";

  if (preferences.defaultLandingPage === "admin") {
    return getAdminLandingPath(adminPermissions) || "/schedule";
  }

  return "/schedule";
}

export default function LandingRedirect() {
  const { preferences } = useUserPreferences();
  const adminPermissions = useAdminPermissions();

  return (
    <Navigate to={getLandingPath(preferences, adminPermissions)} replace />
  );
}
