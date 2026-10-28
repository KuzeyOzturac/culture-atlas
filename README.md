# Culture Atlas

Interactive culture ancestry editor built with plain HTML, CSS, and JavaScript.

- Zero parents: root culture; one: divergence; two: hybridization.
- Flag images from HTTPS URLs, culture notes, pan/zoom, search, and clickable relatives.
- Relationship degree counts edges along the shortest undirected parent–child path.
- Clear graph with an in-app confirmation; JSON import/export and a text editor.
- Data is stored in browser localStorage, not on GitHub. Export/import to move between browsers or domains.
- Tree, Map, and Text are independent view toggles. Show any combination, or hide all three.
- On wide screens, drag the dividers between visible views to resize them horizontally; use the arrow keys when a divider is focused. Views stack and scroll on narrow screens.

## Run locally

Serve this directory with `python3 -m http.server 8000` and open http://localhost:8000.

## Publish

GitHub Pages serves the root of the `main` branch. Commits to main automatically update the site. No dependencies or build step.

## Culture territories

Edit a culture and search for a country or a first-level subdivision (province, state, region, or local equivalent). Countries contain expandable subdivision lists. Checking a country selects its whole territory; unchecking one subdivision turns it into a partial selection. A selected culture shows its direct territory in green and the exact union of descendant territory in purple. Shared hybrid descendants count once. Selecting a child does not include its ancestors or siblings.

Country and subdivision assignments are included in JSON exports. Older exports with country-only assignments still work. Whole-country assignments remain whole countries in saved data, so future boundary updates do not require expanding them into a list of subdivisions.

**Add Mashriqi example** appends Mashriqi → Jordanian (Jordan) and Syrian (Syria) without replacing your graph. Use **Focus selection** to zoom to highlighted countries or **World** to reset the map. Country chips in the details panel focus individual countries.

Country and subdivision boundaries are bundled locally; subdivision paths load by country when needed. See [MAP-SOURCES.md](MAP-SOURCES.md). No map keys, map service, or runtime libraries are required.

## Atlas language

Open **Text** to edit the entire atlas as a script. A draft changes the atlas only when you select **Apply text**; syntax and relationship errors leave the current atlas intact. **Reset draft** restores the current atlas. JSON import/export remains available for backups.

```text
culture "Highlanders"
  flag: "https://example.com/flag.png"
  territory: country "Canada", "United States of America"
  note: "Optional context."

diverge "Highlanders" -> "Valleyfolk"
  territory: province "Ontario", "Quebec"

hybridize "Highlanders" + "Valleyfolk" -> "Estuary culture"
```

A territory line can contain a comma-separated list of countries, provinces, or both. After the first item of a type, its `country` or `province` prefix may be omitted until the type changes. In the editor, Tab indents and Shift+Tab outdents selected lines.

IDs stay in the saved JSON and never appear in the language. Existing cultures keep their IDs when names match; a single rename also retains its ID. Parent references use culture names. Unique province names need no country. For a province name shared worldwide, add its country; repeated names within that country use an occurrence number, such as `province "Victoria" (2) in "Canada"`. Repeated culture names also use an occurrence number, such as `diverge "Same" (2) -> "Child"`. Flag and note lines are optional. A script represents the entire atlas, so applying one can remove cultures omitted from it; the editor confirms removals.
