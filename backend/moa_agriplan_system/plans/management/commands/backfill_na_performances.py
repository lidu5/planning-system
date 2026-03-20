from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction
from plans.models import QuarterlyPerformance, PerformanceStatus
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = (
        "Backfill N/A quarterly performances (value is null) to FINAL_APPROVED "
        "when the quarter is not applicable or the plan's quarterly value is missing."
    )

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

        # Base set: N/A performances not already final approved
        base_qs = (
            QuarterlyPerformance.objects.select_related(
                "plan__indicator", "plan__quarterly_breakdown"
            )
            .filter(value__isnull=True)
            .exclude(status=PerformanceStatus.FINAL_APPROVED)
        )

        # Keep only performances where the quarter is not applicable OR plan breakdown value is missing
        to_update_ids = []
        for perf in base_qs:
            indicator = perf.plan.indicator
            breakdown = getattr(perf.plan, "quarterly_breakdown", None)
            q_field = f"q{perf.quarter}"
            plan_q_value = getattr(breakdown, q_field, None) if breakdown else None

            not_applicable = not indicator.is_quarter_applicable(perf.quarter)
            missing_plan_value = plan_q_value is None

            if not_applicable or missing_plan_value:
                to_update_ids.append(perf.id)

        count = len(to_update_ids)
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No N/A performances require backfill."))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would update {count} performance records to FINAL_APPROVED (non-applicable or missing plan quarter)."
                )
            )
            return

        now = timezone.now()
        with transaction.atomic():
            QuarterlyPerformance.objects.filter(id__in=to_update_ids).update(
                status=PerformanceStatus.FINAL_APPROVED,
                final_approved_by_id=getattr(approver, "id", None),
                final_approved_at=now,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {count} performance records to FINAL_APPROVED (non-applicable or missing plan quarter)."
            )
        )
