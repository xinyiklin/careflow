import re
from datetime import datetime

from django.db.models import Q

DOB_SEARCH_FORMATS = ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y")


def parse_search_date(value):
    for date_format in DOB_SEARCH_FORMATS:
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue
    return None


def build_patient_name_query(value):
    normalized = " ".join(str(value or "").strip().split())
    if not normalized:
        return Q()

    if "," in normalized:
        last, first = (part.strip() for part in normalized.split(",", 1))
        query = Q()
        if last:
            query &= Q(last_name__icontains=last)
        if first:
            query &= (
                Q(first_name__icontains=first)
                | Q(middle_name__icontains=first)
                | Q(preferred_name__icontains=first)
            )
        return query

    tokens = [token for token in re.split(r"\s+", normalized) if token]
    if len(tokens) >= 2:
        first_token = tokens[0]
        last_token = tokens[-1]
        direct_order = (
            Q(first_name__icontains=first_token)
            | Q(preferred_name__icontains=first_token)
        ) & Q(last_name__icontains=last_token)
        reverse_order = Q(last_name__icontains=first_token) & (
            Q(first_name__icontains=last_token)
            | Q(preferred_name__icontains=last_token)
        )
        all_tokens = Q()
        for token in tokens:
            all_tokens &= (
                Q(first_name__icontains=token)
                | Q(middle_name__icontains=token)
                | Q(preferred_name__icontains=token)
                | Q(last_name__icontains=token)
            )
        return direct_order | reverse_order | all_tokens

    return (
        Q(last_name__icontains=normalized)
        | Q(first_name__icontains=normalized)
        | Q(middle_name__icontains=normalized)
        | Q(preferred_name__icontains=normalized)
    )


def build_patient_search_query(value):
    digits_only = re.sub(r"\D", "", value)
    query = (
        build_patient_name_query(value)
        | Q(chart_number__icontains=value)
        | Q(email__icontains=value)
        | Q(phones__number__icontains=value)
    )

    if digits_only and digits_only != value:
        query |= Q(chart_number__icontains=digits_only)
        query |= Q(phones__number__icontains=digits_only)

    parsed_date = parse_search_date(value)
    if parsed_date:
        query |= Q(date_of_birth=parsed_date)

    return query
