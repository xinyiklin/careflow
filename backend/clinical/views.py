from django.db import transaction
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from appointments.models import Appointment
from audit.services import record_audit_event
from facilities.access import get_default_staff_profile, get_staff_profile_for_facility
from facilities.security import user_has_facility_permission
from patients.models import Patient

from .models import Encounter, ProgressNote
from .serializers import EncounterSerializer, ProgressNoteSerializer


class FacilityScopedClinicalMixin:
    def get_staff_profile(self):
        facility_id = self.request.query_params.get("facility_id")

        if facility_id:
            profile = get_staff_profile_for_facility(self.request.user, facility_id)
            if not profile:
                raise PermissionDenied("You do not have access to this facility.")
            return profile

        profile = get_default_staff_profile(self.request.user)
        if not profile:
            raise PermissionDenied(
                "No active default facility found. If the user has multiple "
                "facilities, one must be default."
            )
        return profile

    def get_facility(self):
        return self.get_staff_profile().facility

    def require_clinical_permission(self, permission):
        facility = self.get_facility()
        if not user_has_facility_permission(self.request.user, facility.id, permission):
            raise PermissionDenied("You do not have access to clinical charting.")
        return facility


class EncounterViewSet(
    FacilityScopedClinicalMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EncounterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        context["staff_profile"] = self.get_staff_profile()
        return context

    def get_queryset(self):
        facility = self.require_clinical_permission("clinical.view")
        queryset = (
            Encounter.objects.filter(facility=facility)
            .select_related(
                "patient",
                "appointment",
                "appointment__appointment_type",
                "rendering_provider__user",
                "rendering_provider__title",
                "created_by",
            )
            .select_related("progress_note", "progress_note__signed_by")
            .order_by("-started_at", "-created_at")
        )

        patient_id = self.request.query_params.get("patient_id")
        appointment_id = self.request.query_params.get("appointment_id")
        status = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if appointment_id:
            self._ensure_appointment_is_in_facility(appointment_id, facility)
            queryset = queryset.filter(appointment_id=appointment_id)
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

    def _ensure_appointment_is_in_facility(self, appointment_id, facility):
        appointment = (
            Appointment.objects.filter(pk=appointment_id).only("facility_id").first()
        )
        if appointment and appointment.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this appointment.")

    def perform_create(self, serializer):
        facility = self.require_clinical_permission("clinical.create")
        with transaction.atomic():
            encounter = serializer.save()
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=encounter.patient,
                action="create",
                app_label="clinical",
                model_name="encounter",
                object_pk=encounter.pk,
                summary="Created clinical encounter",
                metadata={"status": encounter.status},
            )

    def perform_update(self, serializer):
        facility = self.require_clinical_permission("clinical.update")
        with transaction.atomic():
            encounter = serializer.save()
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=encounter.patient,
                action="update",
                app_label="clinical",
                model_name="encounter",
                object_pk=encounter.pk,
                summary="Updated clinical encounter",
                metadata={"status": encounter.status},
            )


class ProgressNoteViewSet(
    FacilityScopedClinicalMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ProgressNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.require_clinical_permission("clinical.view")
        return (
            ProgressNote.objects.filter(encounter__facility=facility)
            .select_related(
                "encounter",
                "encounter__patient",
                "encounter__facility",
                "signed_by",
            )
            .order_by("-updated_at")
        )

    def perform_update(self, serializer):
        note = self.get_object()
        facility = self.require_clinical_permission("clinical.update")
        with transaction.atomic():
            note = serializer.save()
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=note.encounter.patient,
                action="update",
                app_label="clinical",
                model_name="progressnote",
                object_pk=note.pk,
                summary="Updated progress note draft",
                metadata={"encounter_id": note.encounter_id},
            )

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        note = self.get_object()
        facility = self.require_clinical_permission("clinical.sign")

        if note.status == ProgressNote.STATUS_SIGNED:
            return Response(self.get_serializer(note).data)

        if not any(
            [
                note.subjective.strip(),
                note.objective.strip(),
                note.assessment.strip(),
                note.plan.strip(),
            ]
        ):
            raise ValidationError({"progress_note": "Add note content before signing."})

        with transaction.atomic():
            note.sign(request.user)
            record_audit_event(
                actor=request.user,
                facility=facility,
                patient=note.encounter.patient,
                action="update",
                app_label="clinical",
                model_name="progressnote",
                object_pk=note.pk,
                summary="Signed progress note",
                metadata={"encounter_id": note.encounter_id},
            )

        return Response(self.get_serializer(note).data)
