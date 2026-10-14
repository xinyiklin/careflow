from django.db import transaction
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from audit.models import AuditEvent
from organizations.permissions import get_user_organization_membership, is_org_admin
from shared.scoping import OrgAdminFacilityScopedViewSetMixin

from .access import (
    holds_facility_administration,
    lock_facility_roles,
    lock_facility_security_staff,
    lock_organization_memberships,
    user_can_manage_facility_security,
    validate_staff_security_transition,
)
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
    request, *, facility, model_name, object_pk, summary, metadata, action="update"
):
    AuditEvent.objects.create(
        actor=request.user,
        facility=facility,
        action=action,
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
        facility = self.get_facility()

        # Every membership carries a role, and assigning a role grants its
        # permissions, so creation is a security-management operation gated
        # exactly like a role change in perform_update.
        if not user_can_manage_facility_security(self.request.user, facility.id):
            raise PermissionDenied(
                "You do not have permission to manage security permissions."
            )
        staff = serializer.save(facility=facility)

        create_security_audit_event(
            self.request,
            facility=staff.facility,
            model_name="staff",
            object_pk=staff.pk,
            action="create",
            summary=f"Created staff membership for {staff.user}",
            metadata={
                "changed_fields": ["Created"],
                "previous": {},
                "next": {
                    "role_id": staff.role_id,
                    "is_active": staff.is_active,
                    "security_overrides": staff.security_overrides or {},
                },
                "user_id": staff.user_id,
            },
        )

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
        active_is_changing = (
            "is_active" in serializer.validated_data
            and serializer.validated_data["is_active"] != serializer.instance.is_active
        )

        # Non-security edits (profile fields only) bypass the security gates.
        if not (role_is_changing or overrides_in_payload or active_is_changing):
            serializer.save()
            return

        # Role, active state, and per-staff overrides all determine effective
        # permissions, so changing any of them is a security-management
        # operation.
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
        prospective_is_active = serializer.validated_data.get(
            "is_active", serializer.instance.is_active
        )

        with transaction.atomic():
            serializer.instance = validate_staff_security_transition(
                actor=self.request.user,
                facility=facility,
                staff=serializer.instance,
                prospective_role=incoming_role,
                prospective_overrides=prospective_overrides,
                prospective_is_active=prospective_is_active,
            )

            previous_overrides = serializer.instance.security_overrides or {}
            previous_active = serializer.instance.is_active
            previous_role = serializer.instance.role
            serializer.save()
            if role_is_changing:
                create_security_audit_event(
                    self.request,
                    facility=serializer.instance.facility,
                    model_name="staff",
                    object_pk=serializer.instance.pk,
                    summary=(f"Updated staff role for {serializer.instance.user}"),
                    metadata={
                        "changed_fields": ["Role"],
                        "previous": {
                            "role_id": previous_role.id if previous_role else None,
                            "role": previous_role.name if previous_role else None,
                        },
                        "next": {
                            "role_id": serializer.instance.role_id,
                            "role": (
                                serializer.instance.role.name
                                if serializer.instance.role
                                else None
                            ),
                        },
                        "user_id": serializer.instance.user_id,
                    },
                )
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
            if active_is_changing:
                create_security_audit_event(
                    self.request,
                    facility=serializer.instance.facility,
                    model_name="staff",
                    object_pk=serializer.instance.pk,
                    summary=(
                        f"Updated staff active status for {serializer.instance.user}"
                    ),
                    metadata={
                        "changed_fields": ["Active status"],
                        "previous": {"is_active": previous_active},
                        "next": {"is_active": serializer.instance.is_active},
                        "user_id": serializer.instance.user_id,
                    },
                )

    def perform_destroy(self, instance):
        facility = self.get_facility()
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this staff membership.")

        if not instance.is_active:
            return

        if not user_can_manage_facility_security(self.request.user, facility.id):
            raise PermissionDenied(
                "You do not have permission to manage security permissions."
            )

        with transaction.atomic():
            facility_staff = lock_facility_security_staff(facility)

            if instance.user_id == self.request.user.id:
                raise PermissionDenied(
                    "You cannot deactivate your own staff membership. "
                    "This would lock you out."
                )

            had_admin = any(
                holds_facility_administration(
                    staff, staff.role, staff.security_overrides
                )
                for staff in facility_staff
            )
            has_admin_after = any(
                staff.id != instance.id
                and holds_facility_administration(
                    staff, staff.role, staff.security_overrides
                )
                for staff in facility_staff
            )
            if had_admin and not has_admin_after:
                raise PermissionDenied(
                    "This change would leave the facility without an "
                    "administrator. Assign another administrator first."
                )

            instance.is_active = False
            instance.save(update_fields=["is_active"])
            create_security_audit_event(
                self.request,
                facility=instance.facility,
                model_name="staff",
                object_pk=instance.pk,
                summary=f"Updated staff active status for {instance.user}",
                metadata={
                    "changed_fields": ["Active status"],
                    "previous": {"is_active": True},
                    "next": {"is_active": False},
                    "user_id": instance.user_id,
                },
            )


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
        facility = self.get_facility()
        role_code = serializer.validated_data.get("code")
        security_permissions = get_role_security_template(role_code)

        # A role template can grant the self-management permissions that define
        # a facility administrator, so creating such a role is a
        # security-management operation gated exactly like the update path.
        grants_self_management = any(
            security_permissions.get(permission, False)
            for permission in SELF_MANAGEMENT_PERMISSIONS
        )
        if grants_self_management and not user_can_manage_facility_security(
            self.request.user, facility.id
        ):
            raise PermissionDenied(
                "You do not have permission to manage security permissions."
            )

        role = serializer.save(
            facility=facility,
            security_permissions=security_permissions,
            is_system_role=False,
            is_deletable=True,
        )
        create_security_audit_event(
            self.request,
            facility=facility,
            model_name="staffrole",
            object_pk=role.pk,
            action="create",
            summary=f"Created role {role.name}",
            metadata={
                "changed_fields": ["Created"],
                "previous": {},
                "next": security_permissions,
            },
        )

    def perform_update(self, serializer):
        facility = self.get_facility()
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("Invalid facility.")

        with transaction.atomic():
            # Classify and save against the locked, committed row. Both paths
            # save the full row, so a pre-lock copy could silently undo a
            # concurrent permission or active-state change. Memberships lock
            # first to keep the memberships -> roles -> staff order.
            lock_organization_memberships(facility.organization_id)
            lock_facility_roles(facility)
            role = StaffRole.objects.get(pk=serializer.instance.pk)
            serializer.instance = role

            new_perms = serializer.validated_data.get("security_permissions")
            active_is_changing = (
                "is_active" in serializer.validated_data
                and serializer.validated_data["is_active"] != role.is_active
            )
            # Permission lookups require an active role, so deactivating a
            # role revokes every holder's access and is gated like a
            # permission edit.
            if new_perms is None and not active_is_changing:
                serializer.save()
                return

            if not user_can_manage_facility_security(self.request.user, facility.id):
                raise PermissionDenied(
                    "You do not have permission to manage security permissions."
                )

            facility_staff = lock_facility_security_staff(facility)
            prospective_is_active = serializer.validated_data.get(
                "is_active", role.is_active
            )
            prospective_permissions = (
                new_perms if new_perms is not None else role.security_permissions
            )

            user_has_role = any(
                staff.user_id == self.request.user.id and staff.role_id == role.id
                for staff in facility_staff
            )
            if user_has_role and not prospective_is_active:
                raise PermissionDenied(
                    "You cannot deactivate your own role. This would lock you out."
                )
            if (
                user_has_role
                and new_perms is not None
                and any(
                    not new_perms.get(permission, False)
                    for permission in SELF_MANAGEMENT_PERMISSIONS
                )
            ):
                raise PermissionDenied(
                    "You cannot remove administrative or security management "
                    "from your own role. This would lock you out."
                )

            def holds_admin_after(staff):
                if staff.role_id == role.id:
                    return holds_facility_administration(
                        staff,
                        role,
                        staff.security_overrides,
                        permissions=prospective_permissions,
                        is_active=prospective_is_active,
                    )
                return holds_facility_administration(
                    staff, staff.role, staff.security_overrides
                )

            had_admin = any(
                holds_facility_administration(
                    staff, staff.role, staff.security_overrides
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

            previous_permissions = role.security_permissions or {}
            previous_is_active = role.is_active
            members_affected = sum(
                1 for staff in facility_staff if staff.role_id == role.id
            )
            serializer.save()
            if new_perms is not None:
                create_security_audit_event(
                    self.request,
                    facility=serializer.instance.facility,
                    model_name="staffrole",
                    object_pk=serializer.instance.pk,
                    summary=(
                        f"Updated security permissions for role "
                        f"{serializer.instance.name}"
                    ),
                    metadata={
                        "changed_fields": ["Security permissions"],
                        "previous": previous_permissions,
                        "next": serializer.instance.security_permissions or {},
                        "members_affected": members_affected,
                    },
                )
            if active_is_changing:
                create_security_audit_event(
                    self.request,
                    facility=serializer.instance.facility,
                    model_name="staffrole",
                    object_pk=serializer.instance.pk,
                    summary=(
                        f"Updated active status for role {serializer.instance.name}"
                    ),
                    metadata={
                        "changed_fields": ["Active status"],
                        "previous": {"is_active": previous_is_active},
                        "next": {"is_active": serializer.instance.is_active},
                        "members_affected": members_affected,
                    },
                )

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("Invalid facility.")

        if not instance.is_deletable:
            raise PermissionDenied("This protected role cannot be deleted.")

        if Staff.objects.filter(role=instance).exists():
            raise ValidationError(
                {"detail": "Reassign staff members before deleting this role."}
            )

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
