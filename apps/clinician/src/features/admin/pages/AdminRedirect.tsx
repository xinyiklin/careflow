import { Navigate } from "react-router-dom";

import AdminAccessDenied from "../components/shared/AdminAccessDenied";
import useAdminPermissions from "../hooks/shared/useAdminPermissions";
import { getAdminLandingPath } from "../utils/adminRoutes";

export default function AdminRedirect() {
  const permissions = useAdminPermissions();
  const landingPath = getAdminLandingPath(permissions);

  if (!landingPath) {
    return <AdminAccessDenied />;
  }

  return <Navigate to={landingPath} replace />;
}
