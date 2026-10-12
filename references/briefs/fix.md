<!-- Brief template: apply fact-check findings (phase 6). Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/fix.md. Fix: <slug> (PDF: <path>)[, ...]."
After a polish pass: "Fix: <slug> (findings in <notes>/polish_check_<slug>.md; PDF: <path>)."
For the index: "Read <notes>/briefs/fix.md. Fix: index (findings in <notes>/check_index.md). Note corrections made by
the page fixers: <list from the Fix logs>. PDFs: <slug: path, ...>." -->

# Brief: apply checker findings to finished pages

You fix the pages named in your spawn prompt. An independent read-only checker compared each page with its paper. Its
findings are in `{{NOTES}}/check_<slug>.md`, or in the findings file your spawn prompt names.

## Context
- **Pages.** `{{OUT}}/<slug>.html`: interactive explainer pages with a white theme. The shared
  `{{OUT}}/assets/site.css` and `site.js` are read-only for you.
- **Content source.** `{{NOTES}}/digest_<slug>.md`. Its "## 12. Verification log" corrections win over the earlier
  sections.
- **PDFs.** Paths are in your spawn prompt. Read pages with the Read tool (`pages`) or with `{{PYTHON}}` + pymupdf.
- **Design guide.** `{{SKILL}}/references/design_guide.md`; §6 is the page standard. Read only the sections you need.

Save context: grep and read the page in parts; never read `site.js` or `site.css`; keep command output short.

## The fix loop, per finding
1. **Confirm it.** The findings are not ground truth. Check the finding against the notes or the PDF cell it quotes.
   Line numbers may have shifted: locate each edit by the text it quotes.
2. **If it holds, apply the smallest edit** that makes the page true again, in the page's voice and within the
   standard: short, plain wording; one fact in one place. A fix keeps every hedge the sentence had. If a fix makes a
   nearby sentence wrong (a verdict that repeats the corrected claim, a figure title, a step narration, a detail
   panel), fix that too and log it.
3. **If it does not hold, reject it** with the evidence.
4. **Figure findings** (states, edges, tags, badges, stage lighting): edit the diagram JSON or the storyboard SVG,
   then re-check the figure (below), because a moved edge can create a crossing.

## Rules
1. **Fix only what the findings name**, plus what rule 2 above forces. Do not restyle or rewrite other parts.
2. **Internal words.** "digest", "notes file", "brief" and "agent" never appear on a page. Write "our reading" or "our
   analysis" instead.
3. **When the notes were wrong too, correct the notes.** If a finding you apply shows that the notes themselves are
   wrong (not just the page), make the same correction in `{{NOTES}}/digest_<slug>.md`. Log it at the end of its
   "## 12. Verification log" as `- (fix phase) <old> → <new> [evidence]`. Later updates and the index are built from
   the notes, so an error left there comes back.
4. **The index** (when your spawn prompt says so). Apply `check_index.md` the same way. Then carry over the note
   corrections listed in your spawn prompt wherever the index uses those values: the collection JSON, the cards and
   the shared-benchmarks table. Finally, re-check every cell of the shared-benchmarks table against the PDF table it
   cites.
5. **Write only:** your assigned pages (or `index.html`); the notes of your assigned papers, as in rule 3;
   screenshots in `{{NOTES}}/vis/<slug>/`; the Fix log below.
6. **Never delete, never download, never run cloned code.**

## Check after editing each page
1. Run `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/vis/<slug>`. It must
   exit 0, ending with `console: clean`: no console line, no `[standard]` line, nothing missing.
2. Open the desktop and phone slices that contain your edits, and confirm the edited text fits, with no overflow and no
   broken layout. Zoom (Pillow crop at 2×) into every figure you touched.
3. If an edit sits inside a hidden state (a tab, a diagram detail panel, a step, a stage), check it with
   `bash {{SKILL}}/scripts/shot_state.sh` (guide §8).

## Fix log
Append a section `## Fix log` to each findings file, one line per finding, then one line per note
correction and per extra edit:
```
- <n>: applied — <what changed> [evidence]
- <n>: applied with change — <what, and why it differs from the suggestion> [evidence]
- <n>: rejected — <why> [evidence]
- notes: <old> → <new> [evidence]
- also: <nearby sentence fixed, and why>
```

## Return (at most 15 lines)
For each page: the counts applied / applied with change / rejected (a one-line reason for each rejection), the check
result, the PNGs you looked at, and anything left open.
