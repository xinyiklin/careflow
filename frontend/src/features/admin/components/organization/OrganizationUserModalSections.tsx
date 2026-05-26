import { Mail, Building2 } from "lucide-react";
import { Badge } from "../../../../shared/components/ui";
import type { AdminOrganizationUserForm, AdminFacility } from "../../types";

const ROLE_LABELS: Record<AdminOrganizationUserForm["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function getDisplayName(formData: AdminOrganizationUserForm) {
  const fullName = [formData.first_name, formData.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || formData.username || "New User";
}

type UserPreviewPanelProps = {
  formData: AdminOrganizationUserForm;
  initials: string;
  facilities: AdminFacility[];
  loadingFacilities: boolean;
};

export function UserPreviewPanel({
  formData,
  initials,
  facilities,
  loadingFacilities,
}: UserPreviewPanelProps) {
  const totalFacilitiesCount = facilities.length;
  const accessedFacilities = formData.facility_ids || [];
  const adminFacilities = formData.admin_facility_ids || [];

  return (
    <div className="flex flex-col items-center bg-cf-surface-soft/20 border border-cf-border/40 rounded-2xl p-6 text-center space-y-5 h-full md:sticky md:top-2">
      {/* Avatar */}
      <div className="h-20 w-20 rounded-full bg-cf-accent/10 border border-cf-accent/30 text-cf-accent flex items-center justify-center text-2xl font-extrabold shadow-sm">
        {initials}
      </div>

      {/* Title & Metadata */}
      <div className="space-y-1 w-full">
        <h4 className="truncate text-base font-bold tracking-tight text-cf-text">
          {getDisplayName(formData)}
        </h4>
        <p className="truncate text-xs font-semibold tracking-wider uppercase text-cf-text-muted mt-0.5">
          {formData.username ? `@${formData.username}` : "New User"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        <Badge variant="outline">{ROLE_LABELS[formData.role]}</Badge>
        <Badge variant={formData.is_active ? "success" : "muted"}>
          {formData.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Detail list */}
      <div className="w-full border-t border-cf-border/50 pt-4 text-left space-y-3.5 text-xs font-semibold mt-auto">
        <div className="flex gap-2">
          <Mail className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
              Email
            </span>
            <span className="text-cf-text block truncate">
              {formData.email || "No email provided"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Building2 className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
              Facility Coverage
            </span>
            <span className="text-cf-text block truncate">
              {loadingFacilities ? (
                "Loading..."
              ) : (
                <>
                  {accessedFacilities.length} of {totalFacilitiesCount}{" "}
                  {totalFacilitiesCount === 1 ? "facility" : "facilities"}
                  {adminFacilities.length > 0 &&
                    ` (${adminFacilities.length} Admin)`}
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
