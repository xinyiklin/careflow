from organizations.models import (
    FacilityPharmacyPreferenceOverride,
    OrganizationPharmacyPreference,
)


def get_effective_pharmacy_ids(facility):
    if not facility:
        return set()

    hidden_preference_ids = set(
        FacilityPharmacyPreferenceOverride.objects.filter(
            facility=facility,
            organization_preference_id__isnull=False,
        )
        .exclude(is_active=True, is_hidden=False)
        .values_list("organization_preference_id", flat=True)
    )

    org_pharmacy_ids = set(
        OrganizationPharmacyPreference.objects.filter(
            organization_id=facility.organization_id,
            is_active=True,
            is_hidden=False,
            pharmacy__is_active=True,
        )
        .exclude(id__in=hidden_preference_ids)
        .values_list("pharmacy_id", flat=True)
    )

    local_pharmacy_ids = set(
        FacilityPharmacyPreferenceOverride.objects.filter(
            facility=facility,
            organization_preference_id__isnull=True,
            pharmacy__is_active=True,
            is_active=True,
            is_hidden=False,
        ).values_list("pharmacy_id", flat=True)
    )

    return org_pharmacy_ids | local_pharmacy_ids


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


def facility_can_use_pharmacy(facility, pharmacy):
    if not pharmacy:
        return True
    return pharmacy.id in get_effective_pharmacy_ids(facility)


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


def facility_can_use_pharmacy_ids(facility, pharmacy_ids):
    normalized_ids = {int(pharmacy_id) for pharmacy_id in pharmacy_ids if pharmacy_id}
    if not normalized_ids:
        return True
    return normalized_ids.issubset(get_effective_pharmacy_ids(facility))
