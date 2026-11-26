from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.db.models import Q
from .models import ProductImage, Product, PriceTier, Category, Brand, Review, SiteSetting, Order, OrderItem, ShoppingList, ShoppingListItem, Address, PaymentMethod, Voucher
from .availability import unavailable_reason
from .store_settings import clean_pricing


# ─── PriceTier ────────────────────────────────────────────────────────────────

class PriceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceTier
        fields = ['id', 'qty', 'price', 'discount']


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        return obj.image.url

    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'image']
        extra_kwargs = {'image': {'write_only': True}}


# ─── SiteSetting ──────────────────────────────────────────────────────────────

class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = ['key', 'value']

    def validate(self, attrs):
        key = attrs.get('key') or getattr(self.instance, 'key', None)
        # Prices on the basket and invoices are calculated from these numbers.
        if key == 'pricing' and 'value' in attrs:
            try:
                attrs['value'] = clean_pricing(attrs['value'])
            except ValueError as error:
                raise serializers.ValidationError({'error': str(error)})
        return attrs


# ─── Voucher ──────────────────────────────────────────────────────────────────

class VoucherSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=50)
    voucherType = serializers.ChoiceField(source='voucher_type', choices=Voucher.VOUCHER_TYPES)
    value = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))
    minOrder = serializers.DecimalField(
        source='min_order', max_digits=10, decimal_places=2, min_value=Decimal('0'), required=False,
    )
    freeDelivery = serializers.BooleanField(source='free_delivery', required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    expiryDate = serializers.DateField(source='expiry_date', required=False, allow_null=True)
    usageLimit = serializers.IntegerField(
        source='usage_limit', required=False, allow_null=True, min_value=1, max_value=1_000_000_000,
    )
    timesUsed = serializers.IntegerField(source='times_used', read_only=True)

    class Meta:
        model = Voucher
        fields = [
            'id', 'code', 'voucherType', 'value', 'minOrder', 'freeDelivery',
            'isActive', 'expiryDate', 'usageLimit', 'timesUsed',
        ]

    def validate_code(self, code):
        # Checkout compares codes in capitals.
        code = code.strip().upper()
        if not code or any(c.isspace() for c in code):
            raise serializers.ValidationError('Enter a code without spaces.')
        others = Voucher.objects.filter(code__iexact=code)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError('This code already exists.')
        return code

    def validate(self, attrs):
        def current(field, default=None):
            return attrs[field] if field in attrs else getattr(self.instance, field, default)

        value = current('value')
        if current('voucher_type') == 'percent' and value > 100:
            raise serializers.ValidationError({'error': 'A percentage cannot be more than 100.'})
        if value == 0 and not current('free_delivery', False):
            raise serializers.ValidationError({'error': 'Enter a discount, or turn on free delivery.'})
        return attrs


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'color']


# ─── Category ─────────────────────────────────────────────────────────────────

def _unique_category_slug(base, exclude_id=None):
    """Return `base`, or `base-2`, `base-3`… — the first slug no other category uses."""
    others = Category.objects.all()
    if exclude_id is not None:
        others = others.exclude(id=exclude_id)
    slug, n = base, 2
    while others.filter(slug=slug).exists():
        slug = f'{base}-{n}'
        n += 1
    return slug


class CategoryListSerializer(serializers.ModelSerializer):
    """Used for listing categories (no nested products)."""
    fromPrice = serializers.CharField(source='from_price', allow_null=True, required=False, allow_blank=True)
    fallbackColor = serializers.CharField(source='fallback_color', allow_null=True, required=False, allow_blank=True)
    slug = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    # Computed from real products by CategoryViewSet's queryset annotations.
    productCount = serializers.SerializerMethodField()
    minPrice = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'fromPrice', 'image', 'fallbackColor', 'parent', 'productCount', 'minPrice']

    def get_productCount(self, obj):
        # Includes products in subcategories.
        count = getattr(obj, 'product_count', None)
        if count is not None:
            return count
        return Product.objects.filter(Q(category=obj) | Q(category__parent=obj)).count()

    def get_minPrice(self, obj):
        value = getattr(obj, 'min_price', None)
        return f'{Decimal(str(value)):.4f}' if value is not None else None

    def validate(self, attrs):
        """
        Slug rules (no database migration needed):
          - blank or missing on create  -> generated from the name
          - blank on update             -> regenerated from the (new or current) name
          - typed by the admin          -> normalised (lowercase, hyphens) and must be unique
        """
        instance = getattr(self, 'instance', None)
        exclude_id = instance.id if instance else None
        name = (attrs.get('name') if 'name' in attrs else getattr(instance, 'name', '')) or ''
        if 'name' in attrs and not name.strip():
            raise serializers.ValidationError({'name': 'Category name cannot be blank.'})

        parent = attrs.get('parent')
        if parent is not None:
            if parent.id == exclude_id or parent.parent_id:
                raise serializers.ValidationError({'parent': 'The parent must be a main category.'})
            if instance and instance.children.exists():
                raise serializers.ValidationError(
                    {'parent': 'This category has subcategories, so it cannot become one.'}
                )

        slug_given = 'slug' in attrs
        raw_slug = (attrs.get('slug') or '').strip() if slug_given else None

        if raw_slug:
            slug = slugify(raw_slug)
            if not slug:
                raise serializers.ValidationError({'slug': 'Slug must contain letters or numbers.'})
            if Category.objects.exclude(id=exclude_id).filter(slug=slug).exists():
                raise serializers.ValidationError({'slug': f'Another category already uses the slug "{slug}".'})
            attrs['slug'] = slug
        elif instance is None or slug_given or not instance.slug:
            base = slugify(name)
            if not base:
                raise serializers.ValidationError(
                    {'slug': 'Could not generate a slug from this name. Please enter one.'}
                )
            attrs['slug'] = _unique_category_slug(base, exclude_id)
        return attrs


