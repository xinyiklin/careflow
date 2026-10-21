import logging
import re

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import exceptions
from rest_framework.settings import api_settings
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

# Django's default message for a violated conditional UniqueConstraint names
# the constraint; the name is an internal detail, so the client gets a plain
# conflict message instead.
_CONSTRAINT_MESSAGE = re.compile(r"^Constraint [“\"].+[”\"] is violated\.$")
_CONFLICT_MESSAGE = "This record conflicts with an existing one."


def _public_messages(messages):
    return [
        _CONFLICT_MESSAGE if _CONSTRAINT_MESSAGE.match(str(message)) else message
        for message in messages
    ]


def _django_validation_detail(exc):
    """Shape a Django ``ValidationError`` like a DRF field-error payload."""
    if hasattr(exc, "error_dict"):
        detail = {}
        for field, messages in exc.message_dict.items():
            key = api_settings.NON_FIELD_ERRORS_KEY if field == "__all__" else field
            detail[key] = _public_messages(messages)
        return detail
    return {api_settings.NON_FIELD_ERRORS_KEY: _public_messages(exc.messages)}


def exception_handler(exc, context):
    """DRF exception handler that turns model validation into a 400.

    Models run ``full_clean()`` in ``save()`` as a safety net. When a
    serializer is looser than its model (a duplicate per-facility code, an
    invalid time zone, a bad phone number on a nested record), the Django
    ``ValidationError`` otherwise escapes DRF as a 500 with no user-safe body.
    Everything else keeps DRF's default handling.
    """
    if isinstance(exc, DjangoValidationError):
        detail = _django_validation_detail(exc)
        # A model rule reaching this layer usually means a serializer is
        # missing a check; keep it visible without logging the values.
        view = context.get("view") if context else None
        request = context.get("request") if context else None
        logger.warning(
            "Model validation reached the API layer: %s %s fields=%s",
            getattr(request, "method", "-"),
            type(view).__name__ if view is not None else "-",
            sorted(detail.keys()),
        )
        exc = exceptions.ValidationError(detail=detail)
    return drf_exception_handler(exc, context)
