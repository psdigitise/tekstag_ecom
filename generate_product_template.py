"""
Generates the Viking Direct product data collection Excel template.
Run: python3 generate_product_template.py
Output: Product_Data_Template.xlsx
"""

from openpyxl import Workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

wb = Workbook()

# ── Colour palette ────────────────────────────────────────────────────────────
HEADER_FILL   = PatternFill("solid", fgColor="1F3864")   # dark navy
SECTION_FILL  = PatternFill("solid", fgColor="D6E4F7")   # light blue
REQ_FILL      = PatternFill("solid", fgColor="FFF2CC")   # amber – required
OPT_FILL      = PatternFill("solid", fgColor="EAF4EA")   # green – optional
HEADER_FONT   = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
TITLE_FONT    = Font(name="Calibri", bold=True, color="1F3864", size=13)
LABEL_FONT    = Font(name="Calibri", bold=True, size=10)
BODY_FONT     = Font(name="Calibri", size=10)
EXAMPLE_FONT  = Font(name="Calibri", size=10, color="595959", italic=True)
THIN_BORDER   = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"),  bottom=Side(style="thin"),
)

def header_cell(ws, row, col, value, width=None):
    c = ws.cell(row=row, column=col, value=value)
    c.fill   = HEADER_FILL
    c.font   = HEADER_FONT
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = THIN_BORDER
    if width:
        ws.column_dimensions[get_column_letter(col)].width = width
    return c

def data_cell(ws, row, col, value="", required=False, example=False):
    c = ws.cell(row=row, column=col, value=value)
    c.font   = EXAMPLE_FONT if example else BODY_FONT
    c.fill   = REQ_FILL if required else OPT_FILL
    c.border = THIN_BORDER
    c.alignment = Alignment(vertical="center", wrap_text=True)
    return c

def freeze_and_filter(ws, row=2):
    ws.freeze_panes = ws.cell(row=row + 1, column=1)
    ws.auto_filter.ref = ws.dimensions

def add_legend(ws, start_row):
    ws.cell(row=start_row, column=1, value="Legend:").font = LABEL_FONT
    r = PatternFill("solid", fgColor="FFF2CC")
    g = PatternFill("solid", fgColor="EAF4EA")
    c1 = ws.cell(row=start_row, column=2, value="  Required field  ")
    c1.fill = r; c1.border = THIN_BORDER; c1.font = BODY_FONT
    c2 = ws.cell(row=start_row, column=3, value="  Optional field  ")
    c2.fill = g; c2.border = THIN_BORDER; c2.font = BODY_FONT


# ══════════════════════════════════════════════════════════════════════════════
# 1.  INSTRUCTIONS  (default sheet)
# ══════════════════════════════════════════════════════════════════════════════
ws_inst = wb.active
ws_inst.title = "Instructions"
ws_inst.sheet_view.showGridLines = False
ws_inst.column_dimensions["A"].width = 4
ws_inst.column_dimensions["B"].width = 28
ws_inst.column_dimensions["C"].width = 60

title = ws_inst.cell(row=2, column=2,
    value="Viking Direct – Product Data Collection Template")
title.font = Font(name="Calibri", bold=True, size=16, color="1F3864")
ws_inst.merge_cells("B2:C2")
title.alignment = Alignment(horizontal="left", vertical="center")
ws_inst.row_dimensions[2].height = 32

instructions = [
    ("Purpose",
     "Fill in each sheet with your product/category data and return the "
     "completed file. Do NOT rename or delete any sheet."),
    ("Required vs Optional",
     "Amber cells = required (must be filled). Green cells = optional (fill "
     "if available). Rows with a grey italic example row are for reference only "
     "– replace or delete them."),
    ("IDs",
     "Each row needs a unique numeric ID. Start from any number; we will "
     "reassign IDs during import if needed."),
    ("Prices",
     "Enter prices as plain numbers (e.g. 4.99). Do not include currency "
     "symbols. Prices are assumed to be in GBP (£)."),
    ("Images",
     "Provide a full URL or a relative path (e.g. /images/products/pen.avif). "
     "Leave blank if not yet available."),
    ("Price Tiers",
     "On the 'Listing Products' sheet each product can have up to 3 bulk "
     "pricing tiers. Fill Tier 1 → Tier 3 columns left to right."),
    ("Badges",
     "Allowed badge values: buyMore | promo | sale | new | (leave blank)"),
    ("Eco Badge",
     "Allowed eco badge values: Sustainable | Recycled | Carbon Neutral | "
     "(leave blank)"),
    ("Stock Status",
     "Suggested values: Currently in stock | Low stock | Out of stock"),
    ("Colour Hex",
     "Category fallback colours must be 6-digit hex codes starting with # "
     "(e.g. #FFF3E0). If unsure, leave blank."),
]

