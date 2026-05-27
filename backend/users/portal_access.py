from rest_framework.exceptions import PermissionDenied


def get_patient_for_user(user):
    """Return the Patient linked via PatientPortalAccount, or raise PermissionDenied."""
    portal_account = getattr(user, "portal_account", None)
    if not portal_account or not portal_account.is_active:
        raise PermissionDenied("Patient portal account required.")
    return portal_account.patient