class CategorySummarySerializer(serializers.ModelSerializer):
    """
    Category as nested inside a product. Deliberately has no productCount /
    minPrice: computing those per product cost one extra query per row.
    """
    fromPrice = serializers.CharField(source='from_price', read_only=True)
    fallbackColor = serializers.CharField(source='fallback_color', read_only=True)

    parent = serializers.IntegerField(source='parent_id', read_only=True, allow_null=True)
    parentName = serializers.CharField(source='parent.name', read_only=True, default=None)
    parentSlug = serializers.CharField(source='parent.slug', read_only=True, default=None)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'fromPrice', 'image', 'fallbackColor', 'parent', 'parentName', 'parentSlug']


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Used for category detail — includes nested products."""
    fromPrice = serializers.CharField(source='from_price', allow_null=True, required=False, allow_blank=True)
    fallbackColor = serializers.CharField(source='fallback_color', allow_null=True, required=False, allow_blank=True)
    products = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'fromPrice', 'image', 'fallbackColor', 'products']

    def get_products(self, obj):
        return ProductSerializer(obj.products.all(), many=True).data


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductSerializer(serializers.ModelSerializer):
    # Optional text fields accept blank strings: the admin form sends "" for
    # fields left empty. Without allow_blank=True those requests were rejected.
    shortName = serializers.CharField(source='short_name', allow_null=True, allow_blank=True, required=False)
    brandName = serializers.CharField(source='brand_name', allow_null=True, allow_blank=True, required=False)
    priceExVat = serializers.DecimalField(
        source='price_ex_vat', max_digits=12, decimal_places=4, allow_null=True, required=False,
        min_value=0,
    )
    priceIncVat = serializers.DecimalField(
        source='price_inc_vat', max_digits=12, decimal_places=4, allow_null=True, required=False,
        min_value=0,
    )
    bulkFrom = serializers.CharField(source='bulk_from', allow_null=True, allow_blank=True, required=False)
    reviewCount = serializers.IntegerField(source='review_count', required=False, min_value=0)
    ecoBadge = serializers.CharField(source='eco_badge', allow_null=True, allow_blank=True, required=False)
    unitInfo = serializers.CharField(source='unit_info', allow_null=True, allow_blank=True, required=False)
    stockStatus = serializers.CharField(source='stock_status', allow_null=True, allow_blank=True, required=False)
    deliveryText = serializers.CharField(source='delivery_text', allow_null=True, allow_blank=True, required=False)
    imageStyle = serializers.CharField(source='image_style', allow_null=True, allow_blank=True, required=False)
    weight = serializers.DecimalField(max_digits=8, decimal_places=3, allow_null=True, required=False)
    priceTiers = PriceTierSerializer(source='price_tiers', many=True, read_only=True)
    category = CategorySummarySerializer(read_only=True, allow_null=True)
    keyAttributes = serializers.CharField(source='key_attributes', allow_blank=True, required=False)
    weightText = serializers.CharField(source='weight_text', allow_blank=True, required=False, max_length=100)
    groupCode = serializers.CharField(source='group_code', allow_blank=True, required=False, max_length=50)
    categoryId = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    brand = BrandSerializer(read_only=True, allow_null=True)
    # Resolves the correct image: uploaded file takes priority over URL string
    imageUrl = serializers.SerializerMethodField()
    # Only set on grouped listings (?grouped=1).
    variantCount = serializers.SerializerMethodField()
    priceVaries = serializers.SerializerMethodField()

    def _group(self, obj):
        return (self.context.get('groups') or {}).get(obj.group_code)

    def get_variantCount(self, obj):
        group = self._group(obj)
        return group['n'] if group else 1

    def get_priceVaries(self, obj):
        group = self._group(obj)
        return bool(group and group['low'] != group['high'])
    # Server's verdict on whether the product can be bought (see availability.py).
    isPurchasable = serializers.SerializerMethodField()
    unavailableReason = serializers.SerializerMethodField()

    def get_isPurchasable(self, obj):
        return unavailable_reason(obj) is None

    def get_unavailableReason(self, obj):
        return unavailable_reason(obj)

    def get_imageUrl(self, obj):
        if obj.image_file:
            return obj.image_file.url
        return obj.image or None

    # Display sections the storefront knows how to show. 'recommendation' comes
    # from the client's product data template.
    SECTIONS = ('listing', 'viewed', 'bought', 'recommendation')

    def validate_section(self, value):
        value = (value or 'listing').strip().lower()
        if value not in self.SECTIONS:
            raise serializers.ValidationError(
                f'Section must be one of: {", ".join(self.SECTIONS)}.'
            )
        return value

    def validate_name(self, value):
        if not (value or '').strip():
            raise serializers.ValidationError('Product name cannot be blank.')
        return value.strip()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'shortName', 'sku', 'brandName',
            'priceExVat', 'priceIncVat', 'unit', 'bulkFrom',
            'badge', 'stars', 'reviewCount', 'image', 'image_file', 'imageUrl',
            'ecoBadge', 'unitInfo', 'stockStatus', 'deliveryText',
            'imageStyle', 'weight', 'section', 'category', 'categoryId', 'brand', 'priceTiers',
            'isPurchasable', 'unavailableReason',
            'variantCount', 'priceVaries', 'description', 'keyAttributes', 'colour', 'thickness', 'size', 'weightText', 'groupCode',
        ]


# ─── Review ───────────────────────────────────────────────────────────────────

class ReviewSerializer(serializers.ModelSerializer):
    # Legacy field for homepage Trustpilot-style reviews
    timeAgo = serializers.CharField(source='time_ago', allow_null=True, required=False)

    # For product reviews: write product_id, read back display info
    productId = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True, required=False, allow_null=True
    )
    authorName = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    isVerifiedPurchase = serializers.SerializerMethodField()

    def get_authorName(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full else obj.user.username
        return obj.author or 'Anonymous'

    def get_createdAt(self, obj):
        if obj.created_at:
            return obj.created_at.strftime('%B %Y')
        return obj.time_ago or ''

    def get_isVerifiedPurchase(self, obj):
        if not obj.user or not obj.product:
            return False
        from .models import OrderItem
        return OrderItem.objects.filter(
            order__user=obj.user,
            product=obj.product,
            order__status__in=['delivered', 'shipped', 'processing', 'out_for_delivery'],
        ).exists()

    class Meta:
        model = Review
        fields = ['id', 'title', 'body', 'author', 'timeAgo', 'stars',
                  'productId', 'authorName', 'createdAt', 'isVerifiedPurchase']
        read_only_fields = ['id', 'authorName', 'createdAt', 'isVerifiedPurchase']

# ─── User ─────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_login = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'last_login']

# ─── Order ──────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(format="%d %b %Y %H:%M", read_only=True)
    updated_at = serializers.DateTimeField(format="%d %b %Y %H:%M", read_only=True)
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username if obj.user else None

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'total_amount', 'status', 'created_at', 'updated_at',
            'user_email', 'user_name',
            'contact_name', 'phone', 'postal_code', 'street', 'city', 'county',
            'delivery_contact_name', 'delivery_phone', 'delivery_postal_code',
            'delivery_street', 'delivery_city', 'delivery_county',
            'tracking_number', 'carrier', 'estimated_delivery', 'admin_notes',
            'items',
        ]
        # total_amount is always calculated server-side in perform_create;
        # marking it read_only ensures clients cannot inject a fake total.
        read_only_fields = ['user', 'order_number', 'total_amount']


# ─── Shopping List ────────────────────────────────────────────────────────────

class ShoppingListItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = ShoppingListItem
        fields = ['id', 'product', 'product_id', 'added_at']

class ShoppingListSerializer(serializers.ModelSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(format="%d %b %Y", read_only=True)

    class Meta:
        model = ShoppingList
        fields = ['id', 'name', 'created_at', 'items']
        read_only_fields = ['user']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'contact_name', 'phone', 'street', 'city',
            'postal_code', 'county', 'is_default', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'card_type', 'last_4', 'expiry_month', 'expiry_year',
            'holder_name', 'is_default', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
