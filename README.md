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
