# Generated manually to fix missing columns

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('indicators', '0005_alter_indicatorgroup_unique_together_and_more'),
    ]

    operations = [
        # Add parent column if it doesn't exist
        migrations.AddField(
            model_name='indicatorgroup',
            name='parent',
            field=models.ForeignKey(
                blank=True, 
                null=True, 
                on_delete=django.db.models.deletion.CASCADE, 
                related_name='children', 
                to='indicators.indicatorgroup'
            ),
            preserve_default=False,
        ),
        # Add unit column if it doesn't exist
        migrations.AddField(
            model_name='indicatorgroup',
            name='unit',
            field=models.CharField(
                blank=True, 
                help_text='Unit of measurement for this group and its indicators', 
                max_length=64
            ),
            preserve_default=False,
        ),
    ]
