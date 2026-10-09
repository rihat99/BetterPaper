<!-- Brief template: the index page (phase 4). Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{READER}} {{TOPIC}}
{{READING_ORDER}} {{CATEGORIES}} (= the map lanes, top to bottom) {{COLUMNS}} {{INDEX_TITLE}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/index.md. Build index.html for: <slug list in reading order>."
When papers are added to an existing index: "Update index.html: add <slugs>; keep everything else." -->

# Brief: the index page of a paper collection

You build `{{OUT}}/index.html`, the page that links the paper explainer pages of one collection on {{TOPIC}}.
Reader: {{READER}}, on a laptop and on a phone.

## Read first
1. `{{SKILL}}/templates/index.html`. One JSON block, `<script type="application/json" id="collection">`, drives the
   family map, the cards and the comparison table. Its schema is in the HTML comment right above it.
   - If `{{OUT}}/index.html` does not exist, copy the template there and replace the placeholder content.
   - If it exists (papers are being added), edit it in place: add the new papers to the JSON, and extend the
     hand-written parts (header counts, shared benchmarks, patterns) without rewriting what is there.
2. The design guide `{{SKILL}}/references/design_guide.md`: §1, §3.1, §3.8, §3.9, §6, §7 and §8.
3. The notes of every paper, `{{NOTES}}/digest_<slug>.md`. They are long, so read them selectively:
   - §0 Meta, §1 TL;DR, §3 Key idea;
   - §8 tables, only to pick each method's own numbers on shared benchmarks;
   - §9a–b and the §11 JSON record;
   - §12 Verification log. Its corrections win over the earlier sections.

## Reading order (also the prev/next order of the paper pages)
{{READING_ORDER}}

Page files are `<slug>.html` next to `index.html`.

## Content
1. **Header.**
   - Title: {{INDEX_TITLE}}.
   - One short paragraph on what the papers share and how to read the pages.
   - The paper count and the pager link are hand-written; make them match the JSON.
2. **Family map**, generated from the JSON.
   - `lanes`: {{CATEGORIES}}.
   - `papers`: the §11 records in reading order. Every paper's `category` must be one of the lanes. `code_url` is a
     bare https URL or ""; anything else is not linked and logs a warning.
   - `priors`: the earlier systems that more than one paper builds on, or that explain a paper's lineage. Every
     `builds_on` entry must name a prior or a paper in the collection exactly, and each entry is drawn as an edge. Trim
     the lists to what the map should show, and say what you trimmed.
   - `compares_against`: only papers of this collection whose numbers a paper prints as baselines. Check each one in
     the notes' §8.
3. **Cards**, generated: one per paper with its one-liner, input → output, headline result with a table ref, and code
   status.
4. **Comparison table**, generated.
   - `columns`: input, output, backbone, training data, runtime, plus the collection's domain fields: {{COLUMNS}}.
   - Use `sort: "number"` only for columns with one unit.
5. **Shared benchmarks**, hand-written. Where several papers report on the same benchmark, give each method's own
   number **as printed in its own paper**, with the paper and table ref per row.
   - Put a visible caveat above the table, "not a leaderboard": the protocols differ across papers (frame rate,
     segment length, alignment, given intrinsics, subsets, training on the test domain).
   - Flag rows with `data-flag` where a caveat applies to that row.
   - Use only numbers present in the notes.
6. **Patterns across the papers**, hand-written: 4–6 short points a researcher would want. Ground each one in the
   notes' critical analyses, and name the papers it rests on (evidence chips).

## Rules
- White theme only.
- Every number exactly as in the notes, after their §12 corrections. Nothing invented. "Not stated" stays visible.
- Internal words ("digest", "notes file", "brief", "agent") never appear where a reader can see them.
- Keep `site.js` deferred in `<head>`: the page-local builder must run before it, so that the generated table still
  sorts.
- Write only `{{OUT}}/index.html`, screenshots in `{{NOTES}}/vis/index/`, and scratch files in
  `{{NOTES}}/scratch/index/`. Never edit `site.css`, `site.js` or the paper pages.

## Check before you return
The user's rule is to always check how the page looks visually.
1. Render the page:
   `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/index.html {{NOTES}}/vis/index`
   It must exit 0, ending with `console: clean`. The builder logs data errors (an unknown `builds_on`, a missing
   field, a bad date or code URL) and map faults (overlapping nodes, an edge through a node) to the console. A link
   to a paper page that does not exist yet shows as `missing:`; at the end of the run there must be none.
2. Open EVERY PNG and look for:
   - overlaps in the map, clipped labels;
   - horizontal overflow of the table at phone width;
   - bad spacing.
3. Zoom into the map with a Pillow crop, using `{{PYTHON}}`.
4. Screenshot the hidden states and look at them:
   `bash {{SKILL}}/scripts/shot_state.sh {{OUT}}/index.html {{NOTES}}/scratch/index/pin.png --section map --js "FamilyMap.pin('<slug>')"`
   - comparison edges on: `--js "document.getElementById('fm-tg-c').click()"`;
   - a filtered table: `--section compare --js "document.querySelector('[data-filter=\"<lane>\"]').click()"`.
5. Check that every card and map node links to a `<slug>.html` of the reading order.

## Return (at most 30 lines)
- the page path;
- the lanes, priors and edges you chose, and what you trimmed;
- the PNGs and shots you looked at, and what you fixed after looking;
- any remaining issues.
