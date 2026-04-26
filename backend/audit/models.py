from django.db import models


class AuditEvent(models.Model):
    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("view", "View"),
        ("export", "Export"),
        ("login", "Login"),
        ("other", "Other"),
    ]

    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default="other")
    app_label = models.CharField(max_length=100)
    model_name = models.CharField(max_length=100, blank=True)
    object_pk = models.CharField(max_length=100, blank=True)
    summary = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action}: {self.summary}"
