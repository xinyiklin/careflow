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

        # security_overrides is writable, and a role can itself grant security
        # self-management, so creating a membership with either is a
        # security-management operation gated exactly like perform_update.
        overrides_in_payload = "security_overrides" in serializer.validated_data
        incoming_role = serializer.validated_data.get("role")
        role_self_manages_security = bool(
            incoming_role
            and holds_all_self_management(incoming_role.security_permissions, None)
        )
        can_manage_security = user_can_manage_facility_security(
            self.request.user, facility.id
        )

        if (overrides_in_payload or role_self_manages_security) and (
            not can_manage_security
        ):
            if role_self_manages_security:
                raise PermissionDenied(
                    "You do not have permission to manage security permissions."
                )
            # Actor may create the membership but not the security overrides;
            # strip them rather than persisting an unauthorized escalation.
            staff = serializer.save(facility=facility, security_overrides={})
        else:
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
        prospective_role_permissions = (
            incoming_role.security_permissions if incoming_role else {}
        )
        prospective_is_active = serializer.validated_data.get(
            "is_active", serializer.instance.is_active
        )

        with transaction.atomic():
            facility_staff = lock_facility_security_staff(facility)
            if serializer.instance.id not in {staff.id for staff in facility_staff}:
                facility_staff.append(
                    Staff.objects.select_for_update(of=("self",))
                    .select_related("role")
                    .get(pk=serializer.instance.pk)
                )

            if serializer.instance.user_id == self.request.user.id:
                # Evaluate against the INCOMING role and post-save overrides —
                # otherwise a self role-downgrade could silently drop access.
                if not prospective_is_active or not holds_all_self_management(
                    prospective_role_permissions, prospective_overrides
                ):
                    raise PermissionDenied(
                        "You cannot remove your own administrative or security "
                        "management access. This would lock you out."
                    )

            def holds_admin_after(staff):
                if staff.id == serializer.instance.id:
                    if not prospective_is_active:
                        return False
                    return holds_all_self_management(
                        prospective_role_permissions, prospective_overrides
                    )
                if not staff.is_active:
                    return False
                return holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
                )

            had_admin = any(
                staff.is_active
                and holds_all_self_management(
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
                holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
                )
                for staff in facility_staff
            )
            has_admin_after = any(
                staff.id != instance.id
                and holds_all_self_management(
                    staff.role.security_permissions if staff.role else {},
                    staff.security_overrides,
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

            previous_permissions = serializer.instance.security_permissions or {}
            members_affected = sum(
                1 for staff in facility_staff if staff.role_id == serializer.instance.id
            )
            serializer.save()
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
