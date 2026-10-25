# Map sources

Country identities and names originated with [world-atlas 2.0.2](https://github.com/topojson/world-atlas), `countries-50m.json`. The displayed country shapes now come from unions of the same Natural Earth 1:10m Admin 1 polygons used for provinces. Natural Earth geographic data is public domain. Boundaries are illustrative, not live political data.

The app uses an equirectangular projection. The original `scripts/build-map.py` and `scripts/build-map.mjs` build a 50m country base that supplies IDs and names during regeneration. `npm run build:map` then replaces its geometry with country outlines derived from the province polygons. The pipeline simplifies shared boundaries with Mapshaper and uses d3-geo 3.1.1 to clip at the antimeridian. No external map services or keys are needed at runtime.

Country assignments are user-defined. Parent highlights are the union of the selected culture's assignments and all descendant assignments, including descendants linked through hybridization. A hybrid does not automatically inherit either parent's territory.

First-level subdivision boundaries: [Natural Earth 1:10m Admin 1 states and provinces](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/), version 5.1.1, public domain. `province-index.js` contains searchable names and parent country IDs; `province-paths/` contains one SVG path bundle per country. These paths are loaded only when a selected culture needs them. The generated index covers 4,578 subdivisions across all 240 country/map units in the bundled country map. Some source features representing special areas have no corresponding country unit in this map and are excluded. A one-feature country unit remains selectable as a whole country.

Country and subdivision shapes are now generated from the same topology-simplified source, so their shared edges align. The map remains an illustrative user assignment tool, not a statement about cultural or political boundaries. JSON exports record `boundaryVersion: "natural-earth-5.1.1"`; subdivision IDs come from Natural Earth's `adm1_code`. When updating the boundary dataset, keep an ID migration table for renamed or split subdivisions before publishing new data.

To regenerate the bundled map, download `ne_10m_admin_1_states_provinces.zip` from Natural Earth, extract it, run `npm install`, install the build-only Python packages `pyshp`, `pycountry`, and `shapely`, then run:

```sh
npm run build:map -- /path/to/ne_10m_admin_1_states_provinces.shp
```

The intermediate `province-geo/` directory and `country-geo.json` are ignored by Git. The output files in `country-data.js`, `province-index.js`, and `province-paths/` are committed because GitHub Pages serves the site without a build step.
