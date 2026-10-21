"""The DRF exception handler turns model validation into 400s."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import SimpleTestCase

from .exceptions import exception_handler


class ExceptionHandlerTests(SimpleTestCase):
    def test_field_errors_become_a_400(self):
        response = exception_handler(
            DjangoValidationError({"code": ["Already in use."]}), {}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"code": ["Already in use."]})

    def test_all_key_maps_to_non_field_errors(self):
        response = exception_handler(
            DjangoValidationError({"__all__": ["Row already exists."]}), {}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"non_field_errors": ["Row already exists."]})

    def test_plain_messages_map_to_non_field_errors(self):
        response = exception_handler(DjangoValidationError(["Bad value."]), {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"non_field_errors": ["Bad value."]})

    def test_constraint_names_are_not_exposed(self):
        response = exception_handler(
            DjangoValidationError(
                {
                    "__all__": [
                        "Constraint “unique_pending_refill_per_medication” is violated."
                    ]
                }
            ),
            {},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data,
            {"non_field_errors": ["This record conflicts with an existing one."]},
        )

    def test_other_exceptions_keep_default_handling(self):
        self.assertIsNone(exception_handler(RuntimeError("boom"), {}))
