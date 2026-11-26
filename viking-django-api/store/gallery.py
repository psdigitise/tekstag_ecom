"""Which gallery photos belong to which products."""
import hashlib

from .models import Product, ProductImage


def digest(name):
    """Content hash of a stored picture, or the name itself if it can't be read."""
    storage = ProductImage._meta.get_field('image').storage
    try:
        with storage.open(name) as handle:
            return hashlib.sha256(handle.read()).hexdigest()
    except OSError:
        return name


def owner_of(product):
    """Fields that tie a new photo to this product (shared across its group)."""
    return {'group_code': product.group_code} if product.group_code else {'product': product}


def gallery_for(product):
    return ProductImage.objects.filter(**owner_of(product))


def products_sharing(photo):
    """Every product whose gallery contains this photo."""
    if photo.group_code:
        return Product.objects.filter(group_code=photo.group_code)
    return Product.objects.filter(id=photo.product_id)
