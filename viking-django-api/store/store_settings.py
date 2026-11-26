"""
Store-wide values the admin controls (SiteSetting rows "pricing" and
"invoice"). The defaults apply until the admin saves their own.

The same pricing defaults live in the storefront: src/utils/storeSettings.js.
"""
from decimal import Decimal, InvalidOperation

from .models import SiteSetting

PRICING_DEFAULTS = {'vatRate': 20, 'deliveryCharge': 2.46, 'freeDeliveryOver': 29}

INVOICE_DEFAULTS = {
    'title': 'TAX INVOICE',
    'businessName': 'tekstag',
    'tagline': 'Business Supplies & Solutions',
    'address': '',
    'phone': '',
    'email': '',
    'vatNumber': '',
    'footer': 'Thank you for choosing tekstag.',
}

# key -> (label, highest value, may be left empty)
_PRICING_RULES = {
    'vatRate': ('VAT rate', Decimal('100'), False),
    'deliveryCharge': ('Delivery charge', Decimal('100000'), False),
    'freeDeliveryOver': ('Free delivery amount', Decimal('10000000'), True),
}


def _number(value):
    """A finite Decimal, or None when the value isn't a number."""
    if isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value).strip())
    except InvalidOperation:
        return None
    return number if number.is_finite() else None


def clean_pricing(value):
    """Validate the "pricing" setting. Raises ValueError with a readable message."""
    if not isinstance(value, dict):
        raise ValueError('Pricing settings are not in the expected format.')
    cleaned = {}
    for key, (label, highest, optional) in _PRICING_RULES.items():
        raw = value.get(key)
        if optional and (raw is None or str(raw).strip() == ''):
            cleaned[key] = None
            continue
        number = _number(raw)
        if number is None or not 0 <= number <= highest:
            raise ValueError(f'{label} must be a number from 0 to {highest}.')
        cleaned[key] = float(round(number, 2))
    return cleaned


def _saved(key, defaults):
    value = SiteSetting.objects.filter(key=key).values_list('value', flat=True).first()
    return {**defaults, **(value if isinstance(value, dict) else {})}


def vat_rate():
    """VAT as a percentage, e.g. Decimal('20')."""
    number = _number(_saved('pricing', PRICING_DEFAULTS)['vatRate'])
    if number is None or not 0 <= number <= 100:
        number = Decimal(str(PRICING_DEFAULTS['vatRate']))
    return number


def invoice_details():
    """The text printed on invoices; every value is a stripped string."""
    saved = _saved('invoice', INVOICE_DEFAULTS)
    details = {key: str(saved.get(key) or '').strip() for key in INVOICE_DEFAULTS}
    details['businessName'] = details['businessName'] or INVOICE_DEFAULTS['businessName']
    details['title'] = details['title'] or INVOICE_DEFAULTS['title']
    return details
