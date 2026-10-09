# Design guide for paper pages

For the agents that build, check and fix the pages.
1. Read this file fully.
2. Read `templates/page.html` in this skill once. It shows every component below, wired together; its comments cite
   the sections of this guide.

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
| `optimized` | dashed stroke, cycle glyph | variables optimized per video / per scene (test-time) |
| `unstated` | white fill, dotted entity stroke, no glyph | the paper does not say whether this module is trained (legend: "training not stated") |
| `op` (default) | white fill, grey stroke | no learned parameters (concat, projection, NMS, sum) |
| `data` | white pill, entity stroke | inputs and outputs |
| `loss` | white, grey dashed | loss or energy term |
| `"new": true` | indigo ring + `NEW` tag | introduced by this paper (combine with any state) |
| `"mismatch": "..."` | amber `≠` badge | paper and released code differ (text says how) |

**Flows** (edges; `flow` in the JSON): `feat` (default, thin line in entity color: tokens/features), `geom`
(thick: points, poses, meshes, cameras), `loss` (grey dashed: supervision / gradient into a loss), `rec` (dotted:
recurrent state carried to the next frame or iteration). Edge color defaults to the source node's entity.

The legend under each diagram is generated automatically and lists only what that diagram uses. An unknown `e`,
`state` or `flow` value logs a console warning; a slip such as using a legend label as the key would otherwise draw
a black node.

**Wording for inputs that are not video.** site.js speaks of frames by default: "Showing all 6 frames" in the
storyboard, "follow one frame through the model" under a diagram, and "recurrent: carried to the next frame" in the
legend. A page whose input is not a video changes this with one page-level block:
```html
<script type="application/json" id="labels">{"unit": "token", "units": "tokens", "optimized": "optimized per prompt"}</script>
```

| Key | Default | Used in |
|---|---|---|
| `unit` / `units` | `frame` / `frames` | the storyboard status, the diagram's step narration and its play status ("Frame 2/6"); `units` defaults to `unit` + "s" |
| `optimized` | `optimized per input` | the legend label of state `optimized` |
| `rec` | `recurrent: carried to the next <unit>` | the legend label of flow `rec` |
| `geom` | `geometry: points, poses, meshes` | the legend label of flow `geom` |

An unknown key and invalid JSON log a console message. `templates/page.html` has an active block (its stage
timeline loops per iteration and its edges carry boxes) and a commented-out example for a token model.

## 2. Page skeleton

Copy `templates/page.html` to `<out>/<slug>.html` and replace its content. Sections, ids and order are fixed. The bare
structure:

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
<section id="idea"><h2>Claim heading</h2> ... storyboard figure (§3.2) ...</section>
<section id="architecture"><h2>Claim heading</h2> ... diagram (§3.3 / §3.4) ...</section>
<section id="method"><h2>Claim heading</h2> losses, recipe, inference, paper vs code ...</section>
<section id="experiments"><h2>Claim heading</h2> training data, KPIs, tables in tabs, ablation bars, paper figures</section>
<section id="analysis"><h2>Claim heading</h2> carries vs minor, limitations, not shown, open questions</section>
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
- **TOC.** A collapsible box below 1440 px and a sticky sidebar from 1440 px. Its scroll-spy needs the five section
  ids.
- **Prev / next.** Follow the reading order in your brief.
  - The first page's previous link and the last page's next link go to `index.html`, with the text "All papers".
  - `href="#"` renders a greyed placeholder; do not leave one.
  - **A single paper with no index:** delete the `.topbar` and the `footer.pager`.
- Width: every direct child of a `section` is held to the 70ch prose measure **unless it has class `wide`**
  (max 1150 px). Put `wide` on figures, tab boxes, tables, KPI rows, `two-col`, `verdict`; never on prose.

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
<figure class="story panel wide" data-story data-frames="6" data-step-ms="560" aria-label="MethodName in five steps">
  <div class="fig-head">
    <p class="fig-title">Figure 1 · the idea, one frame at a time</p>
    <div class="controls story-controls"></div>          <!-- Play / Replay / status are inserted here -->
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
      <!-- human/scene papers: the world widget below; any other paper: one more .fig-svg panel (see the template) -->
      <div class="world" data-world>
        <script type="application/json">{"people": 3, "camera": "moving", "ground": "plane", "walls": true, "objects": 3, "contacts": false, "frames": 6, "seed": 11}</script>
        <canvas aria-label="Illustration: ... Drag or use arrow keys to rotate."></canvas>
        <div class="world-key"><span class="chip e-human">humans, track IDs</span><span class="chip e-scene">scene points</span><span class="chip e-camera">camera path</span></div>
        <span class="world-tag">illustration, not real data · drag to rotate</span>
      </div>
    </div>
    <div class="story-notes"><div><b>Trained:</b> ...</div><div><b>Online:</b> ...</div><div><b>Not needed:</b> ...</div></div>
  </div>
  <figcaption>What Play does; that the world view is a generic illustration, not the paper's output.</figcaption>
