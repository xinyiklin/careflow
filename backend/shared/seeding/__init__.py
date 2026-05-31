"""Demo seeder, split by domain.

``run_seed`` is the entry point used by the ``seed_demo`` management command.
It builds a :class:`SeedContext`, seeds the global RNG once, and runs each phase
module in the original order (the per-facility block is interleaved inside one
loop so the RNG stream is unchanged from the pre-split command).
"""

import random

from django.utils import timezone

from . import (
    core,
    eprescribe,
    facilities,
    facility_seed,
    portal,
    reference,
    summary,
)
from .context import SeedContext

__all__ = ["run_seed", "SeedContext"]


def run_seed(stdout, style):
    random.seed(42)
    ctx = SeedContext(stdout=stdout, style=style, today=timezone.localdate())
    ctx.write("Seeding demo data...")

    core.seed(ctx)  # organization, users, memberships, org roles
    facilities.seed(ctx)  # facilities, staff, credentials, rooms
    reference.seed(ctx)  # insurance carriers, fee schedule

    for facility in ctx.facilities:
        facility_seed.seed_facility(ctx, facility)

    portal.seed(ctx)  # portal account, scheduling, refills, messaging
    eprescribe.seed(ctx)  # e-prescribe flags, prescriber assignment, delegations

    stdout.write(style.SUCCESS("Demo data seeded successfully!"))
    summary.seed(ctx)
