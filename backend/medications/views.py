from django.http import Http404
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Medication
from .serializers import MedicationSerializer


class MedicationViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self._require_permission(
            "medications.view",
            "You do not have access to view medications.",
        )
        queryset = (
            Medication.objects.filter(facility=facility)
            .select_related("patient", "facility", "created_by", "updated_by")
            .order_by("medication_name", "-start_date", "-created_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            valid_statuses = {choice[0] for choice in Medication.STATUS_CHOICES}
            if status not in valid_statuses:
                raise ValidationError({"status": ["Unsupported medication status."]})
            queryset = queryset.filter(status=status)

        return queryset

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            facility = self.get_facility()
            lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
            if (
                lookup_value
                and Medication.objects.filter(pk=lookup_value)
                .exclude(facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this medication.")
            raise

    def perform_create(self, serializer):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        patient = serializer.validated_data["patient"]
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        medication = serializer.save(
            facility=facility,
            created_by=self.request.user,
            updated_by=self.request.user,
        )
        self._record_medication_event(medication, "create", "Created medication")

    def perform_update(self, serializer):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this medication.")

        patient = serializer.validated_data.get("patient", serializer.instance.patient)
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        medication = serializer.save(updated_by=self.request.user)
        self._record_medication_event(medication, "update", "Updated medication")

    def perform_destroy(self, instance):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this medication.")

        instance.discontinue(user=self.request.user)
        self._record_medication_event(instance, "delete", "Discontinued medication")

    def _require_permission(self, permission, message):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            permission,
        ):
            raise PermissionDenied(message)
        return facility

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

    def _record_medication_event(self, medication, action, summary):
        record_audit_event(
            actor=self.request.user,
            facility=medication.facility,
            patient=medication.patient,
            action=action,
            app_label="medications",
            model_name="medication",
            object_pk=medication.pk,
            summary=f"{summary}: {medication.medication_name}",
            metadata={"status": medication.status},
        )
