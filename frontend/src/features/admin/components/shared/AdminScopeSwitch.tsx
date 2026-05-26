import { useLocation, useNavigate } from "react-router-dom";

import { SegmentedControl } from "../../../../shared/components/ui";
import useAdminPermissions from "../../hooks/shared/useAdminPermissions";

type AdminScope = "facility" | "organization";

const SCOPE_OPTIONS = [
  { value: "facility" as const, label: "Facility" },
  { value: "organization" as const, label: "Org" },
] satisfies readonly { value: AdminScope; label: string }[];

const SCOPE_OPTIONS_MOBILE = [
  { value: "facility" as const, label: "Facility" },
  { value: "organization" as const, label: "Organization" },
] satisfies readonly { value: AdminScope; label: string }[];

export default function AdminScopeSwitch({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessFacilityAdmin, canAccessOrganizationAdmin } =
    useAdminPermissions();

  if (!canAccessFacilityAdmin || !canAccessOrganizationAdmin) return null;

  const currentScope: AdminScope = location.pathname.startsWith(
    "/admin/organization"
  )
    ? "organization"
    : "facility";

  return (
    <SegmentedControl
      options={mobile ? SCOPE_OPTIONS_MOBILE : SCOPE_OPTIONS}
      value={currentScope}
      onChange={(scope) => navigate(`/admin/${scope}`)}
      size={mobile ? "md" : "sm"}
      className={mobile ? "shadow-[var(--shadow-panel)]" : undefined}
    />
  );
}
