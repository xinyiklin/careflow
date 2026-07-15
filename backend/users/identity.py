from facilities.models import Staff
from organizations.models import OrganizationMembership

from .portal import PatientPortalAccount


def has_active_clinic_identity(user):
    """Return whether a user may authenticate to the clinician surface."""
    if not user or not user.is_active:
        return False
    if user.is_superuser:
        return True
    if PatientPortalAccount.objects.filter(user=user).exists():
        return False
    membership = OrganizationMembership.objects.filter(user=user).first()
    return membership is None or membership.is_active


def has_active_portal_identity(user):
    """Return whether the complete patient portal identity chain is active."""
    if not user or not user.is_active:
        return False
    if OrganizationMembership.objects.filter(user=user).exists():
        return False
    if Staff.objects.filter(user=user).exists():
        return False
    return PatientPortalAccount.objects.filter(
        user=user,
        is_active=True,
        patient__is_active=True,
        patient__facility__is_active=True,
    ).exists()
