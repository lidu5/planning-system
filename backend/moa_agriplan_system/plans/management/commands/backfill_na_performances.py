from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction
from plans.models import QuarterlyPerformance, PerformanceStatus
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Backfill N/A quarterly performances (value is null) to FINAL_APPROVED."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=int,
            default=None,
            help="User ID to stamp as final_approved_by. Optional; leaves approver blank if omitted.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many rows would be updated without changing data.",
        )

    def handle(self, *args, **options):
        user_id = options.get("user_id")
        dry_run = options.get("dry_run", False)
        approver = None

        if user_id is not None:
            User = get_user_model()
            try:
                approver = User.objects.get(id=user_id)
            except User.DoesNotExist as exc:
                raise CommandError(f"User with id {user_id} does not exist") from exc

        qs = QuarterlyPerformance.objects.filter(value__isnull=True).exclude(
            status=PerformanceStatus.FINAL_APPROVED
        )

        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No N/A performances require backfill."))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would update {count} performance records to FINAL_APPROVED."
                )
            )
            return

        now = timezone.now()
        with transaction.atomic():
            qs.update(
                status=PerformanceStatus.FINAL_APPROVED,
                final_approved_by_id=getattr(approver, "id", None),
                final_approved_at=now,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {count} performance records to FINAL_APPROVED (value was N/A)."
            )
        )
