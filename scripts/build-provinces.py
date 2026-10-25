"""Build country-sized ADM1 assets from Natural Earth 5.1.1 shapefile.

Usage: PYTHONPATH=/path/to/pyshp python3 scripts/build-provinces.py /path/to/ne_10m_admin_1_states_provinces.shp
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import pycountry
import shapefile

root = Path(__file__).resolve().parent.parent
countries = json.loads(re.search(r'const MAP_COUNTRIES=(.*);', (root / 'country-data.js').read_text()).group(1))
country_ids = {c['id'] for c in countries}
special = {'ALD': '248', 'KOS': 'name:Kosovo', 'SDS': '728', 'PSX': '275',
           'SAH': '732', 'SOL': 'name:Somaliland', 'CYN': 'name:N. Cyprus',
           'KAS': 'name:Siachen Glacier', 'IOA': 'name:Indian Ocean Ter.'}

def simplify(points, tolerance=.025):
    if len(points) < 4:
        return points
    x, y = points[0]
    ex, ey = points[-1]
    dx, dy = ex-x, ey-y
    den = dx*dx + dy*dy
    best, index = -1, 0
    for i, (px, py) in enumerate(points[1:-1], 1):
        t = max(0, min(1, ((px-x)*dx + (py-y)*dy)/den)) if den else 0
        d = (px-x-t*dx)**2 + (py-y-t*dy)**2
        if d > best:
            best, index = d, i
    if best > tolerance*tolerance:
        return simplify(points[:index+1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [points[0], points[-1]]

features = defaultdict(list)
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
            points = simplify(list(ring))
            if len(points) < 4:
                points = list(ring)
            if len(points) >= 4:
                rings.append(points)
        if rings:
            cleaned.append(rings)
    if cleaned:
        features[country].append({'id': record['adm1_code'], 'name': record['name'] or record['adm1_code'],
                                  'geometry': {'type': 'MultiPolygon', 'coordinates': cleaned}})

out = root / 'province-geo'
out.mkdir(exist_ok=True)
index = []
for country, entries in sorted(features.items()):
    index.extend({'id': entry['id'], 'name': entry['name'], 'country': country} for entry in entries)
    (out / f'{country}.json').write_text(json.dumps({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'id': entry['id'], 'properties': {}, 'geometry': entry['geometry']}
        for entry in entries]}, separators=(',', ':'), ensure_ascii=False))
(root / 'province-index.js').write_text('const MAP_PROVINCES=' + json.dumps(index, separators=(',', ':'), ensure_ascii=False) + ';\n')
print(f'{len(index)} provinces in {len(features)} countries')
