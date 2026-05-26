from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.services import record_audit_event
from facilities.access import get_facility_for_user
from facilities.security import user_has_facility_permission
from organizations.permissions import get_user_organization_membership, is_org_admin
from shared.scoping import FacilityScopedViewSetMixin

from .carrier_access import get_effective_carrier_ids
from .models import (
    FacilityInsuranceCarrierOverride,
    InsuranceCarrier,
    OrganizationInsuranceCarrierPreference,
    PatientInsurancePolicy,
)
from .serializers import (
    FacilityInsuranceCarrierOverrideSerializer,
    InsuranceCarrierSerializer,
    OrganizationInsuranceCarrierPreferenceSerializer,
    OrganizationInsuranceCarrierPreferenceWriteSerializer,
    PatientInsurancePolicySerializer,
)


def _get_user_organization(user):
    membership = get_user_organization_membership(user)
    if not membership:
        raise PermissionDenied("Organization membership required.")
    return membership.organization


def _require_org_catalog_admin(user):
    organization = _get_user_organization(user)
    if not (user.is_superuser or is_org_admin(user)):
        raise PermissionDenied("Only organization admins can manage payers.")
    return organization


class InsuranceCarrierViewSet(
    FacilityScopedViewSetMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = InsuranceCarrierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "insurance.view",
        ):
            raise PermissionDenied("You do not have access to view insurance carriers.")

        return InsuranceCarrier.objects.filter(
            id__in=get_effective_carrier_ids(facility),
            is_active=True,
        ).order_by("name")


class OrganizationInsuranceCarrierPreferenceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action in ["create", "partial_update", "update"]:
            return OrganizationInsuranceCarrierPreferenceWriteSerializer
        return OrganizationInsuranceCarrierPreferenceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = _require_org_catalog_admin(self.request.user)
        return context

    def get_queryset(self):
        organization = _require_org_catalog_admin(self.request.user)
        return (
            OrganizationInsuranceCarrierPreference.objects.filter(
                organization=organization
            )
            .select_related("organization", "carrier")
            .order_by("sort_order", "carrier__name")
        )

    def perform_create(self, serializer):
        preference = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="insurance",
            model_name="organizationinsurancecarrierpreference",
            object_pk=preference.pk,
            summary=f"Added organization payer {preference.carrier.name}",
            metadata={
                "organization_id": preference.organization_id,
                "carrier_id": preference.carrier_id,
            },
        )

    def perform_update(self, serializer):
        preference = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="insurance",
            model_name="organizationinsurancecarrierpreference",
            object_pk=preference.pk,
            summary=f"Updated organization payer {preference.carrier.name}",
            metadata={
                "organization_id": preference.organization_id,
                "carrier_id": preference.carrier_id,
                "is_active": preference.is_active,
                "is_hidden": preference.is_hidden,
            },
        )


class FacilityInsuranceCarrierOverrideViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FacilityInsuranceCarrierOverrideSerializer
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
            "billing.fee_schedules.manage",
        )
        if not can_manage:
            raise PermissionDenied("You do not have access to payer overrides.")
        return facility

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self.get_facility()
        return (
            FacilityInsuranceCarrierOverride.objects.filter(facility=facility)
            .select_related(
                "facility",
                "carrier",
                "organization_preference",
                "organization_preference__carrier",
            )
            .order_by(
                "sort_order",
                "carrier__name",
                "organization_preference__carrier__name",
            )
        )

    def perform_create(self, serializer):
        override = serializer.save()
        carrier = override.effective_carrier
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="insurance",
            model_name="facilityinsurancecarrieroverride",
            object_pk=override.pk,
            summary=f"Added facility payer override {carrier.name if carrier else ''}",
            metadata={
                "facility_id": override.facility_id,
                "carrier_id": getattr(carrier, "id", None),
            },
        )

    def perform_update(self, serializer):
        override = serializer.save()
        carrier = override.effective_carrier
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="insurance",
            model_name="facilityinsurancecarrieroverride",
            object_pk=override.pk,
            summary=f"Updated facility payer override {carrier.name if carrier else ''}",
            metadata={
                "facility_id": override.facility_id,
                "carrier_id": getattr(carrier, "id", None),
                "is_active": override.is_active,
                "is_hidden": override.is_hidden,
            },
        )


class PatientInsurancePolicyViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PatientInsurancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "insurance.view",
        ):
            raise PermissionDenied("You do not have access to view insurance policies.")

        queryset = PatientInsurancePolicy.objects.filter(
            patient__facility=facility,
            is_active=True,
        ).select_related("patient", "carrier")

        patient_id = self.request.query_params.get("patient_id")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        return queryset.order_by(
            "patient__last_name", "patient__first_name", "-is_primary"
        )

    def _ensure_policy_belongs_to_facility(self, policy):
        if policy.patient.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this insurance policy.")

    def perform_create(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "insurance.manage",
        ):
            raise PermissionDenied(
                "You do not have access to update insurance policies."
            )

        patient = serializer.validated_data["patient"]
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")
        policy = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=policy.patient,
            action="create",
            app_label="insurance",
            model_name="patientinsurancepolicy",
            object_pk=policy.pk,
            summary=f"Created insurance policy for {policy.patient}",
            metadata={"carrier_id": policy.carrier_id},
        )

    def perform_update(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "insurance.manage",
        ):
            raise PermissionDenied(
                "You do not have access to update insurance policies."
            )

        self._ensure_policy_belongs_to_facility(serializer.instance)
        patient = serializer.validated_data.get("patient", serializer.instance.patient)
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")
        policy = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=policy.patient,
            action="update",
            app_label="insurance",
            model_name="patientinsurancepolicy",
            object_pk=policy.pk,
            summary=f"Updated insurance policy for {policy.patient}",
            metadata={"carrier_id": policy.carrier_id},
        )

    def perform_destroy(self, instance):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "insurance.manage",
        ):
            raise PermissionDenied(
                "You do not have access to update insurance policies."
            )

        self._ensure_policy_belongs_to_facility(instance)
        instance.is_active = False
        instance.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=instance.patient,
            action="delete",
            app_label="insurance",
            model_name="patientinsurancepolicy",
            object_pk=instance.pk,
            summary=f"Deactivated insurance policy for {instance.patient}",
            metadata={"carrier_id": instance.carrier_id},
        )
