# Design guide for paper pages

For the agents that build, check and fix the pages.
1. Read this file fully. **§6 is the page standard**: numbered rules every page must meet, so that all pages share
   one style and one format. §2–§5 show how to build it; §8 how to check it.
2. Read `templates/page.html` in this skill once. It shows every component below, wired together, and follows the
   standard; its comments cite the sections of this guide.

Do not read `site.js` / `site.css` whole. Every option below was checked against them; grep them only to confirm a
detail. Page agents may not edit them. If something is missing, add page-local CSS/JS inline, prefixed with your slug,
and report it.

Paths (your brief gives the absolute ones):
- pages: `<out>/<slug>.html`
- shared files: `<out>/assets/site.css` and `<out>/assets/site.js`
- figures: `<out>/assets/<slug>/`
- screenshots: `<notes>/vis/<slug>/`
- scratch files: `<notes>/scratch/<slug>/`
- this skill's folder, `<skill>`, which holds `templates/` and `scripts/`

"The notes" means the paper's notes file, `<notes>/digest_<slug>.md`, which is the page's only content source.

**Light theme only.** White page. No dark mode, no `prefers-color-scheme` blocks, no theme toggle, no localStorage.

## 1. Visual language (identical meaning on every page)

Tokens live on `:root` in site.css. Use the variables, never raw hex.

| token | use |
|---|---|
| `--bg` `--surface` (white), `--surface-2` (light grey panel), `--border`, `--border-strong` | backgrounds, rules |
| `--text`, `--muted`, `--faint` | text levels |
| `--accent` / `--accent-tint` (indigo) | the one UI accent: links, active state, **new in this paper** |
| `--warn` / `--warn-tint` (amber) | caveats: ≠ badges, table flags, speculation, "paper ≠ code" |
| `--loss` (grey) | loss / energy terms and supervision edges |
| `--frozen-fill` | grey fill of frozen modules |
| `--read` (760 px), `--wide` (1150 px) | the reading column and the wide column (§2) |
| `--font-display` (Bricolage Grotesque), `--font-body` (IBM Plex Sans), `--font-mono` (IBM Plex Mono) | headings / text / shapes, code, labels |

**Entity colors.** There are six colour slots, one per kind of data a paper moves around. The class `e-<slot>` sets
`--e` and `--e-tint`, and works on chips, SVG groups, bars and stack bars. The slot names come from the first
collection, 4D humans in scenes; papers in that domain use them as they are:

| class | color | default meaning (legend label) |
|---|---|---|
| `e-human` | burnt orange | bodies, poses, human tokens, human losses (human) |
| `e-scene` | green | scene geometry, point maps, depth, scene tokens/state (scene) |
| `e-camera` | blue | camera poses, intrinsics, trajectories (camera) |
| `e-contact` | magenta | contacts, interaction, penetration (contact) |
| `e-robot` | ochre | robot, retargeting, policy, simulator (robot) |
| `e-neutral` | slate | images, generic ops, everything else (other) |

**Any other domain.** Map the paper's 2–5 main kinds of data to the slots, and keep `e-neutral` for everything else.
Then rename the slots with one page-level block:
```html
<script type="application/json" id="entities">{"human": "text tokens", "scene": "image latents"}</script>
```
- **Keys and values.** Keys are slot names (`human`, `scene`, `camera`, `contact`, `robot`, `neutral`); values are this
  page's labels. A missing key keeps its default label. An unknown key logs a console warning.
- **Where the names apply.** In every diagram legend on the page and in the entity chip of a node's detail panel. On a
  page with two diagrams, choose names that fit both.
- **Prose chips.** Use the same names: `<span class="chip e-human">text tokens</span>`.
- **Collections.** Keep one mapping across a collection whose papers share data types.
- **Choosing slots.** Choose by meaning, not by colour:
  1. the main input or token stream → `human`;
  2. the second main stream → `scene`;
  3. conditioning, poses or geometry of the sensor → `camera`;
  4. interactions → `contact`;
  5. a downstream agent or policy → `robot`.

**Module states** (architecture nodes; `state` in the JSON; same words in chips `chip s-...`):

| state | look | means |
|---|---|---|
| `frozen` | grey fill, thin stroke, lock glyph | pretrained, not updated |
| `finetuned` | entity tint, medium stroke, half-disc glyph | pretrained then updated |
| `trained` | entity tint, thick stroke, dot glyph | trained from scratch in this paper |
| `optimized` | dashed stroke, cycle glyph | variables optimized per input (test-time) |
| `unstated` | white fill, dotted entity stroke, no glyph | the paper does not say whether this module is trained, or from which weights it starts (legend: "training or initialization not stated") |
| `op` (default) | white fill, grey stroke | no learned parameters (concat, projection, NMS, sum) |
| `data` | white pill, entity stroke | inputs and outputs |
| `loss` | white, grey dashed | loss or energy term |
| `"new": true` | indigo ring + `NEW` tag | introduced by this paper (combine with any state; also on a group, §3.3) |
| `"mismatch": "..."` | amber `≠` badge | paper and released code differ (text says how) |

**Flows** (edges; `flow` in the JSON): `feat` (default, thin line in entity color: tokens/features), `geom`
(thick: points, poses, meshes, cameras), `loss` (grey dashed: supervision / gradient into a loss), `rec` (dotted:
recurrent state carried to the next frame or iteration, and the update loop of an optimization). Edge color defaults
to the source node's entity.

The legend under each diagram is generated automatically and lists only what that diagram uses. An unknown `e`,
`state` or `flow` value logs a console warning; a slip such as using a legend label as the key would otherwise draw
a black node.

**Page labels.** site.js speaks of frames by default: "Showing all 6 frames" in the storyboard, "follow one frame
through the model" under a diagram, and "recurrent: carried to the next frame" in the legend. A page changes this
with one page-level block:
```html
<script type="application/json" id="labels">{"unit": "token", "units": "tokens", "optimized": "optimized per prompt"}</script>
```

| Key | Default | Used in |
|---|---|---|
| `unit` / `units` | `frame` / `frames` | the storyboard status, the diagram's step narration and its play status ("Frame 2/6"); `units` defaults to `unit` + "s" |
| `optimized` | `optimized per input` | the legend label of state `optimized`; a page whose input is a video sets `"optimized per video"` |
| `rec` | `recurrent: carried to the next <unit>` | the legend label of flow `rec` |
| `geom` | `geometry: points, poses, meshes` | the legend label of flow `geom` |

An unknown key and invalid JSON log a console message. One diagram whose steps follow another unit than the page
(a training diagram over image pairs) sets `"unit"` in its own JSON instead (§3.3). `templates/page.html` has an
active block and a commented-out example for a token model.

## 2. Page skeleton and layout

Copy `templates/page.html` to `<out>/<slug>.html` and replace its content. Sections, ids and order are fixed (§6 A).
The bare structure:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MethodName</title>
<meta name="description" content="MethodName (Venue Year): one sentence. Architecture, experiments and critical analysis.">
<link rel="stylesheet" href="assets/site.css">
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js" crossorigin="anonymous"></script>
<script defer src="assets/site.js"></script>
</head>
<body>
<!-- keep the one-line <svg class="sprite" ...> from templates/page.html (glyphs: lock, dot, half, cycle, play...) -->
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><a href="index.html">← All papers</a></div>
<div class="layout">
<header class="ph">
  <div class="ph-kicker"><span class="chip cat">optimization</span><span>CVPR 2025</span><span aria-hidden="true">·</span><span>arXiv 2501.01234</span></div>
  <h1>MethodName</h1>
  <p class="ph-title">Full paper title</p>
  <p class="ph-authors">Authors · Affiliations</p>
  <p class="ph-links"><a href="...">arXiv</a> <a href="...">Project page</a> <a href="...">Code</a>
    <span class="muted">code read at commit <code>abc1234</code></span></p>
  <p class="claim">The one claim, one or two sentences.</p>   <!-- CSS prints "THE ONE CLAIM" above it -->
  <dl class="glance">
    <div><dt>Input</dt><dd>...</dd></div><div><dt>Output</dt><dd>...</dd></div>
    <div><dt>Backbone</dt><dd>...</dd></div><div><dt>Runtime</dt><dd>... (or <span class="tag">not stated</span>)</dd></div>
  </dl>