</figure>
```
- Player: Play walks frames × steps (`data-frames` × number of `data-step` values), `data-step-ms` per tick
  (min 250). The current step is full opacity, others fade to 40 %. Elements with `data-frame="n"` get
  `.is-current` (accent stroke) on frame n and `.is-on` for frames ≤ n. Add class `grow` to a `data-frame`
  element that should appear frame by frame (scene points, camera frusta): while playing it stays at 12 %
  opacity until its frame has played. A world inside the figure builds up with the frames. At rest everything is
  shown: the resting state must be complete.
- **Output step without the world widget** (any paper not about humans in scenes): draw the output as one more
  `.fig-svg` panel. CSS caps a panel SVG at 400 px wide, so use `viewBox="0 0 400 160"` at most; a wider viewBox
  shrinks the text below the 11 px floor on phones. `templates/page.html` does this, and keeps the world widget
  as a commented-out snippet.
- 3-5 steps: 4 panels in `.story-grid` + 1 output step in `.story-out` is the tested layout. With 3 panels use
  `.story-grid` alone plus `.story-out`. The first panel must show what the input really looks like (frame strip,
  several views, egocentric clip, robot setup, capture rig).
- Panel SVG vocabulary (`.fig-svg`, put entity class on a `<g>`): `frame` (grey image box), `ink` (entity stroke),
  `ink-fill`, `tok` / `tok hot` (token squares, hot = filled), `box` (+ `frozen` / `trained` / `optimized`),
  `ring-new`, `faint` (grey hairline), `flowline` (+ `geom` / `loss` / `rec`) with `arrowhead` paths, `glyph`
  (`<use href="#g-lock" class="glyph" x y width="11" height="11"/>`), text classes `t-mono` (11 px, muted),
  `t-muted`, `t-e` (entity color, bold); `pulse` on anything that should pulse while its step plays.
- **World JSON**, for papers about humans, scenes or robots only. It draws a generic illustration, not data. All keys
  are optional; defaults are in brackets: `people` [2]; `camera` "moving" | "multiview" | "static"
  ["moving"]; `views` (multiview cameras) [4]; `ground` "plane" | "terrain" | "stairs" ["plane"]; `walls` [true];
  `objects` (boxes) [3]; `robot` [false] (true: the last person is drawn as a robot, robot color, label "robot");
  `contacts` [true] (foot-contact rings, contact color); `frames` (frusta along the path and ghost poses) [6];
  `ghosts` [true]; `trails` [true]; `ids` [true] (#1, #2 labels); `seed` [7]; `yaw` [-0.5], `pitch` [0.42]
  (initial view angle), `dist` [14.5] (eye distance, perspective strength). Framing is automatic (fits the
  scene, frusta and people with room for the key and tag). Height 380 px desktop, 300 px phone. Drag or arrow
  keys rotate, double-click resets. All variants above were rendered and checked. Always keep the `world-tag`.

### 3.3 Architecture diagram (feed-forward networks and pipelines)
```html
<figure class="panel wide arch-wide" style="padding-bottom:.8rem">
  <div class="arch" data-arch>
