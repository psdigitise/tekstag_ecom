from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0011_paymentmethod'),
    ]

    operations = [
        migrations.CreateModel(
            name='Voucher',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code',          models.CharField(max_length=50, unique=True)),
                ('voucher_type',  models.CharField(choices=[('percent', 'Percentage'), ('fixed', 'Fixed Amount')], default='percent', max_length=10)),
                ('value',         models.DecimalField(decimal_places=2, max_digits=10)),
                ('min_order',     models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('free_delivery', models.BooleanField(default=False)),
                ('is_active',     models.BooleanField(default=True)),
                ('expiry_date',   models.DateField(blank=True, null=True)),
                ('usage_limit',   models.IntegerField(blank=True, help_text='Leave blank for unlimited uses', null=True)),
                ('times_used',    models.IntegerField(default=0)),
                ('created_at',    models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'voucher',
            },
        ),
    ]
