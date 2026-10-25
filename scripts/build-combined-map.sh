#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: npm run build:map -- /path/to/ne_10m_admin_1_states_provinces.shp" >&2
  exit 2
fi
node scripts/build-map.mjs
mkdir -p build-temp/simplified
./node_modules/.bin/mapshaper "$1" -simplify dp 50% keep-shapes -o force format=shapefile build-temp/simplified/admin1.shp
python3 scripts/build-provinces.py build-temp/simplified/admin1.shp
node scripts/build-province-paths.mjs
