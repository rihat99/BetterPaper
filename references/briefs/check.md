<!-- Brief template: adversarial fact check of finished pages (phase 5). Placeholders: {{SKILL}} {{OUT}} {{NOTES}}
{{CODE_DIR}} {{READER}} {{READING_ORDER}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/check.md. Check: <slug> (PDF: <path>)[, <slug> (PDF: <path>)]."
After a polish pass add: "Old checked copy: <notes>/before/<slug>.html; change log: <notes>/changes_<slug>.md."
For the index, add: "Also check index.html against all notes; findings go under === check_index.md ===." -->

# Brief: independent fact check of finished pages

You check one or two finished HTML explainer pages for factual errors, as an adversary: assume the page is wrong
somewhere and find where. **You do not edit anything.** Another agent will apply your findings, so every finding must
be precise enough to fix without re-reading the paper.

## Context
- **Reader.** {{READER}}. A wrong number, an overstated claim or a lost caveat is the worst possible defect.
- **Pages.** `{{OUT}}/<slug>.html`. Each page is self-contained: tables, tab panels, diagram JSON (`nodes`, `edges`,
  `groups`, `steps`, `stages`, details with equations and shapes) and chart data are all inline.
- **Content source.** The notes the page was built from: `{{NOTES}}/digest_<slug>.md`. They end with "## 12.
  Verification log" by an independent checker; where §12 corrects an earlier section, §12 wins.
- **PDFs.** Paths are in your spawn prompt. Read pages with the Read tool (`pages`) or with `{{PYTHON}}` + pymupdf.
- **Code.** The path is in the notes' Meta. It is read-only: never run, build or import it.
- **The page standard** is §6 of `{{SKILL}}/references/design_guide.md`; read it only where a finding needs it.

Save context: read the HTML in parts with `grep -n` and `sed -n` (it is 100–200 KB); never read `site.js` or
`site.css`; keep command output short.

## What to check, per page
1. **Every table cell**: main tables, ablations, stage tables under diagrams, tab panels, headline tiles, bar-chart
   data. Check value, unit, row and column, best and second marks, and caveat flags against the notes (after §12).
   When a cell differs from the notes, check the PDF table itself and say which one is right. Do the same for the
   page's 3–5 headline numbers.
2. **Every number and factual claim in the text**: dimensions, tensor shapes, layer counts, loss weights, iteration
   counts, dataset sizes, runtimes, hardware, affiliations and training data. Anything the notes do not support is a
   finding; so is anything the notes mark "not stated", "estimated", "read off a plot" or "in code" that the page
   shows as a plain paper fact.
3. **Hedges and scope.** Every sentence that qualifies a claim in the notes ("presumably", "in the authors'
   pipeline", "can", "on benchmark X", which paper version) keeps the qualifier on the page. Summaries, ledes, h2s,
   captions and KPI tiles do not claim more than the table or text they summarise: no generalising from some metrics
   to all, no ranking from a near-tie, no gain credited to one part when the ablation changed two.
4. **Figures.** In the diagram JSON and the storyboard SVG: node states (frozen / finetuned / trained / optimized /
   unstated) against the detail text and the notes; edges (what feeds what); in / out / why lines; shapes; labels;
   ≠ badges (each a real recorded difference) and NEW tags (each new in this paper); stage highlighting (a block still
   in use must not grey out); figure titles and captions (no count or claim the figure does not show).
5. **Critical analysis.** Each "main", "minor" and "not shown" item is supported by the notes or by the ablation rows
   it cites; main only where an ablation measured it. Flag overstatements and softened findings, inference stated
   as fact, wrong evidence chips, unlabelled speculation.
6. **Self-consistency.** Every number that appears twice on the page agrees; counts agree between titles, steps and
   text; one name per concept.
7. **Links and assets.** Prev and next follow the reading order: {{READING_ORDER}}. Every `assets/...` file exists.
   External links (arXiv, project page, code) match the notes.
8. **Internal words.** "digest", "notes file", "brief" and "agent" must not appear anywhere a reader can see them,
   including tooltips, alt text and data shown as text. Report each occurrence as MINOR.
9. **After a polish pass** (your spawn prompt names an old copy and a change log): check every "Facts touched" item —
   is the new wording as true as the old? — then diff the two versions
   (`diff <(sed 's/></>\n</g' old) <(sed 's/></>\n</g' new)`) and report any changed number, name or claim the list
   missed. A cut matters only if the page still makes a claim whose support was cut, or if it removed a caveat the
   reader needs.
10. **Console and files.** Run
    `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/scratch/check_<slug>`.
    It writes screenshots there, which is allowed. It must exit 0, ending with `console: clean`, with no `missing:`
    line and no `[standard]` line.
11. **For the index**, also check every card, table cell and shared-benchmark cell against the notes (and the
    benchmark cells against the PDF tables they cite), every `builds_on` and `compares_against` edge against the
    notes' §8 tables, and every pattern against the analyses it cites.

## Output
Put the findings for each page in your final message, under a header `=== check_<slug>.md ===`. The orchestrator
saves them. Most severe first:
```
## <n>. [WRONG|HEDGE-LOST|UNSUPPORTED|INCONSISTENT|MISSING|FIGURE|LINK|CONSOLE|MINOR] short title  [major|minor]
- Where: line <L> of <slug>.html, quoting the exact current text (at most 1 line)
- Should be: the exact replacement text or value
- Evidence: notes §x / PDF p.y Tab.z (quote the source cell) / old page line <L>
```
Types: WRONG (false), HEDGE-LOST (a qualifier or scope dropped), UNSUPPORTED (no source, overstated, or inference as
fact), INCONSISTENT (the page contradicts itself), MISSING (a fact, tag or caveat the reader needs is gone), FIGURE
(a figure regression: state, edge, tag, badge, stage lighting or title that no longer matches the text or the
notes), LINK, CONSOLE, MINOR. Major = a reader would take away a wrong fact.

End each page's findings with this line:
`Checked: <what you covered>; not covered: <what you skipped>`
If a page is clean, say so.

Before the findings, give at most 15 lines: for each page, the number of findings by type and the 3 most serious.

You may not delete or edit any file, and you may not download anything. The only files you create are the check
script's screenshots in your scratch folder.
