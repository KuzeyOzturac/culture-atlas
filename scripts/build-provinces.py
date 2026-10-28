"""Build country-sized ADM1 assets from a topology-simplified Natural Earth 5.1.1 shapefile.

Usage: PYTHONPATH=/path/to/pyshp python3 scripts/build-provinces.py /path/to/ne_10m_admin_1_states_provinces.shp
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pycountry
import shapefile
from shapely.geometry import shape as polygon_shape, mapping
from shapely import union_all

root = Path(__file__).resolve().parent.parent
countries = json.loads(re.search(r'const MAP_COUNTRIES=(.*);', (root / 'country-data.js').read_text()).group(1))
country_ids = {c['id'] for c in countries}
special = {'ALD': '248', 'KOS': 'name:Kosovo', 'SDS': '728', 'PSX': '275',
           'SAH': '732', 'SOL': 'name:Somaliland', 'CYN': 'name:N. Cyprus',
           'KAS': 'name:Siachen Glacier', 'IOA': 'name:Indian Ocean Ter.'}

features = defaultdict(list)
country_shapes = defaultdict(list)
reader = shapefile.Reader(sys.argv[1])
for item in reader.iterShapeRecords():
    record = item.record.as_dict()
    alpha3 = record['adm0_a3']
    iso = pycountry.countries.get(alpha_3=alpha3)
    country = special.get(alpha3, iso.numeric if iso else None)
    if country not in country_ids:
        continue
    shape = item.shape.__geo_interface__
    polygons = [shape['coordinates']] if shape['type'] == 'Polygon' else shape['coordinates']
    cleaned = []
    for polygon in polygons:
        rings = []
        for ring in polygon:
            points = list(ring)
            if len(points) >= 4:
                rings.append(points)
        if rings:
            cleaned.append(rings)
    if cleaned:
        country_shapes[country].append(polygon_shape({'type': 'MultiPolygon', 'coordinates': cleaned}))
        features[country].append({'id': record['adm1_code'], 'name': record['name'] or record['adm1_code'],
                                  'type': record.get('type_en') or '',
                                  'geometry': {'type': 'MultiPolygon', 'coordinates': cleaned}})

out = root / 'province-geo'
out.mkdir(exist_ok=True)
index = []
for country, entries in sorted(features.items()):
    duplicates = Counter(entry['name'] for entry in entries)
    index.extend({'id': entry['id'], 'name': entry['name'], 'country': country,
                  **({'type': entry['type']} if duplicates[entry['name']] > 1 and entry['type'] else {})}
                 for entry in entries)
    (out / f'{country}.json').write_text(json.dumps({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'id': entry['id'], 'properties': {}, 'geometry': entry['geometry']}
        for entry in entries]}, separators=(',', ':'), ensure_ascii=False))
(root / 'province-index.js').write_text('const MAP_PROVINCES=' + json.dumps(index, separators=(',', ':'), ensure_ascii=False) + ';\n')
country_outlines = {}
for country, shapes in country_shapes.items():
    outline = union_all(shapes)
    if sum(part.area for part in shapes) - outline.area > 1e-7:
        raise ValueError(f'Overlapping province shapes in country {country}')
    country_outlines[country] = mapping(outline)
(root / 'country-geo.json').write_text(json.dumps(country_outlines, separators=(',', ':')))
print(f'{len(index)} provinces in {len(features)} countries')
