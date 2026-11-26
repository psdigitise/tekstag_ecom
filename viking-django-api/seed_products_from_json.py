import os
import json
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'viking_api.settings')
django.setup()

from store.models import Category, Product, PriceTier

def seed_data():
    json_path = os.path.join('../viking-direct-clone/src/data/products.json')
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return

    with open(json_path, 'r') as f:
        data = json.load(f)

    # 1. Seed Categories
    print("Seeding categories...")
    for cat_data in data.get('topCategories', []):
        Category.objects.update_or_create(
            id=cat_data['id'],
            defaults={
                'name': cat_data['name'],
                'slug': cat_data['slug'],
                'from_price': cat_data.get('fromPrice'),
                'image': cat_data.get('image'),
                'fallback_color': cat_data.get('fallbackColor')
            }
        )

    # 2. Seed Products from each category key
    print("Seeding products...")
    category_slugs = [c['slug'] for c in data.get('topCategories', [])]
    category_products = data.get('categoryProducts', {})
    
    for slug in category_slugs:
        if slug not in category_products:
            print(f"Skipping slug: {slug}")
            continue
            
        category = Category.objects.get(slug=slug)
        products_list = category_products[slug]
        
        for p_data in products_list:
            # Create or update product
            product, created = Product.objects.update_or_create(
                id=p_data['id'],
                defaults={
                    'name': p_data['name'],
                    'brand_name': p_data.get('brand'),
                    'stars': p_data.get('stars'),
                    'review_count': p_data.get('reviews', 0),
                    'price_ex_vat': p_data.get('priceExVat') or p_data.get('price'),
                    'price_inc_vat': p_data.get('price'),
                    'badge': p_data.get('badge'),
                    'eco_badge': p_data.get('ecoBadge'),
                    'unit_info': p_data.get('unitInfo'),
                    'stock_status': p_data.get('stockStatus'),
                    'delivery_text': p_data.get('deliveryText'),
                    'image': p_data.get('image'),
                    'image_style': p_data.get('imageStyle'),
                    'category': category
                }
            )
            
            # Seed Price Tiers if available
            if 'priceTiers' in p_data:
                # Clear existing tiers for this product to avoid duplicates
                product.price_tiers.all().delete()
                for tier in p_data['priceTiers']:
                    PriceTier.objects.create(
                        product=product,
                        qty=tier['qty'],
                        price=tier['price'],
                        discount=tier.get('discount')
                    )
            
            status = "Created" if created else "Updated"
            print(f"  [{status}] {product.name} (ID: {product.id})")

    print("\nSeeding complete!")

if __name__ == '__main__':
    seed_data()
