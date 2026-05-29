import logging

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

logger = logging.getLogger(__name__)


def _get_fernet():
    key = getattr(settings, "FIELD_ENCRYPTION_KEY", None)
    if not key:
        raise ImproperlyConfigured("FIELD_ENCRYPTION_KEY is required.")
    return Fernet(key.encode() if isinstance(key, str) else key)


class EncryptedCharField(models.CharField):
    """CharField that encrypts values at rest using Fernet (AES-128-CBC + HMAC)."""

    def get_prep_value(self, value):
        if not value:
            return value
        return _get_fernet().encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if not value:
            return value
        try:
            return _get_fernet().decrypt(value.encode()).decode()
        except InvalidToken as exc:
            # Never return the undecryptable ciphertext as if it were the
            # plaintext value — that would silently surface encrypted bytes
            # as PHI. Fail loud so a misconfigured/rotated FIELD_ENCRYPTION_KEY
            # is caught instead of corrupting reads.
            logger.error(
                "Failed to decrypt %s value; FIELD_ENCRYPTION_KEY may be "
                "missing, wrong, or rotated.",
                self.__class__.__name__,
            )
            raise ValueError("Unable to decrypt stored value.") from exc

    def get_internal_type(self):
        return "TextField"
