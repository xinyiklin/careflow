from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed demo data for CareFlow"

    def handle(self, *args, **kwargs):
        from shared.seeding import run_seed

        run_seed(stdout=self.stdout, style=self.style)
