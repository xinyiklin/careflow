from django.http import FileResponse, Http404, HttpResponseRedirect
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from shared.scoping import FacilityScopedViewSetMixin

from .document_pdf import (
    DocumentPdfError,
    build_combined_pdf,
    validate_supported_document_file,
)
from .document_storage import get_patient_document_storage
from .models import (
    Patient,
    PatientDocument,
    PatientDocumentCategory,
    ensure_default_document_categories,
)
from .serializers import PatientDocumentCategorySerializer, PatientDocumentSerializer


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


class PatientDocumentViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PatientDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "documents.view",
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
            "documents.manage",
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

        metadata_serializer = self.get_serializer(
            data={
                "name": request.data.get("name")
                or uploaded_file.name
                or "Untitled document",
                "category": request.data.get("category")
                or PatientDocument.CATEGORY_ADMIN,
                "document_date": request.data.get("document_date") or None,
                "notes": request.data.get("notes") or "",
            }
        )
        if not metadata_serializer.is_valid():
            return Response(
                metadata_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        storage = get_patient_document_storage()
        storage_key = storage.save(uploaded_file, patient.id)
        metadata = metadata_serializer.validated_data
        content_type = uploaded_file.content_type or "application/octet-stream"
        file_size = uploaded_file.size or 0
        document = PatientDocument.objects.create(
            patient=patient,
            name=metadata["name"],
            category=metadata["category"],
            document_date=metadata.get("document_date"),
            uploaded_by_name=request.user.get_full_name()
            or request.user.get_username()
            or "",
            file_size_display=format_file_size(file_size),
            file_size_bytes=file_size,
            content_type=content_type,
            original_filename=uploaded_file.name or metadata["name"],
            storage_key=storage_key,
            notes=metadata.get("notes") or "",
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

    def partial_update(self, request, *args, **kwargs):
        allowed_fields = {"name", "category", "document_date", "notes"}
        unsupported_fields = sorted(set(request.data.keys()) - allowed_fields)
        if unsupported_fields:
            return Response(
                {
                    field: "This field cannot be updated."
                    for field in unsupported_fields
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "documents.manage",
        ):
            raise PermissionDenied(
                "You do not have access to update patient documents."
            )

        tracked_fields = {
            "name": "Name",
            "category": "Category",
            "document_date": "Document date",
            "notes": "Notes",
        }
        previous_values = {
            field: getattr(serializer.instance, field)
            for field in tracked_fields
            if field in serializer.validated_data
        }
        document = serializer.save()
        changed_fields = [
            tracked_fields[field]
            for field, previous_value in previous_values.items()
            if previous_value != getattr(document, field)
        ]

        if changed_fields:
            record_audit_event(
                actor=self.request.user,
                facility=facility,
                patient=document.patient,
                action="update",
                app_label="patients",
                model_name="patientdocument",
                object_pk=document.pk,
                summary=f"Updated document {document.name}",
                metadata={
                    "document_id": document.pk,
                    "category": document.category,
                    "changed_fields": changed_fields,
                },
            )

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
            "documents.manage",
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


class PatientDocumentCategoryViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PatientDocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "documents.view",
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