<script type="application/json">
{
  "title": "MethodName as implemented in the released code",
  "viewBox": [0, 0, 1240, 420],
  "minWidth": 1000,
  "groups": [{"x": 380, "y": 300, "w": 330, "h": 96, "label": "training only", "labelBelow": true}],
  "nodes": [
    {"id": "img", "x": 8, "y": 150, "w": 120, "h": 60, "label": "Input image", "sub": "RGB", "shape": "3×H×W",
     "e": "neutral", "state": "data", "detail": {"does": "One RGB image ...", "out": "3×H×W"}},
    {"id": "enc", "x": 190, "y": 150, "w": 160, "h": 60, "label": "Image encoder", "sub": "ViT-L/14", "shape": "F: N×1024",
     "e": "scene", "state": "frozen", "detail": {"does": "...", "in": "<span class=\"math\">I</span>", "out": "...",
     "params": "≈300 M, frozen", "train": "not trained here", "eq": "F = \\mathrm{ViT}(I)", "code": "src/encoder.py:40-88"}},
    {"id": "qry", "x": 410, "y": 40, "w": 160, "h": 60, "label": "Learned queries", "sub": "Q = 100", "e": "human",
     "state": "trained", "new": true, "detail": {"does": "..."}},
    {"id": "dec", "x": 640, "y": 140, "w": 170, "h": 80, "label": "Query decoder", "sub": "8 layers", "e": "human",
     "state": "trained", "mismatch": "Paper: 6 layers. Code: 8.", "detail": {"does": "..."}},
    {"id": "sum", "kind": "circle", "x": 520, "y": 330, "w": 44, "h": 44, "label": "Σ", "sub": "total loss",
     "subPos": "below", "e": "neutral", "state": "op"}
  ],
  "edges": [
    {"from": "img", "to": "enc", "label": "resized", "shape": "3×518×518", "pts": [[128, 180], [190, 180]], "lx": 159, "ly": 172},
    {"from": "enc", "to": "dec", "label": "K, V", "shape": "N×1024", "pts": [[350, 180], [640, 180]], "lx": 495, "ly": 172},
    {"from": "qry", "to": "dec", "label": "Q_0", "pts": [[570, 70], [725, 70], [725, 140]], "lx": 732, "ly": 105, "anchor": "start"},
    {"from": "dec", "to": "sum", "flow": "loss", "mismatch": "Paper: one loss. Code: one per layer.",
     "pts": [[725, 220], [725, 352], [564, 352]]}
  ],
  "steps": [
    {"title": "An image arrives", "text": "Plain sentence; <span class=\"math\">F</span> allowed.", "nodes": ["img", "enc"], "edges": ["img>enc"]},
    {"title": "The queries read the features", "text": "...", "nodes": ["enc", "qry", "dec"]}
  ]
}
</script>
  </div>
  <figcaption>Optional caption.</figcaption>
</figure>
```
Top level: `title` (aria label), `viewBox` [x, y, w, h], `minWidth` (px below which the diagram scrolls
sideways; use 1000), `groups`, `nodes`, `edges`, `steps`, `stages` (§3.4), `stageMatTitle`.
Host attribute `data-no-code` (`<div class="arch" data-arch data-no-code>`): the paper released no model code, so
the help line under the diagram ends "... whether it is trained and the key equation." instead of promising code
paths. Set it on every diagram of a paper without released code, and of a paper whose code was not read in this run.
Do not set it when the detail panels cite inherited code, for example a paper built on another paper's released code.

- **groups**: `{x, y, w, h, label, labelBelow, e}`: dotted frame, mono caps label 7 units above the top (or 17
  below the bottom with `labelBelow`). Use for "carried to next frame", "per person", "stage 1".
- **nodes**: `id`, `x`, `y`, `w`, `h` (viewBox units, top-left corner); `label` (bold, `\n` for a second line);
  `sub` (mono line under the label); `shape` (replaces `sub` when the reader ticks "Tensor shapes"); `e`
  (entity, default neutral); `state` (default op); `new`; `mismatch` (string: shown as "Paper ≠ code" in the
  detail panel); `kind: "circle"` (operator circle, 40-50 wide, 1-2 character label; its `sub` sits outside:
  `subPos` "below" (default) | "above" | "left" | "right", pick the side no edge uses).
- **detail** (panel shown on click): `title` (default: label; light markup `E_{depth}` and literal
  `<sub>`/`<sup>` tags render as sub/superscript, any other HTML is shown escaped), `does`, `in`, `out`, `params`, `train`, `eq`
  (LaTeX, rendered as display math), `code` (path, shown as code), `paper` (paper-vs-code text; defaults to the
  node's `mismatch`), `rows` (extra `[["Label", "html"], ...]`). All values except `eq` and `code` are raw HTML:
  light markup is NOT applied there, so write `d<sub>b</sub>` or `<span class=\"math\">d_b</span>`, never bare `d_b`.
