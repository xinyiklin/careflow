from django.db.models import Count
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.access import user_can_admin_facility
from facilities.security import user_has_facility_permission
from organizations.permissions import get_user_organization_membership, is_org_admin
from shared.scoping import OrgAdminFacilityScopedViewSetMixin

from .cpt_catalog import get_catalog_entries
from .models import (
    FacilityFeeScheduleOverride,
    OrganizationFeeSchedule,
    OrganizationFeeScheduleItem,
)
from .serializers import (
    FacilityFeeScheduleOverrideSerializer,
    OrganizationFeeScheduleItemSerializer,
    OrganizationFeeScheduleSerializer,
)
from .services import copy_schedule_to_facility, populate_fee_schedule_from_catalog


class OrgAdminBillingViewSetMixin(OrgAdminFacilityScopedViewSetMixin):
    def require_billing_permission(self, permission):
        facility = self.get_facility()
        if user_can_admin_facility(self.request.user, facility.id):
            return facility
        if not user_has_facility_permission(self.request.user, facility.id, permission):
            raise PermissionDenied("You do not have access to billing.")
        return facility


class OrganizationFeeScheduleViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrganizationFeeScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_membership(self):
        membership = get_user_organization_membership(self.request.user)
        if not membership:
            raise PermissionDenied("Organization membership required.")
        return membership

    def _require_org_admin(self):
        if not is_org_admin(self.request.user) and not self.request.user.is_superuser:
            raise PermissionDenied("Only organization admins can manage fee schedules.")
        return self.get_membership()

    def get_queryset(self):
        membership = self._require_org_admin()
        return (
            OrganizationFeeSchedule.objects.filter(
                organization=membership.organization,
                facility__isnull=True,
            )
            .annotate(item_count=Count("items"))
            .order_by("sort_order", "name", "id")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        membership = get_user_organization_membership(self.request.user)
        if membership:
            context["organization"] = membership.organization
        return context

    def perform_create(self, serializer):
        membership = self._require_org_admin()
        schedule = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="billing",
            model_name="organizationfeeschedule",
            object_pk=schedule.pk,
            summary=f"Created organization fee schedule {schedule.name}",
            metadata={"organization_id": membership.organization_id},
        )

    def perform_update(self, serializer):
        membership = self._require_org_admin()
        if serializer.instance.organization_id != membership.organization_id:
            raise PermissionDenied("You do not have access to this fee schedule.")
        schedule = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="billing",
            model_name="organizationfeeschedule",
            object_pk=schedule.pk,
            summary=f"Updated organization fee schedule {schedule.name}",
            metadata={"organization_id": schedule.organization_id},
        )

    @action(detail=True, methods=["post"])
    def populate(self, request, pk=None):
        membership = self._require_org_admin()
        schedule = self.get_object()
        if schedule.organization_id != membership.organization_id:
            raise PermissionDenied("You do not have access to this fee schedule.")
        created = populate_fee_schedule_from_catalog(schedule, user=request.user)
        record_audit_event(
            actor=request.user,
            action="update",
            app_label="billing",
            model_name="organizationfeeschedule",
            object_pk=schedule.pk,
            summary=f"Populated fee schedule {schedule.name} with {len(created)} catalog codes",
            metadata={
                "organization_id": membership.organization_id,
                "codes_added": len(created),
            },
        )
        return Response({"added": len(created)})


class CPTCatalogViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return Response(get_catalog_entries())


class OrganizationFeeScheduleItemViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrganizationFeeScheduleItemSerializer
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
            raise PermissionDenied("Only organization admins can manage fee schedules.")
        queryset = (
            OrganizationFeeScheduleItem.objects.filter(
                organization=membership.organization,
            )
            .select_related("schedule")
            .order_by("sort_order", "service_code", "id")
        )

        schedule_id = self.request.query_params.get("schedule_id")
        if schedule_id:
            try:
                parsed_schedule_id = int(schedule_id)
            except (TypeError, ValueError):
                raise ValidationError({"schedule_id": ["Use a numeric id."]})
            queryset = queryset.filter(schedule_id=parsed_schedule_id)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        membership = get_user_organization_membership(self.request.user)
        if membership:
            context["organization"] = membership.organization
        return context

    def perform_create(self, serializer):
        membership = self.get_membership()
        if not is_org_admin(self.request.user) and not self.request.user.is_superuser:
            raise PermissionDenied("Only organization admins can manage fee schedules.")
        item = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="create",
            app_label="billing",
            model_name="organizationfeescheduleitem",
            object_pk=item.pk,
            summary=f"Created organization fee schedule item {item.service_code}",
            metadata={"organization_id": membership.organization_id},
        )

    def perform_update(self, serializer):
        membership = self.get_membership()
        if serializer.instance.organization_id != membership.organization_id:
            raise PermissionDenied("You do not have access to this fee schedule item.")
        if not is_org_admin(self.request.user) and not self.request.user.is_superuser:
            raise PermissionDenied("Only organization admins can manage fee schedules.")
        item = serializer.save()
        record_audit_event(
            actor=self.request.user,
            action="update",
            app_label="billing",
            model_name="organizationfeescheduleitem",
            object_pk=item.pk,
            summary=f"Updated organization fee schedule item {item.service_code}",
            metadata={"organization_id": item.organization_id},
        )


