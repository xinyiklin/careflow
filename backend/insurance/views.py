from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.views import FacilityScopedPatientMixin

from .models import InsuranceCarrier, PatientInsurancePolicy
from .serializers import InsuranceCarrierSerializer, PatientInsurancePolicySerializer


class InsuranceCarrierViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InsuranceCarrierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InsuranceCarrier.objects.filter(is_active=True).order_by("name")


class PatientInsurancePolicyViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
    serializer_class = PatientInsurancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.view",
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
            "patients.update",
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
            "patients.update",
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
            "patients.update",
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
