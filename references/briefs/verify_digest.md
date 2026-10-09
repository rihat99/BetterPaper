<!-- Brief template: notes check (phase 2). Placeholders: {{SKILL}} {{NOTES}} {{CODE_DIR}} {{READER}} {{PYTHON}}
Spawn prompt: "Read <notes>/briefs/verify_digest.md. Check these notes: <slug> (PDF: <path>)[, <slug> (PDF: <path>)]." -->

# Brief: independent check of paper notes

## Context
Other agents wrote notes ("digests") on papers. Page agents build interactive explainer pages **only from these notes**,
so any wrong number, shape or claim in the notes ends up on a page read by {{READER}}. One wrong table cell destroys
the reader's trust. The notes format is defined in `{{NOTES}}/briefs/digest.md`.

You did not write these notes. Assume they contain mistakes, and find them.

## What to check, per set of notes
1. **§8 tables.** Check every cell against the rendered PDF page: use the Read tool with `pages`, because pdftotext
   garbles tables.
   - Check numbers, units, row and column labels, best and second marks, table numbers and page refs.
   - If a main table or ablation the page should show is missing, add it.
2. **§9 critical analysis.** Every claim must be supported by the table, page or code line it cites.
   - Re-derive every piece of arithmetic (deltas, percentages, ratios).
   - Check each "the paper does not report X" claim by searching the PDF text, including the supplementary.
   - Check each code citation by opening the file at that line (read-only; never run it).
   - Overstated, unfair or unsupported points: correct them, soften them, or mark them as speculation.
   - Flag anything important the notes missed.
3. **§0, §2–§4 facts.** Spot-check against the PDF and the code: affiliations, inputs and outputs, backbones,
   frozen/trained status, key dimensions, loss weights, training data sizes.
4. **§11 JSON.** It must be valid JSON with every key, and its values must match the body.

Out of scope: style, reorganizing, and new material that is neither a correction nor a missing table.

## How to fix
Edit the notes **in place**, with small, surgical edits. Then append:
```
## 12. Verification log
- <what was wrong> → <what it is now> [evidence: Tab.X p.Y / code path:line]
- Checked and confirmed: <brief list of what you verified with no change>
```
If something cannot be decided from the PDF or the code, leave the text, add "(unverified)", and log it.

## Paths and rules
- Notes: `{{NOTES}}/digest_<slug>.md`. PDFs: paths in your spawn prompt. Code: `{{CODE_DIR}}/<repo>/` (read-only).
- Read PDF pages with the Read tool or with `{{PYTHON}}` + pymupdf.
- Write only the notes you were assigned, plus scratch files in `{{NOTES}}/scratch/verify_<slug>/`.
- Download nothing. Never run cloned code. Never delete files.

## Return (at most 25 lines)
For each set of notes:
- the number of corrections;
- the 3 most serious errors you fixed;
- any critical-analysis point you weakened or removed, and why;
- anything left unverified.
