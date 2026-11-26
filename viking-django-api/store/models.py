from django.core.exceptions import ValidationError
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, blank=True, null=True)
    from_price = models.CharField(max_length=50, blank=True, null=True)
    image = models.TextField(blank=True, null=True)
    fallback_color = models.CharField(max_length=50, blank=True, null=True)
    # Set for a subcategory. One level only (enforced by the API and admin).
    parent = models.ForeignKey(
        'self', on_delete=models.PROTECT, blank=True, null=True, related_name='children',
    )

    class Meta:
        db_table = 'category'
        verbose_name_plural = 'categories'

    def __str__(self):
        return f'{self.parent.name} › {self.name}' if self.parent else self.name

    def clean(self):
        if self.parent:
            if self.parent_id == self.pk or self.parent.parent_id:
                raise ValidationError({'parent': 'The parent must be a main category.'})
            if self.pk and self.children.exists():
                raise ValidationError({'parent': 'A category with subcategories cannot become one.'})


class Brand(models.Model):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'brand'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=500)
    short_name = models.CharField(max_length=500, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    brand_name = models.CharField(max_length=255, blank=True, null=True)
    price_ex_vat = models.DecimalField(
        max_digits=12, decimal_places=4, blank=True, null=True
    )
    price_inc_vat = models.DecimalField(
        max_digits=12, decimal_places=4, blank=True, null=True
    )
    unit = models.CharField(max_length=100, blank=True, null=True)
    bulk_from = models.CharField(max_length=100, blank=True, null=True)
    badge = models.CharField(max_length=255, blank=True, null=True)
    stars = models.DecimalField(
        max_digits=2, decimal_places=1, blank=True, null=True
    )
    review_count = models.IntegerField(default=0)
    image = models.TextField(blank=True, null=True)
    image_file = models.ImageField(upload_to='products/', null=True, blank=True)
    eco_badge = models.CharField(max_length=255, blank=True, null=True)
    unit_info = models.CharField(max_length=255, blank=True, null=True)
    stock_status = models.CharField(max_length=100, blank=True, null=True)
    delivery_text = models.CharField(max_length=255, blank=True, null=True)
    image_style = models.CharField(max_length=255, blank=True, null=True)
    weight = models.DecimalField(max_digits=8, decimal_places=3, blank=True, null=True)
    section = models.CharField(max_length=50, default='listing')

    description = models.TextField(blank=True, default='')
    key_attributes = models.TextField(blank=True, default='', help_text='One per line')
    colour = models.CharField(max_length=255, blank=True, default='')
    thickness = models.CharField(max_length=100, blank=True, default='')
    size = models.CharField(max_length=100, blank=True, default='')
    weight_text = models.CharField(max_length=100, blank=True, default='', help_text='e.g. 780g/pack')
    # Products sharing a group code are variants (sizes) of the same item.
    group_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    # Where the supplier keeps the pictures. Not exposed by the public API.
    image_source = models.TextField(blank=True, default='')

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='products',
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='products',
    )

    class Meta:
        db_table = 'product'

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """
    Extra photo in a product's gallery. It belongs either to a group code (shared
    by every size of that product) or to a single product without a group.
    The main picture shown on cards stays on Product.image_file / image.
    """
    group_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    product = models.ForeignKey(
        'Product', on_delete=models.CASCADE, blank=True, null=True, related_name='own_images',
    )
    image = models.ImageField(upload_to='products/gallery/')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_image'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.group_code or self.product_id}: {self.image.name}'


class PriceTier(models.Model):
    qty = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.CharField(max_length=50, blank=True, null=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='price_tiers',
    )

    class Meta:
        db_table = 'price_tier'

    def __str__(self):
        return f'{self.qty} @ {self.price}'


class Review(models.Model):
    title = models.CharField(max_length=500)
    body = models.TextField()
    stars = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    # Legacy fields kept for backward compatibility with homepage Trustpilot reviews
    author = models.CharField(max_length=255, blank=True, null=True)
    time_ago = models.CharField(max_length=100, blank=True, null=True)

    # Product-linked reviews
    product = models.ForeignKey(
        'Product',
        on_delete=models.CASCADE,
        related_name='reviews',
        blank=True,
        null=True,
    )
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        related_name='reviews',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'review'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    company = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'user_profile'

    def __str__(self):
        return self.user.username


class SiteSetting(models.Model):
    key = models.CharField(max_length=255, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'site_setting'

    def __str__(self):
        return self.key


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending',          'Pending'),
        ('processing',       'Processing'),
        ('shipped',          'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered',        'Delivered'),
        ('cancelled',        'Cancelled'),
        ('refunded',         'Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', blank=True, null=True)
    order_number = models.CharField(max_length=100, unique=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')

    # Billing info
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=50, blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)

    # Delivery info
    delivery_contact_name = models.CharField(max_length=255, blank=True, null=True)
    delivery_phone = models.CharField(max_length=100, blank=True, null=True)
    delivery_postal_code = models.CharField(max_length=50, blank=True, null=True)
    delivery_street = models.CharField(max_length=255, blank=True, null=True)
    delivery_city = models.CharField(max_length=100, blank=True, null=True)
    delivery_county = models.CharField(max_length=100, blank=True, null=True)

    # Tracking info (admin-managed)
    tracking_number = models.CharField(max_length=200, blank=True, null=True)
    carrier = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery = models.DateField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order'
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=4)

    class Meta:
        db_table = 'order_item'

    def __str__(self):
        if self.product:
            return f"{self.quantity} x {self.product.name}"
        return f"{self.quantity} x Unknown Product"


class ShoppingList(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shopping_lists')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shopping_list'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ShoppingListItem(models.Model):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shopping_list_item'
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.product.name} in {self.shopping_list.name}"


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    contact_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=100, blank=True, null=True)
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=50)
    county = models.CharField(max_length=100, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'address'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.contact_name} - {self.postal_code}"


class PaymentMethod(models.Model):
    CARD_TYPES = [
        ('visa',       'Visa'),
        ('mastercard', 'Mastercard'),
        ('amex',       'American Express'),
        ('maestro',    'Maestro'),
        ('other',      'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    card_type = models.CharField(max_length=50, choices=CARD_TYPES, default='other')
    last_4 = models.CharField(max_length=4)
    expiry_month = models.IntegerField()
    expiry_year = models.IntegerField()
    holder_name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_method'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.card_type.upper()} ****{self.last_4}"


class Voucher(models.Model):
    VOUCHER_TYPES = [
        ('percent', 'Percentage'),
        ('fixed',   'Fixed Amount'),
    ]

    code          = models.CharField(max_length=50, unique=True)
    voucher_type  = models.CharField(max_length=10, choices=VOUCHER_TYPES, default='percent')
    value         = models.DecimalField(max_digits=10, decimal_places=2)
    min_order     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    free_delivery = models.BooleanField(default=False)
    is_active     = models.BooleanField(default=True)
    expiry_date   = models.DateField(null=True, blank=True)
    usage_limit   = models.IntegerField(null=True, blank=True, help_text='Leave blank for unlimited uses')
    times_used    = models.IntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'voucher'

    def __str__(self):
        return f"{self.code} ({self.voucher_type} — {self.value})"

