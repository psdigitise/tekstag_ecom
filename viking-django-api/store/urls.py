from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .uploads import upload_image

router = DefaultRouter(trailing_slash=True)
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'product-images', views.ProductImageViewSet, basename='product-image')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'brands', views.BrandViewSet, basename='brand')
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'settings', views.SiteSettingViewSet, basename='setting')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'shopping-lists', views.ShoppingListViewSet, basename='shopping-list')
router.register(r'addresses', views.AddressViewSet, basename='address')
router.register(r'payment-methods', views.PaymentMethodViewSet, basename='payment-method')
router.register(r'vouchers', views.VoucherViewSet, basename='voucher')

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('stats/', views.dashboard_stats, name='dashboard-stats'),
    path('uploads/', upload_image, name='upload-image'),
    path('vouchers/validate/', views.ValidateVoucherView.as_view(), name='validate-voucher'),
    path('', include(router.urls)),
]
