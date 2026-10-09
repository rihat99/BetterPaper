<!-- Brief template: apply fact-check findings (phase 6). Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/fix.md. Fix: <slug> (PDF: <path>)[, ...]."
For the index: "Read <notes>/briefs/fix.md. Fix: index (findings in <notes>/check_index.md). Note corrections made by
the page fixers: <list from the Fix logs>. PDFs: <slug: path, ...>." -->

# Brief: apply checker findings to finished pages

You fix the pages named in your spawn prompt. An independent read-only checker compared each page with its paper. Its
findings are in `{{NOTES}}/check_<slug>.md`.

## Context
- **Pages.** `{{OUT}}/<slug>.html`: interactive explainer pages with a white theme. The shared
  `{{OUT}}/assets/site.css` and `site.js` are read-only for you.
- **Content source.** `{{NOTES}}/digest_<slug>.md`. Its "## 12. Verification log" corrections win over the earlier
  sections.
- **PDFs.** Paths are in your spawn prompt. Read pages with the Read tool (`pages`) or with `{{PYTHON}}` + pymupdf.
- **Design guide.** `{{SKILL}}/references/design_guide.md`. Read only the sections you need.

## Rules
1. **The findings are not ground truth.** Before you apply one, confirm it against the notes or the PDF cell it
   quotes.
   - Apply each finding that holds, with the smallest edit that makes the page correct. Keep the page's voice: short
     sentences, plain words.
   - Reject a finding that does not hold, and give the reason.
2. **Line numbers may have shifted.** Locate each edit by the text it quotes.
3. **Fix only what the findings name.** Do not restyle or rewrite other parts. If a fix makes a nearby sentence wrong
   (for example, a verdict that repeats the corrected claim), fix that sentence too and log it.
4. **Internal words.** "digest", "notes file", "brief" and "agent" never appear on a page. Write "our reading" or "our
   analysis" instead.
5. **When the notes were wrong too, correct the notes.** If a finding you apply shows that the notes themselves are
   wrong (not just the page), make the same correction in `{{NOTES}}/digest_<slug>.md`. Log it at the end of its
   "## 12. Verification log" as `- (fix phase) <old> → <new> [evidence]`. Later updates and the index are built from
   the notes, so an error left there comes back.
6. **The index** (when your spawn prompt says so). Apply `check_index.md` the same way. Then carry over the note
   corrections listed in your spawn prompt wherever the index uses those values: the collection JSON, the cards and
   the shared-benchmarks table. Finally, re-check every cell of the shared-benchmarks table against the PDF table it
   cites.
7. **Write only:**
   - your assigned pages (or `index.html`);
   - the notes of your assigned papers, as in rule 5;
   - screenshots in `{{NOTES}}/vis/<slug>/`;
   - a `## Fix log` section appended to each `check_<slug>.md`, with one line per finding:
     `<n>: applied | applied with change (what) | rejected (why)`, plus one line per note correction.
8. **Never delete, never download, never run cloned code.**

## Check after editing each page
1. Run `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/vis/<slug>`. It must
   exit 0, ending with `console: clean`.
2. Open the desktop and phone slices that contain your edits, and confirm the edited text fits, with no overflow and no
   broken layout.
3. If an edit sits inside a hidden state (a tab, a diagram detail panel, a step), check it with
   `bash {{SKILL}}/scripts/shot_state.sh` (see guide §8).

## Return (at most 15 lines)
For each page:
- the findings applied, applied with a change, and rejected (with a one-line reason for each rejection);
- the PNGs you looked at;
- anything left open.
