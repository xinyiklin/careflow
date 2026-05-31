from django.db.models import Prefetch
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.access import get_facility_for_user
from facilities.models import Staff
from facilities.security import (
    get_effective_staff_permissions,
    user_has_facility_permission,
)

from .models import (
    FacilityPharmacyPreferenceOverride,
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
    OrganizationRole,
)
from .permissions import (
    can_manage_org_security,
    get_user_organization_membership,
    is_org_admin,
    is_org_owner,
)
from .security import get_org_role_security_template, normalize_org_security_permissions
from .serializers import (
    FacilityPharmacyPreferenceOverrideSerializer,
    OrganizationDetailSerializer,
    OrganizationPersonCreateSerializer,
    OrganizationPersonSerializer,
    OrganizationPharmacyPreferenceSerializer,
    OrganizationPharmacyPreferenceWriteSerializer,
    OrganizationRoleSerializer,
    OrganizationSecuritySerializer,
    OrganizationSerializer,
)

ORGANIZATION_PHARMACY_MANAGEMENT_PERMISSION = "pharmacies.organization.manage"
FACILITY_PHARMACY_MANAGEMENT_PERMISSION = "pharmacies.facility.manage"


def user_can_manage_organization_pharmacies(user, organization):
    if user.is_superuser or is_org_admin(user):
        return True

    staff_profiles = user.staff_profiles.filter(
        facility__organization=organization,
        is_active=True,
    ).select_related("role")

    return any(
        get_effective_staff_permissions(staff).get(
            ORGANIZATION_PHARMACY_MANAGEMENT_PERMISSION, False
        )
        for staff in staff_profiles
    )


def require_org_security_manager(user, action="security"):
    """Return the user's membership if they may manage organization security,
    otherwise raise ``PermissionDenied``.

    Owners and superusers are break-glass and always qualify; every other role
    must hold the effective ``org.security.manage`` permission. ``action`` only
    customizes the denial message (e.g. "security" vs "roles").
    """
    membership = can_manage_org_security(user)
    if not membership:
        raise PermissionDenied(
            "Only organization owners or members granted security "
            f"management can manage {action}."
        )
    return membership


class FacilityPharmacyPreferenceOverrideViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FacilityPharmacyPreferenceOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_facility(self):
        facility = get_facility_for_user(
            self.request.user,
            self.request.query_params.get("facility_id"),
        )
        can_manage = user_has_facility_permission(
            self.request.user,
            facility.id,
            "admin.facility.manage",
        ) or user_has_facility_permission(
            self.request.user,
            facility.id,
            FACILITY_PHARMACY_MANAGEMENT_PERMISSION,
        )
        if not can_manage:
            raise PermissionDenied("You do not have access to pharmacy overrides.")
        return facility

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self.get_facility()
        return (
            FacilityPharmacyPreferenceOverride.objects.filter(facility=facility)
            .select_related(
                "facility",
                "pharmacy",
                "pharmacy__address",
                "organization_preference",
                "organization_preference__pharmacy",
                "organization_preference__pharmacy__address",
            )
            .order_by(
                "sort_order",
                "pharmacy__name",
                "organization_preference__pharmacy__name",
            )
        )

    def perform_create(self, serializer):
        override = serializer.save()
        pharmacy = override.effective_pharmacy
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="organizations",
            model_name="facilitypharmacypreferenceoverride",
            object_pk=override.pk,
            summary=f"Added facility pharmacy override {pharmacy.name if pharmacy else ''}",
            metadata={
                "facility_id": override.facility_id,
                "pharmacy_id": getattr(pharmacy, "id", None),
            },
        )

    def perform_update(self, serializer):
        override = serializer.save()
        pharmacy = override.effective_pharmacy
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="organizations",
            model_name="facilitypharmacypreferenceoverride",
            object_pk=override.pk,
            summary=f"Updated facility pharmacy override {pharmacy.name if pharmacy else ''}",
            metadata={
                "facility_id": override.facility_id,
                "pharmacy_id": getattr(pharmacy, "id", None),
                "is_active": override.is_active,
                "is_hidden": override.is_hidden,
            },
        )


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Organization.objects.all().order_by("name")

        membership = get_user_organization_membership(self.request.user)
        if not membership:
            return Organization.objects.none()

        return Organization.objects.filter(id=membership.organization_id)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrganizationDetailSerializer
        return OrganizationSerializer

    def perform_update(self, serializer):
        if self.request.user.is_superuser:
            serializer.save()
            return

        membership = get_user_organization_membership(self.request.user)
        if not membership:
            raise PermissionDenied("Organization membership required.")

        if membership.organization_id != serializer.instance.id:
            raise PermissionDenied("You do not have access to this organization.")

        if membership.role not in [
            OrganizationMembership.ROLE_OWNER,
            OrganizationMembership.ROLE_ADMIN,
        ]:
            raise PermissionDenied(
                "Only organization owners or admins can update organization details."
            )

        organization = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="organizations",
            model_name="organization",
            object_pk=organization.pk,
            summary=f"Updated organization {organization.name}",
            metadata={
                "organization_id": organization.pk,
            },
        )


class OrganizationPeopleViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_membership(self):
        membership = get_user_organization_membership(self.request.user)
        if not membership:
            raise PermissionDenied("Organization membership required.")
        return membership

    def get_queryset(self):
        membership = self.get_membership()

        if not is_org_admin(self.request.user) and not self.request.user.is_superuser:
            raise PermissionDenied("Only organization admins can manage people.")

        return (
            OrganizationMembership.objects.filter(organization=membership.organization)
            .select_related("user", "organization")
            .prefetch_related(
                Prefetch(
                    "user__staff_profiles",
                    queryset=Staff.objects.filter(
                        is_active=True,
                        facility__organization=membership.organization,
                    )
                    .select_related("facility", "role")
                    .order_by("facility__name"),
                    to_attr="active_org_staff_profiles",
                )
            )
            .order_by("user__username")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return OrganizationPersonCreateSerializer
        return OrganizationPersonSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        membership = get_user_organization_membership(self.request.user)
        if membership:
            context["organization"] = membership.organization
        return context

    def perform_create(self, serializer):
        if not is_org_admin(self.request.user) and not self.request.user.is_superuser:
            raise PermissionDenied("Only organization admins can create people.")

        membership = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="organizations",
            model_name="organizationmembership",
            object_pk=membership.pk,
            summary=f"Created organization person {membership.user}",
            metadata={
                "organization_id": membership.organization_id,
                "role": membership.role,
            },
        )

    def perform_update(self, serializer):
        target_membership = serializer.instance
        actor_membership = self.get_membership()

        if not self.request.user.is_superuser:
            if actor_membership.organization_id != target_membership.organization_id:
                raise PermissionDenied("You do not have access to this person.")

            if not is_org_admin(self.request.user):
                raise PermissionDenied("Only organization admins can update people.")

            if (
                target_membership.role == OrganizationMembership.ROLE_OWNER
                and not is_org_owner(self.request.user)
            ):
                raise PermissionDenied("Only an owner can modify another owner.")

        membership = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="organizations",
            model_name="organizationmembership",
            object_pk=membership.pk,
            summary=f"Updated organization person {membership.user}",
            metadata={
                "organization_id": membership.organization_id,
                "role": membership.role,
                "is_active": membership.is_active,
            },
        )


class OrganizationPharmacyPreferenceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_membership(self):
        membership = get_user_organization_membership(self.request.user)
        if not membership:
            raise PermissionDenied("Organization membership required.")
        return membership

    def get_queryset(self):
        membership = self.get_membership()

        if not user_can_manage_organization_pharmacies(
            self.request.user,
            membership.organization,
        ):
            raise PermissionDenied("You do not have access to pharmacy management.")

        return (
            OrganizationPharmacyPreference.objects.filter(
                organization=membership.organization
            )
            .select_related("pharmacy", "pharmacy__address", "organization")
            .order_by("sort_order", "pharmacy__name")
        )

    def get_serializer_class(self):
        if self.action in ["create", "partial_update", "update"]:
            return OrganizationPharmacyPreferenceWriteSerializer
        return OrganizationPharmacyPreferenceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        membership = get_user_organization_membership(self.request.user)
        if membership:
            context["organization"] = membership.organization
        return context

    def perform_create(self, serializer):
        membership = self.get_membership()

        if not user_can_manage_organization_pharmacies(
            self.request.user,
            membership.organization,
        ):
            raise PermissionDenied("You do not have access to pharmacy management.")

        preference = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="organizations",
            model_name="organizationpharmacypreference",
            object_pk=preference.pk,
            summary=f"Added organization pharmacy {preference.pharmacy.name}",
            metadata={
                "organization_id": preference.organization_id,
                "pharmacy_id": preference.pharmacy_id,
            },
        )

    def perform_update(self, serializer):
        target_preference = serializer.instance
        actor_membership = self.get_membership()

        if not self.request.user.is_superuser:
            if actor_membership.organization_id != target_preference.organization_id:
                raise PermissionDenied("You do not have access to this pharmacy.")

            if not user_can_manage_organization_pharmacies(
                self.request.user,
                actor_membership.organization,
            ):
                raise PermissionDenied("You do not have access to pharmacy management.")

        preference = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="organizations",
            model_name="organizationpharmacypreference",
            object_pk=preference.pk,
            summary=f"Updated organization pharmacy {preference.pharmacy.name}",
            metadata={
                "organization_id": preference.organization_id,
                "pharmacy_id": preference.pharmacy_id,
                "is_preferred": preference.is_preferred,
                "is_hidden": preference.is_hidden,
                "is_active": preference.is_active,
            },
        )


class OrganizationSecurityViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        membership = require_org_security_manager(request.user)
        org = membership.organization

        org_roles = OrganizationRole.objects.filter(
            organization=org, is_active=True
        ).order_by("-is_system_role", "name")

        roles_data = []
        for role in org_roles:
            perms = role.security_permissions
            if not perms:
                perms = get_org_role_security_template(role.code)

            member_count = OrganizationMembership.objects.filter(
                organization=org, role=role.code, is_active=True
            ).count()

            roles_data.append(
                {
                    "id": role.id,
                    "key": role.code,
                    "label": role.name,
                    "is_system_role": role.is_system_role,
                    "is_deletable": role.is_deletable,
                    "description": role.description,
                    "security_permissions": normalize_org_security_permissions(perms),
                    "member_count": member_count,
                }
            )

        return Response(roles_data)

    @action(detail=False, methods=["patch"], url_path="update-role")
    def update_role(self, request):
        membership = require_org_security_manager(request.user)
        org = membership.organization

        serializer = OrganizationSecuritySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data["role"]
        security_permissions = serializer.validated_data["security_permissions"]

        if role == OrganizationMembership.ROLE_OWNER:
            raise PermissionDenied(
                "The owner role is protected and its permissions cannot be "
                "modified. Owners always retain full access."
            )

        if role == membership.role and not security_permissions.get(
            "org.security.manage", False
        ):
            raise PermissionDenied(
                "Cannot remove security management from your own role. "
                "This would lock you out of the security panel."
            )

        OrganizationRole.objects.filter(organization=org, code=role).update(
            security_permissions=security_permissions
        )

        updated = OrganizationMembership.objects.filter(
            organization=org, role=role, is_active=True
        ).update(security_permissions=security_permissions)

        record_audit_event(
            actor=request.user,
            action="update",
            app_label="organizations",
            model_name="organizationmembership",
            object_pk=org.pk,
            summary=f"Updated security permissions for organization role '{role}'",
            metadata={
                "organization_id": org.pk,
                "role": role,
                "members_updated": updated,
            },
        )

        return Response(
            {
                "role": role,
                "security_permissions": security_permissions,
                "members_updated": updated,
            }
        )


class OrganizationRoleViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationRoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        membership = get_user_organization_membership(self.request.user)
        if not membership:
            return OrganizationRole.objects.none()
        return OrganizationRole.objects.filter(
            organization=membership.organization
        ).order_by("name")

    def perform_create(self, serializer):
        membership = require_org_security_manager(self.request.user, action="roles")
        serializer.save(
            organization=membership.organization,
            security_permissions=get_org_role_security_template("member"),
            is_system_role=False,
            is_deletable=True,
        )

    def perform_update(self, serializer):
        require_org_security_manager(self.request.user, action="roles")
        if serializer.instance.code == OrganizationMembership.ROLE_OWNER:
            raise PermissionDenied(
                "The owner role is protected and cannot be modified."
            )
        serializer.save()

    def perform_destroy(self, instance):
        require_org_security_manager(self.request.user, action="roles")
        if instance.code == OrganizationMembership.ROLE_OWNER:
            raise PermissionDenied("The owner role is protected and cannot be deleted.")
        if not instance.is_deletable:
            instance.is_active = False
            instance.save()
            return
        instance.delete()