</header>
<nav class="toc" aria-label="Contents"><details open><summary>Contents</summary><ol>
  <li><a href="#idea"><span class="toc-num">1</span>The idea</a></li>
  <li><a href="#architecture"><span class="toc-num">2</span>Architecture</a></li>
  <li><a href="#method"><span class="toc-num">3</span>Beyond the figures</a></li>
  <li><a href="#experiments"><span class="toc-num">4</span>Experiments</a></li>
  <li><a href="#analysis"><span class="toc-num">5</span>Critical analysis</a></li>
</ol></details></nav>
<main id="main">
<section id="idea"><h2>Claim heading</h2> <p class="lede">…</p>, Figure 1 (§3.2) ...</section>
<section id="architecture"><h2>Claim heading</h2> <p class="lede">…</p>, Figure 2 (§3.3 / §3.4), paper-vs-code callout ...</section>
<section id="method"><h2>Claim heading</h2> losses, recipe, inference ...</section>
<section id="experiments"><h2>Claim heading</h2> training data, KPIs, tables in tabs, ablation bars, paper figures</section>
<section id="analysis"><h2>Claim heading</h2> <p class="lede">…</p>, carries vs minor, limitations, not shown, open questions</section>
</main>
</div>
<footer class="pager">
  <a href="PREV.html" data-prev><small>← Previous paper</small>PrevName</a>
  <a href="index.html"><small>All papers</small>Index and comparison</a>
  <a href="NEXT.html" data-next style="text-align:right"><small>Next paper →</small>NextName</a>
</footer>
<script type="application/json" id="glossary">{ "Term": "Definition. Lower is better." }</script>
<script type="application/json" id="entities">{ "human": "...", "scene": "..." }</script>   <!-- optional, §1 -->
</body>
</html>
```

- **Category chip.** Its text is one of the collection's categories, given in your brief (default: `optimization`,
  `feed-forward`, `hybrid`, `application`, `dataset`).
- **Prev / next.** Follow the reading order in your brief.
  - The first page's previous link and the last page's next link go to `index.html`, with the text "All papers".
  - `href="#"` renders a greyed placeholder; do not leave one.
  - **A single paper with no index:** delete the `.topbar` and the `footer.pager`.

### Layout: one centered axis
Two columns share one centre line: the reading column (`--read`, 760 px) and the wide column (`--wide`, 1150 px).
- **Reading column**, the default: the header `.ph`, the collapsed TOC, every `main > section`, every tab panel and
  the tab strip (also on `.tabs.wide`). Body text, small figures, narrow tables, bar charts and stacked bars live here.
- **Wide column**: a `.wide` block that is a **direct child** of a section or a tab panel breaks out to it; the facts
  strip `.ph > .glance` does so on its own. A `.wide` nested deeper does nothing.
  Wide blocks: Figure 1, Figure 2 (at every width), tables wider than the reading column, `.kpis`, `.paper-figs` with
  several panels, and `.two-col`, `.three-col`, `.verdict` when they hold charts or justified text.
- **Never an inline `max-width`** on a block: a `.wide` with one hugs the left edge. Inside a wide block, `.read`
  puts one child back on the reading column (`.paper-figs.wide > figure.read` for a tall figure).
- **Captions** (`figcaption`, `.caption`) keep the reading width and centre, so under a wide figure they line up with
  the text.
- **Tables.** site.js measures every `.tbl-wrap` that is a direct child of a section or tab panel and adds `.wide`
  when the table's narrowest width exceeds the reading column. A `.tbl-wrap.wide` in the page stays wide. Mark a text
  table (`table.data.wrap`) with 3+ columns `wide` by hand: it would fit, but read badly. Tables inside
  `details.more` or callouts are not widened; they scroll inside their box.
- **Multi-column blocks.** `.three-col` drops to two columns below 1104 px; every multi-column block is one column
  below 761 px. `.verdict` columns are equal. `.kpis` is a grid of equal columns that spans its column.
- **TOC.** Below 1600 px a collapsible "Contents" box in the reading column; from 1600 px a sticky sidebar in the left
  margin (site.js opens it there). Its scroll-spy needs the five section ids.
- **Diagram detail panel.** Below the diagram at every width; two columns (title and chips, then the rows) from 761 px.
- **Phone** (≤ 560 px): 16 px gutters, both columns are the viewport minus 32 px, no horizontal page scroll; diagrams
  scroll sideways inside their box.

### Justified prose
Running prose is justified and hyphenated (`lang="en"` on `<html>`). Left-aligned, without hyphens: headings, tables,
code, buttons, chips (`.chip .tag .ev .ne .spec .math`), the TOC, the header lines and facts strip, figure heads and
legends, storyboard steps and notes, the diagram bar, narration, detail panel, timeline and stage matrix, tab strips,
KPIs, dataset names and tags, bar charts and stacked-bar keys.
- Put `.no-justify` on any other narrow box (cards, small panels, stage cards): justify opens wide gaps there.
- Evidence chips are inline and may wrap inside prose, so no lone full stop drops to the next line.
- site.js adds break points to `code` and `.ev.code` tokens of 14 or more characters (after `/ : = ,`, before `. _`)
  outside tables, `pre`, diagrams and `.no-justify`, so a long code path does not stretch the line before it.

## 3. Components (copy-paste)

### 3.1 Small inline pieces
```html
<span class="chip cat">feed-forward</span>               <!-- category, mono caps -->
<span class="chip e-human">humans</span>                  <!-- entity chip with color dot -->
<span class="chip s-frozen">frozen</span> <span class="chip s-optimized">optimized</span> <span class="chip s-loss">E_2D</span> <span class="chip s-new">new</span>
<span class="ev">Tab.3</span> <span class="ev">p.7</span> <span class="ev">Fig.2</span>   <!-- evidence chip -->
<span class="ev code">src/model.py:120-145</span>        <!-- code evidence chip -->
<span class="spec">speculation</span>                   <!-- after any sentence that is your inference -->
<span class="ne">≠</span>                                 <!-- inline paper/code mismatch mark -->
<span class="tag">not stated</span>  <span class="tag synthetic">synthetic</span>  <span class="tag inherited">pretrained</span>
<span class="weight">main</span>  <span class="weight low">minor</span>  <span class="weight low">untested</span>   <!-- verdict tags -->
<span class="muted">...</span>
```

### 3.2 Idea figure: storyboard + world widget
```html
<figure class="story panel wide" data-story data-frames="3" data-step-ms="640" aria-label="MethodName in five steps">
  <div class="fig-head">
    <p class="fig-title">Figure 1 · what it shows, at most 8 words</p>
    <div class="controls story-controls"></div>          <!-- site.js puts Play, Replay, status and Show all here -->
  </div>
  <div class="story-grid">                               <!-- 4 columns >= 1100 px, 2 below, 1 on phones -->
    <div class="story-step" data-step="1">
      <h3><span class="story-num">1</span>The input, as it really looks</h3>
      <svg class="fig-svg" viewBox="0 0 260 160" role="img" aria-labelledby="s1-t">
        <title id="s1-t">What the panel shows, one sentence.</title>
        <rect class="frame" x="6" y="6" width="176" height="104" rx="5"/>
        <g class="e-human"><rect class="ink" x="40" y="50" width="30" height="30" rx="3"/></g>
        <rect class="frame" data-frame="1" x="6" y="124" width="30" height="20" rx="2"/>   <!-- frame strip -->
        <text class="t-mono" x="194" y="72">input</text>
      </svg>
      <p>One or two plain sentences.</p>
    </div>
    <!-- steps 2..4 the same way -->
  </div>
  <div class="story-out">                                <!-- output step + notes column (stacks below 980 px) -->
    <div class="story-step" data-step="5">
      <h3><span class="story-num">5</span>The output, in one frame of reference</h3>
      <!-- the world widget below only when it can show this paper's output type (§6 C5); otherwise one more .fig-svg -->
      <div class="world" data-world>
        <script type="application/json">{"people": 3, "camera": "moving", "ground": "plane", "walls": true, "objects": 3, "contacts": false, "frames": 3, "seed": 11}</script>
        <canvas aria-label="Illustration: ... Drag or use arrow keys to rotate."></canvas>
        <div class="world-key"><span class="chip e-human">humans, track IDs</span><span class="chip e-scene">scene points</span><span class="chip e-camera">camera path</span></div>
        <span class="world-tag">illustration, not real data · drag to rotate</span>
      </div>
    </div>
    <div class="story-notes"><div><b>Trained:</b> ...</div><div><b>Online:</b> ...</div><div><b>Not needed:</b> ...</div></div>
  </div>
  <figcaption>What Play does; that the drawings (or the world view) are schematic, not the paper's output.</figcaption>
