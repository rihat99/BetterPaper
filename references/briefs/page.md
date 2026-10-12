<!-- Brief template: build one page (phase 3), or bring an existing page to the standard (polish variant).
Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{READER}} {{USER_REQUEST}} the user's own words about the pages ·
{{READING_ORDER}} numbered list "1 slug (Method) · 2 ..." or "single paper: no index, no prev/next" ·
{{CATEGORIES}} allowed category values · {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/page.md. Your slug: <slug>." plus, once the collection has a reviewed first
page: "Reference page: <out>/<slug0>.html"; for a polish pass: "Rewrite: the page exists; old copy
<notes>/before/<slug>.html"; for a successor: "Continue from <notes>/scratch/page_state_<slug>.md". -->

# Brief: build one paper page

You build ONE interactive HTML explainer page for one paper, to the page standard. Your slug is in your spawn prompt.

## The user's request
{{USER_REQUEST}}

Reader: {{READER}}. They read on a laptop, and sometimes on a phone. They should grasp what the paper does, how, and
how well, in a few minutes, without opening the PDF.

## Read first, in this order
1. **The design guide**: `{{SKILL}}/references/design_guide.md`. Read §6 (the page standard: your spec) fully, then
   §1–§5 and §7–§8; they hold the component APIs, the layout, the pitfalls and the check procedure.
2. **The page template**: `{{SKILL}}/templates/page.html`. It shows every component once and meets the standard:
   Figure 2 is a network within the limits, Figure 2b an optimization with a variables group, one Σ and its update
   loop. Look at its JSON before you draw.
   - If `{{OUT}}/<slug>.html` does not exist yet, copy the template there and replace its content.
   - If the page already exists (you continue an earlier agent's work, or polish a page), edit it in place. Never copy
     the template over it.
3. **The reference page**, only if your spawn prompt names one: the first finished page of this collection. Read its
   header, its architecture section and its analysis section once, for the voice and the level of detail; skip the
   rest. Do not copy its figure shapes: the figures must fit this paper.
4. **Your notes**, your only content source: `{{NOTES}}/digest_<slug>.md`. Its final "## 12. Verification log" was
   written by an independent checker; where it corrects an earlier section, the correction wins.
5. **Your cropped figures**: `{{OUT}}/assets/<slug>/`. Show them full column width, never as thumbnails. If you crop a
   new one, use `{{SKILL}}/scripts/extract_figure.py` (at least 2600 px wide).
6. **Code**, read-only and never run, only when the notes leave a detail vague. Its path is in the notes' Meta.

## Save context
A page is 100–200 KB and the guide is long; agents have run out of room before editing. Grep before reading; read
the page, the notes and the guide in parts, only what you need. Never read `site.js` (≈ 80 KB) or `site.css` whole:
the guide documents their APIs; grep them only to confirm a detail. Keep command output short; look at crops rather
than many full slices. Write the page in a few large chunks rather than many small edits.

If your context gets tight, stop at a clean point and write `{{NOTES}}/scratch/page_state_<slug>.md`: what is done,
what is left, the last check results and your plan. Then return, so a fresh agent can continue from it.

## Files you may write
- `{{OUT}}/<slug>.html`
- new small assets in `{{OUT}}/assets/<slug>/`
- screenshots in `{{NOTES}}/vis/<slug>/`
- scratch files in `{{NOTES}}/scratch/<slug>/`; in a polish pass, the change log `{{NOTES}}/changes_<slug>.md`

Never edit `{{OUT}}/assets/site.css`, `site.js`, other pages or the notes. If a shared component lacks something you
need, add page-local CSS/JS inline, prefixed with your slug, and report it. Never delete a file.

## Prev / next links (reading order)
{{READING_ORDER}}

Files are `<slug>.html`. The first page's previous link and the last page's next link go to `index.html`, with the text
"All papers". On a single page, delete the topbar and the pager.

## What the page must do
Meet every rule of the standard (guide §6). The ones agents miss most:
- **Structure:** Figure 1 and Figure 2 (extra ones 1b, 2b), each with its `fig-head` title "Figure 2 · …" (≤ 8 words);
  the paper-vs-code callout under its figure; extra blocks in `details.more`.
- **Text:** h2 ≤ 15 words, one claim; ledes ≤ 60 words (the section's `p.lede` and every `p.tp-lede`; site.js
  counts them) whose first sentence says what the section or figure shows; paragraphs ≤ 80 words; every
  abbreviation defined once; one name per concept; each fact once.
- **Figure 1:** shows the h2 claim and the paper's key contrast (before / after); ≤ 3 labels per drawing, no formulas;
  the output panel shows this paper's output type; a full Play run ≤ 10 s.
- **Figure 2:** viewBox ≤ 1100 × 560, ≤ 20 nodes, ≤ 30 edges, ≤ 12 edge labels, 0 crossings; the main path one row,
  left to right; labels ≤ 3 words (the job), names and sizes in the sub; at most 4 ≠ and 6 NEW; does / in / out on
  every node and `why` on the key new blocks. More than the limits allow → Figure 2 and 2b. Sketch the grid (columns
  x, rows y) before you write the JSON.
- **Experiments:** ≤ 5 tabs; every table lede starts with the takeaway.

Make the two figures specific to THIS paper:
- **Feed-forward networks**: modules, tokens, heads and recurrent state, with tensor shapes; losses in the
  "training only" band.
- **Optimization methods**: the stage timeline (guide §3.4): frozen models give the start, the variables in one
  group, the energy terms, one Σ with its update loop, the output leaving from the variables; weights and iterations
  in the stage matrix.
- **Pipelines and systems** (for example real-to-sim, or robot learning): one node per stage, with what passes between
  stages. Show the observations, networks, rewards and the simulator where they exist.
- **Dataset and benchmark papers**: capture setup and sensors → processing stages → the ground-truth branch → the
  benchmark and its metrics.

Where code exists, draw the architecture as the code implements it. Put a ≠ badge on the blocks where the difference
changes what the block does (at most 4) and list every difference in the callout under the figure.

The category chip in the header is one of: {{CATEGORIES}} (the notes' §11 record names it).

The template's `#entities` and `#labels` blocks (near the end of the page) belong to its placeholder content. Rewrite
them for this paper, or delete them when the default names and words are true (guide §1). A page about video with
optimized blocks sets `{"optimized": "optimized per video"}`.

If the paper is not about humans, scenes or robots:
- rename the entity slots with the `#entities` block;
- if its input is not a video, set `unit` in the `#labels` block, so the page does not speak of frames;
- delete the commented-out world widget, and draw the output panel in SVG.

If the notes say no code was released or the code was not read, set `data-no-code` on every diagram (guide §3.3).

## Content rules
- **Numbers.** Every number, dimension and table cell exactly as in the notes. Nothing invented.
  - "Not stated" stays visible (a muted tag is fine).
  - Values the notes mark as estimated or read off a plot stay marked.
- **Hedges are facts too.** "Presumably", "not stated", "in the authors' pipeline", "the cause is not isolated", "can
  also", "in code", which paper version, which metrics or benchmark a claim holds for: keep them when you shorten a
  sentence. A cut clause must not leave the rest of the sentence claiming more than before.
- **New text is new claims.** Check every new in / out / why line, takeaway, figure title, panel caption and h2
  against the notes, the PDF or the code before you write it. Rewrites have written "video frames" for a block that
  gets person crops, "the mean" where the code samples, a title that changed a count, a ranking made from a near-tie,
  `trained` for a block that starts from pretrained weights, and "the paper's Fig. N" with the wrong N.
- **Experiments.** Training data first. Then every main comparison table and ablation from the notes, with best and
  second as marked in the paper, and unfair rows flagged with the reason. Then ablation bars, then the paper figures
  with credit.
- **Analysis.**
  - "What carries the method" vs "minor additions", grounded in ablation rows; tags only main, minor, untested.
  - The limitations the authors state.
  - What the paper does not show, each point with an evidence chip.
  - Open questions.
  - Be direct and fair. Label speculation. Keep the notes' findings without softening or exaggerating them.
- **Internal words.** "digest", "notes file", "brief" and "agent" never appear on the page, tooltips and alt text
  included. Write "our reading" or "our analysis" instead.
- **Theme.** White theme only: no dark mode, no theme toggle.

## Polish pass (only when your spawn prompt says "Rewrite")
The page exists and was fact-checked; bring it to the standard without changing a fact. Fix what the standard flags;
cutting text is often the best fix. Where you cannot rephrase a fact safely, keep its wording. Never undo a fix logged
in `{{NOTES}}/check_<slug>.md`. Write `{{NOTES}}/changes_<slug>.md` as you go:
- **Facts touched:** every sentence that carries a number, a name or a claim and was rewritten, moved or cut, as
  `old → new` (quote both, ≤ 2 lines each). The fact checker reads only this list and the diff, so make it complete;
  a fact moved into `details.more` or a detail panel counts.
- **Figures:** what changed in Figure 1 and Figure 2 and why (node count, size, splits, renamed blocks).
- **Not done / needs a site.js change.**

## Check before you return
The user's rule is to always check how the page looks visually. Do all of the following, fix what you find, and
repeat until it is clean:
1. Render the page:
   `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/vis/<slug>`
   It must exit 0, ending with `console: clean`: no `[standard]` line (guide §8 lists what each one wants), no other
   console line, nothing missing. The one allowed exception: `missing: <slug>.html` for a neighbouring page that is
   not built yet (exit 1 with only such lines). If it says the desktop page is taller than 16000 px, screenshot the
   sections past the cut with `shot_state.sh --section <id>`.
2. Open EVERY PNG with the Read tool and look for:
   - clipping, overlapping labels or arrows, text on lines, overflowing boxes;
   - text too small to read, empty figures;
   - horizontal overflow at phone width, columns off the centre line, bad spacing.
3. Zoom into both figures with Pillow crops at 2×, using `{{PYTHON}}` (guide §8).
4. Screenshot the hidden states and look at them: two selected nodes with shapes on, two steps or stages, every tab,
   Figure 1 during Play and after Show all.
   `bash {{SKILL}}/scripts/shot_state.sh {{OUT}}/<slug>.html {{NOTES}}/scratch/<slug>/node.png --query 'node=<id>&shapes=1'`
5. Look at the page at 1512 px (guide §8).
6. Re-read every table on the page against the notes, cell by cell, and your text once more as the reader, start to
   finish.

## Return (at most 30 lines)
- the page path (and the change log path in a polish pass);
- what the two figures show (node and edge counts, Figure 2b if any);
- any page-local CSS/JS you added;
- the PNGs you looked at, and what you fixed after looking;
- any remaining issues, and anything the standard needs from site.js.
