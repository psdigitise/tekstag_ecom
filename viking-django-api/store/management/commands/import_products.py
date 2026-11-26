"""
Import the supplier's product spreadsheet.

    python manage.py import_products FILE.xlsx                 # preview, writes nothing
    python manage.py import_products FILE.xlsx --commit        # save
    python manage.py import_products FILE.xlsx --commit --images DIR

One spreadsheet row (SKU) becomes one product; rows sharing an ID are variants.
Merged cells supply the shared values; a blank cell that isn't merged stays
blank. Existing SKUs are left untouched and nothing is ever deleted.
--images DIR attaches the first picture in DIR/<SKU>/ or DIR/<ID>/ to products
that have none (this also works for products imported earlier).
--gallery DIR adds every picture in DIR/<ID>/ to that product's photo gallery,
shared by all its sizes. Groups that already have gallery photos are skipped.
"""
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify
from PIL import Image

from store.models import Brand, Category, Product, ProductImage
from store.store_settings import vat_rate
from store.xlsx import read_workbook

SHEET = 'Products (Cards)'
FOUR_PLACES = Decimal('0.0001')
IMAGE_TYPES = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}

# field -> how its header starts (lower case, whitespace collapsed)
COLUMNS = {
    'group_code': 'id', 'description': 'item description', 'category': 'main category',
    'subcategory': 'subcategory', 'name': 'name', 'short_name': 'short name', 'sku': 'sku',
    'brand': 'brand', 'price_ex': 'price (ex', 'price_inc': 'price (inc', 'unit': 'unit',
    'colour': 'color', 'thickness': 'thickness', 'weight': 'weight', 'size': 'size',
    'bulk': 'bulk from', 'image': 'image', 'attributes': 'key attribute', 'section': 'section',
}
REQUIRED = ('group_code', 'category', 'name', 'sku', 'price_ex')


def _price(text):
    value = Decimal(text)
    if not value.is_finite():
        raise InvalidOperation
    # Spreadsheet floats such as 28.439999999999998 are rounded to 4 places.
    return value.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)


def _attributes(text):
    """One attribute per line (the sheet uses both line breaks and semicolons)."""
    parts = [p.strip(' \t.•-') for p in re.split(r'[\n;]+', text)]
    return '\n'.join(p for p in parts if p)


def parse(path):
    """Return (records, errors, warnings) without touching the database."""
    sheets = read_workbook(path)
    if SHEET not in sheets:
        raise CommandError(f'Sheet "{SHEET}" not found. Sheets: {", ".join(sheets)}')
    rows = sheets[SHEET]

    header_row = next((n for n, cells in rows.items() if 'SKU' in cells.values()), None)
    if header_row is None:
        raise CommandError('No header row containing "SKU" was found.')
    headers = {c: ' '.join(v.split()).lower() for c, v in rows[header_row].items()}
    columns = {}
    for field, start in COLUMNS.items():
        match = [c for c, h in headers.items() if h == start or (field != 'group_code' and h.startswith(start))]
        if len(match) == 1:
            columns[field] = match[0]
        elif field in REQUIRED or len(match) > 1:
            raise CommandError(f'Expected exactly one "{start}" column, found {len(match)}.')

    records, errors, warnings, seen = [], [], [], {}
    for number, cells in rows.items():
        if number <= header_row:
            continue
        row = {field: cells.get(column, '') for field, column in columns.items()}
        if not row['sku']:
            if any(row.values()):
                errors.append(f'Row {number}: SKU is missing.')
            continue
        where = f'Row {number} ({row["sku"]})'
        for field in ('group_code', 'name', 'category'):
            if not row[field]:
                errors.append(f'{where}: {field.replace("_", " ")} is missing.')
        key = row['sku'].lower()
        if key in seen:
            errors.append(f'{where}: SKU already used on row {seen[key]}.')
        seen[key] = number

        try:
            row['price_ex'] = _price(row['price_ex'])
            if row['price_ex'] <= 0:
                errors.append(f'{where}: price must be above zero.')
        except InvalidOperation:
            errors.append(f'{where}: price "{row["price_ex"]}" is not a number.')
            continue
        if row.get('price_inc'):
            try:
                row['price_inc'] = _price(row['price_inc'])
                multiplier = 1 + vat_rate() / 100
                if abs(row['price_inc'] - row['price_ex'] * multiplier) > FOUR_PLACES:
                    warnings.append(f'{where}: inc-VAT price is not ex-VAT x {multiplier.normalize():f}.')
            except InvalidOperation:
                errors.append(f'{where}: inc-VAT price is not a number.')
                continue
        else:
            row['price_inc'] = None

        for field in ('unit', 'colour', 'thickness', 'bulk', 'size'):
            if not row.get(field):
                warnings.append(f'{where}: {field} is blank in the sheet.')
        if row.get('bulk') and not re.fullmatch(r'\d+\s*(packs?|box(es)?|pcs|rolls?)', row['bulk'], re.I):
            warnings.append(f'{where}: check "Bulk From" value "{row["bulk"]}".')
        row['row'] = number
        records.append(row)

    if not records:
        errors.append('No product rows found.')
    return records, errors, warnings