</figure>
```
- **Controls.** site.js fills `.story-controls` with Play, Replay, a status line and **Show all**, on their own row
  under the title, Show all pinned right (as in the diagram bar), so no button moves while the status changes. Show all
  stops playback and returns to the resting state.
- **Player.** Play walks frames × steps (`data-frames` × the number of `data-step` values), `data-step-ms` per tick
  (min 250); a full run must stay ≤ 10 s (§6 C6). The current step is full opacity, others fade to 40 %. Elements with
  `data-frame="n"` get `.is-current` (accent stroke) on frame n and `.is-on` for frames ≤ n. Add class `grow` to a
  `data-frame` element that should appear frame by frame (scene points, camera frusta): while playing it stays at 12 %
  opacity until its frame has played. A world inside the figure builds up with the frames.
- **Resting state.** At rest everything is shown and the status says "Showing all N frames", or "All steps shown"
  with `data-frames="1"`. The resting state must be complete.
- **Output step without the world widget** (any paper not about humans in scenes, or when the widget cannot show this
  paper's output): draw the output as one more `.fig-svg` panel. CSS caps a panel SVG at 400 px wide, so use
  `viewBox="0 0 400 160"` at most; a wider viewBox shrinks the text below 12 px. `templates/page.html` does this, and
  keeps the world widget as a commented-out snippet.
- 3-5 steps: 4 panels in `.story-grid` + 1 output step in `.story-out` is the tested layout. With 3 panels use
  `.story-grid` alone plus `.story-out`.
- Panel SVG vocabulary (`.fig-svg`, put entity class on a `<g>`): `frame` (grey image box), `ink` (entity stroke),
  `ink-fill`, `tok` / `tok hot` (token squares, hot = filled), `box` (+ `frozen` / `trained` / `optimized`),
  `ring-new`, `faint` (grey hairline), `flowline` (+ `geom` / `loss` / `rec`) with `arrowhead` paths, `glyph`
  (`<use href="#g-lock" class="glyph" x y width="11" height="11"/>`), text classes `t-mono` (12 px, muted),
  `t-muted`, `t-e` (entity color, bold); `pulse` on anything that should pulse while its step plays.
- **World JSON**, for papers about humans, scenes or robots only. It draws a generic illustration, not data. All keys
  are optional; defaults are in brackets: `people` [2]; `camera` "moving" | "multiview" | "static"
  ["moving"]; `views` (multiview cameras) [4]; `ground` "plane" | "terrain" | "stairs" ["plane"]; `walls` [true];
  `objects` (boxes) [3]; `robot` [false] (true: the last person is drawn as a robot, robot color, label "robot");
  `contacts` [true] (foot-contact rings, contact color); `frames` (frusta along the path and ghost poses) [6];
  `ghosts` [true]; `trails` [true]; `ids` [true] (#1, #2 labels); `seed` [7]; `yaw` [-0.5], `pitch` [0.42]
  (initial view angle), `dist` [14.5] (eye distance, perspective strength). Framing is automatic (fits the
  scene, frusta and people with room for the key and tag). Height 380 px desktop, 300 px phone. Drag or arrow
  keys rotate, double-click resets. Always keep the `world-tag`.

### 3.3 Architecture diagram (feed-forward networks and pipelines)
```html
<figure class="panel wide" style="padding-bottom:.8rem">
  <div class="fig-head"><p class="fig-title">Figure 2 · one frame through MethodName</p></div>
  <div class="arch" data-arch>
<script type="application/json">
{
  "title": "MethodName as implemented in the released code",
  "viewBox": [0, 0, 1100, 450],
  "minWidth": 1000,
  "groups": [{"x": 364, "y": 316, "w": 564, "h": 104, "label": "training only", "labelBelow": true}],
  "nodes": [
    {"id": "img", "x": 8, "y": 170, "w": 112, "h": 60, "label": "Input frame", "sub": "RGB, H×W", "shape": "3×H×W",
     "e": "neutral", "state": "data", "detail": {"does": "One RGB frame.", "out": "3×H×W"}},
    {"id": "enc", "x": 178, "y": 170, "w": 140, "h": 60, "label": "Image encoder", "sub": "ViT-L/14", "shape": "F: N×1024",
     "e": "scene", "state": "frozen", "detail": {"does": "...", "in": "<span class=\"math\">I</span>", "out": "...",
     "params": "≈300 M, frozen", "train": "not trained here", "eq": "F = \\mathrm{ViT}(I)", "code": "src/encoder.py:40-88"}},
    {"id": "queries", "x": 376, "y": 40, "w": 144, "h": 60, "label": "Learned queries", "sub": "Q = 100", "e": "human",
     "state": "trained", "new": true, "detail": {"does": "...", "in": "...", "out": "...", "why": "The intuition: why this new block helps."}},
    {"id": "dec", "x": 578, "y": 40, "w": 136, "h": 190, "label": "Transformer\ndecoder", "sub": "8 layers", "e": "human",
     "state": "trained", "mismatch": "Paper: 6 layers. Code: 8.", "detail": {"does": "..."}},
    {"id": "l_match", "x": 772, "y": 336, "w": 144, "h": 56, "label": "Matching loss", "sub": "L_{match}", "e": "human",
     "state": "loss", "detail": {"does": "..."}}
  ],
  "edges": [
    {"from": "img", "to": "enc", "pts": [[120, 200], [178, 200]]},
    {"from": "queries", "to": "dec", "label": "Q_0", "pts": [[520, 70], [578, 70]], "lx": 549, "ly": 62},
    {"from": "dec", "to": "l_match", "flow": "loss", "label": "matched", "pts": [[646, 230], [646, 280], [844, 280], [844, 336]], "lx": 745, "ly": 272}
  ],
  "steps": [
    {"title": "A frame arrives", "text": "Plain sentence; <span class=\"math\">F</span> allowed.", "nodes": ["img", "enc"], "edges": ["img>enc"]},
    {"title": "The queries read the features", "text": "...", "nodes": ["enc", "queries", "dec"]}
  ]
}
</script>
  </div>
  <figcaption>Provenance (code commit or paper version) and what the ≠ badges mark.</figcaption>
</figure>
```
Top level: `title` (aria label), `viewBox` [x, y, w, h] (w ≤ 1100, h ≤ 560: §6 D1–D2), `minWidth` (px below which
the diagram scrolls sideways; use 1000), `unit` (this diagram's step unit when it differs from the page's, e.g.
"pair" on a training diagram; §1), `groups`, `nodes`, `edges`, `steps`, `stages` (§3.4), `stageMatTitle`.
Host attribute `data-no-code` (`<div class="arch" data-arch data-no-code>`): the paper released no model code, so
the help line under the diagram ends "... whether it is trained and the key equation." instead of promising code
paths. Set it on every diagram of a paper without released code, and of a paper whose code was not read in this run.
Do not set it when the detail panels cite inherited code, for example a paper built on another paper's released code.

- **groups**: `{id, x, y, w, h, label, labelBelow, e, new}`: dotted frame, mono caps label 7 units above the top (or 17
  below the bottom with `labelBelow`). Use for "training only", "per-video variables", "stage 1". `"new": true` draws
  the NEW tag in front of the label and counts as one NEW tag (§6 D12). A group's `e` is checked like a node's.
- **Group endpoints.** A group with an `id` can be an edge's `from` or `to`: the update loop into a whole set of
  variables, an output that leaves it (§3.4).
  - Give such an edge `pts` that end on the frame; without `pts` the auto route treats the frame as a node box. Its
    colour is the group's `e`, else neutral; set `e` on the edge to override.
  - Membership is geometric: a node whose box lies fully inside the frame. Selecting a node lights its own edges and
    every edge of each id'd group that holds it, with both ends.
  - Steps and stages light the frame when their `nodes` list the group id (never in `vars` or `terms`); an edge into
    the group lights when both ends are listed, or when the step lists it in `edges`.
  - A group has no detail panel, and clicking the frame does nothing. Errors (console.error): an edge end that names
    no node or group (the edge is dropped), a step or stage that names an unknown node or group, a group id equal to a
    node id.
- **nodes**: `id`, `x`, `y`, `w`, `h` (viewBox units, top-left corner); `label` (bold, ≤ 3 words, `\n` for a second
  line); `sub` (mono line under the label); `shape` (replaces `sub` when the reader ticks "Tensor shapes"); `e`
  (entity, default neutral); `state` (default op); `new`; `mismatch` (string: shown as "Paper ≠ code" in the
  detail panel); `kind: "circle"` (operator circle, 40-50 wide, 1-2 character label; its `sub` sits outside:
  `subPos` "below" (default) | "above" | "left" | "right", pick the side no edge uses).
- **detail** (panel shown on click): `title` (default: label; light markup `E_{depth}` and literal
  `<sub>`/`<sup>` tags render as sub/superscript, any other HTML is shown escaped), `does`, `in`, `out`, `why` (the
  intuition, for the paper's key new blocks: §6 D20), `params`, `train`, `eq` (LaTeX, rendered as display math),
  `code` (path, shown as code), `paper` (paper-vs-code text; defaults to the node's `mismatch`), `rows` (any other row,
  `[["Label", "html"], ...]`, shown last). All values except `eq` and `code` are raw HTML: light markup is NOT applied
  there, so write `d<sub>b</sub>` or `<span class=\"math\">d_b</span>`, never bare `d_b`.
