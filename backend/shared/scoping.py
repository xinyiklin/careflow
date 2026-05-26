from rest_framework.exceptions import PermissionDenied, ValidationError

from facilities.access import (
    get_default_staff_profile,
    get_facility_for_user,
    get_staff_profile_for_facility,
)


class FacilityScopedViewSetMixin:
    """Resolve a Staff profile (and its facility) for the current request.

    Picks the requested facility via the ``facility_id`` query parameter when
    present; otherwise falls back to the user's default staff profile.
    """

    _staff_profile_cache_attr = "_facility_scoped_staff_profile"

    def get_staff_profile(self):
        cached = getattr(self, self._staff_profile_cache_attr, None)
        if cached is not None:
            return cached

        facility_id = self.request.query_params.get("facility_id")
        if facility_id:
            profile = get_staff_profile_for_facility(self.request.user, facility_id)
            if not profile:
                raise PermissionDenied("You do not have access to this facility.")
        else:
            profile = get_default_staff_profile(self.request.user)
            if not profile:
                raise PermissionDenied(
                    "No active default facility found. If the user has multiple "
                    "facilities, one must be default."
                )

        setattr(self, self._staff_profile_cache_attr, profile)
        return profile

    def get_facility(self):
        return self.get_staff_profile().facility

    def parse_positive_int_query_param(self, field_name):
        value = self.request.query_params.get(field_name)
        if not value:
            return None
        try:
            parsed_value = int(value)
        except (TypeError, ValueError):
            raise ValidationError({field_name: ["Use a numeric id."]})
        if parsed_value <= 0:
            raise ValidationError({field_name: ["Use a positive numeric id."]})
        return parsed_value


class OrgAdminFacilityScopedViewSetMixin:
    """Resolve a facility usable by org admins or facility staff.

    Uses :func:`get_facility_for_user`, which allows org admins to operate
    against any active facility in their organization; staff users fall back
    to their default facility membership.
    """

    _facility_cache_attr = "_facility_scoped_facility"

    def get_facility(self):
        cached = getattr(self, self._facility_cache_attr, None)
        if cached is not None:
            return cached

        facility_id = self.request.query_params.get("facility_id")
        facility = get_facility_for_user(self.request.user, facility_id)
        setattr(self, self._facility_cache_attr, facility)
        return facility
