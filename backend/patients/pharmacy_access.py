from organizations.models import OrganizationPharmacyPreference


def organization_can_use_pharmacy(organization_id, pharmacy):
    if not pharmacy:
        return True

    return OrganizationPharmacyPreference.objects.filter(
        organization_id=organization_id,
        pharmacy=pharmacy,
        is_active=True,
        is_hidden=False,
        pharmacy__is_active=True,
    ).exists()


def organization_can_use_pharmacy_ids(organization_id, pharmacy_ids):
    normalized_ids = {int(pharmacy_id) for pharmacy_id in pharmacy_ids if pharmacy_id}
    if not normalized_ids:
        return True

    allowed_count = (
        OrganizationPharmacyPreference.objects.filter(
            organization_id=organization_id,
            pharmacy_id__in=normalized_ids,
            is_active=True,
            is_hidden=False,
            pharmacy__is_active=True,
        )
        .values("pharmacy_id")
        .distinct()
        .count()
    )

    return allowed_count == len(normalized_ids)
