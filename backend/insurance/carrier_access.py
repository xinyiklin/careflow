from .models import (
    FacilityInsuranceCarrierOverride,
    OrganizationInsuranceCarrierPreference,
)


def get_effective_carrier_ids(facility):
    if not facility:
        return set()

    hidden_preference_ids = set(
        FacilityInsuranceCarrierOverride.objects.filter(
            facility=facility,
            organization_preference_id__isnull=False,
        )
        .exclude(is_active=True, is_hidden=False)
        .values_list("organization_preference_id", flat=True)
    )

    org_carrier_ids = set(
        OrganizationInsuranceCarrierPreference.objects.filter(
            organization=facility.organization,
            is_active=True,
            is_hidden=False,
            carrier__is_active=True,
        )
        .exclude(id__in=hidden_preference_ids)
        .values_list("carrier_id", flat=True)
    )

    local_carrier_ids = set(
        FacilityInsuranceCarrierOverride.objects.filter(
            facility=facility,
            organization_preference_id__isnull=True,
            carrier__is_active=True,
            is_active=True,
            is_hidden=False,
        ).values_list("carrier_id", flat=True)
    )

    return org_carrier_ids | local_carrier_ids
