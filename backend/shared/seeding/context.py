"""Shared state for the demo seeder.

A single ``SeedContext`` is threaded through every seeding module so the former
``handle()`` closures become plain functions. Holds no behavior — just the
references the phases build up and read (org, users, facilities, carriers, fee
schedule items, the portal patient) plus the command's stdout/style and the
run's ``today``.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SeedContext:
    stdout: Any
    style: Any
    today: Any

    org: Any = None

    admin_user: Any = None
    doctor_user: Any = None
    doctor2_user: Any = None
    nurse_user: Any = None
    staff_user: Any = None
    staff2_user: Any = None
    facility_admin_user: Any = None

    facilities: list = field(default_factory=list)
    clinic_a: Any = None
    clinic_b: Any = None
    clinic_c: Any = None

    carriers: list = field(default_factory=list)
    standard_fee_schedule: Any = None
    fee_schedule_items: dict = field(default_factory=dict)

    portal_patient: Any = None

    def write(self, message):
        self.stdout.write(message)
