from django.http import Http404
from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import PatientAllergy
from .serializers import PatientAllergySerializer


class AllergyViewSetMixin(FacilityScopedViewSetMixin):
    def require_allergy_permission(self, permission):
        facility = self.get_facility()
        if not user_has_facility_permission(self.request.user, facility.id, permission):
            raise PermissionDenied("You do not have access to allergy records.")
        return facility

    def parse_bool_query_param(self, field_name):
        value = self.request.query_params.get(field_name)
        if value in (None, ""):
            return None

        normalized = str(value).strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False

        raise ValidationError({field_name: ["Use true or false."]})


class PatientAllergyViewSet(
    AllergyViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PatientAllergySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        context["staff_profile"] = self.get_staff_profile()
        return context

    def get_queryset(self):
        facility = self.require_allergy_permission("allergies.view")
        queryset = (
            PatientAllergy.objects.filter(facility=facility)
            .select_related("patient", "facility", "created_by", "updated_by")
            .order_by("-is_active", "allergen", "-updated_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        is_active = self.parse_bool_query_param("is_active")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            valid_statuses = {choice[0] for choice in PatientAllergy.STATUS_CHOICES}
            if status not in valid_statuses:
                raise ValidationError({"status": ["Unsupported allergy status."]})
            queryset = queryset.filter(status=status)
        if category:
            valid_categories = {choice[0] for choice in PatientAllergy.CATEGORY_CHOICES}
            if category not in valid_categories:
                raise ValidationError({"category": ["Unsupported allergy category."]})
            queryset = queryset.filter(category=category)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)

        return queryset

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            facility = self.get_facility()
            lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
            if (
                lookup_value
                and PatientAllergy.objects.filter(pk=lookup_value)
                .exclude(facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this allergy record.")
            raise

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

    def perform_create(self, serializer):
        facility = self.require_allergy_permission("allergies.manage")
        allergy = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=allergy.patient,
            action="create",
            app_label="allergies",
            model_name="patientallergy",
            object_pk=allergy.pk,
            summary="Created allergy record",
            metadata={
                "category": allergy.category,
                "severity": allergy.severity,
                "status": allergy.status,
            },
        )

    def perform_update(self, serializer):
        facility = self.require_allergy_permission("allergies.manage")
        allergy = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=allergy.patient,
            action="update",
            app_label="allergies",
            model_name="patientallergy",
            object_pk=allergy.pk,
            summary="Updated allergy record",
            metadata={
                "category": allergy.category,
                "severity": allergy.severity,
                "status": allergy.status,
            },
        )

    def perform_destroy(self, instance):
        facility = self.require_allergy_permission("allergies.manage")
        allergy_pk = instance.pk
        patient = instance.patient
        instance.mark_entered_in_error(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=patient,
            action="delete",
            app_label="allergies",
            model_name="patientallergy",
            object_pk=allergy_pk,
            summary="Marked allergy record entered in error",
            metadata={
                "category": instance.category,
                "severity": instance.severity,
                "status": instance.status,
            },
        )
