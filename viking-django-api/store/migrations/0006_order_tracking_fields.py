from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0005_shoppinglist_shoppinglistitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='tracking_number',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='carrier',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='estimated_delivery',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='admin_notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending',          'Pending'),
                    ('processing',       'Processing'),
                    ('shipped',          'Shipped'),
                    ('out_for_delivery', 'Out for Delivery'),
                    ('delivered',        'Delivered'),
                    ('cancelled',        'Cancelled'),
                    ('refunded',         'Refunded'),
                ],
                default='pending',
                max_length=50,
            ),
        ),
    ]
