"""
Single definition of "can a customer buy this product?".

Used by the product API (so the storefront can show it) and by order creation
(which is authoritative and cannot be bypassed from the browser).
"""
import re

# Matches "Out of stock", "out-of-stock", "OUT_OF_STOCK" with stray spaces.
OUT_OF_STOCK_PATTERN = r'^\s*out[\s_-]*of[\s_-]*stock\s*$'
_OUT_OF_STOCK = re.compile(OUT_OF_STOCK_PATTERN, re.IGNORECASE)


def unavailable_reason(product):
    """Why this product can't be bought, or None when it can."""
    if _OUT_OF_STOCK.match(product.stock_status or ''):
        return 'Out of stock'
    if product.price_ex_vat is None or product.price_ex_vat <= 0:
        return 'Price not available'
    return None
