import { Navigate } from "react-router-dom";

import { AccessDenied } from "../../../shared/components/ui";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";
import { getAdminLandingPath } from "../utils/adminRoutes";

export default function AdminRedirect() {
  const permissions = useAdminPermissions();
  const landingPath = getAdminLandingPath(permissions);

  if (!landingPath) {
    return (
      <AccessDenied message="You do not have permission to access this workspace." />
    );
  }

  return <Navigate to={landingPath} replace />;
}
