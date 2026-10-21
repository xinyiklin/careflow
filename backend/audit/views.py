from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from facilities.security import user_has_facility_permission
from organizations.permissions import get_user_organization_membership, is_org_admin

from .models import AuditEvent
from .serializers import AuditEventSerializer


def parse_positive_int_param(query_params, field_name):
    """Return the query param as a positive int, None when absent, or 400."""
    value = query_params.get(field_name)
    if not value:
        return None
    try:
        parsed_value = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: ["Use a numeric id."]})
    if parsed_value <= 0:
        raise ValidationError({field_name: ["Use a positive numeric id."]})
    return parsed_value


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AuditEvent.objects.select_related("actor", "facility", "patient").order_by(
            "-created_at"
        )

        facility_id = parse_positive_int_param(self.request.query_params, "facility")
        scope = self.request.query_params.get("scope")

        if is_org_admin(self.request.user):
            membership = get_user_organization_membership(self.request.user)
            qs = qs.filter(
                Q(facility__organization_id=membership.organization_id)
                | Q(
                    facility__isnull=True,
                    actor__org_membership__organization_id=membership.organization_id,
                )
            )
            if scope == "organization":
                qs = qs.filter(facility__isnull=True).filter(
                    Q(metadata__organization_id=membership.organization_id)
                    | Q(
                        actor__org_membership__organization_id=membership.organization_id
                    )
                )
        else:
            if not facility_id:
                raise PermissionDenied(
                    "Facility-scoped audit events require a facility."
                )
            if not user_has_facility_permission(
                self.request.user,
                facility_id,
                "audit.view",
            ):
                raise PermissionDenied(
                    "You do not have access to this facility activity log."
                )
            qs = qs.filter(facility_id=facility_id)

        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        app_label = self.request.query_params.get("app_label")
        if app_label:
            qs = qs.filter(app_label=app_label)

        if facility_id:
            qs = qs.filter(facility_id=facility_id)

        patient_id = parse_positive_int_param(self.request.query_params, "patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        return qs