- **Selection text.** Clicking a node says "Selected Image encoder with its 3 connections". A circle is named by its
  detail `title` as written, else its `sub`: "Selected Σ (total E) with its 6 connections"; give a circle a title
  that reads well mid-sentence, or none. A click that leaves the detail panel below the window scrolls it into view.
- **edges**: `from`, `to` (a node id or an id'd group); `pts` (polyline in viewBox units, first point on the source
  border, last on the target border; the arrowhead is drawn at the last point); without `pts` an elbow route between
  side midpoints is made; `label`; `shape` (replaces the label when shapes are on); `lx`, `ly`, `anchor` ("start" |
  "middle" | "end") place the label (default: middle of the longest segment, 6 above a horizontal or 6 right of a
  vertical); `e`; `flow`; `mismatch` (string tooltip, ≠ badge at the path midpoint or at `bx`, `by`);
  `reverseParticles`; `id` (default `"from>to"`; set it when two edges share from and to).
- **steps**: `{title, text, nodes, edges}`. A step highlights its nodes and edges, fades the rest, runs particles
  along the edges and prints `Step i/N · title. text` above the diagram. Without `edges`, every edge between two
  listed nodes lights up. 5-8 steps that follow one frame (or this diagram's `unit`) through the model (§6 D19). Dwell
  time grows with the text. All steps are also listed under "All N steps as text" (complete without playing).
- **Light markup in labels, subs, shapes, edge labels, stage chips and the matrix**: `x_t`, `x^2` (one character,
  not followed by a letter), `F_{enc}`, `S_{t-1}`, `F^u_{enc}` (braces for anything longer). `pred_head`
  stays literal because a letter follows `_h`.
- Public API (for scratch screenshots): `PaperPage.archs[k].showStep(i)` (0-based), `.select(nodeId)`, `.clear()`;
  `k` counts the diagrams on the page in document order. `scripts/shot_state.sh` wraps it (§8).

### 3.4 Stage timeline (optimization methods)
Same component with `stages` instead of `steps` (never both: §6 D17). The layout is fixed (§6 D16): pretrained models
that give the start are `frozen` nodes on the left, with edges labelled "init" into the variables; the optimized
variables (`state: "optimized"`) sit in one column inside a group with an `id`; the energy terms (`state: "loss"`)
fill the next column; one Σ (`kind: "circle"`, `state: "op"`) receives only the terms and sends one `rec` edge, the
update loop, to the group id; the output leaves from the group, never from Σ. `init` is a label, not a `flow` value.
```json
"groups": [{"id": "vars", "x": 350, "y": 80, "w": 184, "h": 308, "label": "per-video variables", "e": "neutral"}],
"edges": [
  {"from": "sum", "to": "vars", "flow": "rec", "label": "∇E · update", "pts": [[884, 264], [884, 440], [440, 440], [440, 388]], "lx": 596, "ly": 432},
  {"from": "vars", "to": "out", "flow": "geom", "label": "after last stage", "pts": [[380, 388], [380, 478], [918, 478]], "lx": 650, "ly": 470}
],
"stages": [{"label": "1 · Pose + scale", "iters": 200, "title": "Place the objects", "text": "...",
            "nodes": ["kp2d", "fwd", "sum", "vars"], "vars": ["v_pose", "v_scale"], "terms": {"e_2d": 1.0, "e_smooth": 10}}]
```
Each stage: `{label, iters, note, title, text, nodes, vars, terms, edges}`:
- `label`: timeline button text ("1 · Root + scale"); button width ∝ `iters`; `note`: small text after "N it".
- `vars`: ids of variables optimized in this stage → moving dashed accent outline + "optimizes" chips.
- `terms`: `{"e_2d": 1.0, "e_prior": 0.04, "e_contact": true, "e_x": "ramp 0→1"}` → those loss nodes light up
  and show `λ = w` (number), `on` (true) or the string, in place of their sub line; "energy" chips.
- `nodes`: extra ids to keep lit: the forward model, Σ, the variables group, and every input that is still active in
  this stage (a detector whose output a term compares against), so its edges do not grey out. `edges`: optional
  explicit list; without it, every edge between two ids of `nodes` + `vars` + `terms` lights up.
- A matrix (variables × stages, energy terms × stages, iterations) is drawn under the diagram automatically,
  so the reader sees everything without playing; its header cells select a stage. `stageMatTitle` names it. Stage
  weights live only there (§6 D16).
- "Run stages" animates all stages with a progress fill; clicking a node or "Show all" clears.

Figure 2b in `templates/page.html` is a tested, complete stage timeline: copy it and adapt. Its `viewBox` starts at
y = -12 to leave room above the top row.

### 3.5 Text blocks
```html
<div class="callout ne-box"><p class="callout-title">Where the paper and the released code differ</p><ul>
  <li><b>Decoder depth</b> is 8 layers in the released config, not 6. <span class="ev">p.4</span> <span class="ev code">configs/default.yaml:31</span></li></ul></div>
<div class="callout"><p class="callout-title">Title</p><p>...</p></div>
<ul class="keylist"><li><span class="k">Bold lead sentence.</span> Explanation.</li></ul>
<details class="more"><summary>Inference, step by step (code order)</summary> ... long material ... </details>
<div class="two-col wide"> <div>...</div> <div>...</div> </div>      <!-- also .three-col; 1 column on phones -->
<div class="three-col wide no-justify"> ... small cards ... </div>   <!-- narrow boxes: no-justify (§2) -->
<span class="math">\mathcal{L}_{rec}</span>                              <!-- inline KaTeX (MathML) -->
<span class="math-block">E = \sum_t \lVert x_t - \hat x_t \rVert^2</span>  <!-- display math -->
```
The paper-vs-code callout sits under the figure it concerns (§6 A3). Math: raw LaTeX inside the span; in HTML escape
`<` `>` `&` as `&lt;` `&gt;` `&amp;`; inside JSON strings double every backslash (`\\sum`) and escape quotes (`\"`).
Without KaTeX the raw LaTeX shows in mono.

### 3.6 KPIs, datasets, stacked bar
```html
<div class="kpis wide">
  <div class="kpi"><strong>41.3 mm</strong><span><span data-term="PA-MPJPE">PA-MPJPE</span> on Benchmark-1, best feed-forward</span></div>
</div>
<div class="datasets">
  <div class="ds">
    <div class="ds-name">Dataset-A<small>trained on</small></div>
    <div><div class="ds-tags"><span class="tag synthetic">synthetic</span><span class="tag">5,000 sequences</span></div>
      <p>Which labels are used; what is excluded.</p></div>
  </div>
</div>
<div style="margin-bottom:1.6rem">                     <!-- reading column: no wide, no max-width -->
  <div class="stack e-human" role="img" aria-label="Trainable parameters, 60.0 M in total">
    <span style="width:40%" class="hot"></span><span style="width:25%"></span><span style="width:35%"></span></div>
  <div class="stack-key"><span><b>24.0 M</b> query decoder</span><span><b>15.0 M</b> prediction head</span><span><b>21.0 M</b> neck</span></div>
</div>
```
3-4 KPIs per row, always with `wide`; absolute values only (§6 E4). Stack widths are percentages that sum to 100.

### 3.7 Tabs
```html
<div class="tabs wide" data-tabs>
  <div class="tablist" role="tablist" aria-label="Result tables">
    <button type="button" role="tab" id="tab-main" aria-controls="tp-main" aria-selected="true">Main · Tab. 1</button>
    <button type="button" role="tab" id="tab-abl" aria-controls="tp-abl">Ablations · Tab. 3</button>
  </div>
  <div role="tabpanel" id="tp-main" aria-labelledby="tab-main"><p class="tp-lede">The takeaway first; then what is measured, units, lower/higher is better, what bold means.</p> ...table... </div>
  <div role="tabpanel" id="tp-abl" aria-labelledby="tab-abl"> ... </div>
</div>
```
At most 5 tabs, the headline table first (§6 E1). The strip and the panels stay in the reading column; a wide table
inside a panel breaks out on its own. Arrow keys, Home, End move between tabs. Ids must be unique on the page.

### 3.8 Tables: sortable, best/second, caveat flags, super-headers
```html
<div class="tbl-wrap">
  <table class="data" data-sortable>
    <thead>
      <tr class="super"><th colspan="2"></th><th colspan="3">Benchmark-1</th><th colspan="3">Benchmark-2</th></tr>
      <tr><th scope="col">Group</th><th scope="col">Method</th>
        <th scope="col" class="num"><span data-term="PA-MPJPE">PA-MPJPE</span></th> ... </tr>
    </thead>
    <tbody>
      <tr data-flag="Uses ground-truth camera intrinsics."><td>one-stage</td><th scope="row">Baseline A</th><td class="num second">44.9</td> ...</tr>
      <tr class="sep"><td>one-stage</td><th scope="row">Baseline B</th><td class="num">38.2</td> ...</tr>
      <tr class="ours"><td>one-stage</td><th scope="row">MethodName</th><td class="num best">45.6</td><td class="num" data-v="61.0">61.0†</td></tr>
    </tbody>
  </table>
</div>
<p class="tbl-note"><span class="flag" aria-hidden="true"></span>marks a row whose comparison has a caveat; hover or tap it for the reason. Click a numeric header to sort; a third click restores the paper's order.</p>
```
- The UI help sentence of the `tbl-note` ("Click a numeric header to sort…") appears once per page, under the first
  table (§6 E2).
- Width: a table that does not fit the reading column is widened by site.js (§2); never set an inline `max-width`.
- Sortable columns: `th class="num"` in the **last** header row. Sort value = `data-v` if present, else the first
  number in the cell text; cells without a number ("—", "n/a") sort last.
- `td.best` bold, `td.second` underline (only as marked in the paper), `tr.ours` tinted row, `tr.sep` thick rule
  between groups, `td.yes` / `td.no` for ✓ / ✗ (a ✗ row header: `<th scope="row" class="no">✗</th>`), `td.num` right-aligned.
- `tr[data-flag="reason"]`: an amber triangle is appended to the row's `th scope="row"` with the reason as a
  tooltip. Flag extra inputs, GT intrinsics, test-time optimization, different splits, numbers copied from
  other papers. A caveat shared by every row goes in the lede instead (§6 E3).
  The triangle goes after the last inline piece of the header (before a trailing block such as a year line)
  in a `span.flag-joint` (nowrap) with the last word, or after a word joiner when the label ends in an element
  (`<a>`, `<b>`, math), so it never drops onto a line of its own, even in a wrapping cell.
- Cells do not wrap; wide tables scroll inside `.tbl-wrap`. For a text table add the modifier `wrap`
  (`<table class="data wrap">`): `td` cells wrap, row headers stay on one line; with 3+ columns mark its
  `.tbl-wrap` `wide`. Extra tuning (min-width, top alignment, wrapping row headers) stays page-local on a second class.

### 3.9 Glossary tooltips
`<span data-term="WA-MPJPE">WA-MPJPE</span>` or `<span data-term="Detection-free">Det.-free</span>` (text may
differ from the key). Built-in keys: MPJPE, PA-MPJPE, PVE, W-MPJPE, WA-MPJPE, RTE, MRPE, ATE, RPE, Abs Rel,
δ<1.25, Jitter, Foot sliding, Accel, Chamfer, F1, Precision, Recall, FPS (pose and geometry metrics from the first
collection; any other metric needs its own entry). Add or override keys in the page's
`<script type="application/json" id="glossary">` (override when the paper's protocol differs, e.g. segment
length or alignment). Any element can carry its own tooltip: `data-tip="text" data-tip-title="Title"`.

### 3.10 Bar charts (ablation deltas, "what each component buys")
```html
<div class="two-col wide">
  <div data-bars><script type="application/json">{"title": "Benchmark-1 error gets worse by (mm)", "unit": "", "max": 60, "items": [
    {"label": "Fine-tune the encoder instead of freezing it", "value": 52.4, "display": "+52.4", "e": "scene", "group": "carry", "src": "Tab.4"},
    {"label": "Remove the auxiliary loss", "value": 1.2, "display": "+1.2", "e": "human", "group": "minor", "src": "Tab.5"}],
    "note": "Full model = 45.6. Differences computed here from the paper's tables."}</script></div>
</div>
```
Item keys: `label` (HTML), `value` (bar length, |value| / `max`), `display` (text shown; default
`prefix + value + unit`), `prefix`, `e` (bar color), `group` ("minor" draws a faded bar; "carry" is plain),
`src` (evidence chip), `note` (hover title). Chart keys: `title`, `unit`, `max` (default: largest |value|),
`note` (HTML). Say in the note when you computed the deltas yourself. Two charts side by side go in a
`.two-col.wide`; a single chart fills the reading column (no `wide`). One chart never mixes incomparable quantities
(§6 E5).

### 3.11 Paper figures + lightbox
```html
<h3>Results in the paper's own figures</h3>
<div class="paper-figs wide">
  <figure>
    <a href="assets/<slug>/fig_1.jpg" data-lightbox><img src="assets/<slug>/fig_1.jpg" alt="What is in the image, concretely" loading="lazy" width="2600" height="760"></a>
    <figcaption>What to look at. <span class="credit">Fig. 1 of Author et al., Venue Year.</span></figcaption>
  </figure>
  <figure class="read"> ... a tall figure (width / height < 1.6) ... </figure>
</div>
```
One column, every figure full width (never thumbnails); a tall figure goes back to the reading column with
`class="read"`. `width`/`height` = the file's real pixel size, which `scripts/extract_figure.py` prints when it saves
a crop; for other files:
`<python> -c "import sys;from PIL import Image;[print(p,*Image.open(p).size) for p in sys.argv[1:]]" <out>/assets/<slug>/*.jpg`.
Crop figures with `scripts/extract_figure.py` (≥ 2600 px wide, JPEG quality 93, 4:4:4 chroma); never use a
screenshot or a low-DPI render. Click opens a lightbox with the caption.

### 3.12 Critical analysis
```html
<div class="verdict wide">
  <div class="col-carry"><h3>What carries the method</h3><ol>
    <li><span class="weight">main</span><b>One-line claim.</b> Evidence with numbers. <span class="ev">Tab.3</span></li></ol></div>
  <div class="col-minor"><h3>Minor additions</h3><ul>
    <li><span class="weight low">minor</span><b>Component:</b> delta. <span class="ev">Tab.8</span></li>
    <li><span class="weight low">untested</span><b>Component:</b> no ablation.</li></ul></div>
</div>
<h3>Limitations the authors state</h3><ul><li>... <span class="ev">p.9</span></li></ul>
<h3>What the paper does not show</h3>
<ol class="issues"><li><b>Claim in one line.</b> Explanation. <span class="spec">speculation</span> <span class="ev">Tab.2</span></li></ol>
<h3>Open questions</h3><ul><li>...</li></ul>
```
`issues` items are numbered 01, 02 ... automatically. Weight tags: only main, minor, untested; main only for what an
ablation measured (§6 B10). Pair the verdict with ablation bars (§3.10) when the paper has ablations. Put the full
stop before the evidence chips, never after them.

## 4. Drawing the architecture diagram

- **Scale.** `"viewBox": [0, 0, W, H]` with W ≤ 1100 and H ≤ 560 (§6 D1–D2), `"minWidth": 1000`. In the wide column
  at a 1280 px window the SVG draws at ≈ 1.0 px per unit. Fonts are fixed in viewBox units: node label 15 (bold
  sans), sub / shape / edge label 13.5 (mono), group label 13, NEW tag 12. Never shrink text; a wider viewBox shrinks
  it below 12 px and site.js reports it (§8). Phones scroll the diagram sideways.
- **Grid.** Sketch the grid first: columns (x) and rows (y). 5-7 columns about 190-200 apart (`templates/page.html`
  Figure 2: x = 8, 178, 376, 578, 772, 974). Rows about 75-130 apart. Gap between nodes ≥ 40 units, ≥ 56 where an
  edge label sits in the gap. Leave ≥ 12 units above the top row for NEW tags and ≠ badges (or start the viewBox at
  y = -12). Set H to the content bottom + about 20.
- **Bands.** The main path is one row; frozen models that feed it above; the "training only" group below; offline
  parts in a labelled group at the right (§6 D4–D6).
- **Node size.** Rect nodes: h 56-66 (60 standard; 2-line label + sub: h ≥ 70), w 112-170; tall nodes for a
  decoder or state (e.g. 136×190). Label width ≈ 8.5 units per character, sub ≈ 8.1 per character
  (mono); both must fit in `w − 14`: w 144 → label ≤ 15 chars, sub ≤ 16; w 160 → 17 / 18; w 180 → 19 / 20.
  Circle labels 1-2 characters (⊕, Σ, β, f).
- **Overflow warning.** After the fonts load, site.js measures every node label, sub and shape (with the toggle
  on). Text wider than the node is squeezed and logged:
  `[site.js] diagram text "..." is 152 units wide but node "proj" allows 136: shorten the text or widen the node.`
  Edge labels are not measured: check them in the zoom crops.
- **Edges.** Give explicit orthogonal `pts` for every edge that bends; start and end exactly on node borders
  (right middle = [x + w, y + h/2], top middle = [x + w/2, y], ...). Share a vertical "bus" x for fan-in/fan-out
  (Figure 2b in the template uses buses). Do not route an edge through a node or a label. Two edges that share no
  node never meet (§6 D7); site.js reports every meeting point.
- **Edge labels never sit on a line.** Horizontal edge at y: label baseline `ly = y − 8`, `anchor "middle"`.
  Vertical edge at x: `lx = x + 7, anchor "start"` or `lx = x − 7, anchor "end"`. Keep labels ≥ 4 units away from
  other lines, badges and glyphs, and ≥ 12 units from node borders: a selected node's ring sits 8 units outside it.
  Put a circle's sub on the side no edge leaves from (`subPos`).
- **Glyphs, tags, badges.** State glyph: bottom-right inside the node (11×11). NEW tag: top-left, 9 units above
  the top edge (36×17). Node ≠ badge: top-right corner, 10 units above and 10 right of the node (24×18). Keep 8+
  units around them clear of edges, labels and group frames (a group border just above a node collides with its
  ≠ badge).
- **Paper vs code.** Draw what the code builds when code exists (§6 D11). Put `mismatch` only on the blocks or edges
  whose job the difference changes, at most 4; list every difference in the `callout ne-box` under the figure.
- **Adding a node / edge / step.** Node: free grid cell, size from the character rule, entity, state, detail.
  Edge: `pts` border to border, then the label position. Step: node ids plus edge ids (`"from>to"` or `id`).

## 5. Drawing the storyboard panels
- `viewBox="0 0 260 160"`, drawn at ≈1:1 on desktop (≤ 400 px wide). Text 12 (sans) and `t-mono` 12 are the floor;
  do not set smaller font sizes. Width estimate: mono 12 ≈ 7.2 units per character, sans 12 ≈ 7.2.
- At most 3 labels per drawing, each ≤ 20 characters, no formulas (§6 C3): draw lengths, arrows and boxes instead.
- Keep every text ≥ 4 units from any line, glyph or shape; put labels above or below a grid of tokens, not on it.
- Draw the real input (frame strip, views, egocentric hands, robot) in panel 1, the paper's key contrast as
  before / after in one panel (§6 C2), and this paper's output type in the last panel. Panels must be readable at
  rest; animation only adds emphasis.

## 6. The page standard

Every page meets these rules. Each one is checkable; site.js checks the numeric figure rules and the lede length
itself and prints a `[standard]` console line for each violation (§8), and the rest you check by reading. A reader
should get, in a few minutes and without the PDF: what goes in and comes out, the one idea, how the method does it,
how well it works, and what really carries it. Rules are cited as "§6 D7".

### A. Structure (same order and names on every page)
- **A1 Header:** category chip, method name, full title, authors, links, "The one claim" (≤ 45 words), and the facts
  strip with four cells: Input, Output, Backbone, Runtime. Each cell ≤ 30 words, a plain statement; caveats go in
  the text.
- **A2 The idea** (`#idea`): h2 = the claim, a lede, Figure 1, at most two short paragraphs after it.
- **A3 Architecture** (`#architecture`): h2, a lede, Figure 2; a second diagram is Figure 2b (training, a second
  stage, the optimization). The paper-vs-code differences in one `callout ne-box` under the figure they concern.
- **A4 Beyond the figures** (`#method`): losses, training recipe, inference, test-time details.
- **A5 Experiments** (`#experiments`): training data first, KPIs, tables in tabs, ablation bars, paper figures.
- **A6 Critical analysis** (`#analysis`): what carries the method, minor additions, limits the authors state, what
  the paper does not show, open questions.
- **A7 Figure numbering:** Figure 1 is the storyboard and Figure 2 the main diagram on every page. Extra figures are
  1b, 2b, 2c, never a second "Figure 2". One storyboard per idea section.
- **A8 Figure titles:** every figure has its title in the same place, the mono line at the top of its box:
  `<div class="fig-head"><p class="fig-title">Figure 2 · what it shows, ≤ 8 words</p></div>`.
- **A9 Extra blocks** with no slot (a version box, a forensic subsection, a fairness callout) become a `details.more`
  inside the section they belong to, with a one-sentence summary outside.

### B. Text
- **B1 h2** ≤ 15 words, one claim: "One frozen encoder, one fine-tuned neck, one trained query decoder", not "Method".
  The method comes before any criticism of the code.
- **B2 Ledes** ≤ 60 words, evidence chips not counted: the section lede (`<p class="lede">` right after the h2) and
  every table lede (`<p class="tp-lede">`). The first sentence says what the section or figure shows. At most one
  sentence of UI help ("click a block…"); provenance (commit, paper version) goes in the caption; units and legends
  of a table go in its `tbl-note`.
- **B3 Paragraphs** ≤ 80 words, one idea each, point first. Sentences mostly ≤ 25 words. Plain words; no hype words,
  filler or emojis.
- **B4 Lists of settings** with more than 5 items become a small table or go in `details.more`.
- **B5 Every abbreviation** is defined at its first use on the page (inline, or with a glossary term).
- **B6 One name per concept** on the whole page, in text, figures and tables (not "head" for both a body part and a
  network head).
- **B7 Each fact once:** loss weights in one place, one value per estimate. Re-read every number that appears twice
  on the page; a self-contradiction is a defect.
- **B8 Counts agree** between step titles, figure titles, text and headings ("three frozen models" next to a figure
  with four is a defect).
- **B9 Side analyses** (bookkeeping inconsistencies, log forensics, clip arithmetic, other paper versions) keep one or
  two sentences in the main text; the rest goes in `details.more`.
- **B10 Weight tags** in the analysis: only MAIN, MINOR, UNTESTED. MAIN only for what an ablation measured.
- **B11 Numbers** exactly as in the notes (their §12 verification log wins), with units and "lower/higher is better".
  "Not stated" stays visible. Plot-read or derived values are marked ("≈", "read from the plot", "derived", "counted
  from code").
- **B12 Evidence:** every critical point carries an evidence chip (`Tab.3`, `p.7`, `Fig.2`, code path). Your own
  inference ends with `<span class="spec">speculation</span>`. Do not soften or exaggerate the notes' findings.
- **B13 Hedges are facts.** "Presumably", "not stated", "in the authors' pipeline", "can also", "in code", which
  paper version, which metrics or benchmark a claim holds for: a shorter sentence keeps them (§7, 25-27).
- **B14 Internal words** never appear on the page, in tooltips or in alt text: "digest", "notes file", "brief",
  "agent". Write "our reading" or "our analysis".
- **B15 Captions** say what to look at. The world widget is always labelled as an illustration.

### C. Figure 1, the storyboard
- **C1 Shows the claim.** The panels depict the h2 claim of the idea section; a reader who sees only Figure 1 gets
  the idea.
- **C2 3-5 panels:** what goes in → the idea in 1-3 panels → what comes out. One panel shows the paper's key
  contrast as before / after or with / without.
- **C3 Legible:** panel text renders ≥ 12 px at a 1280 px window; at most 3 labels per drawing, each ≤ 20
  characters; no formulas inside drawings.
- **C4 Step titles** start with a word, ≤ 7 words. **Step captions** ≤ 30 words, one point; every symbol used in the
  drawing is defined.
- **C5 The output panel shows this paper's output type** (boxes, points, meshes, a robot, several views, metric
  scale). The 3D world widget is optional: use it only when it can show that output, keep it to at most about half
  the figure, and configure it for this paper (layers, how many people, robot or not). Otherwise draw the output in
  SVG.
- **C6 Play earns its time.** Animate per frame only what changes per frame; a full Play run (frames × steps ×
  `data-step-ms`) ≤ 10 s.
- **C7 Controls:** Play, Replay, Show all (site.js builds them). At rest everything is shown.

### D. Figure 2, the architecture diagram
Size
- **D1** viewBox width ≤ 1100, so the diagram draws at scale ≥ 1 in the wide column: node labels 15 px, subs and
  edge labels 13.5 px on screen.
- **D2** viewBox height ≤ 560, so the diagram and its controls fit an 800 px laptop window.
- **D3** ≤ 20 nodes, ≤ 30 edges, ≤ 12 labelled edges. More → split into Figure 2 and 2b (model and training, or
  stage 1 and stage 2).

Layout
- **D4** The main data path is one row, left to right: inputs are the leftmost nodes, outputs the rightmost. No input
  enters from the right; no upward chain of 3+ nodes.
- **D5** Every output named in the facts strip is an end node (a data pill) at the right.
- **D6 Bands:** frozen or pretrained models that feed the path sit above it; training-only parts (losses, teachers)
  in a band below, inside a group labelled "training only"; offline or test-time parts in a labelled group at the
  right.
- **D7** 0 crossings between edges that share no node. No edge wraps around the diagram (longer than half its width,
  around other nodes). A crossing is fixed by moving nodes, never explained in a caption.
- **D8** Orthogonal edges on a grid; nodes in a column share x and width; nodes in a row share y and height. Labels
  keep ≥ 12 units from node borders.

Words
- **D9** Bold label = the block's job in ≤ 3 plain words ("Image encoder", "Contact head", "Scale solver"). The model
  name, symbol or size goes in the sub ("ViT-L/14", "Q = 100"). No code identifiers, stage numerals, equation
  numbers, library names or "not stated" in labels or subs.
- **D10** No equations in subs or edge labels; the equation goes in the detail panel. Edge labels ≤ 20 characters,
  only where what flows is not obvious.

Meaning
- **D11 One version:** draw the version the page follows, normally the released code; a paper version when the code
  matches none. At most 4 ≠ badges, on blocks or edges where the difference changes what the block does. All other
  differences, and other paper versions, go in the callout under the figure.
- **D12 NEW:** at most 6 tags; when 3 or more new blocks share a group, tag the group (`"new": true`) instead.
- **D13 States match the detail text.** A hedge in the text ("presumably trained") means `unstated`; a block that
  starts from pretrained weights and is then trained is `finetuned`, not `trained`.
- **D14** The main path is never drawn as loss flow.
- **D15 Losses (feed-forward):** each loss node receives dashed edges from what it compares (the prediction and its
  target), inside the "training only" band; at most 6 loss nodes, else one "Training losses" node listing them in its
  detail.
- **D16 Optimization diagrams:** the optimized variables in one column inside a group with an `id`; the energy terms
  in the next column; one Σ that only receives the terms and sends one dotted (`rec`) update loop to the variables
  group; outputs leave from the variables, never from Σ. At most 6 term nodes per solver, else one "Energy" node per
  solver listing the terms. Stage weights live in the stage matrix only (§3.4).
- **D17** Steps or stages, not both, on one diagram: steps for networks, stages for staged optimization.
- **D18** The step narration names the right unit: `#labels` `unit` for the page (frame, window, clip), or `"unit"`
  in one diagram's JSON when that diagram differs (§1).

Steps and details
- **D19** 5-8 steps, each lighting one path segment; narration one sentence ≤ 25 words.
- **D20** Every node's detail has does / in / out; the paper's key new blocks also get `why` (the intuition).
- **D21** The lede's first sentence says what Figure 2 shows ("Figure 2 shows one frame through MethodName: …"). One
  sentence of UI help at most.

### E. Experiments
- **E1** ≤ 5 tabs, the headline table first.
- **E2** Each table lede starts with the takeaway (what to look at), then the metrics and their direction. The UI help
  sentence ("click a header to sort…") appears once per page, under the first table.
- **E3** No flag on every row: a caveat shared by all rows goes in the lede.
- **E4** KPI tiles show absolute values, not deltas between different protocols.
- **E5** No chart mixes incomparable quantities.
- **E6** Paper figures with several panels use the wide column; a single small plot or a tall figure uses the reading
  column (`figure.read`).
- **E7** The data section shows each quantity once.

## 7. Pitfalls (each one happened on real pages)

Markup and components
1. **Multi-character subscripts need braces**: `E_{2D}`, `F_{enc}`, `S_{t-1}`. `E_2D` renders only "2" low.
   `pred_head` stays literal only because a letter follows `_h`.
2. **Light markup works only in diagram labels, subs, shapes, edge labels, stage chips and the matrix**, not in
   `detail`, step `text` or page prose: there use `<sub>`, `<sup>` or `<span class="math">`.
3. **Table super-header rows: blank cells via `colspan`, never `rowspan`.** Sorting and flags use the column
   indices of the last header row; a rowspan shifts them and sorts the wrong column.
4. **Text never shrinks**: overflow is squeezed and logged (§4); shorten the text or widen the node.
5. **Edge labels never on a line** (§4): set `lx`, `ly`, `anchor` for every labelled edge.
6. **Duplicate edge ids**: two edges with the same `from` and `to` need an explicit `id`, or a step will
   highlight only one of them. Unknown ids in steps or stages log `console.error`.
7. **JSON in `<script type="application/json">`**: no trailing commas, no comments, `\\` for LaTeX backslashes,
   `\"` inside HTML strings. One invalid character kills the whole component (console error "invalid JSON").
8. **`data-term` without a glossary entry** logs a warning. Add the key to `#glossary`.
9. **`<` in prose** (δ<1.25, p<0.05) must be written `&lt;`.
10. **Hidden content is not in the screenshot**: other tabs, the detail panel, steps, stages. Check them with
    `scripts/shot_state.sh` (§8).
11. **Image sizes**: `width`/`height` must be the real file pixels (Pillow command in §3.11), or the layout jumps.
12. **Phone pages over 16000 px are cut** by Chrome. check_page.sh then also renders each section alone at phone
    width (`<slug>.phone-<section>-N.png`); look at those for the part the full render lost.
13. **Console check**: use `scripts/check_page.sh`; it greps `CONSOLE|Uncaught` only, because Chrome's own ERROR
    lines (CVDisplayLink, task_policy) are noise. By hand under zsh, wrap the command in `bash -c '...'`.
14. **Never leave PNGs in `<out>/`**. 15. **Resting state complete**: nothing visible only while playing.
16. **`\bar` is unreliable in Chrome** with KaTeX MathML output (sometimes missing, sometimes drawn on the letter
    for d, q, u, n, β, θ): write `\overline{s}`, not `\bar s`.
17. **No released code, or code not read** → `data-no-code` on every diagram host (§3.3), so the help line does not
    promise code paths.
18. **Detail-panel titles** take `E_{depth}` or `E<sub>depth</sub>`; other HTML there is escaped.
19. **Training status or starting weights not stated** → node `state: "unstated"` (dotted box, chip "training or
    initialization not stated", legend entry when used). No page-local CSS needed.
20. **Frame-by-frame build-up** in a storyboard → class `grow` on the `data-frame` elements (§3.2); do not add a
    page-local `.is-playing` rule.
21. **Text tables** → `table.data.wrap` (§3.8), not a page-local `white-space: normal` rule.
22. **Low-resolution figures** look poor next to the paper. Crop with `scripts/extract_figure.py`; never shrink a
    figure into a thumbnail.
23. **Wording that assumes video** ("frame", "per video") on a page about another input → `#labels` (§1); one
    diagram over another unit → `"unit"` in its JSON.

Layout
24. **An inline `max-width` on a `.wide` block** makes it hug the left edge, and a `.wide` nested inside another block
    does nothing (§2). Bar charts and stacked bars fill the reading column without `wide`.

Facts (the most common checker findings)
25. **Inference stated as fact.** Every claim that goes beyond the paper gets `speculation` or "our reading".
26. **Hedges dropped in a shorter sentence**: "in the authors' pipeline", "on benchmark X", "can also",
    "presumably", "in code", which paper version. A cut clause must not leave the rest of the sentence claiming more
    than before; this includes h2s shortened until they contradict their own section.
27. **Overclaims in summaries**: a takeaway that generalises from two metrics to all four, ranks a near-tie, credits a
    gain to one component when the ablation changed two, or a visible summary that widens a caveat kept in a
    collapsed block.
28. **Code-only facts shown as paper facts**: counts or settings read from the code, on a figure or in a sentence
    "drawn from the paper", need "in code".
29. **New in / out / why lines are new claims**: "video frames" when the block gets person crops, "the mean" when the
    code samples. Check each against the notes before writing it.
30. **Wrong references**: "the paper's Fig. N" with the wrong N; a figure title that changes a count.
31. **A caption that promises more than the figure** ("the ≠ badges mark every difference" when the callout lists
    more), and detail text that points to something that is not there ("see the matrix" for a value it lacks).
32. **Redraw regressions**: a NEW tag or a ≠ badge lost; a stage that greys out a block still in use (list it in the
    stage's `nodes`); a node state that no longer matches its detail text (§6 D13).

## 8. Check procedure (do all of it, then fix and repeat)

1. Render and run the console check:
   ```bash
   bash <skill>/scripts/check_page.sh <out>/<slug>.html <notes>/vis/<slug>
   ```
   It writes `<slug>.desktop-N.png` (1280 px) and `<slug>.phone-N.png` (500 px), 1600 px per slice, into the vis
   folder; older slices move to `.old/`. A phone page taller than 16000 px also gets one render per section,
   `<slug>.phone-<section>-N.png`. Then it checks that every local file the page references exists
   (`missing: <path>`), and runs the console check at a 1280 × 900 window (`console: clean`, or every console line).
   - Exit 0 means clean. Exit 1 means console messages or missing files. Exit 3 means no Chrome, or a Python
     without Pillow.
   - While a collection is being built, `missing: <slug>.html` for a page that does not exist yet is expected.
     Every other `missing:` line is a defect, and at the final look there must be none.
   - `templates/index.html` itself exits 1, with only `missing: author2023.html` … `author2025b.html`: its four
     placeholder papers. That is expected for the template; a real index replaces them with the collection's slugs.
   - A desktop page taller than 16000 px is cut too; the script says so. Check the sections past the cut with
     `shot_state.sh --section <id>`.
   - The console check catches JSON errors, unknown node/edge/group ids, unknown `e`/`state`/`flow` values, missing
     glossary keys, unknown `#entities`/`#labels` keys, node-text overflow, and every page-standard violation below.
   - The script uses `$PYTHON` (a Python with Pillow) when set, then `~/.claude/venv/bin/python`, then `python3`.
   - Offline, KaTeX and the web fonts do not load and the console stays clean: formulas show as raw LaTeX in
     mono. Check math rendering online.

   **Page-standard lines.** site.js prints one `console.warn` per violation of §6 B2, C and D, as
   `[standard] <where>: <what>: <what to do>`, where `<where>` is `architecture diagram N` or `storyboard N` (the
   order of `[data-arch]` / `[data-story]` on the page), `section lede #<section id>` or `table lede #<tab panel
   id>`. A page is done only when none is left.

   | message | rule | what it wants |
   |---|---|---|
   | `viewBox W × H (max 1100 × 560)` | D1, D2 | a tighter layout, or Figure 2 and 2b |
   | `N nodes (max 20)` / `N edges (max 30)` | D3 | split into Figure 2 and 2b |
   | `N labelled edges (max 12)` | D3, D10 | labels only where what flows is not obvious |
   | `N ≠ badges (max 4): ids` | D11 | ≠ only where the code changes what a block does; the rest in the callout |
   | `N NEW tags (max 6): ids` | D12 | one tag on the group (`"new": true`) |
   | `both steps (N) and stages (M)` | D17 | steps for a network, stages for a staged optimization |
   | `edges "a>b" and "c>d" cross at (x, y)` / `overlap from (x, y)` | D7 | move nodes, or give each edge its own track; a shared track is fine only as a complete bus (a>d and c>b exist too) |
   | `edge "a>b" is loss flow between "a" and "b", neither a loss node` | D14 | `feat` or `geom` on the main path; loss edges start or end at a loss node or a loss sum (an op fed only by loss nodes) |
   | `edge "s>x" (geom) leaves the loss sum "s"` | D16 | outputs leave from the variables; Σ sends only the `rec` loop |
   | `node "id" label "…" has N words (max 3)` | D9 | the block's job in ≤ 3 words; names and sizes in the sub (words = tokens with a letter or digit) |
   | `a full Play run takes T s (… max 10 s)` (storyboard) | C6 | fewer `data-frames` or a shorter `data-step-ms` |
   | `N texts below 12 px at a W px window: "text" size ×count, …` | C3, D1 | a larger font or a smaller viewBox; checked only at windows ≥ 1200 px, as in check_page.sh |
   | `lede is N words: cut to ≤ 60 (…)` (section or table lede) | B2 | cut to ≤ 60 words (evidence chips not counted); a table lede moves units and legends into the `tbl-note`, a section lede keeps details for the paragraphs below |

   Groups count as edge ends: edges that share a group end never cross; a group is never a loss node or a loss sum.
2. Open **every** PNG with the Read tool and look: clipping, overlaps, text on lines, overflow, tiny text, empty
   figures, phone overflow, ugly spacing, the world box edges, text columns that do not share the centre line.
3. Zoom into both diagrams with Pillow crops at 2×. Find the y range in the full PNG first; a figure split across two
   slices can be pasted together. Write crops to your scratch folder and read them. Use the Python your brief names
   (`<python>`, one with Pillow):
   ```bash
   <python> -c "
   from PIL import Image
   b=Image.open('<notes>/vis/<slug>/<slug>.desktop-2.png')
   b.crop((40,740,620,1290)).resize((1160,1100),Image.LANCZOS).save('<notes>/scratch/<slug>/arch_left.png')
   b.crop((580,740,1160,1290)).resize((1160,1100),Image.LANCZOS).save('<notes>/scratch/<slug>/arch_right.png')"
   ```
4. Hidden states (a selected node with shapes on, a step, a stage, every tab, Figure 1 during Play and after Show
   all):
   ```bash
   S=<notes>/scratch/<slug>
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/node.png --query 'node=<id>&shapes=1'
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/step.png --query 'step=3'
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/stage.png --query 'arch=1&stage=0' --height 2600   # 2nd diagram in the section
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/tab.png --section experiments --query 'tab=<tab button id>'
   ```
   The script shows only one section (`--section`, default `architecture`) and screenshots from its top, so a lower
   diagram needs a taller `--height` (then crop). `step` is 1-based; `stage` (the matrix column) and `arch` (which
   diagram in the section) are 0-based. `--js '<code>'` runs extra JavaScript for any other state. Exit 1 means the
   state did not apply or the page logged to the console (`[standard]` lines included); the message says why, and the
   screenshot is still saved. An existing PNG of the same name moves to `.old/`.
5. Look at the page at 1512 px too (the TOC sidebar appears from 1600 px):
   `"<chrome>" --headless=new --disable-gpu --hide-scrollbars --window-size=1512,3000 --virtual-time-budget=4000 --screenshot=<out.png> file://<page>`.
6. Re-read every table on the page against the notes, cell by cell, and every number that appears twice (§6 B7).

## 9. Checklist before you return
- [ ] §6 A: five sections with the fixed ids, claim headings, TOC, real prev/next links, `#glossary`; figures
      numbered 1, 2, 2b with fig-head titles; paper-vs-code callout under its figure.
- [ ] §6 B: ledes, paragraphs, abbreviations, one name per concept, each fact once, hedges kept, internal words absent.
- [ ] §6 C: Figure 1 shows the claim and the key contrast, the output type; Play ≤ 10 s; Show all; resting state
      complete; world tagged as illustration (or no world).
- [ ] §6 D: diagram specific to this paper, within the limits, no crossings; every node has does / in / out (why on
      the key new blocks); steps or stages; shapes where known; ≠ on at most 4 blocks, the rest in the callout.
- [ ] Method text: losses with math, recipe, inference, tricks; long parts in `details.more`.
- [ ] §6 E: training data first, KPIs, ≤ 5 tabs with takeaway ledes, numbers exact, best/second as in the paper,
      flags with reasons, ablation bars, 1-3 paper figures with credit and real width/height.
- [ ] Analysis: carries vs minor grounded in ablation numbers, stated limits, not-shown points with evidence
      chips, speculation labelled, open questions.
- [ ] check_page.sh exit 0 (no `[standard]` line); every PNG read, both diagrams zoomed, hidden states
      screenshotted, 1512 px looked at, tables re-checked.
- [ ] Report: page path, what the two figures show, page-local CSS/JS added, PNGs looked at, remaining issues.
