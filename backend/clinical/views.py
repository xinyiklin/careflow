from django.db import transaction
from django.db.models import Prefetch
from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from appointments.models import Appointment
from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from insurance.models import PatientInsurancePolicy
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Encounter, ProgressNote, Vitals
from .serializers import EncounterSerializer, ProgressNoteSerializer, VitalsSerializer


class ClinicalViewSetMixin(FacilityScopedViewSetMixin):
    def require_clinical_permission(self, permission):
        facility = self.get_facility()
        if not user_has_facility_permission(self.request.user, facility.id, permission):
            raise PermissionDenied("You do not have access to clinical charting.")
        return facility

    def reject_unknown_action_fields(self, request):
        if hasattr(request.data, "keys") and request.data.keys():
            raise ValidationError(
                {field: ["Unknown field."] for field in sorted(request.data.keys())}
            )


class EncounterViewSet(
    ClinicalViewSetMixin,
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
                "appointment__status",
                "rendering_provider__user",
                "rendering_provider__title",
                "created_by",
            )
            .select_related("progress_note", "progress_note__signed_by")
            .prefetch_related(
                Prefetch(
                    "patient__insurance_policies",
                    queryset=PatientInsurancePolicy.objects.filter(
                        is_primary=True, is_active=True
                    ).select_related("carrier"),
                    to_attr="primary_active_insurance_policies",
                )
            )
            .order_by("-started_at", "-created_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        appointment_id = self.parse_positive_int_query_param("appointment_id")
        status = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if appointment_id:
            self._ensure_appointment_is_in_facility(appointment_id, facility)
            queryset = queryset.filter(appointment_id=appointment_id)
        if status:
            valid_statuses = {choice[0] for choice in Encounter.STATUS_CHOICES}
            if status not in valid_statuses:
                raise ValidationError({"status": ["Unsupported encounter status."]})
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
                and Encounter.objects.filter(pk=lookup_value)
                .exclude(facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this encounter.")
            raise

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

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            appointment_id = request.data.get("appointment")
            if appointment_id not in (None, ""):
                try:
                    appointment_id = int(appointment_id)
                except (TypeError, ValueError):
                    appointment_id = None
                if appointment_id:
                    Appointment.objects.select_for_update().filter(
                        pk=appointment_id,
                    ).first()
            return super().create(request, *args, **kwargs)

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
            note = getattr(encounter, "progress_note", None)
            if note:
                record_audit_event(
                    actor=self.request.user,
                    facility=facility,
                    patient=encounter.patient,
                    action="create",
                    app_label="clinical",
                    model_name="progressnote",
                    object_pk=note.pk,
                    summary="Created progress note draft",
                    metadata={"encounter_id": encounter.pk},
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
    ClinicalViewSetMixin,
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

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            facility = self.get_facility()
            lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
            if (
                lookup_value
                and ProgressNote.objects.filter(pk=lookup_value)
                .exclude(encounter__facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this progress note.")
            raise

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

    @extend_schema(request=None, responses={200: ProgressNoteSerializer})
    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        self.reject_unknown_action_fields(request)
        note = self.get_object()
        facility = self.get_facility()

        is_rendering_provider = (
            note.encounter.rendering_provider_id
            and note.encounter.rendering_provider
            and note.encounter.rendering_provider.user_id == request.user.id
        )
        if not is_rendering_provider:
            has_sign_permission = user_has_facility_permission(
                request.user, facility.id, "clinical.sign"
            )
            if not has_sign_permission:
                raise PermissionDenied(
                    "Only the rendering provider or users with sign permission "
                    "can sign a progress note."
                )

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

    @extend_schema(request=None, responses={200: ProgressNoteSerializer})
    @action(detail=True, methods=["post"])
    def unsign(self, request, pk=None):
        self.reject_unknown_action_fields(request)
        note = self.get_object()
        facility = self.get_facility()

        if note.status != ProgressNote.STATUS_SIGNED:
            return Response(self.get_serializer(note).data)

        is_rendering_provider = (
            note.encounter.rendering_provider_id
            and note.encounter.rendering_provider
            and note.encounter.rendering_provider.user_id == request.user.id
        )
        has_unsign_permission = user_has_facility_permission(
            request.user, facility.id, "clinical.unsign"
        )

        if not is_rendering_provider and not has_unsign_permission:
            raise PermissionDenied(
                "Only the rendering provider or users with unsign permission "
                "can unsign a progress note."
            )

        # A signed encounter with a billing record cannot revert to in_progress
        # without orphaning that record at a state the billing model rejects.
        # Local import avoids a circular dependency: billing imports clinical.
        from billing.models import EncounterBillingRecord

        if EncounterBillingRecord.objects.filter(encounter=note.encounter).exists():
            raise ValidationError(
                {"encounter": ["Cannot unsign an encounter that has a billing record."]}
            )

        original_signer = note.signed_by_name or "Unknown"

        with transaction.atomic():
            note.unsign()
            record_audit_event(
                actor=request.user,
                facility=facility,
                patient=note.encounter.patient,
                action="update",
                app_label="clinical",
                model_name="progressnote",
                object_pk=note.pk,
                summary="Unsigned progress note",
                metadata={
                    "encounter_id": note.encounter_id,
                    "severity": "warn",
                    "original_signer": original_signer,
                    "is_rendering_provider": is_rendering_provider,
                },
            )

        return Response(self.get_serializer(note).data)


class VitalsViewSet(
    ClinicalViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Clinician-side CRUD for the per-encounter Vitals row.

    The relationship is 1:1 (``Vitals.encounter``); list is intentionally
    supported and filtered by ``?encounter=<id>`` so the frontend can
    fetch either "the vitals for this encounter" or an empty list,
    rather than relying on retrieve-by-id when it doesn't know the id.
    """

    serializer_class = VitalsSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        facility = self.require_clinical_permission("clinical.view")
        queryset = (
            Vitals.objects.filter(encounter__facility=facility)
            .select_related("encounter", "recorded_by")
            .order_by("-measured_at", "-id")
        )

        encounter_id = self.request.query_params.get("encounter")
        if encounter_id:
            try:
                encounter_id_int = int(encounter_id)
            except (TypeError, ValueError):
                raise ValidationError({"encounter": ["Must be a positive integer."]})
            self._ensure_encounter_is_in_facility(encounter_id_int, facility)
            queryset = queryset.filter(encounter_id=encounter_id_int)
        return queryset

    def _ensure_encounter_is_in_facility(self, encounter_id, facility):
        encounter = (
            Encounter.objects.filter(pk=encounter_id).only("facility_id").first()
        )
        if encounter and encounter.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this encounter.")

    def perform_create(self, serializer):
        facility = self.require_clinical_permission("clinical.create")
        encounter = serializer.validated_data.get("encounter")
        if not encounter or encounter.facility_id != facility.id:
            raise PermissionDenied("Encounter must belong to your facility.")
        if encounter.status == Encounter.STATUS_SIGNED:
            raise ValidationError(
                {"encounter": ["Cannot record vitals on a signed encounter."]}
            )
        with transaction.atomic():
            vitals = serializer.save(recorded_by=self.request.user)
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=encounter.patient,
                action="create",
                app_label="clinical",
                model_name="vitals",
                object_pk=vitals.pk,
                summary="Recorded encounter vitals",
                metadata={"encounter_id": encounter.pk},
            )

    def perform_update(self, serializer):
        facility = self.require_clinical_permission("clinical.update")
        encounter = serializer.instance.encounter
        if encounter.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this encounter.")
        new_encounter = serializer.validated_data.get("encounter")
        if new_encounter and new_encounter.id != encounter.id:
            raise ValidationError(
                {"encounter": ["Vitals encounter cannot be changed."]}
            )
        with transaction.atomic():
            vitals = serializer.save(recorded_by=self.request.user)
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=encounter.patient,
                action="update",
                app_label="clinical",
                model_name="vitals",
                object_pk=vitals.pk,
                summary="Updated encounter vitals",
                metadata={"encounter_id": encounter.pk},
            )
