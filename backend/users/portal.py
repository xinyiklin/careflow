from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class PatientPortalAccount(models.Model):
    """Join model linking a Django ``User`` to a ``patients.Patient``.

    A portal account represents a patient-facing login. It is intentionally
    disjoint from clinician/staff identities: a single ``User`` may either
    belong to an organization (clinician/staff) or have a portal account, but
    not both. The invariant is enforced in :meth:`clean`.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="portal_account",
    )
    patient = models.OneToOneField(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="portal_account",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Patient Portal Account"
        verbose_name_plural = "Patient Portal Accounts"

    def clean(self):
        # Avoid importing at module load to keep this file safe from
        # circular imports across the users/organizations/facilities apps.
        from facilities.models import Staff
        from organizations.models import OrganizationMembership

        if not self.user_id:
            return

        if OrganizationMembership.objects.filter(user=self.user).exists():
            raise ValidationError(
                "User already linked to a clinician organization/staff role; "
                "cannot become a portal patient."
            )

        if Staff.objects.filter(user=self.user).exists():
            raise ValidationError(
                "User already linked to a clinician organization/staff role; "
                "cannot become a portal patient."
            )

    def __str__(self):
        return f"PortalAccount<{self.user.username} → {self.patient}>"
