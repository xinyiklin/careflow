import { Navigate } from "react-router-dom";

import useAdminPermissions from "../features/admin/hooks/shared/useAdminPermissions";
import { getAdminLandingPath } from "../features/admin/utils/adminRoutes";
import { useUserPreferences } from "../shared/context/UserPreferencesProvider";

import type { AdminPermissions } from "../features/admin/hooks/shared/useAdminPermissions";
import type { UserPreferences } from "../shared/types/domain";

function getLandingPath(
  preferences: UserPreferences,
  adminPermissions: AdminPermissions
) {
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
