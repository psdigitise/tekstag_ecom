from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import io
import math

from django.db import transaction
from django.db.models import (
    Case, CharField, Count, F, Func, Max, Min, OuterRef, ProtectedError, Q, Subquery, Sum, Value, When,
)
from django.db.models.functions import Cast, Coalesce, Concat

from django.http import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from rest_framework import mixins, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Category, Brand, Review, SiteSetting, Order, OrderItem, ShoppingList, ShoppingListItem, Address, PaymentMethod, Voucher
from .serializers import (
    ProductSerializer,
    CategoryListSerializer,
    CategoryDetailSerializer,
    BrandSerializer,
    ReviewSerializer,
    SiteSettingSerializer,
    UserSerializer,
    OrderSerializer,
    ShoppingListSerializer,
    AddressSerializer,
    PaymentMethodSerializer,
    VoucherSerializer,
)
from .store_settings import invoice_details, vat_rate
from .availability import OUT_OF_STOCK_PATTERN, unavailable_reason
from .gallery import digest, gallery_for, owner_of, products_sharing
from .models import ProductImage
from .serializers import ProductImageSerializer


# ─── Root endpoint ────────────────────────────────────────────────────────────

@api_view(['GET'])
def api_root(request):
    return Response({
        'message': 'Welcome to the Viking Direct API',
        'status': 'operational',
        'endpoints': {
            'products': '/api/products/',
            'categories': '/api/categories/',
            'brands': '/api/brands/',
            'stats': '/api/stats/',
            'auth': '/api/auth/',
            'orders': '/api/orders/',
            'shopping-lists': '/api/shopping-lists/',
            'addresses': '/api/addresses/',
            'payment-methods': '/api/payment-methods/'
        }
    })