- **edges**: `from`, `to`; `pts` (polyline in viewBox units, first point on the source border, last on the
  target border; the arrowhead is drawn at the last point); without `pts` an elbow route between side midpoints
  is made; `label`; `shape` (replaces the label when shapes are on); `lx`, `ly`, `anchor` ("start" | "middle" |
  "end") place the label (default: middle of the longest segment, 6 above a horizontal or 6 right of a
  vertical); `e`; `flow`; `mismatch` (string tooltip, ≠ badge at the path midpoint or at `bx`, `by`);
  `reverseParticles`; `id` (default `"from>to"`; set it when two edges share from and to).
- **steps**: `{title, text, nodes, edges}`. A step highlights its nodes and edges, fades the rest, runs particles
  along the edges and prints `Step i/N · title. text` above the diagram. Without `edges`, every edge between two
  listed nodes lights up. 6-10 steps that follow one frame through the model. Dwell time grows with the text.
  All steps are also listed under "All N steps as text" (complete without playing).
- **Light markup in labels, subs, shapes, edge labels, stage chips and the matrix**: `x_t`, `x^2` (one character,
  not followed by a letter), `F_{enc}`, `S_{t-1}`, `F^u_{enc}` (braces for anything longer). `pred_head`
  stays literal because a letter follows `_h`.
- Public API (for scratch screenshots): `PaperPage.archs[k].showStep(i)` (0-based), `.select(nodeId)`, `.clear()`;
  `k` counts the diagrams on the page in document order. `scripts/shot_state.sh` wraps it (§8).

### 3.4 Stage timeline (optimization methods)
Same component. Add `stages`; nodes for optimized variables use `state: "optimized"`, energy terms use
`state: "loss"`, pretrained models feeding the optimization are `frozen`. Each stage:
`{label, iters, note, title, text, nodes, vars, terms, edges}`:
- `label`: timeline button text ("1 · Root + scale"); button width ∝ `iters`; `note`: small text after "N it".
- `vars`: ids of variables optimized in this stage → moving dashed accent outline + "optimizes" chips.
- `terms`: `{"e_2d": 1.0, "e_prior": 0.04, "e_contact": true, "e_x": "ramp 0→1"}` → those loss nodes light up
  and show `λ = w` (number), `on` (true) or the string, in place of their sub line; "energy" chips.
- `nodes`: extra ids to keep highlighted (forward model, Σ); `edges`: optional explicit list.
- A matrix (variables × stages, energy terms × stages, iterations) is drawn under the diagram automatically,
  so the reader sees everything without playing; its header cells select a stage. `stageMatTitle` names it.
- "Run stages" animates all stages with a progress fill; clicking a node or "Show all" clears.
- Put initialization in the diagram as frozen nodes with edges labelled "init" into the variables (see the
  template). `init` is a label, not a `flow` value.

The second diagram in `templates/page.html` is a tested, complete stage timeline: copy it and
adapt. Its `viewBox` starts at y = -12 to leave room for an edge label above the top row.

### 3.5 Text blocks
```html
<div class="callout ne-box"><p class="callout-title">Where the paper and the released code differ</p><ul>
  <li><b>Decoder depth</b> is 8 layers in the released config, not 6. <span class="ev">p.4</span> <span class="ev code">configs/default.yaml:31</span></li></ul></div>
<div class="callout"><p class="callout-title">Title</p><p>...</p></div>
<ul class="keylist"><li><span class="k">Bold lead sentence.</span> Explanation.</li></ul>
<details class="more"><summary>Inference, step by step (code order)</summary> ... long material ... </details>
<div class="two-col wide"> <div>...</div> <div>...</div> </div>      <!-- also .three-col; 1 column on phones -->
<span class="math">\mathcal{L}_{rec}</span>                              <!-- inline KaTeX (MathML) -->
<span class="math-block">E = \sum_t \lVert x_t - \hat x_t \rVert^2</span>  <!-- display math -->
```
Math: raw LaTeX inside the span; in HTML escape `<` `>` `&` as `&lt;` `&gt;` `&amp;`; inside JSON strings double
every backslash (`\\sum`) and escape quotes (`\"`). Without KaTeX the raw LaTeX shows in mono.

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
<div class="wide" style="max-width:720px">
  <div class="stack e-human" role="img" aria-label="Trainable parameters, 60.0 M in total">
    <span style="width:40%" class="hot"></span><span style="width:25%"></span><span style="width:35%"></span></div>
  <div class="stack-key"><span><b>24.0 M</b> query decoder</span><span><b>15.0 M</b> prediction head</span><span><b>21.0 M</b> neck</span></div>
