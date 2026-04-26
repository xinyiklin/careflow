from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.services import record_audit_event
from facilities.security import get_effective_staff_permissions

from .models import (
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
)
from .permissions import (
    get_user_organization_membership,
    is_org_admin,
    is_org_owner,
)
from .serializers import (
    OrganizationDetailSerializer,
    OrganizationPersonCreateSerializer,
    OrganizationPersonSerializer,
    OrganizationPharmacyPreferenceSerializer,
    OrganizationPharmacyPreferenceWriteSerializer,
    OrganizationSerializer,
)

PHARMACY_MANAGEMENT_PERMISSION = "pharmacies.manage"


def user_can_manage_organization_pharmacies(user, organization):
    if user.is_superuser or is_org_admin(user):
        return True

    staff_profiles = user.staff_profiles.filter(
        facility__organization=organization,
        is_active=True,
    ).select_related("role")

    return any(
        get_effective_staff_permissions(staff).get(
            PHARMACY_MANAGEMENT_PERMISSION, False
        )
        for staff in staff_profiles
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
