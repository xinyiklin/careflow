from django.db import models
from django.conf import settings
from colorfield.fields import ColorField

# --- 1. SEED DATA ---

DEFAULT_APPOINTMENT_STATUSES = [
    {"code": "pending", "name": "Pending", "color": "#6c757d"},
    {"code": "check_in", "name": "Check In", "color": "#0d6efd"},
    {"code": "check_out", "name": "Check Out", "color": "#198754"},
    {"code": "cancelled", "name": "Cancelled", "color": "#dc3545"},
    {"code": "no_show", "name": "No Show", "color": "#fd7e14"},
]

DEFAULT_APPOINTMENT_TYPES = [
    {"code": "new_patient", "name": "New Patient", "color": "#20c997"},
    {"code": "follow_up", "name": "Follow Up", "color": "#6f42c1"},
    {"code": "annual", "name": "Annual", "color": "#198754"},
    {"code": "consult", "name": "Consult", "color": "#0dcaf0"},
    {"code": "procedure", "name": "Procedure", "color": "#ffc107"},
    {"code": "urgent", "name": "Urgent", "color": "#dc3545"},
]

DEFAULT_ROLES = [
    ("admin", "Admin"),
    ("physician", "Physician"),
    ("nurse", "Nurse"),
    ("staff", "Staff"),
    ("biller", "Biller"),
]

DEFAULT_TITLES = [
    ("md", "MD"),
    ("do", "DO"),
    ("np", "NP"),
    ("pa", "PA"),
    ("rn", "RN"),
]

# --- 2. FACILITY MODEL ---

class Facility(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Facilities"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            # 1. Seed Appointment Statuses
            for status in DEFAULT_APPOINTMENT_STATUSES:
                AppointmentStatus.objects.get_or_create(
                    facility=self,
                    code=status["code"],
                    defaults={"name": status["name"], "color": status["color"]}
                )

            # 2. Seed Appointment Types
            for appt_type in DEFAULT_APPOINTMENT_TYPES:
                AppointmentType.objects.get_or_create(
                    facility=self,
                    code=appt_type["code"],
                    defaults={"name": appt_type["name"], "color": appt_type["color"]}
                )

            # 3. Seed Staff Roles
            for role in DEFAULT_ROLES:
                StaffRole.objects.get_or_create(
                    facility=self,
                    code=role[0],
                    defaults={"name": role[1]}
                )

            # 4. Seed Staff Titles
            for title in DEFAULT_TITLES:
                StaffTitle.objects.get_or_create(
                    facility=self,
                    code=title[0],
                    defaults={"name": title[1]}
                )

# --- 3. CONFIGURATION MODELS ---

class AppointmentStatus(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name="appointment_statuses")
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    color = ColorField(default="#6c757d")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")
        verbose_name_plural = "Appointment Statuses"

    def __str__(self):
        return f"{self.facility.name} - {self.name}"

class AppointmentType(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name="appointment_types")
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    color = ColorField(default="#6f42c1")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("facility", "code")

    def __str__(self):
        return f"{self.facility.name} - {self.name}"

class StaffRole(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name="roles")
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    is_system_role = models.BooleanField(default=False)

    class Meta:
        unique_together = ("facility", "code")

    def __str__(self):
        return f"{self.facility.name} - {self.name}"

class StaffTitle(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name="titles")
    name = models.CharField(max_length=20)
    code = models.CharField(max_length=10)

    class Meta:
        unique_together = ("facility", "code")

    def __str__(self):
        return f"{self.facility.name} - {self.name}"

# --- 4. THE STAFF MODEL ---

class Staff(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name="staff_profiles"
    )
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name="staff_members")
    role = models.ForeignKey(StaffRole, on_delete=models.PROTECT)
    title = models.ForeignKey(StaffTitle, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "facility")
        verbose_name_plural = "Staff"

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f"{name} ({self.role.name}) - {self.facility.name}"