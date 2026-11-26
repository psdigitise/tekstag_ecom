import json
import os
from django.core.management.base import BaseCommand
from store.models import Product, PriceTier, Category, Brand, Review


class Command(BaseCommand):
    help = 'Seed the database from products.json'

    def handle(self, *args, **options):
        # Locate JSON file
        json_path = os.path.join(
            os.path.dirname(__file__),
            '..', '..', '..', '..', 'viking-direct-clone', 'src', 'data', 'products.json',
        )
        json_path = os.path.abspath(json_path)

        if not os.path.exists(json_path):
            self.stderr.write(self.style.ERROR(f'JSON file not found: {json_path}'))
            return

        with open(json_path, 'r') as f:
            data = json.load(f)

        # Clear existing data
        PriceTier.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Brand.objects.all().delete()
        Review.objects.all().delete()
        self.stdout.write('🗑️  Cleared old data')

        # Seed Categories
        for c in data.get('topCategories', []):
            Category.objects.create(
                name=c['name'],
                slug=c.get('slug'),
                from_price=c.get('fromPrice'),
                image=c.get('image'),
                fallback_color=c.get('fallbackColor'),
            )
        self.stdout.write(f"📁 Seeded {len(data.get('topCategories', []))} categories")

        # Seed Brands
        for b in data.get('brands', []):
            Brand.objects.create(
                name=b['name'],
                slug=b.get('slug'),
                color=b.get('color'),
            )
        self.stdout.write(f"🏷️  Seeded {len(data.get('brands', []))} brands")

        # Seed Reviews
        for r in data.get('trustpilotReviews', []):
            Review.objects.create(
                title=r['title'],
                body=r['body'],
                author=r['author'],
                time_ago=r.get('timeAgo'),
                stars=r.get('stars', 5),
            )
        self.stdout.write(f"⭐ Seeded {len(data.get('trustpilotReviews', []))} reviews")

        # Seed Products - "viewed" section
        for p in data.get('productsViewed', []):
            Product.objects.create(
                name=p['name'],
                short_name=p.get('shortName'),
                sku=p.get('sku'),
                brand_name=p.get('brand'),
                price_ex_vat=p.get('priceExVat'),
                price_inc_vat=p.get('priceIncVat'),
                unit=p.get('unit'),
                bulk_from=p.get('bulkFrom'),
                badge=p.get('badge'),
                image=p.get('image'),
                section='viewed',
            )
        self.stdout.write(f"👁️  Seeded {len(data.get('productsViewed', []))} 'viewed' products")

        # Seed Products - "bought" section
        for p in data.get('productsBought', []):
            Product.objects.create(
                name=p['name'],
                short_name=p.get('shortName'),
                sku=p.get('sku'),
                brand_name=p.get('brand'),
                price_ex_vat=p.get('priceExVat'),
                price_inc_vat=p.get('priceIncVat'),
                unit=p.get('unit'),
                bulk_from=p.get('bulkFrom'),
                badge=p.get('badge'),
                image=p.get('image'),
                section='bought',
            )
        self.stdout.write(f"🛒 Seeded {len(data.get('productsBought', []))} 'bought' products")

        # Seed Products - "listing" section (with price tiers)
        for p in data.get('listingProducts', []):
            badge = p.get('badge')
            if badge == 'Buy More, Save More':
                badge = 'buyMore'

            product = Product.objects.create(
                name=p['name'],
                brand_name=p.get('brand'),
                stars=p.get('stars'),
                review_count=p.get('reviews', 0),
                badge=badge,
                eco_badge=p.get('ecoBadge'),
                price_ex_vat=p.get('price'),
                price_inc_vat=p.get('price'),
                unit_info=p.get('unitInfo'),
                stock_status=p.get('stockStatus'),
                delivery_text=p.get('deliveryText'),
                image=p.get('image'),
                image_style=p.get('imageStyle'),
                section='listing',
            )

            # Save price tiers
            for t in p.get('priceTiers', []):
                PriceTier.objects.create(
                    qty=t['qty'],
                    price=t['price'],
                    discount=t.get('discount'),
                    product=product,
                )
        self.stdout.write(
            f"📦 Seeded {len(data.get('listingProducts', []))} listing products with tiers"
        )

        self.stdout.write(self.style.SUCCESS('✅ Seed complete!'))
