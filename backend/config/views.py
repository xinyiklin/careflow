from collections import Counter

from django.shortcuts import render
from django.utils.text import slugify

from .api_catalog import API_ENDPOINT_SECTIONS


def api_home(request):
    endpoint_sections = [
        {
            **section,
            "id": slugify(section["title"]),
        }
        for section in API_ENDPOINT_SECTIONS
    ]
    method_counts = Counter(
        endpoint["method"]
        for section in endpoint_sections
        for endpoint in section["endpoints"]
    )

    context = {
        "api_title": "CareFlow API",
        "api_subtitle": "Operational catalog for the CareFlow backend surface area.",
        "version": "v1",
        "method_counts": [
            {"method": method, "count": count, "class": method.lower()}
            for method, count in sorted(method_counts.items())
        ],
        "endpoint_sections": endpoint_sections,
    }
    return render(request, "api_home.html", context)