ws_inst.row_dimensions[4].height = 18
ws_inst.cell(row=4, column=2, value="Column").font = LABEL_FONT
ws_inst.cell(row=4, column=3, value="Guidance").font = LABEL_FONT

for i, (topic, detail) in enumerate(instructions, start=5):
    ws_inst.cell(row=i, column=2, value=topic).font = Font(
        name="Calibri", bold=True, size=10, color="1F3864")
    d = ws_inst.cell(row=i, column=3, value=detail)
    d.font = BODY_FONT
    d.alignment = Alignment(wrap_text=True, vertical="top")
    ws_inst.row_dimensions[i].height = 30

add_legend(ws_inst, len(instructions) + 7)


# ══════════════════════════════════════════════════════════════════════════════
# Helper – build a simple columnar sheet
# ══════════════════════════════════════════════════════════════════════════════
def build_sheet(title, columns, example_rows, note=None):
    """
    columns  : list of (header_label, col_width, is_required)
    example_rows : list of lists (one per example product row)
    """
    ws = wb.create_sheet(title)
    ws.sheet_view.showGridLines = False

    # Title row
    ws.merge_cells(start_row=1, start_column=1,
                   end_row=1,   end_column=len(columns))
    t = ws.cell(row=1, column=1, value=title)
    t.font      = TITLE_FONT
    t.fill      = PatternFill("solid", fgColor="D6E4F7")
    t.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 24

    # Optional note
    offset = 0
    if note:
        ws.merge_cells(start_row=2, start_column=1,
                       end_row=2,   end_column=len(columns))
        n = ws.cell(row=2, column=1, value=note)
        n.font = Font(name="Calibri", size=9, italic=True, color="595959")
        n.alignment = Alignment(wrap_text=True, vertical="center")
        ws.row_dimensions[2].height = 30
        offset = 1

    header_row = 2 + offset

    # Headers
    for col_idx, (label, width, _req) in enumerate(columns, start=1):
        header_cell(ws, header_row, col_idx, label, width)
    ws.row_dimensions[header_row].height = 36

    # Example rows (greyed-out italic)
    for row_offset, values in enumerate(example_rows, start=1):
        r = header_row + row_offset
        ws.row_dimensions[r].height = 18
        for col_idx, (_, _, req) in enumerate(columns, start=1):
            val = values[col_idx - 1] if col_idx - 1 < len(values) else ""
            data_cell(ws, r, col_idx, val, required=req, example=True)

    # Blank data entry rows (20 rows)
    first_blank = header_row + len(example_rows) + 1
    for r in range(first_blank, first_blank + 20):
        ws.row_dimensions[r].height = 18
        for col_idx, (_, _, req) in enumerate(columns, start=1):
            data_cell(ws, r, col_idx, "", required=req)

    add_legend(ws, first_blank + 21)
    freeze_and_filter(ws, row=header_row)
    return ws


# ══════════════════════════════════════════════════════════════════════════════
# 2.  MAIN CATEGORIES
# ══════════════════════════════════════════════════════════════════════════════
build_sheet(
    title="Main Categories",
    columns=[
        ("ID",            8,  True),
        ("Category Name", 35, True),
        ("From Price\n(display text)", 22, True),
        ("Image Path / URL", 45, False),
        ("Fallback\nColour (#hex)", 18, False),
    ],
    example_rows=[
        [1, "Paper, Envelopes & Packaging", "From £2.99",
         "/images/categories/paper.avif", "#E3F2FD"],
        [2, "Ink & Toner", "From £4.99",
         "/images/categories/ink-toner.avif", "#F3E5F5"],
        [3, "Office Supplies", "From £0.79",
         "/images/categories/office-supplies.avif", "#FFF3E0"],
    ],
    note=(
        "List every top-level/main category here. "
        "Each category will have subcategories listed on the 'Subcategories' sheet."
    ),
)


