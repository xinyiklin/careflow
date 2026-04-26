from datetime import time

from colorfield.fields import ColorField
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from timezone_field import TimeZoneField

from .defaults import (
    DEFAULT_APPOINTMENT_STATUSES,
    DEFAULT_APPOINTMENT_TYPES,
    DEFAULT_PATIENT_GENDERS,
    DEFAULT_ROLES,
    DEFAULT_TITLES,
)
from .security import get_effective_staff_permissions, get_role_security_template


def default_operating_days():
    return [1, 2, 3, 4, 5]


class Facility(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="facilities",
    )
    name = models.CharField(max_length=100)
    facility_code = models.CharField(max_length=50, blank=True)
    address = models.OneToOneField(
        "shared.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="facility",
    )
    phone_number = models.CharField(max_length=20, blank=True)
    fax_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    timezone = TimeZoneField(default="America/New_York")
    operating_start_time = models.TimeField(default=time(8, 0))
    operating_end_time = models.TimeField(default=time(17, 0))
    operating_days = models.JSONField(default=default_operating_days, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Facilities"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            for status in DEFAULT_APPOINTMENT_STATUSES:
                AppointmentStatus.objects.get_or_create(
                    facility=self,
                    code=status["code"],
                    defaults={
                        "name": status["name"],
                        "color": status["color"],
                        "is_active": True,
                        "is_deletable": False,
                    },
                )

            for appt_type in DEFAULT_APPOINTMENT_TYPES:
                AppointmentType.objects.get_or_create(
                    facility=self,
                    code=appt_type["code"],
                    defaults={
                        "name": appt_type["name"],
                        "color": appt_type["color"],
                        "duration_minutes": appt_type["duration"],
                        "is_active": True,
                        "is_deletable": False,
                    },
                )

            for role in DEFAULT_ROLES:
                StaffRole.objects.get_or_create(
                    facility=self,
                    code=role["code"],
                    defaults={
                        "name": role["name"],
                        "security_permissions": get_role_security_template(
                            role["code"]
                        ),
                        "is_system_role": role["is_system_role"],
                        "is_active": True,
                        "is_deletable": False,
                    },
                )

            for code, name in DEFAULT_TITLES:
                StaffTitle.objects.get_or_create(
                    facility=self,
                    code=code,
                    defaults={
                        "name": name,
                        "is_active": True,
                        "is_deletable": False,
                    },
                )

            for gender in DEFAULT_PATIENT_GENDERS:
                PatientGender.objects.get_or_create(
                    facility=self,
                    code=gender["code"],
                    defaults={
                        "name": gender["name"],
                        "sort_order": gender["sort_order"],
                        "is_active": True,
                        "is_deletable": False,
                    },
                )


def is_physician_role(role):
    if not role:
        return False

    role_code = (getattr(role, "code", "") or "").strip().lower()
    role_name = (getattr(role, "name", "") or "").strip().lower()
    return role_code == "physician" or role_name == "physician"


def build_staff_resource_name(staff):
    if not staff:
        return ""

    full_name = " ".join(
        part for part in [staff.user.first_name, staff.user.last_name] if part
    ).strip()
    base_name = full_name or staff.user.username
    title_name = getattr(staff.title, "name", "") or ""

    return " ".join(part for part in [title_name, base_name] if part).strip()


class FacilityResource(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="resources",
    )
    name = models.CharField(max_length=100)
    default_room = models.CharField(max_length=80, blank=True)
    operating_start_time = models.TimeField(null=True, blank=True)
    operating_end_time = models.TimeField(null=True, blank=True)
    linked_staff = models.OneToOneField(
        "Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resource",
    )
    is_active = models.BooleanField(default=True)
    is_deletable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]

    def clean(self):
        if self.linked_staff and self.linked_staff.facility_id != self.facility_id:
            raise ValidationError(
                {"linked_staff": "Linked staff must belong to the same facility."}
            )
        if bool(self.operating_start_time) != bool(self.operating_end_time):
            raise ValidationError(
                {
                    "operating_start_time": "Set both start and end times, or leave both blank."
                }
            )
        if (
            self.operating_start_time
            and self.operating_end_time
            and self.operating_start_time >= self.operating_end_time
        ):
            raise ValidationError(
                {"operating_end_time": "End time must be after start time."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AppointmentStatus(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="appointment_statuses",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    color = ColorField(default="#94a3b8")
    is_active = models.BooleanField(default=True)
    is_deletable = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        ordering = ["name"]

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default appointment status cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class AppointmentType(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="appointment_types",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    color = ColorField(default="#c084fc")
    duration_minutes = models.PositiveIntegerField(default=15)
    is_active = models.BooleanField(default=True)
    is_deletable = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        ordering = ["name"]

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default appointment type cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class StaffRole(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="roles",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    security_permissions = models.JSONField(default=dict, blank=True)
    is_system_role = models.BooleanField(default=False)
    is_deletable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        ordering = ["name"]

    def clean(self):
        if self.pk:
            old = StaffRole.objects.get(pk=self.pk)

            if old.code in ["admin", "physician"]:
                if self.code != old.code:
                    raise ValidationError(
                        {"code": f"{old.name} role code cannot be changed."}
                    )
                if self.name != old.name:
                    raise ValidationError(
                        {"name": f"{old.name} role name cannot be changed."}
                    )
                if self.is_active != old.is_active:
                    raise ValidationError(
                        {"is_active": f"{old.name} role cannot be deactivated."}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default role cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class StaffTitle(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="titles",
    )
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    is_deletable = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        ordering = ["name"]

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default staff title cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class Staff(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profiles",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="staff_members",
    )
    role = models.ForeignKey(StaffRole, on_delete=models.PROTECT)
    title = models.ForeignKey(
        StaffTitle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    security_overrides = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("user", "facility")
        verbose_name_plural = "Staff"

    def clean(self):
        if self.role and self.role.facility_id != self.facility_id:
            raise ValidationError({"role": "Role must belong to the same facility."})

        if self.title and self.title.facility_id != self.facility_id:
            raise ValidationError({"title": "Title must belong to the same facility."})

        membership = getattr(self.user, "org_membership", None)
        if not membership or not membership.is_active:
            raise ValidationError(
                {"user": "User must belong to an active organization."}
            )

        if (
            self.facility
            and membership.organization_id != self.facility.organization_id
        ):
            raise ValidationError(
                {"facility": "Staff facility must belong to the user's organization."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()

        old_is_active = None
        old_is_default = None
        if self.pk:
            old = Staff.objects.get(pk=self.pk)
            old_is_active = old.is_active
            old_is_default = old.is_default

        is_new = self.pk is None

        other_active_memberships = Staff.objects.filter(user=self.user, is_active=True)
        if self.pk:
            other_active_memberships = other_active_memberships.exclude(pk=self.pk)

        if self.is_active and is_new and not other_active_memberships.exists():
            self.is_default = True

        super().save(*args, **kwargs)

        if self.is_default:
            Staff.objects.filter(user=self.user).exclude(pk=self.pk).update(
                is_default=False
            )

        if old_is_default and old_is_active and not self.is_active:
            replacement = (
                Staff.objects.filter(user=self.user, is_active=True)
                .exclude(pk=self.pk)
                .order_by("id")
                .first()
            )
            if replacement:
                Staff.objects.filter(pk=replacement.pk).update(is_default=True)
                Staff.objects.filter(pk=self.pk).update(is_default=False)
                self.is_default = False

        if (
            self.is_active
            and not Staff.objects.filter(
                user=self.user, is_active=True, is_default=True
            ).exists()
        ):
            Staff.objects.filter(pk=self.pk).update(is_default=True)
            self.is_default = True

        if self.is_active and is_physician_role(self.role):
            try:
                linked_resource = self.resource
            except FacilityResource.DoesNotExist:
                linked_resource = None

            default_resource_name = build_staff_resource_name(self)

            if linked_resource:
                updated_fields = []

                if linked_resource.facility_id != self.facility_id:
                    linked_resource.facility = self.facility
                    updated_fields.append("facility")
                if not linked_resource.name:
                    linked_resource.name = default_resource_name
                    updated_fields.append("name")
                if not linked_resource.is_active:
                    linked_resource.is_active = True
                    updated_fields.append("is_active")

                if updated_fields:
                    linked_resource.save(update_fields=updated_fields)
            else:
                FacilityResource.objects.create(
                    facility=self.facility,
                    name=default_resource_name,
                    linked_staff=self,
                    is_active=True,
                    is_deletable=False,
                )

    def delete(self, *args, **kwargs):
        user = self.user
        was_default = self.is_default

        super().delete(*args, **kwargs)

        if was_default:
            replacement = (
                Staff.objects.filter(user=user, is_active=True).order_by("id").first()
            )
            if replacement:
                Staff.objects.filter(pk=replacement.pk).update(is_default=True)

    @property
    def effective_security_permissions(self):
        return get_effective_staff_permissions(self)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class PatientGender(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_genders",
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_deletable = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        ordering = ["sort_order", "name"]

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default patient gender cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name
