from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import ProductImage, Category, Brand, Product, PriceTier, Review, UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('image', 'group_code', 'product', 'sort_order')
    list_filter = ('group_code',)


class PriceTierInline(admin.TabularInline):
    model = PriceTier
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'size', 'sku', 'brand_name', 'category', 'price_ex_vat', 'section')
    list_filter = ('section', 'brand_name', 'category')
    search_fields = ('name', 'sku', 'group_code')
    inlines = [PriceTierInline]

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'slug')
    list_filter = ('parent',)
    search_fields = ('name',)

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'color')
    search_fields = ('name',)

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'stars')
    list_filter = ('stars',)
    search_fields = ('title', 'body', 'author')

admin.site.site_header = "Viking Direct Admin"
admin.site.site_title = "Viking Direct Admin Portal"
admin.site.index_title = "Welcome to Viking Direct Admin Portal"