# ══════════════════════════════════════════════════════════════════════════════
# 3.  SUBCATEGORIES
# ══════════════════════════════════════════════════════════════════════════════
build_sheet(
    title="Subcategories",
    columns=[
        ("ID",                      8,  True),
        ("Parent Category Name\n(must match Main Categories sheet)", 38, True),
        ("Subcategory Name",        35, True),
        ("Items\n(comma-separated list of products/types in this subcategory)", 80, False),
        ("Image Path / URL",        45, False),
    ],
    example_rows=[
        [1, "Paper, Envelopes & Packaging", "Copy & Printer Paper",
         "A4 Paper 80gsm, A4 Paper 90gsm, A3 Paper, A5 Paper, Coloured Paper, Recycled Paper",
         "/images/subcategories/copy-printer-paper.avif"],
        [2, "Paper, Envelopes & Packaging", "Envelopes",
         "White Envelopes DL, White Envelopes C4, White Envelopes C5, Padded Envelopes, Bubble Wrap Envelopes",
         "/images/subcategories/envelopes.avif"],
        [3, "Ink & Toner", "Printer Ink Cartridges",
         "HP 301 Black Ink, HP 305 Colour Ink, Canon PG-545 Black, Epson 603 Black",
         "/images/subcategories/printer-ink.avif"],
        [4, "Office Supplies", "Writing Instruments",
         "Ballpoint Pens, Rollerball Pens, Highlighters, Permanent Markers, Pencils",
         "/images/subcategories/writing-instruments.avif"],
    ],
    note=(
        "One row per subcategory. "
        "'Parent Category Name' must exactly match a name entered in the Main Categories sheet. "
        "List all product types/items within that subcategory separated by commas."
    ),
)


# ══════════════════════════════════════════════════════════════════════════════
# 4.  PRODUCTS  (simple card products – viewed / bought / recommendations)
# ══════════════════════════════════════════════════════════════════════════════
build_sheet(
    title="Products (Cards)",
    columns=[
        ("ID",          8,  True),
        ("Main Category\n(must match Main Categories sheet)", 35, True),
        ("Subcategory\n(must match Subcategories sheet)", 35, True),
        ("Name\n(full)", 45, True),
        ("Short Name\n(truncated display)", 40, False),
        ("SKU",         18, True),
        ("Brand",       20, True),
        ("Price\n(ex VAT £)", 16, True),
        ("Price\n(inc VAT £)", 16, True),
        ("Unit\n(e.g. Pack, Box, Each)", 18, True),
        ("Bulk From\n(e.g. from 10 Packs)", 22, False),
        ("Badge\n(buyMore/promo/sale/new)", 18, False),
        ("Rating\n(0–5 or blank)", 14, False),
        ("Image URL / Path", 45, False),
        ("Section\n(viewed / bought / recommendation)", 22, True),
    ],
    example_rows=[
        [101, "Paper, Envelopes & Packaging", "Notepads & Notebooks",
         "Pukka Pad Notebook Metallic Jotta A5 Ruled Spiral Bound",
         "Pukka Pad Notebook Metallic Jotta A5...", "B1J200-IGN", "Pukka Pad",
         4.99, 5.99, "Pack", "from 10 Packs", "buyMore", "",
         "https://example.com/image.jpg", "viewed"],
        [201, "Office Supplies", "Writing Instruments",
         "BIC Cristal Original Ballpoint Pen Black 0.4 mm",
         "BIC Cristal Original Ballpoint Pen...", "BC10BK", "BIC",
         10.19, 12.23, "Pack", "from 3 Packs", "buyMore", "",
         "https://example.com/image2.jpg", "bought"],
    ],
    note=(
        "Main Category and Subcategory must exactly match names entered in their respective sheets. "
        "Section column: 'viewed' = Recently Viewed, 'bought' = Frequently Bought, 'recommendation' = Recommended."
    ),
)


# ══════════════════════════════════════════════════════════════════════════════
# 5.  LISTING PRODUCTS  (product listing / search results page)
# ══════════════════════════════════════════════════════════════════════════════
ws_list = wb.create_sheet("Listing Products")
ws_list.sheet_view.showGridLines = False

note_text = (
    "Products shown on category / search listing pages. "
    "Each product supports up to 3 bulk price tiers. "
    "Tier 1 = lowest qty, Tier 3 = highest qty discount."
)

ws_list.merge_cells("A1:W1")
t = ws_list.cell(row=1, column=1, value="Listing Products")
t.font      = TITLE_FONT
t.fill      = PatternFill("solid", fgColor="D6E4F7")
t.alignment = Alignment(horizontal="left", vertical="center")
ws_list.row_dimensions[1].height = 24

ws_list.merge_cells("A2:W2")
n = ws_list.cell(row=2, column=1, value=note_text)
n.font = Font(name="Calibri", size=9, italic=True, color="595959")
n.alignment = Alignment(wrap_text=True, vertical="center")
ws_list.row_dimensions[2].height = 30

