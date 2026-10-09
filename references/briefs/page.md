<!-- Brief template: build one page (phase 3). Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{READER}}
{{USER_REQUEST}} the user's own words about the pages · {{READING_ORDER}} numbered list "1 slug (Method) · 2 ..." or
"single paper: no index, no prev/next" · {{CATEGORIES}} allowed category values · {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/page.md. Your slug: <slug>." plus, once the collection has a reviewed first
page: "Reference page: <out>/<slug0>.html", and for a successor: "Continue from <notes>/scratch/page_state_<slug>.md". -->

# Brief: build one paper page

You build ONE interactive HTML explainer page for one paper. Your slug is in your spawn prompt.

## The user's request
{{USER_REQUEST}}

Reader: {{READER}}. They read on a laptop, and sometimes on a phone.

## Read first, in this order
1. **The design guide**, fully: `{{SKILL}}/references/design_guide.md`. It holds the component APIs, the colour and
   state language, the layout rules, the pitfalls and the check procedure.
2. **The page template**: `{{SKILL}}/templates/page.html`. It shows every component once.
   - If `{{OUT}}/<slug>.html` does not exist yet, copy the template there and replace its content.
   - If the page already exists (you continue an earlier agent's work, or fix a page), edit it in place. Never copy
     the template over it.
3. **The reference page**, only if your spawn prompt names one: the first finished page of this collection. Read its
   header, its architecture section and its analysis section once, for the voice and the level of detail; skip the
   rest. Do not copy its figure shapes: the figures must fit this paper.
4. **Your notes**, your only content source: `{{NOTES}}/digest_<slug>.md`. Its final "## 12. Verification log" was
   written by an independent checker; where it corrects an earlier section, the correction wins.
5. **Your cropped figures**: `{{OUT}}/assets/<slug>/`. Show them full column width, never as thumbnails. If you crop a
   new one, use `{{SKILL}}/scripts/extract_figure.py` (at least 2600 px wide).
6. **Code**, read-only and never run, only when the notes leave a detail vague. Its path is in the notes' Meta.

## Context budget
Do not read `site.js` (≈75 KB) or `site.css` whole. The guide documents their APIs; grep them only to confirm a
detail. Write the page in a few large chunks rather than many small edits.

If you approach your context limit, stop and write a handoff to `{{NOTES}}/scratch/page_state_<slug>.md`: what is
done, what is left, and the last check results. Then return, so a fresh agent can continue.

## Files you may write
- `{{OUT}}/<slug>.html`
- new small assets in `{{OUT}}/assets/<slug>/`
- screenshots in `{{NOTES}}/vis/<slug>/`
- scratch files in `{{NOTES}}/scratch/<slug>/`

Never edit `{{OUT}}/assets/site.css`, `site.js`, other pages or the notes. If a shared component lacks something you
need, add page-local CSS/JS inline, prefixed with your slug, and report it.

## Prev / next links (reading order)
{{READING_ORDER}}

Files are `<slug>.html`. The first page's previous link and the last page's next link go to `index.html`, with the text
"All papers". On a single page, delete the topbar and the pager.

## What the page must do
Follow the guide's page anatomy, component APIs, entity and state language and writing rules. Then make the two
figures specific to THIS paper:
- **Feed-forward networks**: modules, tokens, heads and recurrent state, with tensor shapes.
- **Optimization methods**: the stage timeline is the detailed figure. Show the variables optimized, the energy terms
  that light up in each stage, the weights, the iterations and the initialization. Pretrained models that feed it are
  frozen nodes.
- **Pipelines and systems** (for example real-to-sim, or robot learning): one node per stage, with what passes between
  stages. Show the observations, networks, rewards and the simulator where they exist.
- **Dataset and benchmark papers**: capture setup and sensors → processing stages → the ground-truth branch → the
  benchmark and its metrics.

The idea figure shows what the input really looks like, the idea in 3–5 big steps, and the output.

Where code exists, draw the architecture as the code implements it, and mark every paper-vs-code difference with a ≠
badge.

The category chip in the header is one of: {{CATEGORIES}} (the notes' §11 record names it).

The template's `#entities` and `#labels` blocks (near the end of the page) belong to its placeholder content. Rewrite
them for this paper, or delete them when the default names and words are true (guide §1).

If the paper is not about humans, scenes or robots:
- rename the entity slots with the `#entities` block;
- if its input is not a video, set `unit` in the `#labels` block, so the page does not speak of frames;
- delete the commented-out world widget, and draw the output panel in SVG.

If the notes say no code was released or the code was not read, set `data-no-code` on every diagram (guide §3.3).

## Content rules
- **Numbers.** Every number, dimension and table cell exactly as in the notes. Nothing invented.
  - "Not stated" stays visible (a muted tag is fine).
  - Values the notes mark as estimated or read off a plot stay marked.
- **Experiments.** Training data first. Then every main comparison table and ablation from the notes, with best and
  second as marked in the paper, and unfair rows flagged with the reason. Then ablation bars, then the paper figures
  with credit.
- **Analysis.**
  - "What carries the method" vs "minor additions", grounded in ablation rows.
  - The limitations the authors state.
  - What the paper does not show, each point with an evidence chip.
  - Open questions.
  - Be direct and fair. Label speculation. Keep the notes' findings without softening or exaggerating them.
- **Writing.** Short sentences, plain words, headings that are claims. Define every term on first use (glossary
  tooltip).
- **Internal words.** "digest", "notes file", "brief" and "agent" never appear on the page, tooltips and alt text
  included. Write "our reading" or "our analysis" instead.
- **Theme.** White theme only: no dark mode, no theme toggle.

## Check before you return
The user's rule is to always check how the page looks visually. Do all of the following, fix what you find, and
repeat until it is clean:
1. Render the page:
   `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/vis/<slug>`
   The script renders desktop and phone slices (plus one phone render per section when the page is taller than
   16000 px), checks that every referenced file exists, and runs the console check. It must exit 0, ending with
   `console: clean`. The one allowed exception: `missing: <slug>.html` for a neighbouring page that is not built
   yet (exit 1 with only such lines). If it says the desktop page is taller than 16000 px, screenshot the sections
   past the cut with `shot_state.sh --section <id>`.
2. Open EVERY PNG with the Read tool and look for:
   - clipping, overlapping labels or arrows, text on lines, overflowing boxes;
   - text too small to read, empty figures;
   - horizontal overflow at phone width, bad spacing.
3. Zoom into both diagrams with Pillow crops at 2×, using `{{PYTHON}}` (guide §8).
4. Screenshot the hidden states and look at them: a selected node with shapes on, a step, a stage, every tab.
   `bash {{SKILL}}/scripts/shot_state.sh {{OUT}}/<slug>.html {{NOTES}}/scratch/<slug>/node.png --query 'node=<id>&shapes=1'`
5. Re-read every table on the page against the notes, cell by cell.

## Return (at most 30 lines)
- the page path;
- what the two figures show;
- any page-local CSS/JS you added;
- the PNGs you looked at, and what you fixed after looking;
- any remaining issues.
