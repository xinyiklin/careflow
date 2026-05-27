export function getAdminLandingPath({
  canAccessOrganizationAdmin,
  canAccessFacilityAdmin,
}: {
  canAccessOrganizationAdmin?: boolean;
  canAccessFacilityAdmin?: boolean;
}): string | null {
  if (canAccessFacilityAdmin) return "/admin/facility";
  if (canAccessOrganizationAdmin) return "/admin/organization";
  return null;
}