# ─── Permissions ──────────────────────────────────────────────────────────────

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Anyone may read; only staff users may create, update or delete.

    Used for catalog and storefront-content endpoints. Previously these used
    IsAuthenticatedOrReadOnly, which let any registered customer edit or
    delete products, categories, brands and homepage content.
    """
    def has_permission(self, request, _view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ─── Products ─────────────────────────────────────────────────────────────────

PRODUCT_LIST_MAX_LIMIT = 100
PRODUCT_PAGE_SIZE = 24

# Sidebar price filters (ex VAT): [low, high). None = no upper bound.
PRICE_BRACKETS = [(0, 5), (5, 15), (15, 30), (30, 50), (50, 100), (100, 200), (200, None)]
BUY_MORE_BADGES = ['Buy More, Save More', 'buyMore']


def _bracket_key(low, high):
    return f'{low}-{"" if high is None else high}'


def _bracket_q(low, high):
    q = Q(price_ex_vat__gte=low)
    return q if high is None else q & Q(price_ex_vat__lt=high)


def _int_list(values):
    """Integers from repeated and/or comma-separated query values; junk is ignored."""
    return [int(v) for raw in values for v in str(raw).split(',') if v.strip().isdigit() and len(v.strip()) < 19]


Q_HAS_ECO = Q(eco_badge__isnull=False) & ~Q(eco_badge='')
Q_BUY_MORE = Q(badge__in=BUY_MORE_BADGES)
# "Available" = has a stock status, and it isn't out of stock.
Q_AVAILABLE = (
    Q(stock_status__isnull=False) & ~Q(stock_status='') & ~Q(stock_status__iregex=OUT_OF_STOCK_PATTERN)
)


class ProductViewSet(viewsets.ModelViewSet):
    """
    Scope parameters (list and facets; all optional, combinable):
      section   exact display section (listing / viewed / bought / recommendation)
      category  category id (a main category includes its subcategories)
      slug      category slug (same)
      group     group code: all variants of one item
      search    matches product name, SKU, brand name or category name
      brand     exact brand name (case-insensitive)
      exclude   product id to leave out (used for "related products")
      grouped   grouped=1: one entry per group code (its cheapest matching size);
                facet counts then count products, not sizes
      ids       comma-separated product ids (used to re-check the basket)

    Shopper filters (list only; repeat a parameter to select several):
      categories, brands, price (e.g. "5-15", "200-"), eco=1, bestprice=1, available=1

    Ordering and size (list only):
      ordering  newest | popular | price_asc | price_desc | name  (default: id)
      page, page_size   paginated response {count, page, pageSize, totalPages, results}
      limit     without `page`: return at most N products (1-100) as a plain array
    """
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]

    ORDERINGS = {
        'newest': ('-id',),
        'popular': ('-units_sold', '-id'),
        'price_asc': (F('price_ex_vat').asc(nulls_last=True), 'id'),
        'price_desc': (F('price_ex_vat').desc(nulls_last=True), 'id'),
        'name': ('name', 'id'),
    }

    def get_queryset(self):
        qs = Product.objects.select_related('brand', 'category__parent').prefetch_related('price_tiers')
        # Filters, ordering and limits only apply to list/facets, so that
        # retrieve/update/delete always find the product by id.
        if self.action not in ('list', 'facets'):
            return qs

        params = self.request.query_params
        section = params.get('section')
        category_id = params.get('category')
        category_slug = params.get('slug')
        search = (params.get('search') or '').strip()
        brand = (params.get('brand') or '').strip()
        exclude = params.get('exclude')

        if section:
            qs = qs.filter(section=section)
        if category_id:
            ids = _int_list([category_id])
            qs = qs.filter(Q(category__id__in=ids) | Q(category__parent_id__in=ids))
        if category_slug:
            qs = qs.filter(Q(category__slug=category_slug) | Q(category__parent__slug=category_slug))
        if params.get('group'):
            qs = qs.filter(group_code=params['group'])
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(brand_name__icontains=search)
                | Q(category__name__icontains=search)
            )
        if brand:
            qs = qs.filter(brand_name__iexact=brand)
        if exclude and exclude.isdigit():
            qs = qs.exclude(id=int(exclude))
        if 'ids' in params:
            qs = qs.filter(id__in=_int_list(params.getlist('ids')))
        if self.action == 'facets':
            return qs

        qs = self._apply_shopper_filters(qs, params)

        grouped = params.get('grouped') == '1'
        if grouped:
            qs = self._one_per_group(qs)

        ordering = params.get('ordering')
        if ordering == 'popular' and grouped:
            # Units ordered of any size in the group.
            sold = OrderItem.objects.filter(
                Q(product=OuterRef('pk'))
                | (~Q(product__group_code='') & Q(product__group_code=OuterRef('group_code')))
            ).order_by().annotate(v=Func(F('quantity'), function='SUM')).values('v')
            qs = qs.annotate(units_sold=Coalesce(Subquery(sold), Value(0)))
        elif ordering == 'popular':
            # Popularity = total units ordered across all orders (real order data).
            qs = qs.annotate(units_sold=Coalesce(Sum('orderitem__quantity'), Value(0)))
        qs = qs.order_by(*self.ORDERINGS.get(ordering, ('id',)))

        limit = params.get('limit')
        if 'page' not in params and limit and limit.isdigit():
            qs = qs[:max(1, min(int(limit), PRODUCT_LIST_MAX_LIMIT))]
        return qs

    @staticmethod
    def _one_per_group(qs):
        """Keep the cheapest matching size of each group (priced ones first)."""
        chosen = {}
        rows = qs.order_by(F('price_ex_vat').asc(nulls_last=True), 'id').values_list('id', 'group_code')
        for product_id, group in rows:
            chosen.setdefault(group or f'#{product_id}', product_id)
        return qs.filter(id__in=list(chosen.values()))

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if self.action == 'list' and self.request.query_params.get('grouped') == '1' and args:
            # How many sizes each card stands for, and whether their prices differ.
            groups = {p.group_code for p in args[0] if p.group_code}
            serializer.context['groups'] = {
                g['group_code']: g for g in Product.objects.filter(group_code__in=groups)
                .values('group_code').annotate(n=Count('id'), low=Min('price_ex_vat'), high=Max('price_ex_vat'))
            }
        return serializer

    @staticmethod
    def _apply_shopper_filters(qs, params):
        if 'categories' in params:
            qs = qs.filter(category__id__in=_int_list(params.getlist('categories')))
        brands = [b for b in params.getlist('brands') if b]
        if brands:
            qs = qs.filter(brand_name__in=brands)
        wanted = set(params.getlist('price'))
        brackets = [b for b in PRICE_BRACKETS if _bracket_key(*b) in wanted]
        if brackets:
            q = Q()
            for bracket in brackets:
                q |= _bracket_q(*bracket)
            qs = qs.filter(q)
        if params.get('eco') == '1':
            qs = qs.filter(Q_HAS_ECO)
        if params.get('bestprice') == '1':
            qs = qs.filter(Q_BUY_MORE)
        if params.get('available') == '1':
            qs = qs.filter(Q_AVAILABLE)
        return qs

    def list(self, request, *args, **kwargs):
        # Pagination is opt-in (?page=), so callers expecting an array still work.
        params = request.query_params
        if 'page' not in params:
            return super().list(request, *args, **kwargs)

        def positive(name, default):
            raw = params.get(name, '')
            return max(1, int(raw)) if raw.isdigit() and len(raw) < 10 else default

        qs = self.filter_queryset(self.get_queryset())
        size = min(positive('page_size', PRODUCT_PAGE_SIZE), PRODUCT_LIST_MAX_LIMIT)
        count = qs.count()
        total_pages = max(1, math.ceil(count / size))
        page = min(positive('page', 1), total_pages)  # past the end -> last page
        items = qs[(page - 1) * size: page * size]
        return Response({
            'count': count,
            'page': page,
            'pageSize': size,
            'totalPages': total_pages,
            'results': self.get_serializer(items, many=True).data,
        })

    @action(detail=True, methods=['get', 'post'])
    def images(self, request, pk=None):
        """
        GET: gallery photos (shared by all sizes of a grouped product).
        POST (staff): multipart upload of one or more files named "images".
        """
        product = self.get_object()
        if request.method == 'POST':
            files = request.FILES.getlist('images')
            if not files or len(files) > 30:
                raise ValidationError({'error': 'Choose between 1 and 30 pictures.'})
            if any(f.size > MAX_IMAGE_BYTES for f in files):
                raise ValidationError({'error': 'Each picture must be 10 MB or smaller.'})
            uploads = [ProductImageSerializer(data={'image': f}) for f in files]
            if not all([u.is_valid() for u in uploads]):  # validate all before saving any
                raise ValidationError({'error': 'One of the files is not a valid picture.'})
            last = gallery_for(product).aggregate(n=Max('sort_order'))['n'] or 0
            with transaction.atomic():
                for offset, upload in enumerate(uploads, start=1):
                    upload.save(sort_order=last + offset, **owner_of(product))
        status = 201 if request.method == 'POST' else 200
        return Response(ProductImageSerializer(gallery_for(product), many=True).data, status=status)

    @action(detail=False, methods=['get'])
    def facets(self, request):
        """Filter options and counts across the whole scope, not just one page."""
        qs = self.get_queryset().order_by()
        if request.query_params.get('grouped') == '1':
            qs = qs.annotate(key=Case(
                When(group_code='', then=Concat(Value('#'), Cast('id', CharField()))),
                default=F('group_code'), output_field=CharField(),
            ))
            def how_many(**extra):
                return Count('key', distinct=True, **extra)
        else:
            def how_many(**extra):
                return Count('id', **extra)
        counts = {
            'total': how_many(),
            'eco': how_many(filter=Q_HAS_ECO),
            'bestPrice': how_many(filter=Q_BUY_MORE),
            'available': how_many(filter=Q_AVAILABLE),
        }
        for i, bracket in enumerate(PRICE_BRACKETS):
            counts[f'price_{i}'] = how_many(filter=_bracket_q(*bracket))
        totals = qs.aggregate(**counts)

        categories = (qs.exclude(category__isnull=True)
                      .values('category_id', 'category__name')
                      .annotate(n=how_many()).order_by('-n', 'category__name'))
        brands = (qs.exclude(brand_name__isnull=True).exclude(brand_name='')
                  .values('brand_name').annotate(n=how_many()).order_by('-n', 'brand_name'))
        return Response({
            'total': totals['total'],
            'eco': totals['eco'],
            'bestPrice': totals['bestPrice'],
            'available': totals['available'],
            'categories': [{'id': c['category_id'], 'name': c['category__name'], 'count': c['n']} for c in categories],
            'brands': [{'name': b['brand_name'], 'count': b['n']} for b in brands],
            'price': [{'key': _bracket_key(*b), 'count': totals[f'price_{i}']}
                      for i, b in enumerate(PRICE_BRACKETS)],
        })


MAX_IMAGE_BYTES = 10 * 1024 * 1024


class ProductImageViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Staff only: remove a gallery photo, or make it the main picture."""
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer

    def get_permissions(self):
        return [IsAdminStaff()]

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def make_main(self, request, pk=None):
        """
        Use this photo as the main picture of every product that shares it. The
        previous main picture moves into the gallery, so nothing is lost.
        """
        photo = self.get_object()
        products = list(products_sharing(photo))
        if not products:
            raise ValidationError({'error': 'No product uses this photo.'})
        chosen = photo.image.name
        owner = owner_of(products[0])
        old_names = {p.image_file.name for p in products if p.image_file} - {chosen}
        # Each size may hold its own copy of the same picture: keep one per content,
        # and none that the gallery already has.
        seen = {digest(name) for name in gallery_for(products[0]).values_list('image', flat=True)}
        spare = []
        for name in sorted(old_names):
            key = digest(name)
            if key not in seen:
                seen.add(key)
                spare.append(name)
        for product in products:
            product.image_file.name = chosen
            product.save(update_fields=['image_file'])
        if spare:
            photo.image.name = spare.pop(0)  # swap places
            photo.save(update_fields=['image'])
            for name in spare:
                ProductImage.objects.create(image=name, sort_order=photo.sort_order, **owner)
        else:
            photo.delete()
        return Response({'updated': len(products)})


