<!-- Brief template: fact check of finished pages (phase 5). Placeholders: {{SKILL}} {{OUT}} {{NOTES}} {{CODE_DIR}}
{{READER}} {{READING_ORDER}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/check.md. Check: <slug> (PDF: <path>)[, <slug> (PDF: <path>)]."
For the index, add: "Also check index.html against all notes; findings go under === check_index.md ===." -->

# Brief: independent fact check of finished pages

You check one or two finished HTML explainer pages for factual errors. **You do not edit anything.** Another agent will
apply your findings, so every finding must be precise enough to fix without re-reading the paper.

## Context
- **Reader.** {{READER}}. A wrong number or an overstated claim is the worst possible defect.
- **Pages.** `{{OUT}}/<slug>.html`. Each page is self-contained: tables, tab panels, diagram JSON (`nodes`, `edges`,
  `steps`, `stages`, details with equations and shapes) and chart data are all inline.
- **Content source.** The notes the page was built from: `{{NOTES}}/digest_<slug>.md`. They end with "## 12.
  Verification log" by an independent checker; where §12 corrects an earlier section, §12 wins.
- **PDFs.** Paths are in your spawn prompt. Read pages with the Read tool (`pages`) or with `{{PYTHON}}` + pymupdf.
- **Code.** The path is in the notes' Meta. It is read-only: never run, build or import it.

## What to check, per page
1. **Every table cell.** This covers:
   - main tables, ablations, stage tables under diagrams and tab panels;
   - the headline tiles;
   - bar-chart data.

   For each cell, check the value, unit, row and column placement, best and second marks, and caveat flags.
   - Compare with the notes, after their §12 corrections.
   - When a cell differs from the notes, check the PDF table itself and say which one is right. Do the same for the
     page's 3–5 headline numbers.
2. **Every number and factual claim in the text and the diagrams.** This covers dimensions, tensor shapes, layer counts,
   loss weights, iteration counts, dataset sizes, runtimes, hardware, affiliations and training data.
   - Anything the notes do not support is a finding: an invented detail.
   - Anything the notes mark "not stated", "estimated" or "read off a plot" that the page shows as a plain fact is a
     finding.
3. **Critical analysis.** Each "main thing", "minor addition" and "hidden issue" must be supported by the notes or by
   the ablation rows it cites. Flag:
   - overstatements, and findings that were softened;
   - inference stated as fact;
   - wrong evidence chips (wrong table or page);
   - speculation not labelled as speculation.
4. **Paper vs code marks.** Each ≠ badge must match a real difference recorded in the notes.
5. **Links and assets.**
   - Prev and next follow the reading order: {{READING_ORDER}}.
   - Every `assets/...` file the page references exists.
   - External links (arXiv, project page, code) match the notes.
6. **Internal words.** "digest", "notes file", "brief" and "agent" must not appear anywhere a reader can see them,
   including tooltips, alt text and data shown as text. Report each occurrence as MINOR.
7. **Console and files.** Run
   `PYTHON={{PYTHON}} bash {{SKILL}}/scripts/check_page.sh {{OUT}}/<slug>.html {{NOTES}}/scratch/check_<slug>`.
   It writes screenshots there, which is allowed. It must exit 0, ending with `console: clean`, and print no
   `missing:` line.
8. **For the index**, also check:
   - every card, table cell and shared-benchmark cell against the notes, and the benchmark cells against the PDF
     tables they cite;
   - every `builds_on` and `compares_against` edge against the notes' §8 tables;
   - every pattern against the analyses it cites.

Read the HTML in parts with `grep -n` and `sed -n`; it is 100–200 KB. Do not read `site.js` or `site.css`.

## Output
Put the findings for each page in your final message, under a header `=== check_<slug>.md ===`. The orchestrator
saves them. Most severe first:
```
## <n>. [WRONG|UNSUPPORTED|OVERSTATED|LINK|CONSOLE|MINOR] short title
- Where: line <L> of <slug>.html, quoting the exact current text (at most 1 line)
- Should be: the exact replacement text or value
- Evidence: notes §x / PDF p.y Tab.z (quote the source cell)
```
End each page's findings with this line:
`Checked: <what you covered>; not covered: <what you skipped>`
If a page is clean, say so.

Before the findings, give at most 15 lines: for each page, the number of findings by type and the 3 most serious.

You may not delete or edit any file, and you may not download anything. The only files you create are the check
script's screenshots in your scratch folder.
