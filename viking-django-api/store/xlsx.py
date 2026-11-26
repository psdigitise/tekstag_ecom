"""
Minimal read-only .xlsx reader (standard library only).

Returns each sheet as {row_number: {column_number: text}}. Merged ranges are
expanded, so every cell in a range carries the range's value — exactly what the
spreadsheet shows.
"""
import re
import zipfile
from xml.etree import ElementTree as ET

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
MAX_PART_BYTES = 20 * 1024 * 1024
MAX_MERGED_CELLS = 100_000


def _tag(name):
    return f'{{{NS}}}{name}'


def _position(ref):
    letters, row = re.fullmatch(r'([A-Z]+)(\d+)', ref).groups()
    column = 0
    for letter in letters:
        column = column * 26 + ord(letter) - 64
    return int(row), column


def read_workbook(path):
    """{sheet name: {row: {column: str}}}"""
    with zipfile.ZipFile(path) as archive:
        def part(name):
            if archive.getinfo(name).file_size > MAX_PART_BYTES:
                raise ValueError(f'{name} is too large')
            return ET.fromstring(archive.read(name))

        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            for item in part('xl/sharedStrings.xml').findall(_tag('si')):
                shared.append(''.join(t.text or '' for t in item.iter(_tag('t'))))

        targets = {r.get('Id'): r.get('Target') for r in part('xl/_rels/workbook.xml.rels')}
        sheets = {}
        for sheet in part('xl/workbook.xml').find(_tag('sheets')):
            target = targets[sheet.get(f'{{{REL_NS}}}id')].lstrip('/')
            root = part(target if target.startswith('xl/') else f'xl/{target}')
            rows = {}
            for cell in root.iter(_tag('c')):
                kind, value = cell.get('t'), cell.find(_tag('v'))
                if kind == 'inlineStr':
                    text = ''.join(t.text or '' for t in cell.iter(_tag('t')))
                elif value is None:
                    if cell.find(_tag('f')) is not None:
                        raise ValueError(f'Cell {cell.get("r")} has a formula with no saved value')
                    continue
                elif kind == 's':
                    text = shared[int(value.text)]
                elif kind == 'e':
                    raise ValueError(f'Cell {cell.get("r")} contains an error ({value.text})')
                else:
                    text = value.text or ''
                if text.strip():
                    row, column = _position(cell.get('r'))
                    rows.setdefault(row, {})[column] = text.strip()

            merged = 0
            for merge in root.iter(_tag('mergeCell')):
                start, end = (_position(r) for r in merge.get('ref').split(':'))
                merged += (end[0] - start[0] + 1) * (end[1] - start[1] + 1)
                if merged > MAX_MERGED_CELLS:
                    raise ValueError('Too many merged cells')
                first = rows.get(start[0], {}).get(start[1])
                if first is None:
                    continue
                for row in range(start[0], end[0] + 1):
                    for column in range(start[1], end[1] + 1):
                        rows.setdefault(row, {})[column] = first
            sheets[sheet.get('name')] = dict(sorted(rows.items()))
        return sheets