class FacilityFeeScheduleViewSet(
    OrgAdminBillingViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrganizationFeeScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        return (
            OrganizationFeeSchedule.objects.filter(facility=facility)
            .annotate(item_count=Count("items"))
            .order_by("sort_order", "name", "id")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        facility = self.get_facility()
        context["organization"] = facility.organization
        context["facility"] = facility
        return context

    def perform_update(self, serializer):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this fee schedule.")
        schedule = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="update",
            app_label="billing",
            model_name="organizationfeeschedule",
            object_pk=schedule.pk,
            summary=f"Updated facility fee schedule {schedule.name}",
            metadata={"facility_id": facility.id},
        )

    @action(detail=False, methods=["post"], url_path="copy-from-org")
    def copy_from_org(self, request):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        source_id = request.data.get("source_schedule_id")
        if not source_id:
            raise ValidationError({"source_schedule_id": ["This field is required."]})

        source = OrganizationFeeSchedule.objects.filter(
            pk=source_id,
            organization=facility.organization,
            facility__isnull=True,
        ).first()
        if not source:
            raise ValidationError(
                {"source_schedule_id": ["Organization fee schedule not found."]}
            )

        new_schedule = copy_schedule_to_facility(source, facility, user=request.user)
        record_audit_event(
            actor=request.user,
            facility=facility,
            action="create",
            app_label="billing",
            model_name="organizationfeeschedule",
            object_pk=new_schedule.pk,
            summary=f"Copied org fee schedule '{source.name}' to facility",
            metadata={"source_schedule_id": source.id, "facility_id": facility.id},
        )
        serializer = self.get_serializer(new_schedule)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def populate(self, request, pk=None):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        schedule = self.get_object()
        if schedule.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this fee schedule.")
        created = populate_fee_schedule_from_catalog(schedule, user=request.user)
        return Response({"added": len(created)})


class FacilityFeeScheduleItemViewSet(
    OrgAdminBillingViewSetMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrganizationFeeScheduleItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        queryset = (
            OrganizationFeeScheduleItem.objects.filter(
                schedule__facility=facility,
            )
            .select_related("schedule")
            .order_by("sort_order", "service_code", "id")
        )

        schedule_id = self.request.query_params.get("schedule_id")
        if schedule_id:
            try:
                parsed_schedule_id = int(schedule_id)
            except (TypeError, ValueError):
                raise ValidationError({"schedule_id": ["Use a numeric id."]})
            queryset = queryset.filter(schedule_id=parsed_schedule_id)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        facility = self.get_facility()
        context["organization"] = facility.organization
        return context

    def perform_update(self, serializer):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        if serializer.instance.schedule.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this fee schedule item.")
        item = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="update",
            app_label="billing",
            model_name="organizationfeescheduleitem",
            object_pk=item.pk,
            summary=f"Updated facility fee schedule item {item.service_code}",
            metadata={"facility_id": facility.id},
        )


class FacilityFeeScheduleOverrideViewSet(
    OrgAdminBillingViewSetMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FacilityFeeScheduleOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        return (
            FacilityFeeScheduleOverride.objects.filter(facility=facility)
            .select_related("facility", "organization_item")
            .order_by("sort_order", "service_code", "organization_item__service_code")
        )

    def perform_create(self, serializer):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        override = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="create",
            app_label="billing",
            model_name="facilityfeescheduleoverride",
            object_pk=override.pk,
            summary=f"Created facility fee schedule override {override.effective_service_code}",
            metadata={"facility_id": facility.id},
        )

    def perform_update(self, serializer):
        facility = self.require_billing_permission("billing.fee_schedules.manage")
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied(
                "You do not have access to this fee schedule override."
            )
        override = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="update",
            app_label="billing",
            model_name="facilityfeescheduleoverride",
            object_pk=override.pk,
            summary=f"Updated facility fee schedule override {override.effective_service_code}",
            metadata={"facility_id": facility.id},
        )
