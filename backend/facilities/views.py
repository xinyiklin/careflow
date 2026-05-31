from django.db import transaction
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.models import AuditEvent
from organizations.permissions import get_user_organization_membership, is_org_admin
from shared.scoping import OrgAdminFacilityScopedViewSetMixin

from .access import lock_facility_security_staff, user_can_manage_facility_security
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
from .security import (
    SELF_MANAGEMENT_PERMISSIONS,
    get_role_security_template,
    holds_all_self_management,
)
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
        facility = self.get_facility()
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this staff membership.")

        incoming_role = serializer.validated_data.get("role", serializer.instance.role)
        role_is_changing = (
            "role" in serializer.validated_data
            and incoming_role != serializer.instance.role
        )
        overrides_in_payload = "security_overrides" in serializer.validated_data

        # Non-security edits (profile fields only) bypass the security gates.
        if not (role_is_changing or overrides_in_payload):
            serializer.save()
            return

        # Role and per-staff overrides both determine effective permissions, so
        # changing either is a security-management operation.
        if not user_can_manage_facility_security(self.request.user, facility.id):
            raise PermissionDenied(
                "You do not have permission to manage security permissions."
            )

        # The overrides that will be in effect after save: the incoming map when
        # present, otherwise the row's existing overrides.
        prospective_overrides = (
            serializer.validated_data["security_overrides"]
            if overrides_in_payload
            else serializer.instance.security_overrides
        )
        prospective_role_permissions = (
            incoming_role.security_permissions if incoming_role else {}
        )

        with transaction.atomic():
            facility_staff = lock_facility_security_staff(facility)

            if serializer.instance.user_id == self.request.user.id:
                # Evaluate against the INCOMING role and post-save overrides —
                # otherwise a self role-downgrade could silently drop access.
                if not holds_all_self_management(
                    prospective_role_permissions, prospective_overrides
                ):
                    raise PermissionDenied(
                        "You cannot remove your own administrative or security "
                        "management access. This would lock you out."
                    )

            staying_active = serializer.validated_data.get(
                "is_active", serializer.instance.is_active
            )

            def holds_admin_after(staff):
                if staff.id == serializer.instance.id:
                    if not staying_active:
                        return False
                    return holds_all_self_management(
                        prospective_role_permissions, prospective_overrides
                    )
                return holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
                )

            had_admin = any(
                holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
                )
                for staff in facility_staff
            )
            if had_admin and not any(
                holds_admin_after(staff) for staff in facility_staff
            ):
                raise PermissionDenied(
                    "This change would leave the facility without an "
                    "administrator. Assign another administrator first."
                )

            previous_overrides = serializer.instance.security_overrides or {}
            serializer.save()
            if "security_overrides" in serializer.validated_data:
                create_security_audit_event(
                    self.request,
                    facility=serializer.instance.facility,
                    model_name="staff",
                    object_pk=serializer.instance.pk,
                    summary=(
                        f"Updated security overrides for {serializer.instance.user}"
                    ),
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
        facility = self.get_facility()
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("Invalid facility.")

        new_perms = serializer.validated_data.get("security_permissions")
        if new_perms is None:
            serializer.save()
            return

        if not user_can_manage_facility_security(self.request.user, facility.id):
            raise PermissionDenied(
                "You do not have permission to manage security permissions."
            )

        with transaction.atomic():
            facility_staff = lock_facility_security_staff(facility)

            user_has_role = any(
                staff.user_id == self.request.user.id
                and staff.role_id == serializer.instance.id
                for staff in facility_staff
            )
            if user_has_role and any(
                not new_perms.get(permission, False)
                for permission in SELF_MANAGEMENT_PERMISSIONS
            ):
                raise PermissionDenied(
                    "You cannot remove administrative or security management "
                    "from your own role. This would lock you out."
                )

            def holds_admin_after(staff):
                role_permissions = (
                    new_perms
                    if staff.role_id == serializer.instance.id
                    else (staff.role.security_permissions if staff.role else {})
                )
                return holds_all_self_management(
                    role_permissions, staff.security_overrides
                )

            had_admin = any(
                holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
                )
                for staff in facility_staff
            )
            if had_admin and not any(
                holds_admin_after(staff) for staff in facility_staff
            ):
                raise PermissionDenied(
                    "This change would leave the facility without an "
                    "administrator. Assign another administrator first."
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
