from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from shared.scoping import FacilityScopedViewSetMixin

from .models import Patient
from .pharmacy_access import (
    facility_can_use_pharmacy,
    facility_can_use_pharmacy_ids,
)
from .search import build_patient_name_query, build_patient_search_query
from .serializers import PatientSerializer


def get_patient_display_name(patient):
    return f"{patient.last_name}, {patient.first_name}"


def get_changed_patient_fields(instance, validated_data):
    field_labels = {
        "preferred_name": "Preferred name",
        "middle_name": "Middle name",
        "last_name": "Last name",
        "first_name": "First name",
        "date_of_birth": "Date of birth",
        "gender": "Gender",
        "sex_at_birth": "Sex at birth",
        "race": "Race",
        "race_declined": "Race declined",
        "ethnicity": "Ethnicity",
        "ethnicity_declined": "Ethnicity declined",
        "preferred_language": "Preferred language",
        "preferred_language_declined": "Preferred language declined",
        "pronouns": "Pronouns",
        "email": "Email",
        "address": "Address",
        "emergency_contacts": "Emergency contacts",
        "phones": "Phones",
        "pcp": "Primary care provider",
        "referring_provider": "Referring provider",
        "preferred_pharmacy": "Preferred pharmacy",
        "pharmacy_ids": "Pharmacies",
        "ssn": "SSN",
    }
    changed = []

    for field_name, label in field_labels.items():
        if field_name not in validated_data:
            continue
        if field_name in {"phones", "emergency_contacts", "pharmacy_ids", "ssn"}:
            changed.append(label)
            continue

        previous_value = getattr(instance, field_name, None)
        next_value = validated_data[field_name]
        if hasattr(previous_value, "pk"):
            previous_value = previous_value.pk
        if hasattr(next_value, "pk"):
            next_value = next_value.pk

        if previous_value != next_value:
            changed.append(label)

    return changed


class PatientViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.view",
        ):
            raise PermissionDenied("You do not have access to view patients.")

        base_queryset = (
            Patient.objects.filter(
                facility=facility,
                is_active=True,
            )
            .select_related(
                "gender",
                "facility",
                "pcp",
                "referring_provider",
                "preferred_pharmacy",
                "address",
            )
            .prefetch_related(
                "phones",
                "emergency_contacts",
                "patient_documents",
                "pharmacy_preferences__pharmacy",
            )
        )

        quick_search = (self.request.query_params.get("search") or "").strip()
        name = (self.request.query_params.get("name") or "").strip()
        date_of_birth = (self.request.query_params.get("date_of_birth") or "").strip()
        chart_number = (self.request.query_params.get("chart_number") or "").strip()
        phone = (self.request.query_params.get("phone") or "").strip()

        if quick_search:
            queryset = base_queryset
            queryset = queryset.filter(build_patient_search_query(quick_search))

            return queryset.distinct().order_by("last_name", "first_name")

        if (
            self.action == "list"
            and not name
            and not date_of_birth
            and not chart_number
            and not phone
        ):
            return Patient.objects.none()

        queryset = base_queryset

        if name:
            queryset = queryset.filter(build_patient_name_query(name))

        if date_of_birth:
            queryset = queryset.filter(date_of_birth=date_of_birth)

        if chart_number:
            queryset = queryset.filter(chart_number__icontains=chart_number)

        if phone:
            queryset = queryset.filter(phones__number__icontains=phone)

        return queryset.distinct().order_by("last_name", "first_name")

    def perform_create(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.create",
        ):
            raise PermissionDenied("You do not have access to create patients.")

        gender = serializer.validated_data.get("gender")
        pcp = serializer.validated_data.get("pcp")
        referring_provider = serializer.validated_data.get("referring_provider")
        preferred_pharmacy = serializer.validated_data.get("preferred_pharmacy")
        pharmacy_ids = serializer.validated_data.get("pharmacy_ids", [])

        if gender.facility_id != facility.id:
            raise PermissionDenied("Selected gender does not belong to this facility.")

        if pcp and pcp.facility_id != facility.id:
            raise PermissionDenied("Selected PCP does not belong to this facility.")

        if referring_provider and referring_provider.facility_id != facility.id:
            raise PermissionDenied(
                "Selected referring provider does not belong to this facility."
            )

        if not facility_can_use_pharmacy(facility, preferred_pharmacy):
            raise PermissionDenied(
                "Selected pharmacy is not enabled for this facility."
            )

        if not facility_can_use_pharmacy_ids(facility, pharmacy_ids):
            raise PermissionDenied(
                "One or more selected pharmacies are not enabled for this facility."
            )

        patient = serializer.save(facility=facility)
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=patient,
            action="create",
            app_label="patients",
            model_name="patient",
            object_pk=patient.pk,
            summary=f"Created patient {get_patient_display_name(patient)}",
        )

    def perform_update(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.update",
        ):
            raise PermissionDenied("You do not have access to update patients.")

        # Toggling is_active soft-deletes (or restores) the patient and is the
        # same operation as the audited delete endpoint, so it must require
        # patients.delete rather than slipping through the update gate.
        active_is_changing = (
            "is_active" in serializer.validated_data
            and serializer.validated_data["is_active"] != serializer.instance.is_active
        )
        if active_is_changing and not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.delete",
        ):
            raise PermissionDenied(
                "You do not have access to change patient active status."
            )

        gender = serializer.validated_data.get("gender", serializer.instance.gender)
        pcp = serializer.validated_data.get("pcp", serializer.instance.pcp)
        referring_provider = serializer.validated_data.get(
            "referring_provider",
            serializer.instance.referring_provider,
        )
        preferred_pharmacy = serializer.validated_data.get(
            "preferred_pharmacy",
            serializer.instance.preferred_pharmacy,
        )
        pharmacy_ids = serializer.validated_data.get("pharmacy_ids", [])

        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

        if gender.facility_id != facility.id:
            raise PermissionDenied("Selected gender does not belong to this facility.")

        if pcp and pcp.facility_id != facility.id:
            raise PermissionDenied("Selected PCP does not belong to this facility.")

        if referring_provider and referring_provider.facility_id != facility.id:
            raise PermissionDenied(
                "Selected referring provider does not belong to this facility."
            )

        if not facility_can_use_pharmacy(facility, preferred_pharmacy):
            raise PermissionDenied(
                "Selected pharmacy is not enabled for this facility."
            )

        if not facility_can_use_pharmacy_ids(facility, pharmacy_ids):
            raise PermissionDenied(
                "One or more selected pharmacies are not enabled for this facility."
            )

        changed_fields = get_changed_patient_fields(
            serializer.instance,
            serializer.validated_data,
        )
        previous_active = serializer.instance.is_active
        patient = serializer.save()
        if changed_fields:
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=patient,
                action="update",
                app_label="patients",
                model_name="patient",
                object_pk=patient.pk,
                summary=f"Updated patient {get_patient_display_name(patient)}",
                metadata={"changed_fields": changed_fields},
            )
        if active_is_changing:
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=patient,
                action="update",
                app_label="patients",
                model_name="patient",
                object_pk=patient.pk,
                summary=(
                    f"{'Reactivated' if patient.is_active else 'Deactivated'} "
                    f"patient {get_patient_display_name(patient)}"
                ),
                metadata={
                    "changed_fields": ["Active status"],
                    "previous": {"is_active": previous_active},
                    "next": {"is_active": patient.is_active},
                },
            )

    def perform_destroy(self, instance):
        facility = self.get_facility()

        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.delete",
        ):
            raise PermissionDenied("You do not have access to delete patients.")

        instance.is_active = False
        instance.save(update_fields=["is_active"])
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=instance,
            action="delete",
            app_label="patients",
            model_name="patient",
            object_pk=instance.pk,
            summary=f"Deactivated patient {get_patient_display_name(instance)}",
        )

    @action(detail=True, methods=["get"], url_path="reveal-ssn")
    def reveal_ssn(self, request, pk=None):
        patient = self.get_object()
        facility = self.get_facility()
        if not user_has_facility_permission(
            request.user,
            facility.id,
            "patients.view",
        ):
            raise PermissionDenied("You do not have access to view patients.")

        record_audit_event(
            actor=request.user,
            facility=facility,
            patient=patient,
            action="view",
            app_label="patients",
            model_name="patient",
            object_pk=patient.pk,
            summary="Revealed patient SSN",
            metadata={"field": "ssn"},
        )
        return Response({"ssn": patient.ssn or ""})