LISTING_COLS = [
    # (label, width, required)
    ("ID",                      8,  True),
    ("Main Category\n(must match Main Categories sheet)", 35, True),
    ("Subcategory\n(must match Subcategories sheet)",     35, True),
    ("Product Name",           45,  True),
    ("Brand",                  20,  True),
    ("Star Rating\n(0–5)",     14,  False),
    ("No. of Reviews",         14,  False),
    ("Badge",                  18,  False),
    ("Eco Badge",              18,  False),
    ("Price (ex VAT £)",       16,  True),
    ("Unit Info\n(e.g. Pack / from 6 Packs)", 26, True),
    ("Stock Status",           22,  False),
    ("Delivery Text",          38,  False),
    ("Image URL / Path",       45,  False),
    ("Image Style\n(bag/box/default)", 18, False),
    # Tier 1
    ("Tier 1\nQty Range\n(e.g. 1-2)", 16, False),
    ("Tier 1\nPrice (£)",      14,  False),
    ("Tier 1\nDiscount",       14,  False),
    # Tier 2
    ("Tier 2\nQty Range",      16,  False),
    ("Tier 2\nPrice (£)",      14,  False),
    ("Tier 2\nDiscount",       14,  False),
    # Tier 3
    ("Tier 3\nQty Range",      16,  False),
    ("Tier 3\nPrice (£)",      14,  False),
    ("Tier 3\nDiscount",       14,  False),
]

# Merge header for tiers
HEADER_ROW = 3
for col_idx, (label, width, _) in enumerate(LISTING_COLS, start=1):
    header_cell(ws_list, HEADER_ROW, col_idx, label, width)
ws_list.row_dimensions[HEADER_ROW].height = 50

# Example row 1
ex1 = [
    1001, "Catering & Hospitality", "Food & Snacks",
    "Tate & Lyle White Granulated Pure Cane Sugar 2 kg",
    "Tate & Lyle", 5, 16, "Buy More, Save More", "",
    4.69, "Each\nfrom 6 Pieces",
    "Currently in stock", "Order before 6:00 PM for next working day delivery.",
    "https://example.com/sugar.jpg", "bag",
    "1-2", 5.19, "",
    "3-5", 4.99, "-3%",
    "6+",  4.69, "-9%",
]
ex2 = [
    1002, "Catering & Hospitality", "Food & Snacks",
    "Tate & Lyle White Sugar Sachets 2.5g Pack of 1000",
    "Tate & Lyle", 4.5, 6, "Buy More, Save More", "Sustainable",
    12.39, "Pack\nfrom 6 Packs",
    "Currently in stock", "Order before 6:00 PM for next working day delivery.",
    "https://example.com/sachets.jpg", "box",
    "1-2", 13.39, "",
    "3-5", 12.89, "-3%",
    "6+",  12.39, "-7%",
]
for row_offset, values in enumerate([ex1, ex2], start=1):
    r = HEADER_ROW + row_offset
    ws_list.row_dimensions[r].height = 22
    for col_idx, (_, _, req) in enumerate(LISTING_COLS, start=1):
        val = values[col_idx - 1] if col_idx - 1 < len(values) else ""
        data_cell(ws_list, r, col_idx, val, required=req, example=True)

first_blank = HEADER_ROW + 3
for r in range(first_blank, first_blank + 20):
    ws_list.row_dimensions[r].height = 20
    for col_idx, (_, _, req) in enumerate(LISTING_COLS, start=1):
        data_cell(ws_list, r, col_idx, "", required=req)

add_legend(ws_list, first_blank + 21)
ws_list.freeze_panes = ws_list.cell(row=HEADER_ROW + 1, column=1)
ws_list.auto_filter.ref = ws_list.dimensions


# ══════════════════════════════════════════════════════════════════════════════
# 6.  BRANDS
# ══════════════════════════════════════════════════════════════════════════════
build_sheet(
    title="Brands",
    columns=[
        ("ID",          8,  True),
        ("Brand Name",  28, True),
        ("Brand Colour\n(#hex)", 18, False),
    ],
    example_rows=[
        [1, "Tate & Lyle", "#D52B1E"],
        [2, "BIC", "#F5A623"],
        [3, "Post-it", "#F5C518"],
    ],
    note="List all brands. Colour is used for brand badges/highlights on the storefront.",
)


# ══════════════════════════════════════════════════════════════════════════════
# 7.  RECOMMENDATIONS  (sub-category tiles)
# ══════════════════════════════════════════════════════════════════════════════
build_sheet(
    title="Recommendations",
    columns=[
        ("ID",          8,  True),
        ("Display Name", 40, True),
        ("Image URL / Path", 45, False),
        ("Fallback BG\nColour (#hex)", 20, False),
    ],
    example_rows=[
        [1, "Notebooks, Notepads & Pads",
         "https://example.com/notebooks.jpg", "#E0F2F1"],
        [2, "Diaries, Calendars & Planners",
         "https://example.com/diaries.jpg", "#E3F2FD"],
    ],
    note="These are the sub-category recommendation tiles shown on the homepage.",
)


# ══════════════════════════════════════════════════════════════════════════════
# Save
# ══════════════════════════════════════════════════════════════════════════════
out_path = "/Users/darshan/Downloads/viking-2/Product_Data_Template.xlsx"
wb.save(out_path)
print(f"Saved: {out_path}")
