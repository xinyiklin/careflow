from django.http import FileResponse, Http404, HttpResponseRedirect
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.access import get_default_staff_profile, get_staff_profile_for_facility
from facilities.permissions import IsFacilityAdminOrReadOnly
from facilities.security import user_has_facility_permission

from .document_pdf import (
    DocumentPdfError,
    build_combined_pdf,
    validate_supported_document_file,
)
from .document_storage import get_patient_document_storage
from .models import (
    CareProvider,
    Patient,
    PatientDocument,
    PatientDocumentCategory,
    Pharmacy,
    ensure_default_document_categories,
)
from .pharmacy_access import (
    organization_can_use_pharmacy,
    organization_can_use_pharmacy_ids,
)
from .search import build_patient_name_query, build_patient_search_query
from .serializers import (
    CareProviderSerializer,
    PatientDocumentCategorySerializer,
    PatientDocumentSerializer,
    PatientSerializer,
    PharmacySerializer,
)


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


class FacilityScopedPatientMixin:
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


class PatientViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
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

        if not organization_can_use_pharmacy(
            facility.organization_id,
            preferred_pharmacy,
        ):
            raise PermissionDenied(
                "Selected pharmacy is not enabled for this organization."
            )

        if not organization_can_use_pharmacy_ids(
            facility.organization_id,
            pharmacy_ids,
        ):
            raise PermissionDenied(
                "One or more selected pharmacies are not enabled for this organization."
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

        if not organization_can_use_pharmacy(
            facility.organization_id,
            preferred_pharmacy,
        ):
            raise PermissionDenied(
                "Selected pharmacy is not enabled for this organization."
            )

        if not organization_can_use_pharmacy_ids(
            facility.organization_id,
            pharmacy_ids,
        ):
            raise PermissionDenied(
                "One or more selected pharmacies are not enabled for this organization."
            )

        changed_fields = get_changed_patient_fields(
            serializer.instance,
            serializer.validated_data,
        )
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


def format_file_size(size):
    if not size:
        return ""

    units = ["bytes", "KB", "MB", "GB"]
    value = float(size)
    unit = units[0]

    for unit in units:
        if value < 1024 or unit == units[-1]:
            break
        value /= 1024

    if unit == "bytes":
        return f"{int(value)} bytes"
    return f"{value:.1f} {unit}"


class PatientDocumentViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
    serializer_class = PatientDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.view",
        ):
            raise PermissionDenied("You do not have access to view patient documents.")

        queryset = (
            PatientDocument.objects.filter(
                patient__facility=facility,
                is_active=True,
            )
            .select_related("patient", "patient__facility")
            .order_by("-document_date", "-created_at", "name")
        )

        patient_id = (self.request.query_params.get("patient_id") or "").strip()
        if patient_id:
            try:
                patient_id = int(patient_id)
            except ValueError:
                return queryset.none()

            queryset = queryset.filter(patient_id=patient_id)

        return queryset

    def create(self, request, *args, **kwargs):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.update",
        ):
            raise PermissionDenied(
                "You do not have access to update patient documents."
            )

        patient_id = request.data.get("patient") or request.data.get("patient_id")
        uploaded_file = request.FILES.get("file")

        if not patient_id:
            return Response(
                {"patient": "Patient is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not uploaded_file:
            return Response(
                {"file": "Document file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_supported_document_file(uploaded_file)
        except DocumentPdfError as exc:
            return Response(
                {"file": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = Patient.objects.filter(
            pk=patient_id,
            facility=facility,
            is_active=True,
        ).first()
        if not patient:
            raise PermissionDenied("You do not have access to this patient.")

        storage = get_patient_document_storage()
        storage_key = storage.save(uploaded_file, patient.id)
        name = (
            request.data.get("name") or uploaded_file.name or "Untitled document"
        ).strip()
        content_type = uploaded_file.content_type or "application/octet-stream"
        file_size = uploaded_file.size or 0
        category = (
            request.data.get("category") or PatientDocument.CATEGORY_ADMIN
        ).strip()
        ensure_default_document_categories(facility)
        if not PatientDocumentCategory.objects.filter(
            facility=facility,
            code=category,
            is_active=True,
        ).exists():
            return Response(
                {"category": "Select an active document category."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = PatientDocument.objects.create(
            patient=patient,
            name=name,
            category=category,
            document_date=request.data.get("document_date") or None,
            uploaded_by_name=request.user.get_full_name()
            or request.user.get_username()
            or "",
            file_size_display=format_file_size(file_size),
            file_size_bytes=file_size,
            content_type=content_type,
            original_filename=uploaded_file.name or name,
            storage_key=storage_key,
            notes=(request.data.get("notes") or "").strip(),
            is_active=True,
        )
        record_audit_event(
            actor=request.user,
            facility=facility,
            patient=patient,
            action="create",
            app_label="patients",
            model_name="patientdocument",
            object_pk=document.pk,
            summary=f"Uploaded document {document.name}",
            metadata={
                "document_id": document.pk,
                "category": document.category,
                "content_type": document.content_type,
            },
        )

        serializer = self.get_serializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def view(self, request, pk=None):
        return self._file_response(as_attachment=False)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        return self._file_response(as_attachment=True)

    @action(detail=False, methods=["post"], url_path="bundle/view")
    def bundle_view(self, request):
        return self._bundle_response(as_attachment=False)

    @action(detail=False, methods=["post"], url_path="bundle/download")
    def bundle_download(self, request):
        return self._bundle_response(as_attachment=True)

    def perform_destroy(self, instance):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.update",
        ):
            raise PermissionDenied(
                "You do not have access to update patient documents."
            )

        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=instance.patient,
            action="delete",
            app_label="patients",
            model_name="patientdocument",
            object_pk=instance.pk,
            summary=f"Deactivated document {instance.name}",
            metadata={"document_id": instance.pk, "category": instance.category},
        )

    def _file_response(self, as_attachment):
        document = self.get_object()
        action = "export" if as_attachment else "view"

        if document.storage_key:
            storage = get_patient_document_storage()
            if not storage.exists(document.storage_key):
                raise Http404("Document file was not found.")

            self._record_document_access(document, action, as_attachment)
            return FileResponse(
                storage.open(document.storage_key),
                as_attachment=as_attachment,
                filename=document.original_filename or document.name,
                content_type=document.content_type or "application/octet-stream",
            )

        if document.file_url:
            self._record_document_access(document, action, as_attachment)
            return HttpResponseRedirect(document.file_url)

        raise Http404("Document file was not found.")

    def _record_document_access(self, document, action, as_attachment):
        record_audit_event(
            actor=self.request.user,
            facility=document.patient.facility,
            patient=document.patient,
            action=action,
            app_label="patients",
            model_name="patientdocument",
            object_pk=document.pk,
            summary=(
                f"Downloaded document {document.name}"
                if as_attachment
                else f"Viewed document {document.name}"
            ),
            metadata={"document_id": document.pk, "category": document.category},
        )

    def _bundle_response(self, as_attachment):
        document_ids = self.request.data.get("document_ids") or []
        if not isinstance(document_ids, list) or not document_ids:
            return Response(
                {"document_ids": "Select at least one document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_ids = []
        for document_id in document_ids:
            try:
                normalized_ids.append(int(document_id))
            except (TypeError, ValueError):
                return Response(
                    {"document_ids": "Document IDs must be integers."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        documents = list(self.get_queryset().filter(id__in=normalized_ids))
        documents_by_id = {document.id: document for document in documents}
        ordered_documents = [
            documents_by_id[document_id]
            for document_id in normalized_ids
            if document_id in documents_by_id
        ]

        if len(ordered_documents) != len(normalized_ids):
            raise PermissionDenied("One or more documents are unavailable.")

        try:
            pdf = build_combined_pdf(
                ordered_documents,
                get_patient_document_storage(),
            )
        except DocumentPdfError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = ordered_documents[0].patient
        record_audit_event(
            actor=self.request.user,
            facility=patient.facility,
            patient=patient,
            action="export" if as_attachment else "view",
            app_label="patients",
            model_name="patientdocument",
            object_pk=patient.pk,
            summary=(
                "Downloaded document bundle"
                if as_attachment
                else "Viewed document bundle"
            ),
            metadata={
                "document_ids": normalized_ids,
                "document_count": len(ordered_documents),
            },
        )
        filename = f"{patient.last_name}_{patient.first_name}_documents.pdf"
        return FileResponse(
            pdf,
            as_attachment=as_attachment,
            filename=filename,
            content_type="application/pdf",
        )


class PatientDocumentCategoryViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
    serializer_class = PatientDocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "patients.view",
        ):
            raise PermissionDenied(
                "You do not have access to view document categories."
            )

        ensure_default_document_categories(facility)
        return PatientDocumentCategory.objects.filter(
            facility=facility,
            is_active=True,
        ).order_by("sort_order", "name")

    def perform_create(self, serializer):
        facility = self.get_facility()
        self._check_manage_permission(facility)
        serializer.save(facility=facility)

    def perform_update(self, serializer):
        facility = self.get_facility()
        self._check_manage_permission(facility)
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this category.")
        serializer.save()

    def perform_destroy(self, instance):
        facility = self.get_facility()
        self._check_manage_permission(facility)
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this category.")
        if instance.is_system:
            raise ValidationError(
                "System document categories can be renamed and reordered, but not deleted."
            )
        if PatientDocument.objects.filter(
            patient__facility_id=facility.id,
            category=instance.code,
            is_active=True,
        ).exists():
            raise ValidationError(
                "This category has filed documents and cannot be deleted."
            )
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    def _check_manage_permission(self, facility):
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "documents.categories.manage",
        ):
            raise PermissionDenied(
                "You do not have access to manage document categories."
            )


class PharmacyViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        facility = self.get_facility()
        queryset = (
            Pharmacy.objects.filter(
                organization_preferences__organization_id=facility.organization_id,
                organization_preferences__is_active=True,
                organization_preferences__is_hidden=False,
                is_active=True,
            )
            .select_related("address")
            .distinct()
        )

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("name")


class CareProviderViewSet(FacilityScopedPatientMixin, viewsets.ModelViewSet):
    serializer_class = CareProviderSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return CareProvider.objects.filter(facility=self.get_facility()).order_by(
            "last_name",
            "first_name",
            "organization_name",
        )

    def perform_create(self, serializer):
        serializer.save(facility=self.get_facility())

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this provider.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this provider.")
        instance.is_active = False
        instance.save()