def _category(name, parent=None):
    """Find a category by name under the same parent, or create it with a unique slug."""
    found = Category.objects.filter(name__iexact=name, parent=parent).first()
    if found:
        return found, False
    base = slugify(name) or 'category'
    slug, n = base, 2
    while Category.objects.filter(slug=slug).exists():
        slug, n = f'{base}-{n}', n + 1
    return Category.objects.create(name=name, slug=slug, parent=parent), True


def _pictures(folder, name):
    """Valid picture files in folder/name, in file-name order."""
    if not re.fullmatch(r'[\w .-]+', name) or name.startswith('.') or not (folder / name).is_dir():
        return
    for path in sorted((folder / name).iterdir()):
        if path.suffix.lower() in IMAGE_TYPES and path.is_file() and not path.is_symlink():
            try:
                with Image.open(path) as image:
                    image.verify()
            except Exception:
                continue
            yield path


def _find_image(folder, record):
    for name in (record['sku'], record['group_code']):
        for path in _pictures(folder, name):
            return path
    return None


class Command(BaseCommand):
    help = 'Import products from the supplier spreadsheet (preview unless --commit).'

    def add_arguments(self, parser):
        parser.add_argument('file')
        parser.add_argument('--commit', action='store_true', help='save to the database')
        parser.add_argument('--images', help='folder with one sub-folder of pictures per SKU or ID')
        parser.add_argument('--gallery', help='folder with one sub-folder of gallery pictures per ID')

    def handle(self, *args, **options):
        path = Path(options['file']).expanduser()
        if not path.is_file():
            raise CommandError(f'File not found: {path}')
        images = Path(options['images']).expanduser() if options['images'] else None
        if images and not images.is_dir():
            raise CommandError(f'Image folder not found: {images}')
        gallery = Path(options['gallery']).expanduser() if options['gallery'] else None
        if gallery and not gallery.is_dir():
            raise CommandError(f'Gallery folder not found: {gallery}')

        try:
            records, errors, warnings = parse(path)
        except ValueError as error:
            raise CommandError(f'Could not read the spreadsheet: {error}')
        for warning in warnings:
            self.stdout.write(f'  warning  {warning}')
        if errors:
            for error in errors:
                self.stderr.write(f'  error    {error}')
            raise CommandError(f'{len(errors)} error(s). Nothing was imported.')

        existing = {s.lower() for s in Product.objects.values_list('sku', flat=True) if s}
        with transaction.atomic():
            created, skipped, pictured, new_categories = [], [], 0, 0
            for record in records:
                if record['sku'].lower() in existing:
                    skipped.append(record['sku'])
                    product = Product.objects.filter(sku__iexact=record['sku']).first()
                else:
                    main, made_main = _category(record['category'])
                    leaf, made_leaf = (_category(record['subcategory'], main)
                                       if record.get('subcategory') else (main, False))
                    new_categories += made_main + made_leaf
                    brand = None
                    if record.get('brand'):
                        brand = Brand.objects.filter(name__iexact=record['brand']).first() \
                            or Brand.objects.create(name=record['brand'], slug=slugify(record['brand']))
                    product = Product(
                        group_code=record['group_code'], name=record['name'],
                        short_name=record.get('short_name', ''), sku=record['sku'],
                        brand=brand, brand_name=record.get('brand', ''), category=leaf,
                        price_ex_vat=record['price_ex'], price_inc_vat=record['price_inc'],
                        unit_info=record.get('unit', ''), colour=record.get('colour', ''),
                        thickness=record.get('thickness', ''), size=record.get('size', ''),
                        weight_text=record.get('weight', ''), bulk_from=record.get('bulk', ''),
                        description=record.get('description', ''),
                        key_attributes=_attributes(record.get('attributes', '')),
                        image_source=record.get('image', ''),
                        section=record.get('section', '').lower() if record.get('section', '').lower()
                        in ('listing', 'viewed', 'bought', 'recommendation') else 'listing',
                    )
                    try:
                        product.full_clean(exclude=['brand', 'category'])
                    except ValidationError as error:
                        raise CommandError(f'Row {record["row"]} ({record["sku"]}): {error.message_dict}')
                    product.save()
                    created.append(record['sku'])

                if images and product and not product.image_file and not product.image:
                    picture = _find_image(images, record)
                    if picture:
                        pictured += 1
                        if options['commit']:
                            with picture.open('rb') as handle:
                                name = f'{slugify(record["sku"])}{picture.suffix.lower()}'
                                product.image_file.save(name, File(handle), save=True)

            photos = 0
            if gallery:
                for group in dict.fromkeys(r['group_code'] for r in records):
                    if ProductImage.objects.filter(group_code=group).exists():
                        continue
                    for order, picture in enumerate(_pictures(gallery, group), start=1):
                        photos += 1
                        if options['commit']:
                            with picture.open('rb') as handle:
                                ProductImage(group_code=group, sort_order=order).image.save(
                                    f'{slugify(group)}-{order:02d}{picture.suffix.lower()}', File(handle), save=True)

            if not options['commit']:
                transaction.set_rollback(True)

        verb = 'Imported' if options['commit'] else 'Would import'
        self.stdout.write(f'\n{verb}: {len(created)} products, {new_categories} categories. '
                          f'Skipped (SKU already exists): {len(skipped)}. Pictures: {pictured}. Gallery photos: {photos}.')
        if not options['commit']:
            self.stdout.write('Preview only. Nothing was saved. Add --commit to import.')
