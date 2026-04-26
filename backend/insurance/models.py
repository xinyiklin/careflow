from django.db import models


class InsuranceCarrier(models.Model):
    name = models.CharField(max_length=150)
    payer_id = models.CharField(max_length=50, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PatientInsurancePolicy(models.Model):
    COVERAGE_ORDER_CHOICES = [
        ("primary", "Primary"),
        ("secondary", "Secondary"),
        ("tertiary", "Tertiary"),
        ("other", "Other"),
    ]

    RELATIONSHIP_CHOICES = [
        ("self", "Self"),
        ("spouse", "Spouse"),
        ("child", "Child"),
        ("parent", "Parent"),
        ("other", "Other"),
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="insurance_policies",
    )
    carrier = models.ForeignKey(
        InsuranceCarrier,
        on_delete=models.PROTECT,
        related_name="policies",
    )
    plan_name = models.CharField(max_length=150, blank=True)
    member_id = models.CharField(max_length=100)
    group_number = models.CharField(max_length=100, blank=True)
    subscriber_name = models.CharField(max_length=150, blank=True)
    relationship_to_subscriber = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        default="self",
    )
    effective_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    coverage_order = models.CharField(
        max_length=20,
        choices=COVERAGE_ORDER_CHOICES,
        default="secondary",
    )
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["patient", "-is_primary", "coverage_order", "carrier__name"]
        unique_together = ("patient", "carrier", "member_id")

    def save(self, *args, **kwargs):
        if self.coverage_order == "primary":
            self.is_primary = True
        elif self.is_primary:
            self.coverage_order = "primary"

        super().save(*args, **kwargs)

        if self.is_primary:
            PatientInsurancePolicy.objects.filter(patient=self.patient).exclude(
                pk=self.pk
            ).update(is_primary=False, coverage_order="secondary")

    def __str__(self):
        return f"{self.patient} - {self.carrier}"
