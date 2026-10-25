# Culture Atlas

Interactive culture ancestry editor built with plain HTML, CSS, and JavaScript.

- Zero parents: root culture; one: divergence; two: hybridization.
- Flag images from HTTPS URLs, culture notes, pan/zoom, search, and clickable relatives.
- Relationship degree counts edges along the shortest undirected parent–child path.
- Clear graph with an in-app confirmation; JSON import/export.
- Data is stored in browser localStorage, not on GitHub. Export/import to move between browsers or domains.

## Run locally

Serve this directory with `python3 -m http.server 8000` and open http://localhost:8000.

## Publish

GitHub Pages serves the root of the `main` branch. Commits to main automatically update the site. No dependencies or build step.

## Culture territories

Edit a culture and search for a country or a first-level subdivision (province, state, region, or local equivalent). Countries contain expandable subdivision lists. Checking a country selects its whole territory; unchecking one subdivision turns it into a partial selection. A selected culture shows its direct territory in green and the exact union of descendant territory in purple. Shared hybrid descendants count once. Selecting a child does not include its ancestors or siblings.

Country and subdivision assignments are included in JSON exports. Older exports with country-only assignments still work. Whole-country assignments remain whole countries in saved data, so future boundary updates do not require expanding them into a list of subdivisions.

**Add Mashriqi example** appends Mashriqi → Jordanian (Jordan) and Syrian (Syria) without replacing your graph. Use **Focus selection** to zoom to highlighted countries or **World** to reset the map. Country chips in the details panel focus individual countries.

Country and subdivision boundaries are bundled locally; subdivision paths load by country when needed. See [MAP-SOURCES.md](MAP-SOURCES.md). No map keys, map service, or runtime libraries are required.
