import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Landmark } from "lucide-react";

import useAdminPermissions from "../../hooks/shared/useAdminPermissions";

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

  const isOrganizationScope = location.pathname.startsWith(
    "/admin/organization"
  );
  const isFacilityScope = location.pathname.startsWith("/admin/facility");
  const wrapperClass = mobile
    ? "grid grid-cols-2 gap-1 rounded-2xl border border-cf-border bg-cf-surface p-1 shadow-[var(--shadow-panel)]"
    : "mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-cf-border bg-cf-page-bg p-1";
  const buttonClass = (active: boolean) =>
    [
      "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 font-semibold transition",
      mobile ? "text-sm" : "text-xs",
      active
        ? "bg-cf-text text-cf-page-bg shadow-[var(--shadow-panel)]"
        : "text-cf-text-muted hover:bg-cf-surface hover:text-cf-text",
    ].join(" ");

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => navigate("/admin/facility")}
        className={buttonClass(isFacilityScope)}
      >
        <Building2 className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Facility
      </button>
      <button
        type="button"
        onClick={() => navigate("/admin/organization")}
        className={buttonClass(isOrganizationScope)}
      >
        <Landmark className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {mobile ? "Organization" : "Org"}
      </button>
    </div>
  );
}
