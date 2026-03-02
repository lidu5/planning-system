"""
Data migration script for handling existing quarterly data when introducing NULL support.

This script should be run after the schema migrations to properly handle existing data.
"""

from django.db import migrations
from django.db.models import F


def set_default_applicable_quarters(apps, schema_editor):
    """Set all existing indicators to have all quarters applicable"""
    Indicator = apps.get_model('indicators', 'Indicator')
    Indicator.objects.update(applicable_quarters=[1, 2, 3, 4])


def migrate_existing_quarterly_breakdowns(apps, schema_editor):
    """
    Migrate existing quarterly breakdowns.
    - Keep existing values as-is (they represent actual targets)
    - Don't convert any values to NULL unless they were already NULL
    """
    QuarterlyBreakdown = apps.get_model('plans', 'QuarterlyBreakdown')
    
    # No action needed - existing values should be preserved
    # The schema migration already handles the field changes
    pass


def create_validation_examples(apps, schema_editor):
    """Create example indicators with different quarter applicability for testing"""
    Indicator = apps.get_model('indicators', 'Indicator')
    Department = apps.get_model('indicators', 'Department')
    Sector = apps.get_model('indicators', 'StateMinisterSector')
    
    # Get or create a test department
    sector, _ = Sector.objects.get_or_create(
        name="Agriculture",
        defaults={}
    )
    
    dept, _ = Department.objects.get_or_create(
        name="Crop Management",
        sector=sector,
        defaults={}
    )
    
    # Create example indicators with different quarter applicability
    examples = [
        {
            "name": "Rainy Season Crop Yield",
            "applicable_quarters": [1, 2],  # Only Q1-Q2 (rainy season)
            "description": "Crop yield during rainy season months"
        },
        {
            "name": "Dry Season Crop Yield", 
            "applicable_quarters": [3, 4],  # Only Q3-Q4 (dry season)
            "description": "Crop yield during dry season months"
        },
        {
            "name": "Annual Equipment Maintenance",
            "applicable_quarters": [],  # All quarters (empty list)
            "description": "Regular equipment maintenance throughout the year"
        },
        {
            "name": "Q1 Planting Activities",
            "applicable_quarters": [1],  # Only Q1
            "description": "Planting activities for first quarter"
        }
    ]
    
    for example in examples:
        Indicator.objects.get_or_create(
            name=example["name"],
            department=dept,
            defaults={
                "description": example["description"],
                "applicable_quarters": example["applicable_quarters"],
                "unit": "tons"
            }
        )


class Migration(migrations.Migration):
    dependencies = [
        ('indicators', '0011_add_applicable_quarters_to_indicator'),
        ('plans', '0007_allow_null_quarterly_values'),
    ]

    operations = [
        migrations.RunPython(set_default_applicable_quarters),
        migrations.RunPython(migrate_existing_quarterly_breakdowns),
        migrations.RunPython(create_validation_examples),
    ]