</div>
```
3-4 KPIs per row, always with `wide`. Stack widths are percentages that sum to 100.

### 3.7 Tabs
```html
<div class="tabs wide" data-tabs>
  <div class="tablist" role="tablist" aria-label="Result tables">
    <button type="button" role="tab" id="tab-main" aria-controls="tp-main" aria-selected="true">Main · Tab. 1</button>
    <button type="button" role="tab" id="tab-abl" aria-controls="tp-abl">Ablations · Tab. 3</button>
  </div>
  <div role="tabpanel" id="tp-main" aria-labelledby="tab-main"><p class="tp-lede">What is measured, units, lower/higher is better, what bold means.</p> ...table... </div>
  <div role="tabpanel" id="tp-abl" aria-labelledby="tab-abl"> ... </div>
</div>
```
Arrow keys, Home, End move between tabs. Ids must be unique on the page.

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
- Sortable columns: `th class="num"` in the **last** header row. Sort value = `data-v` if present, else the first
  number in the cell text; cells without a number ("—", "n/a") sort last.
- `td.best` bold, `td.second` underline (only as marked in the paper), `tr.ours` tinted row, `tr.sep` thick rule
  between groups, `td.yes` / `td.no` for ✓ / ✗ (a ✗ row header: `<th scope="row" class="no">✗</th>`), `td.num` right-aligned.
- `tr[data-flag="reason"]`: an amber triangle is appended to the row's `th scope="row"` with the reason as a
  tooltip. Flag extra inputs, GT intrinsics, test-time optimization, different splits, numbers copied from
  other papers.
  The triangle goes after the last inline piece of the header (before a trailing block such as a year line)
  in a `span.flag-joint` (nowrap) with the last word, or after a word joiner when the label ends in an element
  (`<a>`, `<b>`, math), so it never drops onto a line of its own, even in a wrapping cell.
- Cells do not wrap; wide tables scroll inside `.tbl-wrap`. For a text table add the modifier `wrap`
  (`<table class="data wrap">`): `td` cells wrap, row headers stay on one line. Extra tuning (min-width,
  top alignment, wrapping row headers) stays page-local on a second class.

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
`note` (HTML). Say in the note when you computed the deltas yourself.

### 3.11 Paper figures + lightbox
```html
<h3>Results in the paper's own figures</h3>
<div class="paper-figs wide">
  <figure>
    <a href="assets/<slug>/fig_1.jpg" data-lightbox><img src="assets/<slug>/fig_1.jpg" alt="What is in the image, concretely" loading="lazy" width="2600" height="760"></a>
    <figcaption>What to look at. <span class="credit">Fig. 1 of Author et al., Venue Year.</span></figcaption>
  </figure>
