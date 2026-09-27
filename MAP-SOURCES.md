# Map sources

Country geometry: [world-atlas 2.0.2](https://github.com/topojson/world-atlas), `countries-50m.json`, derived from Natural Earth's 1:50m Admin 0 country boundaries. Natural Earth geographic data is public domain. The map includes countries and territories as represented by this dataset; boundaries are illustrative, not live political data.

The app uses an equirectangular projection. `scripts/build-map.py` decodes shared TopoJSON arcs and simplifies them at 0.06 degrees. `scripts/build-map.mjs` uses d3-geo 3.1.1 to clip polygons at the antimeridian before generating self-contained SVG paths. This prevents long segments across the map when a country crosses ±180° longitude. Run `npm install` then `npm run build:map` to regenerate. No external map services or keys are needed at runtime.

Country assignments are user-defined. Parent highlights are the union of the selected culture's assignments and all descendant assignments, including descendants linked through hybridization. A hybrid does not automatically inherit either parent's territory.
