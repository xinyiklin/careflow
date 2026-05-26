from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.models import AuditEvent
from organizations.permissions import get_user_organization_membership, is_org_admin
from shared.scoping import OrgAdminFacilityScopedViewSetMixin

from .models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    FacilityResource,
    PatientGender,
    Staff,
    StaffRole,
    StaffTitle,
)
from .permissions import (
    IsFacilityAdminOrReadOnly,
    IsOrgAdminOrFacilityAdmin,
)
from .security import get_role_security_template
from .serializers import (
    AppointmentStatusSerializer,
    AppointmentTypeSerializer,
    FacilityResourceSerializer,
    FacilitySerializer,
    PatientGenderSerializer,
    StaffRoleSerializer,
    StaffSerializer,
    StaffTitleSerializer,
)


def create_security_audit_event(
    request, *, facility, model_name, object_pk, summary, metadata
):
    AuditEvent.objects.create(
        actor=request.user,
        facility=facility,
        action="update",
        app_label="facilities",
        model_name=model_name,
        object_pk=str(object_pk),
        summary=summary,
        metadata=metadata,
    )


class FacilityViewSet(viewsets.ModelViewSet):
    serializer_class = FacilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdminOrFacilityAdmin]

    def get_queryset(self):
        membership = get_user_organization_membership(self.request.user)
        if not membership:
            return Facility.objects.none()

        queryset = Facility.objects.filter(
            organization_id=membership.organization_id
        ).order_by("name")

        if not is_org_admin(self.request.user):
            facility_ids = Staff.objects.filter(
                user=self.request.user, is_active=True
            ).values_list("facility_id", flat=True)
            queryset = queryset.filter(id__in=facility_ids)

        return queryset

    def perform_create(self, serializer):
        membership = get_user_organization_membership(self.request.user)
        serializer.save(organization=membership.organization)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class StaffViewSet(OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        queryset = (
            Staff.objects.filter(facility=self.get_facility())
            .select_related("user", "facility", "role", "title", "resource")
            .order_by("user__last_name", "user__first_name")
        )

        role_code = self.request.query_params.get("role")
        if role_code:
            queryset = queryset.filter(role__code=role_code)

        return queryset

    def perform_create(self, serializer):
        serializer.save(facility=self.get_facility())

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this staff membership.")
        previous_overrides = serializer.instance.security_overrides or {}
        serializer.save()
        if "security_overrides" in serializer.validated_data:
            create_security_audit_event(
                self.request,
                facility=serializer.instance.facility,
                model_name="staff",
                object_pk=serializer.instance.pk,
                summary=f"Updated security overrides for {serializer.instance.user}",
                metadata={
                    "changed_fields": ["Security overrides"],
                    "previous": previous_overrides,
                    "next": serializer.instance.security_overrides or {},
                    "user_id": serializer.instance.user_id,
                },
            )

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this staff membership.")
        instance.is_active = False
        instance.save()


class AppointmentStatusViewSet(
    OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet
):
    serializer_class = AppointmentStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return AppointmentStatus.objects.filter(facility=self.get_facility()).order_by(
            "name"
        )

    def perform_create(self, serializer):
        serializer.save(facility=self.get_facility())

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        previous_values = {
            "name": serializer.instance.name,
            "code": serializer.instance.code,
            "color": str(serializer.instance.color),
            "is_active": serializer.instance.is_active,
            "is_billable": serializer.instance.is_billable,
        }
        serializer.save()
        changed_fields = [
            field
            for field in ["name", "code", "color", "is_active", "is_billable"]
            if field in serializer.validated_data
            and previous_values[field] != getattr(serializer.instance, field)
        ]
        if changed_fields:
            create_security_audit_event(
                self.request,
                facility=serializer.instance.facility,
                model_name="appointmentstatus",
                object_pk=serializer.instance.pk,
                summary=f"Updated appointment status {serializer.instance.name}",
                metadata={
                    "changed_fields": changed_fields,
                    "previous": previous_values,
                    "next": {
                        "name": serializer.instance.name,
                        "code": serializer.instance.code,
                        "color": str(serializer.instance.color),
                        "is_active": serializer.instance.is_active,
                        "is_billable": serializer.instance.is_billable,
                    },
                },
            )

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        instance.is_active = False
        instance.save()


class AppointmentTypeViewSet(OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AppointmentTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return AppointmentType.objects.filter(facility=self.get_facility()).order_by(
            "name"
        )

    def perform_create(self, serializer):
        serializer.save(facility=self.get_facility())

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        instance.is_active = False
        instance.save()


class FacilityResourceViewSet(
    OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet
):
    serializer_class = FacilityResourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return (
            FacilityResource.objects.filter(facility=self.get_facility())
            .select_related("linked_staff__user", "linked_staff__title")
            .order_by("name", "id")
        )

    def perform_create(self, serializer):
        serializer.save(
            facility=self.get_facility(),
            is_deletable=True,
        )

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class StaffRoleViewSet(OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = StaffRoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return StaffRole.objects.filter(facility=self.get_facility()).order_by("name")

    def perform_create(self, serializer):
        role_code = serializer.validated_data.get("code")
        serializer.save(
            facility=self.get_facility(),
            security_permissions=get_role_security_template(role_code),
            is_system_role=False,
            is_deletable=True,
        )

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")

        new_perms = serializer.validated_data.get("security_permissions")
        if new_perms is not None and not new_perms.get("admin.security.manage", False):
            user_has_role = Staff.objects.filter(
                user=self.request.user,
                facility=self.get_facility(),
                role=serializer.instance,
                is_active=True,
            ).exists()
            if user_has_role:
                raise PermissionDenied(
                    "Cannot remove security management from your own role. "
                    "This would lock you out of the security panel."
                )

        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")

        if not instance.is_deletable:
            instance.is_active = False
            instance.save()
            return

        instance.delete()


class StaffTitleViewSet(OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = StaffTitleSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return StaffTitle.objects.filter(facility=self.get_facility()).order_by("name")

    def perform_create(self, serializer):
        serializer.save(
            facility=self.get_facility(),
            is_deletable=True,
        )

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")

        if not instance.is_deletable:
            instance.is_active = False
            instance.save()
            return

        instance.delete()


class PatientGenderViewSet(OrgAdminFacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PatientGenderSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return PatientGender.objects.filter(facility=self.get_facility()).order_by(
            "sort_order", "name"
        )

    def perform_create(self, serializer):
        serializer.save(
            facility=self.get_facility(),
            is_deletable=True,
        )

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")

        if not instance.is_deletable:
            instance.is_active = False
            instance.save()
            return

        instance.delete()