</div>
```
One column, every figure full width (never thumbnails). `width`/`height` = the file's real pixel size, which
`scripts/extract_figure.py` prints when it saves a crop; for other files:
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
`issues` items are numbered 01, 02 ... automatically. Pair the verdict with ablation bars (§3.10) when the
paper has ablations. Put the full stop before the evidence chips, never after them: a chip that wraps would leave a
lone full stop on the next line.

## 4. Drawing the architecture diagram

- **Scale.** Use `"viewBox": [0, 0, 1240, H]` and `"minWidth": 1000`. At a 1280 px laptop the SVG is drawn at
  ≈0.9 px per unit. Fonts are fixed in viewBox units: node label 15 (bold sans), sub / shape / edge label 13.5
  (mono), group label 13, NEW tag 12. That is ≈13 px and ≈12 px on screen, the minimum. Never shrink text,
  never scale the viewBox wider than 1240 (it would make text smaller). Phones scroll the diagram sideways.
- **Grid.** 5-7 columns. Column x positions about 150-210 apart (for example 8, 190, 410, 640, 870, 1080).
  Rows about 80-110 apart. Gap between nodes ≥ 40 units, ≥ 50 where an edge label sits in the gap.
  Leave ≥ 12 units above the top row for NEW tags and ≠ badges (or start the viewBox at y = -12). Set H to the
  content bottom + about 20.
- **Node size.** Rect nodes: h 56-66 (60 standard; 2-line label + sub: h ≥ 70), w 120-170; tall nodes for a
  decoder or state (e.g. 150×280). Label width ≈ 8.5 units per character, sub ≈ 8.1 per character
  (mono); both must fit in `w − 14`: w 150 → label ≤ 15 chars, sub ≤ 16; w 160 → 17 / 18; w 180 → 19 / 20.
  Edge labels ≤ 24 characters. Circle labels 1-2 characters (⊕, Σ, β, f).
- **Overflow warning.** After the fonts load, site.js measures every node label, sub and shape (with the toggle
  on). Text wider than the node is squeezed and logged:
  `[site.js] diagram text "..." is 152 units wide but node "proj" allows 136: shorten the text or widen the node.`
  Zero console messages therefore means no node text overflows. Edge labels are not measured: check them in the
  zoom crops.
- **Edges.** Give explicit orthogonal `pts` for every edge that bends; start and end exactly on node borders
  (right middle = [x + w, y + h/2], top middle = [x + w/2, y], ...). Share a vertical "bus" x for fan-in/fan-out
  (the template's stage timeline uses buses). Do not route an edge through a node or a label.
- **Edge labels never sit on a line.** Horizontal edge at y: label baseline `ly = y − 8`, `anchor "middle"`.
  Vertical edge at x: `lx = x + 7, anchor "start"` or `lx = x − 7, anchor "end"`. Keep labels ≥ 4 units away from
  other lines, badges and glyphs, and ≥ 12 units from node borders: a selected node's ring sits 8 units outside it.
  Put a circle's sub on the side no edge leaves from (`subPos`).
- **Glyphs, tags, badges.** State glyph: bottom-right inside the node (11×11). NEW tag: top-left, 9 units above
  the top edge (36×17). Node ≠ badge: top-right corner, 10 units above and 10 right of the node (24×18). Keep 8+
  units around them clear of edges, labels and group frames (a group border just above a node collides with its
  ≠ badge).
- **Paper vs code.** Draw what the code builds when code exists; mark every difference with `mismatch` on the
  node or edge and list them again in a `callout ne-box` below the diagram (as the template does).
- **Adding a node / edge / step.** Node: free grid cell, size from the character rule, entity, state, detail.
  Edge: `pts` border to border, then the label position. Step: node ids plus edge ids (`"from>to"` or `id`).

## 5. Drawing the storyboard panels
- `viewBox="0 0 260 160"`, drawn at ≈1:1 on desktop (≤ 400 px wide). Text 12 (sans) and mono 11 are the floor;
  do not set smaller font sizes. Width estimate: mono 11 ≈ 6.6 units per character, sans 12 ≈ 7.2.
- Keep every text ≥ 4 units from any line, glyph or shape; put labels above or below a grid of tokens, not on it.
- Draw the real input (frame strip, views, egocentric hands, robot) in panel 1 and the real output in the
  last panel. Panels must be readable at rest; animation only adds emphasis.

## 6. Writing rules
- Headings are claims: "One frozen encoder, one fine-tuned neck, one trained query decoder", not "Method".
- Short sentences, everyday words. One idea per sentence. Define every term on first use (tooltip or a
  parenthesis). One name per thing across the page.
- Numbers exactly as in the notes (and their §12 verification log, which wins), with units and "lower/higher is
  better". "Not stated" stays visible. Plot-read or derived values are marked ("≈", "read from the plot",
  "derived", "counted from code").
- Every critical point carries an evidence chip (`Tab.3`, `p.7`, `Fig.2`, code path). Your own inference ends
  with `<span class="spec">speculation</span>`. Do not soften or exaggerate the findings in the notes.
- Internal words never appear on the page, in tooltips or in alt text: "digest", "notes file", "brief", "agent".
  Write "our reading" or "our analysis".
- Captions say what to look at. The world widget is always labelled as an illustration.
- No emojis, no hype words, no filler.

## 7. Pitfalls (each one happened in the first collection)
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
19. **Training status not stated** → node `state: "unstated"` (dotted box, chip "training not stated", legend
    entry when used). No page-local CSS needed.
20. **Frame-by-frame build-up** in a storyboard → class `grow` on the `data-frame` elements (§3.2); do not add a
    page-local `.is-playing` rule.
21. **Text tables** → `table.data.wrap` (§3.8), not a page-local `white-space: normal` rule.
22. **Inference stated as fact** is the most common checker finding. Every claim that goes beyond the paper gets
    `speculation` or "our reading".
23. **Low-resolution figures** look poor next to the paper. Crop with `scripts/extract_figure.py`; never shrink a
    figure into a thumbnail.
24. **Wording that assumes video** ("frame", "per video") on a page about another input → `#labels` (§1).

