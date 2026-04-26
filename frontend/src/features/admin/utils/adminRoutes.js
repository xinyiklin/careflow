export function getAdminLandingPath({
  canAccessOrganizationAdmin,
  canAccessFacilityAdmin,
}) {
  if (canAccessFacilityAdmin) return "/admin/facility";
  if (canAccessOrganizationAdmin) return "/admin/organization";
  return null;
}
