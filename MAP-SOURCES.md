# Map sources

Country geometry: [world-atlas 2.0.2](https://github.com/topojson/world-atlas), `countries-50m.json`, derived from Natural Earth's 1:50m Admin 0 country boundaries. Natural Earth geographic data is public domain. The map includes countries and territories as represented by this dataset; boundaries are illustrative, not live political data.

The app uses an equirectangular projection. `scripts/build-map.py` decodes shared TopoJSON arcs and simplifies them at 0.06 degrees. `scripts/build-map.mjs` uses d3-geo 3.1.1 to clip polygons at the antimeridian before generating self-contained SVG paths. This prevents long segments across the map when a country crosses ±180° longitude. Run `npm install` then `npm run build:map` to regenerate. No external map services or keys are needed at runtime.

Country assignments are user-defined. Parent highlights are the union of the selected culture's assignments and all descendant assignments, including descendants linked through hybridization. A hybrid does not automatically inherit either parent's territory.

First-level subdivision boundaries: [Natural Earth 1:10m Admin 1 states and provinces](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/), version 5.1.1, public domain. `province-index.js` contains searchable names and parent country IDs; `province-paths/` contains one SVG path bundle per country. These paths are loaded only when a selected culture needs them. The generated index covers 4,578 subdivisions across all 240 country/map units in the bundled country map. Some source features representing special areas have no corresponding country unit in this map and are excluded. A one-feature country unit remains selectable as a whole country.

The subdivision source is 1:10m while the existing country backdrop is 1:50m, so coastlines and disputed borders can differ slightly at close zoom. The map remains an illustrative user assignment tool, not a statement about cultural or political boundaries. JSON exports record `boundaryVersion: "natural-earth-5.1.1"`; subdivision IDs come from Natural Earth's `adm1_code`. When updating the boundary dataset, keep an ID migration table for renamed or split subdivisions before publishing new data.

To regenerate the bundled subdivisions, download `ne_10m_admin_1_states_provinces.zip` from Natural Earth, extract it, install the build-only Python packages `pyshp` and `pycountry`, then run:

```sh
python3 scripts/build-provinces.py /path/to/ne_10m_admin_1_states_provinces.shp
node scripts/build-province-paths.mjs
```

The intermediate `province-geo/` directory is ignored by Git. The output files in `province-index.js` and `province-paths/` are committed because GitHub Pages serves the site without a build step.