# ─── Categories ───────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        # productCount and minPrice come from real product data, and a main
        # category includes everything in its subcategories.
        own = Product.objects.filter(
            Q(category=OuterRef('pk')) | Q(category__parent=OuterRef('pk'))
        ).order_by()

        def aggregate(function, field):
            return Subquery(own.annotate(v=Func(F(field), function=function)).values('v'))

        return Category.objects.annotate(
            product_count=aggregate('COUNT', 'id'),
            min_price=aggregate('MIN', 'price_ex_vat'),
        ).order_by('id')

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'error': 'Delete or move its subcategories first.'}, status=400)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CategoryDetailSerializer
        return CategoryListSerializer


# ─── Brands ───────────────────────────────────────────────────────────────────

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [IsStaffOrReadOnly]


# ─── Reviews ──────────────────────────────────────────────────────────────────

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        product_id = self.request.query_params.get('product')
        if product_id:
            return Review.objects.filter(product_id=product_id).select_related('user', 'product')
        # Legacy: reviews with no product attached (e.g. homepage Trustpilot reviews)
        return Review.objects.filter(product__isnull=True)

    def perform_create(self, serializer):
        product = serializer.validated_data.get('product')
        user = self.request.user if self.request.user.is_authenticated else None

        if product and user:
            # 1. Prevent duplicate reviews
            if Review.objects.filter(product=product, user=user).exists():
                raise ValidationError({'detail': 'You have already reviewed this product.'})

            # 2. Enforce verified purchase (Security Hardening)
            from .models import OrderItem
            has_purchased = OrderItem.objects.filter(
                order__user=user,
                product=product,
                order__status__in=['delivered', 'shipped', 'processing', 'out_for_delivery'],
            ).exists()

            if not has_purchased:
                raise ValidationError({'detail': 'Only customers who have purchased this product can leave a review.'})

        serializer.save(user=user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def can_review(self, request):
        """
        GET /api/reviews/can_review/?product=<id>
        Returns whether the authenticated user can submit a review for this product.
        """
        product_id = request.query_params.get('product')
        if not product_id:
            return Response({'error': 'product query param required'}, status=400)

        has_purchased = OrderItem.objects.filter(
            order__user=request.user,
            product_id=product_id,
            order__status__in=['delivered', 'shipped', 'processing', 'out_for_delivery'],
        ).exists()

        already_reviewed = Review.objects.filter(
            product_id=product_id, user=request.user
        ).exists()

        return Response({
            'canReview': has_purchased and not already_reviewed,
            'hasPurchased': has_purchased,
            'alreadyReviewed': already_reviewed,
        })


# ─── Settings ─────────────────────────────────────────────────────────────────

class SiteSettingViewSet(viewsets.ModelViewSet):
    queryset = SiteSetting.objects.all()
    serializer_class = SiteSettingSerializer
    lookup_field = 'key'
    permission_classes = [IsStaffOrReadOnly]

# ─── Users ────────────────────────────────────────────────────────────────────
from django.contrib.auth.models import User

class IsAdminStaff(permissions.BasePermission):
    """Allows access only to users with is_staff=True."""
    def has_permission(self, request, _view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list of registered users — staff only."""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdminStaff]

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

@api_view(['GET'])
@permission_classes([IsAdminStaff])
def dashboard_stats(request):
    """Returns quick overview stats for the React Admin dashboard."""
    return Response({
        'total_products': Product.objects.count(),
        'total_users': User.objects.count(),
        'total_categories': Category.objects.count(),
        'total_brands': Brand.objects.count(),
        'total_orders': Order.objects.count(),
        'orders_pending': Order.objects.filter(status='pending').count(),
        'orders_processing': Order.objects.filter(status='processing').count(),
        'orders_shipped': Order.objects.filter(status='shipped').count(),
        'orders_delivered': Order.objects.filter(status='delivered').count(),
        'orders_cancelled': Order.objects.filter(status='cancelled').count(),
    })

# ─── Orders ───────────────────────────────────────────────────────────────────

def _unit_price(value):
    """At least 2 decimals, up to 4 when needed: 1.26, 0.026, 0.0035."""
    text = f'{value:.4f}'
    while text.endswith('0') and len(text.split('.')[1]) > 2:
        text = text[:-1]
    return text

MAX_LINE_QUANTITY = 1_000_000
MAX_ORDER_TOTAL = Decimal('99999999.99')  # Order.total_amount is max_digits=10


def _order_lines(items_data):
    """
    Validate the requested items against the database and return
    [(product, quantity, unit_price)]. Raises ValidationError if ANY line can't
    be bought — an order is never silently reduced. Call inside a transaction.
    """
    if not isinstance(items_data, list) or not items_data:
        raise ValidationError({'error': 'Your order has no items.'})

    quantities = {}
    for item in items_data:
        try:
            product_id = int(str(item['productId']))
            quantity = int(str(item.get('quantity', 1)))
        except (KeyError, TypeError, ValueError, AttributeError):
            raise ValidationError({'error': 'Your order contains an invalid item or quantity.'})
        quantities[product_id] = quantities.get(product_id, 0) + quantity
        if quantity < 1 or quantities[product_id] > MAX_LINE_QUANTITY or not 0 < product_id < 2**62:
            raise ValidationError({'error': 'Your order contains an invalid item or quantity.'})

    products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=quantities)}
    lines, problems = [], []
    for product_id, quantity in quantities.items():
        product = products.get(product_id)
        reason = 'No longer available' if product is None else unavailable_reason(product)
        if reason:
            problems.append({
                'productId': product_id,
                'name': product.name if product else f'Item #{product_id}',
                'reason': reason,
            })
        else:
            lines.append((product, quantity, product.price_ex_vat))

    if problems:
        summary = '; '.join(f"{p['name']}: {p['reason']}" for p in problems)
        raise ValidationError({
            'error': f'Some items can no longer be ordered. {summary}',
            'unavailableItems': problems,
        })
    total = _order_total(lines)
    if total > MAX_ORDER_TOTAL:
        raise ValidationError({'error': 'This order is too large to be placed online.'})
    if total <= 0:
        raise ValidationError({'error': 'The order value is below £0.01. Please increase the quantity.'})
    return lines


def _order_total(lines):
    """Order total in pounds and pence (unit prices can have 4 decimals)."""
    exact = sum((price * quantity for _, quantity, price in lines), Decimal('0'))
    return exact.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin (staff) users see all orders; regular users see only their own
        if self.request.user.is_staff:
            qs = Order.objects.all().select_related('user').prefetch_related('items__product')
            status_filter = self.request.query_params.get('status')
            search = self.request.query_params.get('search')
            if status_filter:
                qs = qs.filter(status=status_filter)
            if search:
                qs = qs.filter(order_number__icontains=search) | qs.filter(contact_name__icontains=search)
            return qs
        return Order.objects.filter(user=self.request.user).prefetch_related('items__product')

    @transaction.atomic
    def perform_create(self, serializer):
        import uuid
        order_number = f"ORD-{str(uuid.uuid4())[:8].upper()}"

        # Server-side prices and availability — never trust the client.
        item_rows = _order_lines(self.request.data.get('items', []))
        total = _order_total(item_rows)

        order = serializer.save(
            user=self.request.user,
            order_number=order_number,
            total_amount=total,
        )

        for product, qty, price in item_rows:
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=price,
            )

        # Increment voucher usage counter if a voucher was applied
        voucher_code = self.request.data.get('voucher_code', '').strip().upper()
        if voucher_code:
            Voucher.objects.filter(code=voucher_code, is_active=True).update(
                times_used=F('times_used') + 1
            )

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        order = self.get_object()
        
        # Create a file-like buffer to receive PDF data.
        buffer = io.BytesIO()
        
        # Create the PDF object, using the buffer as its "file."
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # ─── Logo and Branding ────────────────────────────────────────────────
        # Business details and VAT rate: Admin → Store Settings.
        store = invoice_details()

        p.setFont("Helvetica-Bold", 24)
        p.setFillColor(colors.HexColor("#000000"))
        p.drawString(50, height - 60, store['businessName'][:30])

        p.setFont("Helvetica", 10)
        p.setFillColor(colors.gray)
        business_lines = [store['tagline'], *store['address'].splitlines()[:5]]
        for label, key in (('Tel', 'phone'), ('Email', 'email'), ('VAT No', 'vatNumber')):
            if store[key]:
                business_lines.append(f"{label}: {store[key]}")
        business_y = height - 75
        for line in filter(None, (text.strip() for text in business_lines)):
            p.drawString(50, business_y, line[:70])
            business_y -= 13

        # ─── Header Info ────────────────────────────────────────────────────
        p.setFont("Helvetica-Bold", 16)
        p.setFillColor(colors.black)
        p.drawRightString(width - 50, height - 60, store['title'][:30])
        
        p.setFont("Helvetica", 10)
        p.drawRightString(width - 50, height - 80, f"Invoice #: {order.order_number.replace('ORD-', 'INV-')}")
        p.drawRightString(width - 50, height - 95, f"Date: {order.created_at.strftime('%d %b %Y %H:%M')}")
        p.drawRightString(width - 50, height - 110, f"Status: {order.status.upper()}")
        
        # ─── Billing Details ───────────────────────────────────────────────
        # Moves down when the business details above are long.
        billing_top = min(height - 140, business_y - 14)
        p.setFillColor(colors.black)
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, billing_top, "BILL TO:")
        p.setFont("Helvetica", 10)
        p.drawString(50, billing_top - 15, order.contact_name or order.user.get_full_name() or order.user.username)
        addr_line = f"{order.street or ''}, {order.city or ''} {order.postal_code or ''}".strip(', ')
        p.drawString(50, billing_top - 30, addr_line or "Address on file")
        p.drawString(50, billing_top - 45, f"Tel: {order.phone or 'N/A'}")

        # ─── Items Table ───────────────────────────────────────────────────
        data = [['Product Description', 'Qty', 'Unit Price', 'Total']]
        for item in order.items.all():
            data.append([
                'Product no longer listed' if item.product is None else
                (item.product.name[:40] + ('...' if len(item.product.name) > 40 else '')
                 + (f' ({item.product.size})' if item.product.size else '')),
                str(item.quantity),
                f"£{_unit_price(item.price)}",
                f"£{(item.quantity * item.price):.2f}"
            ])
            
        # Draw table
        t = Table(data, colWidths=[320, 60, 80, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#00857C")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        t_width, t_height = t.wrap(width - 100, height)
        table_top = billing_top - 110
        t.drawOn(p, 50, table_top - t_height)
        
        # ─── Totals ───────────────────────────────────────────────────────
        y_pos = table_top - t_height - 40
        rate = vat_rate()
        vat = (order.total_amount * rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 130, y_pos, "Subtotal:")
        p.drawRightString(width - 50, y_pos, f"£{order.total_amount:.2f}")
        
        y_pos -= 20
        p.drawRightString(width - 130, y_pos, f"VAT ({rate.normalize():f}%):")
        p.drawRightString(width - 50, y_pos, f"£{vat:.2f}")
        
        y_pos -= 30
        p.setFont("Helvetica-Bold", 14)
        p.setFillColor(colors.HexColor("#00857C"))
        p.drawRightString(width - 130, y_pos, "Grand Total:")
        p.drawRightString(width - 50, y_pos, f"£{(order.total_amount + vat):.2f}")
        
        # ─── Footer ────────────────────────────────────────────────────────
        p.setFont("Helvetica-Oblique", 8)
        p.setFillColor(colors.gray)
        footer_lines = simpleSplit(store['footer'], "Helvetica-Oblique", 8, width - 100)[:5]
        for index, line in enumerate(footer_lines):
            p.drawCentredString(width / 2.0, 50 + 11 * (len(footer_lines) - 1 - index), line)
        
        # Close the PDF object cleanly, and we're done.
        p.showPage()
        p.save()
        
        # FileResponse sets the Content-Disposition header so that browsers
        # present the option to save the file.
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"Invoice-{order.order_number.replace('ORD-', 'INV-')}.pdf")

# ─── Shopping Lists ───────────────────────────────────────────────────────────

# ─── Vouchers ─────────────────────────────────────────────────────────────────

class VoucherViewSet(viewsets.ModelViewSet):
    """Admin management of discount codes. Staff only: codes are not public."""
    queryset = Voucher.objects.all().order_by('-created_at', '-id')
    serializer_class = VoucherSerializer
    permission_classes = [IsAdminStaff]


class ValidateVoucherView(APIView):
    """
    POST /api/vouchers/validate/
    Validates a voucher code server-side. Replaces the client-side
    hardcoded lookup table that was trivially bypassable.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        try:
            subtotal = Decimal(str(request.data.get('subtotal', 0)))
        except InvalidOperation:
            return Response({'valid': False, 'error': 'Invalid subtotal.'})

        try:
            voucher = Voucher.objects.get(code=code, is_active=True)
        except Voucher.DoesNotExist:
            return Response({'valid': False, 'error': 'Invalid or expired voucher code.'})

        if voucher.expiry_date and voucher.expiry_date < date.today():
            return Response({'valid': False, 'error': 'Voucher has expired.'})

        if voucher.usage_limit is not None and voucher.times_used >= voucher.usage_limit:
            return Response({'valid': False, 'error': 'Voucher usage limit has been reached.'})

        if voucher.min_order > 0 and subtotal < voucher.min_order:
            return Response({
                'valid': False,
                'error': f'Minimum order of £{voucher.min_order:.2f} required for this voucher.',
            })

        if voucher.voucher_type == 'percent':
            discount = (subtotal * voucher.value / Decimal('100')).quantize(Decimal('0.01'))
        else:
            discount = min(voucher.value, subtotal)

        return Response({
            'valid':         True,
            'type':          voucher.voucher_type,
            'value':         str(voucher.value),
            'discount':      str(discount),
            'free_delivery': voucher.free_delivery,
        })


# ─── Shopping Lists ───────────────────────────────────────────────────────────

class ShoppingListViewSet(viewsets.ModelViewSet):
    serializer_class = ShoppingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ShoppingList.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        shopping_list = self.get_object()
        product_id = request.data.get('productId')
        if not product_id:
            return Response({'error': 'productId is required'}, status=400)
        
        try:
            product = Product.objects.get(id=product_id)
            item, created = ShoppingListItem.objects.get_or_create(
                shopping_list=shopping_list, product=product
            )
            return Response({'status': 'added', 'created': created})
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If this is set as default, unset others for this user
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save()

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        address = self.get_object()
        Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
        address.is_default = True
        address.save()
        return Response({'status': 'default set'})


class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            PaymentMethod.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            PaymentMethod.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save()

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        card = self.get_object()
        PaymentMethod.objects.filter(user=request.user, is_default=True).update(is_default=False)
        card.is_default = True
        card.save()
        return Response({'status': 'default set'})