## 8. Check procedure (do all of it, then fix and repeat)

1. Render and run the console check:
   ```bash
   bash <skill>/scripts/check_page.sh <out>/<slug>.html <notes>/vis/<slug>
   ```
   It writes `<slug>.desktop-N.png` (1280 px) and `<slug>.phone-N.png` (500 px), 1600 px per slice, into the vis
   folder; older slices move to `.old/`. A phone page taller than 16000 px also gets one render per section,
   `<slug>.phone-<section>-N.png`. Then it checks that every local file the page references exists
   (`missing: <path>`), and runs the console check (`console: clean`, or every console line).
   - Exit 0 means clean. Exit 1 means console messages or missing files. Exit 3 means no Chrome, or a Python
     without Pillow.
   - While a collection is being built, `missing: <slug>.html` for a page that does not exist yet is expected.
     Every other `missing:` line is a defect, and at the final look there must be none.
   - A desktop page taller than 16000 px is cut too; the script says so. Check the sections past the cut with
     `shot_state.sh --section <id>`.
   - The console check catches JSON errors, unknown node/edge ids, unknown `e`/`state`/`flow` values, missing
     glossary keys, unknown `#entities`/`#labels` keys and node-text overflow.
   - The script uses `$PYTHON` (a Python with Pillow) when set, then `~/.claude/venv/bin/python`, then `python3`.
   - Offline, KaTeX and the web fonts do not load and the console stays clean: formulas show as raw LaTeX in
     mono. Check math rendering online.
2. Open **every** PNG with the Read tool and look: clipping, overlaps, text on lines, overflow, tiny text, empty
   figures, phone overflow, ugly spacing, the world box edges.
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
4. Hidden states (a selected node with shapes on, a step, a stage, every tab):
   ```bash
   S=<notes>/scratch/<slug>
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/node.png --query 'node=<id>&shapes=1'
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/step.png --query 'step=3'
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/stage.png --query 'arch=1&stage=0'   # 2nd diagram in the section
   bash <skill>/scripts/shot_state.sh <out>/<slug>.html $S/tab.png --section experiments --query 'tab=<tab button id>'
   ```
   The script shows only one section (`--section`, default `architecture`). `step` is 1-based; `stage` (the matrix
   column) and `arch` (which diagram in the section) are 0-based. `--js '<code>'` runs extra JavaScript for any other
   state; `--height` takes a taller window for long panels. Exit 1 means the state did not apply; the message says
   why. An existing PNG of the same name moves to `.old/`.
5. Re-read every table on the page against the notes, cell by cell.

## 9. Checklist before you return
- [ ] Five sections with the fixed ids, claim headings, TOC, real prev/next links, `#glossary`.
- [ ] Idea figure: real-looking input, 3-5 steps, output; Play/Replay work; resting state complete; world tagged
      as illustration (or no world if it does not fit the paper).
- [ ] Detailed diagram specific to this paper (network, stage timeline, robot pipeline or capture pipeline);
      every node has a `detail`; steps or stages; shapes where known; ≠ on every paper/code difference.
- [ ] All text in diagrams ≥ 12 px at 1280 (fonts untouched), no label on a line, no overflow warning.
- [ ] Method text: losses with math, recipe, inference, tricks, paper vs code; long parts in `details.more`.
- [ ] Experiments: training data first, KPIs, every main table from the notes in tabs, numbers exact,
      best/second as in the paper, flags with reasons, ablation bars, 1-3 paper figures with credit and real
      width/height.
- [ ] Analysis: carries vs minor grounded in ablation numbers, stated limits, not-shown points with evidence
      chips, speculation labelled, open questions.
- [ ] Rendered light at desktop + phone, PNGs in `vis/<slug>/`, every PNG read, both diagrams zoomed, hidden
      states screenshotted, console clean, tables re-checked.
- [ ] Report: page path, what the two figures show, page-local CSS/JS added, PNGs looked at, remaining issues.
