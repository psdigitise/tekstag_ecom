# Tekstag store: production readiness

Date: 25 November 2026. Status: **catalog loaded; not ready for real customers.**

> **Update, later the same day (approved).** Migration `0013_product_catalog_details` was applied to
> `viking_db` and the client file imported: 27 products, 3 categories, 8 subcategories, brand Tengli.
> This resolves U1, U3, U4 and U7. U2 is handled with a group code and a size selector.
> Q6 is answered: the sheet uses merged cells (the earlier "blank on variants" notes were wrong).
> Still open: U5 images, U6 draft/hidden state, U8 minimum order quantity, and all of section 1.2.
> Sections 1 to 5 below describe the state **before** this change.
> Backup taken first: `~/viking_db_backups/viking_db_before_import_20261125_223354.dump`
> Importer: `python manage.py import_products FILE.xlsx [--commit] [--images DIR]` (preview without `--commit`).

Contents: [1 Audit](#1-audit) · [2 Client file](#2-client-file-analysis) · [3 Mapping](#3-column-mapping) ·
[4 Schema proposal](#4-schema-proposal-needs-approval) · [5 Import](#5-product-import-proposal) ·
[6 Orders security](#6-orders-security-plan-needs-approval) · [7 Fixed now](#7-fixed-in-this-pass) ·
[8 Client questions](#8-client-decisions-and-clarifications)

---

## 1. Audit

### 1.1 Blockers before the real product upload

| # | Blocker | Detail | Needs |
|---|---|---|---|
| U1 | **Small prices cannot be stored** | Prices have 2 decimals. 7 of 27 SKUs need 3 or 4. Rounded, `POF-SB-1014`, `-1420`, `-1825`, `-2030` become £0.00; `-4060` and both `SAD-*-1924` change by 11–15% | Migration, or sell per lot (Q1) |
| U2 | **No product variants** | The file is 9 products with 27 size/thickness variants. Loaded as flat rows, shoppers see near-identical cards with no size shown | Schema (4.1) |
| U3 | **No subcategories** | All 9 products have one (8 distinct) | Schema (4.2) |
| U4 | **No description, key attributes, colour, thickness or size fields** | This content would be lost | Schema (4.3) |
| U5 | **Images are Google Drive folder links** | A folder page is not an image. All 9 would show "No image" | Client sends files (Q4) |
| U6 | **No draft/hidden state** | Every row is public the moment it is saved | Schema (4.4) |
| U7 | **No importer** | Nothing reads the spreadsheet | Section 5 |
| U8 | **Minimum order quantity is not enforced** | "Bulk From" reads like an order minimum (up to 10,000 pcs). A shopper can currently order 1 piece at £0.002 | Q2, then schema |

### 1.2 Blockers before production launch

| # | Blocker | Detail |
|---|---|---|
| L1 | **Secrets are in git** | `viking-django-api/.env` is committed and in `origin/main` (github.com/psdigitise/tekstag-ecom). Rotate `DJANGO_SECRET_KEY` and the DB password, stop tracking the file, and consider history clean-up. There is no `.gitignore`; `node_modules` and `__pycache__` are tracked too |
| L2 | **Customers can control their orders** | Section 6 |
| L3 | **Order totals are wrong** | The basket shows subtotal − voucher + £2.46 delivery + 20% VAT. The order stores only the ex-VAT subtotal: no VAT, delivery or discount. The invoice adds VAT but no delivery or discount |
| L4 | **No payment** | "Place order" records an order. Nothing collects money |
| L5 | **No email** | No order confirmation and no password reset |
| L6 | **No legal or contact pages** | Terms, privacy, cookies, returns and company contact details. Client to supply |
| L7 | **Invoice phone number** | The PDF footer says 0330 128 1399. It came with the Viking-branded template; confirm or remove (left unchanged: orders module) |
| L8 | **Deployment settings** | Local `.env` has `DEBUG=True`; `nginx.conf` paths and domain are placeholders; `gunicorn.conf.py` binds `0.0.0.0` (use `127.0.0.1` behind nginx); `dist/` is a stale build containing the old mock data; no backup routine |
| L9 | **Rate limiting is weak** | Per-process memory, and it trusts the first `X-Forwarded-For` value, which the client controls |
| L10 | **Basket is lost on page refresh** | It is held in memory only |

### 1.3 Schema changes (need approval)

Variants, subcategories, description/attributes, price precision, minimum order quantity,
publishing status, timestamps, unique SKU, image gallery. See section 4.

### 1.4 Safe without migrations (done now)

Out-of-stock enforcement, pagination, nginx media fix, removal of unverified content and dead
controls. See section 7.

### 1.5 Client decisions

See section 8.

---

## 2. Client file analysis

File: `~/Downloads/Tegstag_two_products20261111.xlsx` (assumed to be the current client file; confirm, Q10).

- **One sheet**, `Products (Cards)`. Headers in row 3, data in rows 4–30. No embedded images.
- **27 SKUs in 9 products.** IDs `101, 102, 103-1, 103-2, 104–108` (not all numeric).
- **Variant layout:** the first row of a product is complete; following rows have a blank ID and carry only what differs (SKU, price, size, weight, sometimes thickness, bulk).
- **Categories:** Packaging Bags (Drawstring Bags, POF Shrink Bags, Vacuum Bags); Packaging Films (Cling Film, PE Shrink Film, POF Shrink Film, Stretch Film); Shipping & Mailing Supplies (Self-Adhesive Packing List Envelopes).
- **SKUs:** all 27 filled, no duplicates.
- **Brand:** Tengli, on first rows only.
- **Prices:** inc-VAT always equals ex-VAT × 1.2. 2 cells are formulas; others are typed or pasted values with floating-point tails (`28.439999999999998`) that the importer must round.
- **Stock:** no stock column at all.
- **Images:** 9 unique Drive folder links, one per product.
- **Descriptions:** all 9 products (up to 245 characters). Key attributes mix line breaks and semicolons.
- **Weight:** text with mixed units (`780g/pack`, `34.7kg/box`, `0.5g/pc`).
- **Unit:** text with embedded pack size (`box(6800pcs/box)`); blank on most variants.
- **Colour:** lists such as `yellow,red,blue` with no per-colour SKU, so a shopper cannot choose one today (Q5).
- **Section:** column exists, completely empty.
- **Typo:** `PE-CF-3050` bulk is `48rols`.

Other files:
- `Product_Data_Template.xlsx` (in the repo) is a blank 7-sheet template with example rows. The client used a modified version of one sheet. Its notes refer to "Main Categories" and "Subcategories" sheets that are not in the client file.
- `~/Downloads/Tengli Products UK.xlsx` (and an identical copy) is a 2-product draft with different category names and typos. Assumed superseded.

---

## 3. Column mapping

| Client column | Database field | Admin UI | Storefront use | Missing support |
|---|---|---|---|---|
| ID | none (own ids) | – | – | Keep as the product-group code |
| Item description | none | none | none | `description` |
| Main Category | `category.name` via `product.category_id` | Categories; product dropdown | Menu, homepage, listing, filters | Importer must create/match |
| Subcategory | none | none | none | Parent link on category |
| Name | `product.name` (500) | yes | Everywhere, search | – |
| Short Name | `short_name` | **not in form** | Homepage cards | Admin field |
| SKU | `sku` (not unique) | yes | Detail, basket, search | Uniqueness |
| Brand | `brand_name` text; `brand` table separate | text only | Filter, detail | Brand strip needs `brand` rows (Django admin) |
| Price ex VAT | `price_ex_vat` (10,2) | yes | All prices, orders | 4 decimals (U1) |
| Price inc VAT | `price_inc_vat` (10,2) | yes | Secondary price line | 4 decimals |
| Unit | `unit` / `unit_info` | `unit_info` only | Beside price | Map to `unit_info` |
| Color | none | none | none | Field, or variants per colour |
| Thickness | none | none | none | Field |
| Weight | `weight` kg (8,3) | yes (kg) | Detail spec | Parse units; `0.5g` needs 4 decimals; keep source text |
| Size | none | none | none | Field (main variant label) |
| Bulk From | `bulk_from` text | **not in form** | "Bulk from: …" on detail and homepage cards | Numeric minimum order if that is its meaning |
| Image | `image` / `image_file` (one) | yes | Cards, detail | Real files; gallery if several per folder |
| Key attribute | none | none | none | Field |
| Section | `section` | yes | Homepage rows | Empty in file; defaults to `listing` |

Database fields the client file does not provide: stock status, delivery text, offer badge, eco badge, rating, price tiers, category images.

---

## 4. Schema proposal (needs approval)

All changes are additive, and the catalog tables are empty, so nothing needs converting. Back up first anyway.

### 4.1 Variants

New `ProductFamily`: `code`, `name`, `short_name`, `description`, `key_attributes`, `brand_name`, `category`, `status`, `published_at`, timestamps.
`Product` stays the sellable SKU (basket and order lines keep pointing at it) and gains `family` (FK, nullable), `size`, `thickness`, `colour`.
Storefront: one card per family showing "from £x"; the detail page gets a variant selector. Admin: family form with a variant table.

*Smaller alternative:* only add the columns to `Product` and show every SKU as its own card, with size in the title. Less work, weaker shopping experience (Q3).

### 4.2 Subcategories

`Category.parent` = FK to `Category`, nullable, `on_delete=PROTECT`; one level only (validated). Slug unique across categories.
A product's `category` points at the subcategory (or at a main category). The parent is derived, so the two can never disagree.

| Area | Change |
|---|---|
| API | `?slug=` includes children; facets group by subcategory; counts and "from" price roll up |
| Menu | Subcategories under each main category in the hover panel |
| Routes | `/category/:slug/:subcat` (exists; currently redirects) shows the subcategory |
| Homepage | Circles show main categories only |
| Admin | "Parent category" dropdown; grouped product dropdown; block deleting a parent that has children |

### 4.3 Description and attributes

`description` (text, blank) and `key_attributes` (text, one per line; importer also splits on `;`) on the family. Detail page shows each only when filled, as plain text.

### 4.4 Publishing

`status`: `draft` (default for new and imported) → `active` → `hidden`.

Customers see only `active`, enforced on the server in: product list, search, facets, single product (404), category counts, related products, basket re-check, order creation, and shopping-list responses.
Staff see all through an authenticated `?status=` parameter (today the admin list uses the public request, so it must send the cookie).
Past orders keep showing hidden products. Prefer "Hide" over delete. Bulk "Publish" action in the admin.

### 4.5 Prices, order quantity, other fields

| Change | Why |
|---|---|
| `price_ex_vat`, `price_inc_vat`, `PriceTier.price`, `OrderItem.price` → (12,4); line totals rounded to pence | U1 (skip if selling per lot, Q1) |
| `min_order_qty` (default 1), `order_multiple` (default 1), enforced server-side | U8 |
| `weight` → (10,4) plus `weight_text` | Sub-gram items |
| `sku` unique when not blank | Safe re-imports |
| `ProductImage` (owner, file, order, alt) | Only if several images per product (Q4) |
| `ImportBatch` (file hash, user, time, counts) | Audit trail |

### 4.6 New Arrivals

Today it sorts by database id, which is only "most recently inserted", and a bulk import makes order arbitrary.
Add `created_at`, `updated_at` and `published_at` (set the first time a product becomes active). Sort New Arrivals by `published_at`; optionally limit to the last N days (Q9).

### 4.7 Suggested order

1. Prices, SKU, timestamps, status. 2. Category parent. 3. Family, attributes, order quantity. 4. Images, import batch. 5. Importer. 6. Dry run on a database copy. 7. Real import as drafts. 8. Review and publish.

---

## 5. Product import proposal

Start as a management command (`import_products FILE --images DIR`), add an admin upload screen later. Needs one new dependency, `openpyxl`.

**Flow:** parse → validate → preview report (writes nothing) → human approval → commit in one transaction → result report.

**Parsing**
- Find the header row by the `SKU` column; match columns by normalised header text, not position.
- A row with an ID starts a product; rows without one are its variants.
- Inherit only shared fields (name, description, category, brand, image, attributes). Never inherit SKU, price, size or weight. List every inherited unit, colour, thickness or bulk value in the preview (Q6).
- Read stored cell values; fail if a formula has no stored value. Convert via decimal, then round.

**Validation** (errors block the whole import; warnings need acknowledgement)

| Check | Level |
|---|---|
| SKU missing, or duplicated in the file | Error |
| Price missing, ≤ 0, more decimals than storable | Error |
| Name or category missing; subcategory under two parents | Error |
| Variant row before any product row; text too long | Error |
| Inc VAT ≠ ex VAT × VAT rate | Warning |
| Weight or bulk text not parseable (`48rols`) | Warning |
| Image missing or not an image file | Warning |
| New category differs only slightly from an existing one | Warning |

**Duplicates and re-imports**
- Match on SKU, ignoring case and surrounding spaces. Preview shows create / update (field by field) / unchanged.
- Updates require an explicit `--update` flag. Blank cells never erase data. The importer never deletes.
- The commit must reference the previewed file's hash, so an edited file has to be previewed again.

**Images:** the client downloads each Drive folder into `images/<ID or SKU>/` (jpg, png, webp). The importer matches by folder name and uploads. No automatic Drive scraping.

**Safety:** `pg_dump` before commit; everything arrives as `draft`; CSV report of every row with outcome and reason.

---

## 6. Orders security plan (needs approval)

Reproduced on an in-memory database. All still open.

| Priority | Problem | Fix |
|---|---|---|
| P0 | A customer can create an order as `delivered`, and change status or tracking later | Customer serializer makes `status`, `tracking_number`, `carrier`, `estimated_delivery`, `admin_notes` read-only; staff serializer keeps them writable |
| P0 | Customers read and overwrite internal notes | Omit `admin_notes` for non-staff |
| P0 | Customers can delete their orders | Customers get list, read, create only; delete and update staff-only |
| P0 | Any customer can publish a homepage testimonial (review with no product) | Require a purchased product for non-staff |
| P1 | Stored total omits VAT, delivery, discount (L3) | Compute all on the server and store each (migration) |
| P1 | Voucher use is counted without re-validating | Validate expiry, limit and minimum inside order creation |
| P1 | A review is allowed while an order is only `processing` | Require `shipped` or later |
| P2 | Order lines lose the product name if the product is deleted | Snapshot name and SKU (migration) |
| P2 | Order number is 8 random hex characters with no retry on collision | Sequence-based number |

The first four need no migration.

---

## 7. Fixed in this pass

**Out of stock**
- One server rule (`store/availability.py`): "Out of stock" in any spacing or case, or no price above zero.
- API returns `isPurchasable` and `unavailableReason`.
- Order creation rejects the whole order if any line is unavailable or unknown, or a quantity is invalid. Nothing is saved. Before, unavailable items were accepted and unknown ones silently dropped.
- Buttons disabled; basket and checkout re-check price and stock; checkout blocked until fixed.
- A **blank** stock status is still purchasable, because the client file has no stock column (Q7). There is no stock quantity.

**Pagination**
- `?page=&page_size=` (default 24, max 100); server-side filters and sorting; `/api/products/facets/` for filter counts.
- Used by category, all-products, search and Admin Catalog (25 per page, new search box). Page number is in the URL.
- Fixed a slowdown introduced in the previous pass: one extra database query per product. Now constant (4 or fewer).
- Calls without `page` still return a plain, uncapped array. Orders, users and shopping lists are not paginated.

**Production images**
- Path: admin upload → `media/products/` → `/media/...` → nginx → `<img>`.
- Cause of 404: the nginx image-extension rule overrode `/media/` and `/static/`. Both now use `^~`.
- Added `STATIC_ROOT`; 10 MB upload limit for Django admin.
- **Not executed:** nginx is not installed and Docker was not running. On the server: `collectstatic`, `nginx -t`, upload an image, `curl -I` its URL, expect 200.

**Content and controls**
- Removed: 40% off banner, delivery/returns/Nectar claims, "#1 since 1990", loyalty and industry blocks, newsletter with £10 offer, payment logos, certificates, social and dead links, phone number in header, Compare boxes, zoom buttons, "Forgot password?", false confirmation-email and next-day messages, fake "good standing" notice.
- Fixed: review arrows, invoice search, suggestion add buttons, heart icon, logo click emptying the basket.
- Volume price tier tables are hidden: basket and orders never applied those prices. Restore when they do.
- Promotional blocks now appear only from content saved in Storefront UI.

---

## 8. Client decisions and clarifications

| # | Question |
|---|---|
| Q1 | Sell tiny-price items per piece (4-decimal prices), or per lot? Every lot works out to whole pence, e.g. 10,000 pcs × £0.002 = £20.00, and needs no price migration |
| Q2 | Is "Bulk From" a minimum order quantity, an order multiple, or a discount threshold? |
| Q3 | One page per product with a size selector, or one listing per SKU? |
| Q4 | Please send image files. How many per product? |
| Q5 | Can buyers choose a colour? If so, does each colour need a SKU? |
| Q6 | Do blank unit, colour, thickness and bulk cells mean "same as the row above"? |
| Q7 | Stock: status text only, or quantities? What should a blank mean? |
| Q8 | Delivery charge and free threshold (code has £2.46 under £29; removed text said £29 first order, £89 after). VAT rate (20% hardcoded). Is there free next-day delivery or free returns? |
| Q9 | What counts as a New Arrival? |
| Q10 | Is `Tegstag_two_products20261111.xlsx` the final file, and is "Tekstag" or "Tegstag" correct? |
| Q11 | Phone number, company details, social accounts, accepted payment methods, certificates, any loyalty scheme or voucher codes |

**Test banner:** the saved welcome banner (`hi` / `darshan`) is a real database record, so it was left alone. To remove it: Admin → Storefront UI → Hero & Basics → clear both boxes → Save Welcome Banner.
