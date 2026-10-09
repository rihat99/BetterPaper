# BetterPaper

A [Claude Code](https://claude.com/claude-code) skill, `better-paper`. It turns research papers (PDFs) into
interactive HTML explainer pages, one page per paper, plus an index page for a collection.

Each page has five sections:
1. **The idea.** An animated storyboard: what goes in, the idea in 3–5 steps, what comes out.
2. **The architecture.** An interactive SVG diagram.
   - Every module is shown with its state (frozen, fine-tuned, trained, optimized per input) and its tensor shapes.
   - Click a module for its inputs, outputs, equation and code path.
   - A step-through player follows one input through the model.
   - ≠ badges mark where the released code differs from the paper.
   - Optimization methods get a stage timeline instead.
3. **Beyond the figures.** Losses, the training recipe, inference, and test-time tricks.
4. **Experiments.**
   - The training data.
   - The main tables, with numbers exactly as printed, sortable, with flags on unfair rows.
   - Ablation bars.
   - Figures cropped from the PDF at high resolution.
5. **Critical analysis.** What really carries the method versus the minor additions, the stated limits, what the
   paper does not show (each point with evidence), and open questions.

The index page has a family map (papers by year and category, what they build on and compare against), cards, a
sortable comparison table, a shared-benchmarks table, and the patterns across the papers.

The pages are plain HTML and vanilla JS with a white theme and no build step. They open from disk and work at phone
width.

## How it works
The main Claude session runs the intake and then orchestrates subagents. Every number is checked twice, and every
page is looked at before it is reported.
1. **Notes.** One agent per paper reads the PDF and, optionally, the official code (read-only, never run). It writes
   structured notes and crops the figures.
2. **Notes check.** A second agent checks the notes against the PDF.
3. **Page.** One agent per paper builds the page from the notes, the templates and the design guide. It renders the
   page and looks at the screenshots.
4. **Index.** For a collection, one agent builds the index from the notes.
5. **Fact check and fixes.** A read-only checker compares every page with the paper. A fresh agent confirms each
   finding and applies it.
6. **Final look.** The main session renders every page and looks at it before reporting.

## Layout
```
SKILL.md                      the workflow (what Claude reads when the skill triggers)
references/design_guide.md    component APIs, layout rules, pitfalls, check procedure
references/briefs/            brief templates for the subagents (notes, notes check, page, index, fact check, fix)
templates/page.html           one complete page skeleton; every component, placeholder content
templates/index.html          index skeleton; one JSON block drives the map, the cards and the table
templates/assets/             site.css, site.js (the shared design system), placeholder_figure.svg
scripts/extract_figure.py     crop a figure from a PDF at ≥ 2600 px (or extract the native image)
scripts/check_page.sh         desktop + phone screenshots, then a console check (headless Chrome)
scripts/shot_state.sh         screenshot a hidden state: selected node, step, stage, tab, or any JS
```

## Install
Put this folder at `~/.claude/skills/better-paper`, for example:
```bash
git clone https://github.com/rihat99/BetterPaper.git ~/.claude/skills/better-paper
```
Then ask Claude Code for "explainer pages for the papers in ./papers".

Requirements:
- **Chrome or Chromium**, for the screenshots and the console check (`CHROME=/path` overrides the search).
- **Python 3 with `pymupdf` and `Pillow`**, for figure crops and screenshot slicing. The check script uses
  `$PYTHON` when set, then `~/.claude/venv/bin/python`, then `python3`.
- **Optional:** `pdftotext` (poppler) for fast text extraction.

The pages load KaTeX from cdnjs and fonts from Google Fonts. Both have fallbacks, so the pages still work offline.

The workflow uses subagents. If the setup has pinned agents named `worker` and `adversary`, it uses those;
otherwise it uses the general-purpose agent.
