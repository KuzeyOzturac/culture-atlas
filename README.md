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

## Culture countries

Edit a culture and search/check its countries. Selecting a culture highlights its direct assignments in green and all descendant countries in purple. Shared hybrid descendants count once. Selecting a child does not include its ancestors or siblings. Country assignments are included in JSON exports; older exports without countries still work.

**Add Mashriqi example** appends Mashriqi → Jordanian (Jordan) and Syrian (Syria) without replacing your graph. Use **Focus selection** to zoom to highlighted countries or **World** to reset the map. Country chips in the details panel focus individual countries.

Country boundaries are bundled locally; see [MAP-SOURCES.md](MAP-SOURCES.md). No map keys, map service, or runtime libraries are required.
