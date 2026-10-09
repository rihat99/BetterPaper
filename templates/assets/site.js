/* site.js — shared behaviour for the paper pages (vanilla JS, no build step).
   Every component is optional and data-driven; a missing element is skipped.
   Light theme only: no dark mode, no theme toggle, no localStorage.
   Components (see references/design_guide.md of the better-paper skill for snippets):
     TOC scroll-spy ...... nav.toc
     math ................ .math / .math-block (KaTeX, MathML output)
     tooltips/glossary ... [data-tip], [data-term], <script id="glossary">
     tabs ................ [data-tabs]
     sortable tables ..... table[data-sortable], tr[data-flag]
     lightbox ............ a[data-lightbox]
     bar chart ........... [data-bars] + JSON
     architecture ........ [data-arch] + JSON (nodes, edges, steps, stages)
     entity names ........ <script id="entities"> (renames legend slots)
     page labels ......... <script id="labels"> (time unit "frame", three legend labels)
     world widget ........ [data-world] + JSON
     storyboard player ... [data-story]
     pager ............... a[data-prev], a[data-next]
   Public API: window.PaperPage (renderMath, worlds, archs). */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PP = (window.PaperPage = window.PaperPage || {});
  PP.worlds = [];
  PP.archs = [];

  /* ─────────── utilities ─────────── */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function motionOK() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function h(tag, attrs, html) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    if (html !== undefined && html !== null) el.innerHTML = html;
    return el;
  }
  function s(tag, attrs, parent) {
    var el = doc.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(el);
    return el;
  }
  function icon(id) {
    return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }
  function readJSON(host) {
    var sc = host.querySelector('script[type="application/json"]');
    if (!sc) { console.error('[site.js] missing JSON <script> in', host); return null; }
    try { return JSON.parse(sc.textContent); } catch (e) {
      console.error('[site.js] invalid JSON in', host, e.message);
      return null;
    }
  }
  /* Light markup in diagram labels: x_t or x^2 (one character, then a non-letter), x_{t-1} or x^{-1} (braces).
     "Head_projection" stays literal because the character after "_p" is a letter. */
  var MARK_RE = /([_^])(?:\{([^}]*)\}|([^\s{}](?![A-Za-z])))/g;
  function plain(str) { return String(str || '').replace(MARK_RE, function (m, k, a, b) { return a !== undefined ? a : b; }).replace(/\n/g, ' '); }
  function esc(str) { return String(str).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* the same light markup as HTML (<sub>/<sup>), for diagram labels repeated in chips and tables */
  function markHTML(str) { return esc(String(str || '').replace(/\n/g, ' ')).replace(MARK_RE, function (m, k, a, b) { var t = a !== undefined ? a : b; return k === '_' ? '<sub>' + t + '</sub>' : '<sup>' + t + '</sup>'; }); }
  /* detail-panel title: light markup plus literal <sub>/<sup> tags; any other HTML stays escaped */
  function titleHTML(str) { return markHTML(str).replace(/&lt;(\/?)(sub|sup)&gt;/g, '<$1$2>'); }
  /* SVG text with light markup (see MARK_RE); "\n" for a new line is handled by callers. */
  function richText(textEl, str) {
    textEl.textContent = '';
    var re = new RegExp(MARK_RE.source, 'g'), last = 0, m, shift = 0;
    function add(txt, dy, small) {
      if (!txt) return;
      var t = s('tspan', {}, textEl);
      t.textContent = txt;
      if (dy) t.setAttribute('dy', dy);
      if (small) t.setAttribute('font-size', '75%');
    }
    str = String(str);
    while ((m = re.exec(str))) {
      if (m.index > last) { add(str.slice(last, m.index), shift ? -shift : null, false); shift = 0; }
      var d = m[1] === '_' ? 3.5 : -5;
      add(m[2] !== undefined ? m[2] : m[3], (shift ? -shift : 0) + d, true);
      shift = d;
      last = re.lastIndex;
    }
    if (last < str.length) add(str.slice(last), shift ? -shift : null, false);
  }
  /* Diagram text never shrinks (it must stay >= 12 px on a laptop). Text wider than its node is squeezed
     horizontally as a stopgap and reported with console.warn, so the builder shortens it or widens the node. */
  function fitText(el, maxW, warn) {
    if (!el || !el.getComputedTextLength) return;
    el.removeAttribute('textLength'); el.removeAttribute('lengthAdjust');
    var w = el.getComputedTextLength();
    if (!w || w <= maxW) return;
    el.setAttribute('textLength', maxW); el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    if (warn && !el._warned) {
      el._warned = true;
      console.warn('[site.js] diagram text "' + el.textContent + '" is ' + Math.round(w) + ' units wide but node "' + (el._who || '?') + '" allows ' + Math.round(maxW) + ': shorten the text or widen the node.');
    }
  }

  /* ─────────── glyph sprite (injected once if the page does not include it) ─────────── */
  var SPRITE =
    '<symbol id="g-lock" viewBox="0 0 12 12"><rect x="2" y="5.2" width="8" height="5.8" rx="1.2"/><path d="M4 5.2V3.9a2 2 0 0 1 4 0v1.3" fill="none" stroke="currentColor" stroke-width="1.4"/></symbol>' +
    '<symbol id="g-dot" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4"/></symbol>' +
    '<symbol id="g-half" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.7" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 2.3a3.7 3.7 0 0 0 0 7.4z"/></symbol>' +
    '<symbol id="g-cycle" viewBox="0 0 12 12"><path d="M9.7 4.3A4 4 0 1 0 10 7.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.8 1.4v3.6H7.2z"/></symbol>' +
    '<symbol id="g-new" viewBox="0 0 12 12"><path d="M6 1l5 5-5 5-5-5z"/></symbol>' +
    '<symbol id="g-play" viewBox="0 0 12 12"><path d="M3 1.6v8.8L10.4 6z"/></symbol>' +
    '<symbol id="g-pause" viewBox="0 0 12 12"><rect x="2.4" y="1.8" width="2.7" height="8.4" rx=".5"/><rect x="6.9" y="1.8" width="2.7" height="8.4" rx=".5"/></symbol>' +
    '<symbol id="g-prev" viewBox="0 0 12 12"><path d="M8 1.8L3.8 6 8 10.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="g-next" viewBox="0 0 12 12"><path d="M4 1.8L8.2 6 4 10.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="g-replay" viewBox="0 0 12 12"><path d="M2.7 6.2a3.4 3.4 0 1 0 1.1-2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 1.2v3.6h3.6z"/></symbol>';
  function initSprite() {
    if (doc.getElementById('g-lock')) return;
    var holder = doc.createElementNS(SVGNS, 'svg');
    holder.setAttribute('class', 'sprite');
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = SPRITE;
    doc.body.insertBefore(holder, doc.body.firstChild);
  }

  /* ─────────── TOC: scroll-spy; collapsed on narrow screens ─────────── */
  function initToc() {
    var toc = $('nav.toc');
    if (!toc) return;
    var det = $('details', toc);
    if (det && window.matchMedia) {
      var wide = window.matchMedia('(min-width: 1440px)');
      var sync = function () { det.open = wide.matches; };
      sync();
      if (wide.addEventListener) wide.addEventListener('change', sync);
    }
    var links = $$('a[href^="#"]', toc), items = [];
    links.forEach(function (a) {
      var t = doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (t) items.push({ a: a, t: t });
    });
    if (!items.length) return;
    var ticking = false;
    function spy() {
      ticking = false;
      var line = window.innerHeight * 0.3, cur = items[0];
      items.forEach(function (it) { if (it.t.getBoundingClientRect().top <= line) cur = it; });
      items.forEach(function (it) {
        it.a.classList.toggle('is-active', it === cur);
        if (it === cur) it.a.setAttribute('aria-current', 'true'); else it.a.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* ─────────── math: KaTeX → MathML; raw LaTeX stays in mono if KaTeX is absent ─────────── */
  function renderMath(ctx) {
    var els = $$('.math, .math-block', ctx || doc).filter(function (el) { return !el.classList.contains('math-ok'); });
    if (!els.length) return;
    if (!window.katex || !window.katex.render) { els.forEach(function (el) { el.classList.add('math-raw'); }); return; }
    els.forEach(function (el) {
      var tex = el.getAttribute('data-tex') || el.textContent;
      el.setAttribute('data-tex', tex);
      try {
        window.katex.render(tex, el, { output: 'mathml', displayMode: el.classList.contains('math-block'), throwOnError: false, strict: 'ignore' });
        el.classList.add('math-ok');
      } catch (e) {
        el.textContent = tex;
        el.classList.add('math-raw');
      }
    });
  }
  PP.renderMath = renderMath;

  /* ─────────── tooltips (shared popover) + metric glossary ─────────── */
  var GLOSSARY = {
    'MPJPE': 'Mean per-joint position error (mm) after aligning the root (pelvis) joint. Lower is better.',
    'PA-MPJPE': 'MPJPE (mm) after Procrustes alignment (rotation, translation, scale) to ground truth. Measures articulated pose only. Lower is better.',
    'PVE': 'Per-vertex error (mm) of the body mesh after aligning the root. Also called V2V or MVE. Lower is better.',
    'W-MPJPE': 'World-frame MPJPE (mm): each segment (usually 100 frames) is aligned to ground truth using only its first two frames, so camera and root drift count. Lower is better.',
    'WA-MPJPE': 'World-frame MPJPE (mm) after aligning the whole segment (usually 100 frames) to ground truth with one similarity transform. Lower is better.',
    'RTE': 'Root translation error (%): error of the root trajectory after rigid alignment without scale, divided by the total distance travelled. Lower is better.',
    'MRPE': 'Mean root position error (mm) in the camera frame, without alignment: is the person at the right depth and place? Lower is better.',
    'ATE': 'Absolute trajectory error (m) of camera positions after aligning the whole trajectory to ground truth (here with scale, Sim(3)). Lower is better.',
    'RPE': 'Relative pose error between nearby frames (translation and rotation). Measures local drift. Lower is better.',
    'Abs Rel': 'Mean absolute relative depth error |d̂ − d| / d over valid pixels. Lower is better.',
    'δ<1.25': 'Share of pixels whose predicted depth is within a factor 1.25 of ground truth. Higher is better.',
    'Jitter': 'Mean jerk (third derivative) of joint positions; measures temporal smoothness. Lower is better.',
    'Foot sliding': 'Mean displacement of feet while they are in contact with the ground. Lower is better.',
    'Accel': 'Acceleration error of joints versus ground truth (mm/frame²). Lower is better.',
    'Chamfer': 'Chamfer distance: mean nearest-neighbour distance between two point sets, both directions. Lower is better.',
    'F1': 'Harmonic mean of precision and recall. Higher is better.',
    'Precision': 'Share of predictions that match a ground-truth instance. Higher is better.',
    'Recall': 'Share of ground-truth instances that are found. Higher is better.',
    'FPS': 'Frames per second at inference, on the hardware stated. Higher is better.'
  };
  var pop = null, popFor = null;
  function showTip(el) {
    var text = el.getAttribute('data-tip');
    if (!text) return;
    if (!pop) { pop = h('div', { class: 'pop', role: 'tooltip', id: 'pp-pop' }); pop.hidden = true; doc.body.appendChild(pop); }
    var title = el.getAttribute('data-tip-title');
    pop.innerHTML = (title ? '<b>' + esc(title) + '</b>' : '') + esc(text);
    pop.hidden = false;
    popFor = el;
    el.setAttribute('aria-describedby', 'pp-pop');
    var r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    var top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 8 > 0) top = r.top - ph - 8;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (top + window.scrollY) + 'px';
  }
  function hideTip() {
    if (pop) pop.hidden = true;
    if (popFor) popFor.removeAttribute('aria-describedby');
    popFor = null;
  }
  function initTips() {
    var extra = doc.getElementById('glossary');
    if (extra) {
      try { var add = JSON.parse(extra.textContent); Object.keys(add).forEach(function (k) { GLOSSARY[k] = add[k]; }); }
      catch (e) { console.error('[site.js] invalid #glossary JSON', e.message); }
    }
    $$('[data-term]').forEach(function (el) {
      var key = el.getAttribute('data-term') || el.textContent.trim();
      var def = GLOSSARY[key];
      if (!def) { console.warn('[site.js] no glossary entry for "' + key + '"'); return; }
      el.classList.add('term');
      el.setAttribute('data-tip', def);
      el.setAttribute('data-tip-title', key);
      if (!/^(A|BUTTON|INPUT)$/.test(el.tagName) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (t && t !== popFor) showTip(t);
    });
    doc.addEventListener('mouseout', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (t && t === popFor && !(e.relatedTarget && t.contains(e.relatedTarget))) hideTip();
    });
    doc.addEventListener('focusin', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (t) showTip(t); else hideTip();
    });
    doc.addEventListener('focusout', function (e) { if (e.target === popFor) hideTip(); });
    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { hideTip(); return; }
      if (t.closest('th') && t.closest('.sort')) return;
      if (popFor === t && pop && !pop.hidden && e.pointerType !== 'mouse') hideTip(); else showTip(t);
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
    window.addEventListener('resize', hideTip);
  }

  /* ─────────── tabs ─────────── */
  function initTabs() {
    $$('[data-tabs]').forEach(function (box) {
      var tabs = $$('[role="tab"]', box);
      if (!tabs.length) return;
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          var p = doc.getElementById(t.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
        if (focus) tab.focus();
      }
      var first = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      select(first, false);
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t, false); });
        t.addEventListener('keydown', function (e) {
          var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
          if (j === null) return;
          e.preventDefault();
          select(tabs[(j + tabs.length) % tabs.length], true);
        });
      });
    });
  }

  /* ─────────── sortable tables + unfair-comparison flags ─────────── */
  function cellValue(cell) {
    if (!cell) return NaN;
    var v = cell.getAttribute('data-v');
    if (v === null) v = cell.textContent;
    var m = String(v).replace(/[,\s]/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }
  /* The flag goes after the last inline piece of the label (before a trailing block such as a year line), in a
     nowrap span with the last word, so it never starts a line of its own. */
  function attachFlag(cell, flag) {
    var anchor = null;
    for (var i = cell.childNodes.length - 1; i >= 0 && !anchor; i--) {
      var n = cell.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) anchor = n;
      else if (n.nodeType === 1 && /^inline/.test(getComputedStyle(n).display)) anchor = n;
    }
    if (!anchor) { cell.appendChild(flag); return; }
    var joint = h('span', { class: 'flag-joint' });
    if (anchor.nodeType === 3) {
      var at = anchor.textContent.search(/\S+\s*$/);
      if (at > 0) anchor = anchor.splitText(at);
      cell.insertBefore(joint, anchor);
      joint.appendChild(anchor);
    } else {
      // an element (link, bold, math) stays outside so it can still wrap; a word joiner glues the flag to it
      cell.insertBefore(joint, anchor.nextSibling);
      joint.appendChild(doc.createTextNode('\u2060'));
    }
    joint.appendChild(flag);
  }
  function initTables() {
    $$('tr[data-flag]').forEach(function (tr) {
      var first = tr.querySelector('th[scope="row"]') || tr.querySelector('th, td');
      if (!first || first.querySelector('.flag')) return;
      var b = h('button', { type: 'button', class: 'flag', 'data-tip': tr.getAttribute('data-flag'), 'data-tip-title': 'Comparison caveat', 'aria-label': 'Comparison caveat: ' + tr.getAttribute('data-flag') });
      attachFlag(first, b);
    });
    $$('table[data-sortable]').forEach(function (table) {
      var tbody = table.tBodies[0];
      if (!tbody) return;
      var original = $$('tr', tbody);
      var headRow = table.tHead ? table.tHead.rows[table.tHead.rows.length - 1] : null;
      if (!headRow) return;
      Array.prototype.forEach.call(headRow.cells, function (th, colIdx) {
        if (!th.classList.contains('num')) return;
        var btn = h('button', { type: 'button', class: 'sort', 'aria-label': 'Sort by ' + th.textContent.trim() });
        while (th.firstChild) btn.appendChild(th.firstChild);
        th.appendChild(btn);
        th.setAttribute('aria-sort', 'none');
        btn.addEventListener('click', function () {
          var state = th.getAttribute('aria-sort');
          var next = state === 'none' ? 'ascending' : state === 'ascending' ? 'descending' : 'none';
          Array.prototype.forEach.call(headRow.cells, function (c) { if (c.hasAttribute('aria-sort')) c.setAttribute('aria-sort', 'none'); });
          th.setAttribute('aria-sort', next);
          var rows = original.slice();
          if (next !== 'none') {
            var dir = next === 'ascending' ? 1 : -1;
            rows.sort(function (a, b) {
              var va = cellValue(a.cells[colIdx]), vb = cellValue(b.cells[colIdx]);
              if (isNaN(va) && isNaN(vb)) return 0;
              if (isNaN(va)) return 1;
              if (isNaN(vb)) return -1;
              return (va - vb) * dir;
            });
          }
          table.classList.toggle('is-sorted', next !== 'none');
          rows.forEach(function (r) { tbody.appendChild(r); });
        });
      });
    });
  }

  /* ─────────── lightbox ─────────── */
  function initLightbox() {
    var links = $$('a[data-lightbox]');
    if (!links.length || typeof HTMLDialogElement !== 'function') return;
    var dlg = h('dialog', { class: 'lightbox', 'aria-label': 'Enlarged figure' });
    var close = h('button', { type: 'button', class: 'btn close' }, 'Close');
    var img = h('img', { alt: '' });
    var cap = h('p');
    dlg.appendChild(close); dlg.appendChild(img); dlg.appendChild(cap);
    doc.body.appendChild(dlg);
    close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var src = a.querySelector('img');
        img.src = a.getAttribute('href');
        img.alt = src ? src.alt : '';
        var fc = a.closest('figure') && a.closest('figure').querySelector('figcaption');
        cap.textContent = fc ? fc.textContent : '';
        dlg.showModal();
      });
    });
  }

  /* ─────────── bar chart from JSON ─────────── */
  function initBars() {
    $$('[data-bars]').forEach(function (host) {
      var d = readJSON(host);
      if (!d || !d.items) return;
      var max = d.max || Math.max.apply(null, d.items.map(function (it) { return Math.abs(it.value); }));
      var wrap = h('div', { class: 'bars', role: 'img', 'aria-label': d.title || 'Bar chart' });
      if (d.title) wrap.appendChild(h('p', { class: 'bars-title' }, esc(d.title)));
      d.items.forEach(function (it) {
        var row = h('div', { class: 'bar-row ' + (it.group || '') + (it.e ? ' e-' + it.e : '') });
        row.appendChild(h('div', { class: 'bar-label' }, it.label + (it.src ? ' <span class="ev">' + esc(it.src) + '</span>' : '')));
        var track = h('div', { class: 'bar-track' });
        var fill = h('div', { class: 'bar-fill' });
        fill.style.width = Math.max(0.6, 100 * Math.abs(it.value) / max) + '%';
        track.appendChild(fill);
        row.appendChild(track);
        var shown = it.display !== undefined ? it.display : (it.prefix || '') + it.value + (d.unit ? ' ' + d.unit : '');
        row.appendChild(h('div', { class: 'bar-val' }, esc(shown)));
        if (it.note) row.setAttribute('title', it.note);
        wrap.appendChild(row);
      });
      if (d.note) wrap.appendChild(h('p', { class: 'bars-note' }, d.note));
      host.appendChild(wrap);
    });
  }

  /* ─────────── architecture diagram ─────────── */
  var STATE_TXT = { frozen: 'frozen, pretrained', finetuned: 'fine-tuned', trained: 'trained from scratch', optimized: 'optimized per input', unstated:'training not stated', op: 'no learned parameters', data: 'data', loss: 'loss or energy term' };
  var ENTITY_TXT = { human: 'human', scene: 'scene', camera: 'camera', contact: 'contact', robot: 'robot', neutral: 'other' };
  /* <script type="application/json" id="entities">{"human": "query tokens"}</script> renames entity slots for this page
     (legend and detail chips); colors stay. An unknown key is a typo, so it is reported. */
  function initEntities() {
    var sc = doc.getElementById('entities');
    if (!sc) return;
    var names;
    try { names = JSON.parse(sc.textContent); } catch (e) { console.error('[site.js] invalid #entities JSON', e.message); return; }
    Object.keys(names).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(ENTITY_TXT, k)) ENTITY_TXT[k] = names[k];
      else console.warn('[site.js] unknown entity slot "' + k + '" in #entities; slots: ' + Object.keys(ENTITY_TXT).join(', '));
    });
  }
  var FLOW_TXT = { feat: 'tokens / features', geom: 'geometry: points, poses, meshes', loss: 'loss / supervision', rec: 'recurrent: carried to the next frame' };
  /* <script type="application/json" id="labels">{"unit": "token", "units": "tokens"}</script> renames, for this page,
     the time unit of the storyboard status and the diagram narration, and three legend labels (state optimized,
     flows rec and geom): not every paper runs on video frames. An unknown key is a typo, so it is reported. */
  var LABELS = { unit: 'frame', units: 'frames', optimized: STATE_TXT.optimized, rec: null, geom: FLOW_TXT.geom };
  function initLabels() {
    var sc = doc.getElementById('labels');
    if (!sc) return;
    var set;
    try { set = JSON.parse(sc.textContent); } catch (e) { console.error('[site.js] invalid #labels JSON', e.message); return; }
    Object.keys(set).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(LABELS, k)) LABELS[k] = set[k];
      else console.warn('[site.js] unknown key "' + k + '" in #labels; keys: ' + Object.keys(LABELS).join(', '));
    });
    if (set.unit !== undefined && set.units === undefined) LABELS.units = LABELS.unit + 's';
    STATE_TXT.optimized = LABELS.optimized;
    FLOW_TXT.geom = LABELS.geom;
    FLOW_TXT.rec = LABELS.rec || 'recurrent: carried to the next ' + LABELS.unit;
  }
  /* a typo in e / state / flow would otherwise draw a black node or an "undefined" chip with a clean console */
  function checkVal(kind, id, key, value, table) {
    if (!Object.prototype.hasOwnProperty.call(table, value)) console.warn('[site.js] ' + kind + ' "' + id + '": unknown ' + key + ' "' + value + '"; allowed: ' + Object.keys(table).join(', '));
  }
  var GLYPH = { frozen: 'g-lock', finetuned: 'g-half', trained: 'g-dot', optimized: 'g-cycle' };
  var DETAIL_ROWS = [['does', 'What it does'], ['in', 'In'], ['out', 'Out'], ['params', 'Params'], ['train', 'Training'], ['eq', 'Equation'], ['code', 'Code'], ['paper', 'Paper ≠ code']];

  function roundedPath(pts, r) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var rr = Math.min(r, d1 / 2, d2 / 2);
      if (!d1 || !d2) continue;
      var a = [p1[0] + (p0[0] - p1[0]) * rr / d1, p1[1] + (p0[1] - p1[1]) * rr / d1];
      var b = [p1[0] + (p2[0] - p1[0]) * rr / d2, p1[1] + (p2[1] - p1[1]) * rr / d2];
      d += ' L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + p1[0] + ' ' + p1[1] + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    var last = pts[pts.length - 1];
    return d + ' L' + last[0] + ' ' + last[1];
  }
  function anchorOf(n, side) {
    var cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    if (side === 'r') return [n.x + n.w, cy];
    if (side === 'l') return [n.x, cy];
    if (side === 't') return [cx, n.y];
    return [cx, n.y + n.h];
  }
  function autoPts(a, b) {
    var sp, tp, m;
    if (b.x >= a.x + a.w) { sp = anchorOf(a, 'r'); tp = anchorOf(b, 'l'); if (Math.abs(sp[1] - tp[1]) < 1) return [sp, tp]; m = (sp[0] + tp[0]) / 2; return [sp, [m, sp[1]], [m, tp[1]], tp]; }
    if (b.x + b.w <= a.x) { sp = anchorOf(a, 'l'); tp = anchorOf(b, 'r'); if (Math.abs(sp[1] - tp[1]) < 1) return [sp, tp]; m = (sp[0] + tp[0]) / 2; return [sp, [m, sp[1]], [m, tp[1]], tp]; }
    if (b.y >= a.y + a.h) { sp = anchorOf(a, 'b'); tp = anchorOf(b, 't'); if (Math.abs(sp[0] - tp[0]) < 1) return [sp, tp]; m = (sp[1] + tp[1]) / 2; return [sp, [sp[0], m], [tp[0], m], tp]; }
    sp = anchorOf(a, 't'); tp = anchorOf(b, 'b'); if (Math.abs(sp[0] - tp[0]) < 1) return [sp, tp]; m = (sp[1] + tp[1]) / 2; return [sp, [sp[0], m], [tp[0], m], tp];
  }
  function labelSpot(pts) {
    var best = 0, bi = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (L > best) { best = L; bi = i; }
    }
    var p = pts[bi], q = pts[bi + 1];
    if (Math.abs(p[1] - q[1]) < Math.abs(p[0] - q[0])) return { x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2 - 6, anchor: 'middle' };
    return { x: (p[0] + q[0]) / 2 + 6, y: (p[1] + q[1]) / 2 + 4, anchor: 'start' };
  }

  function Arch(host) {
    var data = readJSON(host);
    if (!data || !data.nodes) return;
    var self = this;
    var vb = data.viewBox || [0, 0, 1000, 500];
    var nodes = {}, edges = [], edgeById = {};
    var steps = data.steps || [], stages = data.stages || [];
    var stageIdx = -1, stageTimer = null, segs = [], runBtn = null, stageWeighted = {};
    stages.forEach(function (st) { Object.keys(st.terms || {}).forEach(function (id) { stageWeighted[id] = true; }); });
    var stepIdx = -1, playTimer = null, particles = [], rafId = null;

    /* DOM skeleton */
    var bar = h('div', { class: 'arch-bar' });
    var narr = h('div', { class: 'arch-narr', 'aria-live': 'polite' });
    var hint = h('p', { class: 'arch-hint' }, 'The diagram is wider than the screen: scroll it sideways.');
    var body = h('div', { class: 'arch-body' });
    var scroll = h('div', { class: 'arch-scroll' });
    var detail = h('div', { class: 'arch-detail', 'aria-live': 'polite' });
    var svg = s('svg', { class: 'arch-svg', viewBox: vb.join(' '), role: 'group', 'aria-label': data.title || 'Architecture diagram' });
    svg.style.minWidth = (data.minWidth || 900) + 'px';
    scroll.appendChild(svg);
    body.appendChild(scroll);
    body.appendChild(detail);
    var timeline = stages.length ? h('div', { class: 'arch-timeline', role: 'group', 'aria-label': 'Optimization stages' }) : null;
    host.appendChild(bar);
    if (timeline) host.appendChild(timeline);
    host.appendChild(narr);
    host.appendChild(hint);
    host.appendChild(body);

    var gGroups = s('g', { class: 'groups' }, svg);
    var gEdges = s('g', { class: 'edges' }, svg);
    var gNodes = s('g', { class: 'nodes' }, svg);
    var gPart = s('g', { class: 'particles', 'aria-hidden': 'true' }, svg);

    /* groups */
    (data.groups || []).forEach(function (gr) {
      var g = s('g', { class: 'group' + (gr.e ? ' e-' + gr.e : '') }, gGroups);
      s('rect', { x: gr.x, y: gr.y, width: gr.w, height: gr.h, rx: 12 }, g);
      var t = s('text', { x: gr.x + 10, y: gr.y + (gr.labelBelow ? gr.h + 17 : -7) }, g);
      t.textContent = gr.label || '';
    });

    /* nodes */
    data.nodes.forEach(function (n) {
      n.state = n.state || 'op';
      n.e = n.e || 'neutral';
      checkVal('node', n.id, 'e', n.e, ENTITY_TXT);
      checkVal('node', n.id, 'state', n.state, STATE_TXT);
      nodes[n.id] = n;
      var circle = n.kind === 'circle';
      var cls = 'node e-' + n.e + ' s-' + n.state + (n.shape ? ' has-shape' : '') + (n['new'] ? ' is-new' : '');
      var g = s('g', { class: cls, tabindex: '0', role: 'button', 'data-id': n.id, 'aria-label': plain(n.label) + ' (' + (STATE_TXT[n.state] || n.state) + '). Show details.' }, gNodes);
      s('title', {}, g).textContent = plain(n.label) + (n.sub ? ' · ' + plain(n.sub) : '');
      var cx = n.x + n.w / 2, cy = n.y + n.h / 2, rx = n.state === 'data' ? Math.min(n.h / 2, 16) : 8;
      if (circle) {
        if (n['new']) s('circle', { class: 'ring-new', cx: cx, cy: cy, r: n.w / 2 + 4 }, g);
        s('circle', { class: 'sel-ring', cx: cx, cy: cy, r: n.w / 2 + 8 }, g);
        s('circle', { class: 'box', cx: cx, cy: cy, r: n.w / 2 }, g);
      } else {
        if (n['new']) s('rect', { class: 'ring-new', x: n.x - 4, y: n.y - 4, width: n.w + 8, height: n.h + 8, rx: rx + 4 }, g);
        s('rect', { class: 'sel-ring', x: n.x - 8, y: n.y - 8, width: n.w + 16, height: n.h + 16, rx: rx + 7 }, g);
        s('rect', { class: 'box', x: n.x, y: n.y, width: n.w, height: n.h, rx: rx }, g);
        if (GLYPH[n.state]) s('use', { class: 'glyph', href: '#' + GLYPH[n.state], x: n.x + n.w - 14, y: n.y + n.h - 13, width: 11, height: 11 }, g).setAttribute('fill', 'currentColor');
      }
      var lines = String(n.label || '').split('\n');
      var maxW = circle ? n.w - 6 : n.w - 14;
      var weighted = stageWeighted[n.id];
      var lineH = 18, hasSub = !!(n.sub || n.shape || weighted);
      var blockH = lines.length * lineH + (hasSub && !circle ? 16 : 0);
      var y0 = cy - blockH / 2 + 13;
      lines.forEach(function (ln, i) {
        var t = s('text', { class: 'lab', x: cx, y: y0 + i * lineH, 'text-anchor': 'middle' }, g);
        richText(t, ln);
        t._maxW = maxW; t._who = n.id;
      });
      if (hasSub) {
        /* circles put their sub line outside: below (default), above, left or right (subPos), clear of edges */
        var pos = circle ? (n.subPos || 'below') : 'in';
        var sx = pos === 'left' ? n.x - 8 : pos === 'right' ? n.x + n.w + 8 : cx;
        var sy = pos === 'in' ? y0 + lines.length * lineH : pos === 'above' ? n.y - 9 : pos === 'below' ? n.y + n.h + 17 : cy + 5;
        var anc = pos === 'left' ? 'end' : pos === 'right' ? 'start' : 'middle';
        var sw = circle ? 400 : maxW;
        [['sub', n.sub], ['shp', n.shape], ['wt', weighted ? ' ' : '']].forEach(function (k) {
          if (!k[1]) return;
          var st = s('text', { class: k[0], x: sx, y: sy, 'text-anchor': anc }, g);
          richText(st, k[1]);
          st._maxW = sw; st._who = n.id;
          if (k[0] === 'wt') n._wt = st;
        });
      }
      if (n['new']) {
        var nt = s('g', { class: 'tag-new-g' }, g);
        var tx = circle ? cx - 18 : n.x + 8, ty = circle ? n.y - 15 : n.y - 9;
        s('rect', { class: 'tag-new', x: tx, y: ty, width: 36, height: 17, rx: 3 }, nt);
        var ntt = s('text', { class: 'tag-new-t', x: tx + 18, y: ty + 12.8, 'text-anchor': 'middle' }, nt);
        ntt.textContent = 'NEW';
      }
      if (n.mismatch) {
        var bx = circle ? cx + n.w / 2 - 6 : n.x + n.w - 14, by = n.y - 10;
        var bg = s('g', { class: 'badge-ne' }, g);
        s('rect', { x: bx, y: by, width: 24, height: 18, rx: 4 }, bg);
        var btx = s('text', { x: bx + 12, y: by + 13.5, 'text-anchor': 'middle' }, bg);
        btx.textContent = '≠';
      }
      n._g = g;
      g.addEventListener('click', function (e) { e.stopPropagation(); select(n.id); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id); }
        if (e.key === 'Escape') { clearAll(); }
      });
    });

    /* edges */
    (data.edges || []).forEach(function (ed, i) {
      var a = nodes[ed.from], b = nodes[ed.to];
      if (!a || !b) { console.error('[site.js] arch edge with unknown node', ed); return; }
      ed.id = ed.id || ed.from + '>' + ed.to;
      ed.flow = ed.flow || 'feat';
      checkVal('edge', ed.id, 'flow', ed.flow, FLOW_TXT);
      // an inherited e was already checked on its source node
      if (ed.e) checkVal('edge', ed.id, 'e', ed.e, ENTITY_TXT);
      ed.e = ed.e || a.e;
      var pts = ed.pts || autoPts(a, b);
      var g = s('g', { class: 'edge e-' + ed.e + ' f-' + ed.flow + (ed.shape ? ' has-shape' : ''), 'data-id': ed.id }, gEdges);
      s('title', {}, g).textContent = plain(a.label) + ' → ' + plain(b.label) + (ed.label ? ': ' + plain(ed.label) : '') + (ed.shape ? ' [' + plain(ed.shape) + ']' : '');
      var full = roundedPath(pts, 9);
      s('path', { class: 'halo', d: full }, g);
      // shorten the visible line so it ends under the arrowhead
      var L = pts.length, end = pts[L - 1], prev = pts[L - 2];
      var dx = end[0] - prev[0], dy = end[1] - prev[1], dl = Math.hypot(dx, dy) || 1;
      var ux = dx / dl, uy = dy / dl, head = ed.flow === 'geom' ? 10 : 8.5;
      var cut = pts.slice(0, L - 1).concat([[end[0] - ux * (head - 2), end[1] - uy * (head - 2)]]);
      var line = s('path', { class: 'line', d: roundedPath(cut, 9) }, g);
      var hw = ed.flow === 'geom' ? 5.2 : 4.4;
      s('path', { class: 'arrow', d: 'M' + end[0] + ' ' + end[1] + ' L' + (end[0] - ux * head - uy * hw).toFixed(1) + ' ' + (end[1] - uy * head + ux * hw).toFixed(1) + ' L' + (end[0] - ux * head + uy * hw).toFixed(1) + ' ' + (end[1] - uy * head - ux * hw).toFixed(1) + 'Z' }, g);
      var spot = ed.lx !== undefined ? { x: ed.lx, y: ed.ly, anchor: ed.anchor || 'middle' } : labelSpot(pts);
      if (ed.label) { var lt = s('text', { class: 'elab', x: spot.x, y: spot.y, 'text-anchor': spot.anchor }, g); richText(lt, ed.label); }
      if (ed.shape) { var st = s('text', { class: 'eshp', x: spot.x, y: spot.y, 'text-anchor': spot.anchor }, g); richText(st, ed.shape); }
      if (ed.mismatch) {
        var mp = ed.bx !== undefined ? [ed.bx, ed.by] : null;
        if (!mp) { var pl = line.getTotalLength ? line.getTotalLength() : 0; var pp = pl ? line.getPointAtLength(pl * 0.5) : { x: pts[0][0], y: pts[0][1] }; mp = [pp.x, pp.y]; }
        var bg = s('g', { class: 'badge-ne' }, g);
        s('rect', { x: mp[0] - 12, y: mp[1] - 9, width: 24, height: 18, rx: 4 }, bg);
        var bt = s('text', { x: mp[0], y: mp[1] + 4.5, 'text-anchor': 'middle' }, bg);
        bt.textContent = '≠';
        s('title', {}, bg).textContent = ed.mismatch;
      }
      ed._g = g; ed._line = line;
      edges.push(ed);
      edgeById[ed.id] = ed;
    });

    /* check every label once the web fonts are in; shape labels are measured with the shapes toggle on */
    function fitAll(warn) {
      var had = svg.classList.contains('show-shapes');
      svg.classList.remove('show-shapes');
      $$('text.lab, text.sub', svg).forEach(function (t) { if (t._maxW) fitText(t, t._maxW, warn); });
      svg.classList.add('show-shapes');
      $$('text.shp', svg).forEach(function (t) { if (t._maxW) fitText(t, t._maxW, warn); });
      if (!had) svg.classList.remove('show-shapes');
    }
    if (doc.fonts && doc.fonts.ready) { fitAll(false); doc.fonts.ready.then(function () { fitAll(true); }); } else fitAll(true);

    /* focus = highlight a set of nodes/edges; everything else fades */
    function edgesFor(set) {
      if (set.edges) return set.edges.map(function (id) { if (!edgeById[id]) console.error('[site.js] arch step references unknown edge', id); return edgeById[id]; }).filter(Boolean);
      var inSet = {}; (set.nodes || []).forEach(function (id) { inSet[id] = 1; });
      return edges.filter(function (ed) { return inSet[ed.from] && inSet[ed.to]; });
    }
    function focus(set) {
      stopParticles();
      if (!set) {
        svg.classList.remove('has-focus');
        $$('.on', svg).forEach(function (el) { el.classList.remove('on'); });
        return;
      }
      svg.classList.add('has-focus');
      $$('.on', svg).forEach(function (el) { el.classList.remove('on'); });
      (set.nodes || []).forEach(function (id) { if (nodes[id]) nodes[id]._g.classList.add('on'); else console.error('[site.js] arch step references unknown node', id); });
      var es = edgesFor(set);
      es.forEach(function (ed) { ed._g.classList.add('on'); });
      startParticles(es);
    }
    function startParticles(es) {
      if (!motionOK() || !es.length) return;
      es.forEach(function (ed) {
        var len = ed._line.getTotalLength();
        if (!len) return;
        var n = len > 160 ? 3 : 2;
        for (var k = 0; k < n; k++) {
          var c = s('circle', { class: 'particle e-' + ed.e, r: ed.flow === 'geom' ? 3.8 : 3.2 }, gPart);
          particles.push({ c: c, path: ed._line, len: len, phase: k / n, rev: !!ed.reverseParticles });
        }
      });
      var t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var sec = (t - t0) / 1000;
        particles.forEach(function (p) {
          var u = (sec * 90 / p.len + p.phase) % 1;
          var pt = p.path.getPointAtLength((p.rev ? 1 - u : u) * p.len);
          p.c.setAttribute('cx', pt.x.toFixed(1));
          p.c.setAttribute('cy', pt.y.toFixed(1));
        });
        rafId = window.requestAnimationFrame(frame);
      }
      rafId = window.requestAnimationFrame(frame);
    }
    function stopParticles() {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      particles.forEach(function (p) { p.c.remove(); });
      particles = [];
    }

    /* detail panel */
    // data-no-code on the host: the paper released no model code, so the help line does not promise code paths
    var restHTML = '<p class="empty">Click or tap any block for what it does, its inputs and outputs, whether it is trained' + (host.hasAttribute('data-no-code') ? ' and the key equation.' : ', the key equation and the code path.') + (steps.length ? ' Or press <b>Play</b> to walk through the data flow in ' + steps.length + ' steps.' : '') + '</p>';
    detail.innerHTML = restHTML;
    function showDetail(n) {
      var d = n.detail || {};
      var chips = '<span class="chip e-' + n.e + '">' + ENTITY_TXT[n.e] + '</span> <span class="chip s-' + n.state + '">' + (STATE_TXT[n.state] || n.state) + '</span>' +
        (n['new'] ? ' <span class="chip s-new">new in this paper</span>' : '') + (n.mismatch ? ' <span class="ne">≠ paper</span>' : '');
      var rows = '';
      DETAIL_ROWS.forEach(function (r) {
        var v = r[0] === 'paper' ? (d.paper || (typeof n.mismatch === 'string' ? n.mismatch : '')) : d[r[0]];
        if (!v) return;
        if (r[0] === 'eq') v = '<span class="math-block">' + esc(v) + '</span>';
        if (r[0] === 'code') v = '<code>' + esc(v) + '</code>';
        rows += '<dt>' + r[1] + '</dt><dd' + (r[0] === 'paper' ? ' class="paper"' : '') + '>' + v + '</dd>';
      });
      (d.rows || []).forEach(function (r) { rows += '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; });
      detail.innerHTML = '<div class="dh"><h4>' + titleHTML(d.title || n.label) + '</h4><div class="chips">' + chips + '</div></div>' + (rows ? '<dl>' + rows + '</dl>' : '');
      detail.classList.add('has-node');
      renderMath(detail);
    }
    function select(id) {
      pause();
      stopStages();
      clearStageMarks();
      var n = nodes[id];
      if (!n) return;
      $$('.node.sel', svg).forEach(function (g) { g.classList.remove('sel'); });
      n._g.classList.add('sel');
      var inc = edges.filter(function (ed) { return ed.from === id || ed.to === id; });
      var near = [id];
      inc.forEach(function (ed) { near.push(ed.from === id ? ed.to : ed.from); });
      stepIdx = -1;
      focus({ nodes: near, edges: inc.map(function (ed) { return ed.id; }) });
      narr.innerHTML = '<span class="k">Selected</span>' + markHTML(n.label) + ' with its ' + inc.length + ' connection' + (inc.length === 1 ? '' : 's') + '. Press Esc or “Show all” to clear.';
      updateBar();
      showDetail(n);
    }
    function clearAll() {
      pause();
      stopStages();
      clearStageMarks();
      stepIdx = -1;
      $$('.node.sel', svg).forEach(function (g) { g.classList.remove('sel'); });
      focus(null);
      detail.innerHTML = restHTML;
      detail.classList.remove('has-node');
      restNarr();
      updateBar();
    }
    svg.addEventListener('click', function (e) { if (e.target === svg) clearAll(); });

    /* steps */
    function restNarr() {
      narr.innerHTML = steps.length
        ? '<span class="k">' + steps.length + ' steps</span>Full diagram shown. Press Play, or use the arrows, to follow one ' + esc(LABELS.unit) + ' through the model.'
        : stages.length
          ? '<span class="k">' + stages.length + ' stages</span>Full pipeline shown. Press Run stages, or pick a stage, to see what each stage optimizes and which energy terms are on.'
          : '<span class="k">Diagram</span>Click a block for details.';
    }
    function showStep(i) {
      stopStages();
      clearStageMarks();
      stepIdx = i;
      $$('.node.sel', svg).forEach(function (g) { g.classList.remove('sel'); });
      if (i < 0) { focus(null); restNarr(); updateBar(); return; }
      var st = steps[i];
      focus(st);
      narr.innerHTML = '<span class="k">Step ' + (i + 1) + '/' + steps.length + '</span>' + (st.title ? '<b>' + st.title + '.</b> ' : '') + (st.text || '');
      renderMath(narr);
      updateBar();
    }
    function dwell(i) { var st = steps[i] || {}; return Math.min(8000, 2600 + 32 * plain((st.title || '') + (st.text || '')).length); }
    function play() {
      if (!steps.length) return;
      if (stepIdx >= steps.length - 1 || stepIdx < 0) showStep(0); else showStep(stepIdx + 1);
      schedule();
    }
    function schedule() {
      clearTimeout(playTimer);
      playTimer = setTimeout(function () {
        if (stepIdx >= steps.length - 1) { playTimer = null; showStep(-1); return; }
        showStep(stepIdx + 1);
        schedule();
      }, dwell(stepIdx));
      updateBar();
    }
    function pause() { clearTimeout(playTimer); playTimer = null; updateBar(); }

    var bPrev, bPlay, bNext, bAll, status;
    function updateBar() {
      if (!bPlay) return;
      var playing = !!playTimer;
      bPlay.innerHTML = playing ? icon('g-pause') + ' Pause' : icon('g-play') + (stepIdx >= 0 ? ' Resume' : ' Play');
      bPlay.setAttribute('aria-pressed', playing ? 'true' : 'false');
      bPrev.disabled = stepIdx < 0;
      bNext.disabled = stepIdx >= steps.length - 1;
      status.textContent = stepIdx >= 0 ? 'Step ' + (stepIdx + 1) + ' / ' + steps.length : 'All ' + steps.length + ' steps';
    }
    if (steps.length) {
      bPrev = h('button', { type: 'button', class: 'btn', 'aria-label': 'Previous step' }, icon('g-prev'));
      bPlay = h('button', { type: 'button', class: 'btn' });
      bNext = h('button', { type: 'button', class: 'btn', 'aria-label': 'Next step' }, icon('g-next'));
      status = h('span', { class: 'status' });
      bPrev.addEventListener('click', function () { pause(); showStep(stepIdx - 1); });
      bNext.addEventListener('click', function () { pause(); showStep(stepIdx + 1); });
      bPlay.addEventListener('click', function () { if (playTimer) pause(); else play(); });
      bar.appendChild(bPrev); bar.appendChild(bPlay); bar.appendChild(bNext); bar.appendChild(status);
      host.addEventListener('keydown', function (e) {
        if (e.target.closest && e.target.closest('input, .node')) return;
        if (e.key === 'ArrowRight' && stepIdx < steps.length - 1) { pause(); showStep(stepIdx + 1); }
        if (e.key === 'ArrowLeft' && stepIdx >= 0) { pause(); showStep(stepIdx - 1); }
      });
    }
    bar.appendChild(h('span', { class: 'spacer' }));
    var hasShapes = data.nodes.some(function (n) { return n.shape; }) || (data.edges || []).some(function (e) { return e.shape; });
    if (hasShapes) {
      var lab = h('label');
      var cb = h('input', { type: 'checkbox' });
      lab.appendChild(cb);
      lab.appendChild(doc.createTextNode('Tensor shapes'));
      cb.addEventListener('change', function () { svg.classList.toggle('show-shapes', cb.checked); });
      bar.appendChild(lab);
    }
    bAll = h('button', { type: 'button', class: 'btn' }, 'Show all');
    bAll.addEventListener('click', clearAll);
    bar.appendChild(bAll);

    /* stage timeline (optimization pipelines). One button per stage, width ∝ iterations; a stage
       highlights its optimized variables (vars → moving dashed outline) and its energy terms
       (terms → loss nodes show their weight in place of the sub line). A matrix below the diagram
       lists vars × stages and terms × stages, so everything is readable without playing. */
    function stageSet(st) {
      var ids = (st.nodes || []).slice();
      (st.vars || []).concat(Object.keys(st.terms || {})).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      return { nodes: ids, edges: st.edges };
    }
    function weightText(w) { return w === true ? 'on' : typeof w === 'number' ? 'λ = ' + w : String(w); }
    function clearStageMarks() {
      $$('.node.opt-on, .node.show-wt', svg).forEach(function (g) { g.classList.remove('opt-on'); g.classList.remove('show-wt'); });
      segs.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); $('.fill', b).style.width = '0'; });
      $$('.cur', host).forEach(function (c) { c.classList.remove('cur'); });
      stageIdx = -1;
    }
    function stopStages() {
      if (stageTimer) window.cancelAnimationFrame(stageTimer);
      stageTimer = null;
      if (runBtn) runBtn.innerHTML = icon('g-play') + ' Run stages';
    }
    function stageProgress(i, frac) {
      segs.forEach(function (b, j) { $('.fill', b).style.width = (j < i ? 100 : j === i ? 100 * frac : 0) + '%'; });
      var it = $('.iter', narr);
      if (it && stages[i].iters) it.textContent = Math.round(frac * stages[i].iters);
    }
    function showStage(i) {
      pause();
      stepIdx = -1;
      $$('.node.sel', svg).forEach(function (g) { g.classList.remove('sel'); });
      clearStageMarks();
      stageIdx = i;
      var st = stages[i];
      focus(stageSet(st));
      (st.vars || []).forEach(function (id) { if (nodes[id]) nodes[id]._g.classList.add('opt-on'); else console.error('[site.js] arch stage references unknown node', id); });
      Object.keys(st.terms || {}).forEach(function (id) {
        var n = nodes[id];
        if (!n) { console.error('[site.js] arch stage references unknown node', id); return; }
        n._g.classList.add('show-wt');
        if (n._wt) richText(n._wt, weightText(st.terms[id]));
      });
      segs[i].setAttribute('aria-pressed', 'true');
      $$('[data-stage="' + i + '"]', host).forEach(function (c) { c.classList.add('cur'); });
      function chip(id, cls) { var n = nodes[id]; return n ? '<span class="chip ' + cls + ' e-' + n.e + '"><span>' + markHTML(n.label) + '</span></span>' : ''; }
      var chips = '';
      if ((st.vars || []).length) chips += '<span>optimizes</span>' + st.vars.map(function (id) { return chip(id, 's-optimized'); }).join('');
      var tk = Object.keys(st.terms || {});
      if (tk.length) chips += '<span>energy</span>' + tk.map(function (id) { var n = nodes[id]; return n ? '<span class="chip s-loss"><span>' + markHTML(n.label) + ' · ' + markHTML(weightText(st.terms[id])) + '</span></span>' : ''; }).join('');
      narr.innerHTML = '<span class="k">Stage ' + (i + 1) + '/' + stages.length + (st.iters ? ' · <span class="iter">' + st.iters + '</span> / ' + st.iters + ' it' : '') + '</span>' +
        (st.title ? '<b>' + st.title + '.</b> ' : '') + (st.text || '') + (chips ? '<div class="stage-chips">' + chips + '</div>' : '');
      renderMath(narr);
      stageProgress(i, 1);
      updateBar();
    }
    if (timeline) {
      runBtn = h('button', { type: 'button', class: 'btn' }, icon('g-play') + ' Run stages');
      bar.insertBefore(runBtn, bar.firstChild);
      segs = stages.map(function (st, i) {
        var b = h('button', { type: 'button', 'aria-pressed': 'false' }, esc(st.label) + '<small>' + (st.iters ? st.iters + ' it' : '') + (st.note ? (st.iters ? ' · ' : '') + esc(st.note) : '') + '</small><span class="fill"></span>');
        b.style.flexGrow = Math.max(1, st.iters || 1);
        b.addEventListener('click', function () { stopStages(); showStage(i); });
        timeline.appendChild(b);
        return b;
      });
      runBtn.addEventListener('click', function () {
        if (stageTimer) { stopStages(); return; }
        if (!motionOK()) { showStage(stageIdx < 0 || stageIdx >= stages.length - 1 ? 0 : stageIdx + 1); return; }
        runBtn.innerHTML = icon('g-pause') + ' Pause';
        var totalIt = stages.reduce(function (a, st) { return a + (st.iters || 100); }, 0);
        var durs = stages.map(function (st) { return 2600 + 5000 * (st.iters || 100) / totalIt; });
        var t0 = null, cur = -1;
        function tick(t) {
          if (t0 === null) t0 = t;
          var el = t - t0, i = 0;
          while (i < durs.length && el > durs[i]) { el -= durs[i]; i++; }
          if (i >= durs.length) { stopStages(); stageProgress(stages.length - 1, 1); return; }
          if (i !== cur) { cur = i; showStage(i); }
          stageProgress(i, el / durs[i]);
          stageTimer = window.requestAnimationFrame(tick);
        }
        stageTimer = window.requestAnimationFrame(tick);
      });
      /* matrix: rows = optimized variables, then energy terms; columns = stages */
      var varIds = data.nodes.filter(function (n) { return stages.some(function (st) { return (st.vars || []).indexOf(n.id) >= 0; }); }).map(function (n) { return n.id; });
      var termIds = data.nodes.filter(function (n) { return stages.some(function (st) { return (st.terms || {})[n.id] !== undefined; }); }).map(function (n) { return n.id; });
      if (varIds.length || termIds.length) {
        var head = '<tr><th scope="col">' + (data.stageMatTitle || 'Per stage') + '</th>' + stages.map(function (st, i) {
          return '<th scope="col" data-stage="' + i + '" tabindex="0">' + esc(st.label) + '</th>';
        }).join('') + '</tr>';
        var rowsH = varIds.map(function (id) {
          return '<tr><th scope="row"><span class="row-kind">var</span>' + markHTML(nodes[id].label) + '</th>' + stages.map(function (st, i) {
            var on = (st.vars || []).indexOf(id) >= 0;
            return '<td data-stage="' + i + '" class="' + (on ? 'on' : 'off') + '">' + (on ? 'optimized' : 'fixed') + '</td>';
          }).join('') + '</tr>';
        }).join('') + termIds.map(function (id) {
          return '<tr><th scope="row"><span class="row-kind">energy</span>' + markHTML(nodes[id].label) + '</th>' + stages.map(function (st, i) {
            var w = (st.terms || {})[id];
            return '<td data-stage="' + i + '" class="' + (w !== undefined ? 'on' : 'off') + '">' + (w !== undefined ? markHTML(weightText(w)) : 'off') + '</td>';
          }).join('') + '</tr>';
        }).join('');
        if (stages.some(function (st) { return st.iters; })) rowsH += '<tr><th scope="row"><span class="row-kind">iters</span>iterations</th>' + stages.map(function (st, i) { return '<td data-stage="' + i + '" class="on">' + (st.iters || '–') + '</td>'; }).join('') + '</tr>';
        var mat = h('div', { class: 'stage-mat' }, '<div class="tbl-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + rowsH + '</tbody></table></div>');
        host.appendChild(mat);
        $$('th[data-stage]', mat).forEach(function (th) {
          var go = function () { stopStages(); showStage(+th.getAttribute('data-stage')); };
          th.addEventListener('click', go);
          th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        });
      }
    }

    /* legend: only what this diagram uses */
    var used = { e: {}, s: {}, f: {}, isNew: false, ne: false };
    data.nodes.forEach(function (n) { used.e[n.e] = 1; used.s[n.state] = 1; if (n['new']) used.isNew = true; if (n.mismatch) used.ne = true; });
    edges.forEach(function (ed) { used.e[ed.e] = 1; used.f[ed.flow] = 1; if (ed.mismatch) used.ne = true; });
    var lg = h('div', { class: 'legend', 'aria-label': 'Legend' });
    function sw(inner) { return '<svg class="arch-svg" viewBox="0 0 30 18" aria-hidden="true">' + inner + '</svg>'; }
    function item(svgInner, txt) { lg.insertAdjacentHTML('beforeend', '<span class="lg">' + sw(svgInner) + txt + '</span>'); }
    ['human', 'scene', 'camera', 'contact', 'robot', 'neutral'].forEach(function (e) {
      if (used.e[e]) item('<g class="node e-' + e + ' s-trained"><rect class="box" x="3" y="3" width="24" height="12" rx="3"/></g>', ENTITY_TXT[e]);
    });
    lg.insertAdjacentHTML('beforeend', '<span class="lg-sep"></span>');
    ['frozen', 'finetuned', 'trained', 'optimized', 'unstated', 'op', 'data', 'loss'].forEach(function (st) {
      if (!used.s[st]) return;
      var gl = GLYPH[st] ? '<use class="glyph" href="#' + GLYPH[st] + '" x="16" y="4" width="10" height="10" fill="currentColor"/>' : '';
      item('<g class="node e-neutral s-' + st + '"><rect class="box" x="2" y="2" width="26" height="14" rx="' + (st === 'data' ? 7 : 3) + '"/>' + gl + '</g>', STATE_TXT[st]);
    });
    if (used.isNew) item('<g class="node e-neutral s-op"><rect class="ring-new" x="2" y="2" width="26" height="14" rx="5"/><rect class="box" x="5" y="5" width="20" height="8" rx="2"/></g>', 'new in this paper');
    lg.insertAdjacentHTML('beforeend', '<span class="lg-sep"></span>');
    ['feat', 'geom', 'loss', 'rec'].forEach(function (f) {
      if (used.f[f]) item('<g class="edge e-neutral f-' + f + '"><path class="line" d="M2 9H23"/><path class="arrow" d="M28 9L20 5V13Z"/></g>', FLOW_TXT[f]);
    });
    if (used.ne) item('<g class="badge-ne"><rect x="4" y="1" width="22" height="16" rx="4"/><text x="15" y="13" text-anchor="middle">≠</text></g>', 'paper and released code differ');
    host.appendChild(lg);

    /* all steps as text (complete without playing anything) */
    if (steps.length) {
      var list = steps.map(function (st, i) { return '<li><b>' + (st.title || 'Step ' + (i + 1)) + '.</b> ' + (st.text || '') + '</li>'; }).join('');
      var det = h('details', { class: 'more' }, '<summary>All ' + steps.length + ' steps as text</summary><ol>' + list + '</ol>');
      host.appendChild(det);
      renderMath(det);
    }

    restNarr();
    updateBar();
    self.select = select;
    self.showStep = showStep;
    self.clear = clearAll;
    PP.archs.push(self);
  }

  /* ─────────── world widget: stylized 3D scene on a canvas (generic, not real data) ─────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function v3(x, y, z) { return [x, y, z]; }
  function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul3(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm3(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function World(host) {
    var cfg = readJSON(host) || {};
    var C = {
      people: 2, camera: 'moving', ground: 'plane', walls: true, objects: 3, robot: false,
      contacts: true, frames: 6, seed: 7, ghosts: true, trails: true, ids: true,
      yaw: -0.5, pitch: 0.42, dist: 14.5
    };
    Object.keys(cfg).forEach(function (k) { C[k] = cfg[k]; });
    var canvas = host.querySelector('canvas');
    if (!canvas) { canvas = doc.createElement('canvas'); host.insertBefore(canvas, host.firstChild); }
    canvas.setAttribute('tabindex', '0');
    if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', 'Illustrative 3D world: drag or use arrow keys to rotate');
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var rnd = mulberry32(C.seed);
    var X0 = -5.2, X1 = 4.6;
    var view = { yaw: C.yaw, pitch: C.pitch, dist: C.dist, target: [0, 0.9, 3.2] };
    var progress = 1;
    var col = {};

    function groundY(x, z) {
      if (C.ground === 'terrain') return 0.28 * Math.sin(x * 0.8 + 0.5) + 0.2 * Math.cos(z * 1.2 + x * 0.35);
      if (C.ground === 'stairs') return x > 0.6 ? Math.min(6, Math.floor((x - 0.6) / 0.55) + 1) * 0.17 : 0;
      return 0;
    }
    /* scene points: ground, back wall, side wall, a few boxes */
    var pts = [];
    var i, x, y, z;
    for (i = 0; i < 1500; i++) { x = -7 + rnd() * 14; z = -0.5 + rnd() * 8; pts.push({ p: [x, groundY(x, z), z], w: 0 }); }
    if (C.walls) {
      for (i = 0; i < 900; i++) {
        x = -7 + rnd() * 14; y = rnd() * 3.4;
        var bay = Math.floor((x + 7) / 1.75) % 3;
        if (bay === 1 && y > 1.1 && y < 2.4) continue;
        pts.push({ p: [x, y + groundY(x, 7.6), 7.6 + rnd() * 0.06], w: 1 });
      }
      for (i = 0; i < 380; i++) { z = rnd() * 7.6; y = rnd() * 3.0; pts.push({ p: [-7, y + groundY(-7, z), z], w: 1 }); }
    }
    for (var o = 0; o < C.objects; o++) {
      var ox = -5 + o * 3.6 + rnd() * 1.4, oz = 5.4 + rnd() * 1.4, sx = 0.6 + rnd() * 0.8, sz = 0.4 + rnd() * 0.4, sy = 0.45 + rnd() * 0.5;
      var gy = groundY(ox, oz);
      for (i = 0; i < 110; i++) {
        var u = rnd(), v = rnd(), face = rnd();
        if (face < 0.45) pts.push({ p: [ox + (u - 0.5) * sx, gy + sy, oz + (v - 0.5) * sz], w: 2 });
        else if (face < 0.8) pts.push({ p: [ox + (u - 0.5) * sx, gy + v * sy, oz - sz / 2], w: 2 });
        else pts.push({ p: [ox + (rnd() < 0.5 ? -sx / 2 : sx / 2), gy + v * sy, oz + (u - 0.5) * sz], w: 2 });
      }
    }
    pts.forEach(function (q) { q.seen = C.camera === 'moving' ? clamp01((q.p[0] - (X0 + 4.2)) / (X1 - X0)) : 0; });

    /* cameras */
    function camAt(t) {
      if (C.camera === 'static') return { c: [0, 1.6, -3.2], f: norm3([0, -0.12, 1]) };
      var cx = X0 + (X1 - X0) * t;
      var c = [cx, 1.55 + 0.08 * Math.sin(t * 9), -2.6 + 0.35 * Math.sin(t * 3.2)];
      return { c: c, f: norm3([0.25 * Math.sin(t * 2.4) + 0.12, -0.13, 1]) };
    }
    var multi = [];
    if (C.camera === 'multiview') {
      var nv = C.views || 4;
      for (i = 0; i < nv; i++) {
        var a = -Math.PI / 2 + (i - (nv - 1) / 2) * 0.62;
        var c = [6.2 * Math.cos(a), 1.8, 3.2 + 6.2 * Math.sin(a)];
        multi.push({ c: c, f: norm3(sub3([0, 0.9, 3.2], c)) });
      }
    }

    /* people: walk across the ground plane */
    var people = [];
    for (i = 0; i < C.people; i++) {
      var dir = i % 2 === 0 ? 1 : -1;
      var zz = 1.2 + (i * 1.45) % 4.6;
      var xs = dir > 0 ? -4.8 + i * 0.7 : 3.6 - i * 0.4;
      people.push({ dir: dir, z: zz, xs: xs, len: 6.4 - (i % 3) * 0.7, ph: i * 1.7, robot: C.robot && i === C.people - 1, id: i + 1 });
    }
    function skeleton(pe, t) {
      var x0 = pe.xs + pe.dir * pe.len * t, zc = pe.z + 0.25 * Math.sin(t * 5 + pe.ph);
      var phase = t * 22 + pe.ph;
      var fwd = [pe.dir, 0, 0], side = [0, 0, 1], up = [0, 1, 0];
      var hipH = 0.95 + 0.025 * Math.abs(Math.sin(phase));
      var root = [x0, groundY(x0, zc), zc];
      var pelvis = add3(root, [0, hipH, 0]);
      function limb(start, ang, bend, l1, l2) {
        var k = add3(start, add3(mul3(fwd, Math.sin(ang) * l1), mul3(up, -Math.cos(ang) * l1)));
        var e = add3(k, add3(mul3(fwd, Math.sin(ang - bend) * l2), mul3(up, -Math.cos(ang - bend) * l2)));
        return [k, e];
      }
      var sw = 0.48 * Math.sin(phase);
      var hipL = add3(pelvis, mul3(side, 0.1)), hipR = add3(pelvis, mul3(side, -0.1));
      var legL = limb(hipL, sw, Math.max(0, 0.9 * Math.sin(phase + 1.6)), 0.46, 0.46);
      var legR = limb(hipR, -sw, Math.max(0, 0.9 * Math.sin(phase + 1.6 + Math.PI)), 0.46, 0.46);
      var gL = groundY(legL[1][0], legL[1][2]), gR = groundY(legR[1][0], legR[1][2]);
      var lift = Math.min(legL[1][1] - gL, legR[1][1] - gR);
      var shift = [0, -lift, 0];
      function S(p) { return add3(p, shift); }
      var neck = add3(pelvis, [0, 0.56, 0]);
      var head = add3(neck, [0, 0.19, 0]);
      var shL = add3(neck, add3(mul3(side, 0.19), [0, -0.04, 0])), shR = add3(neck, add3(mul3(side, -0.19), [0, -0.04, 0]));
      var armL = limb(shL, -0.55 * sw, -0.35, 0.3, 0.28), armR = limb(shR, 0.55 * sw, -0.35, 0.3, 0.28);
      var footL = S(legL[1]), footR = S(legR[1]);
      return {
        bones: [[pelvis, neck], [hipL, hipR], [hipL, legL[0]], [legL[0], legL[1]], [hipR, legR[0]], [legR[0], legR[1]], [shL, shR], [shL, armL[0]], [armL[0], armL[1]], [shR, armR[0]], [armR[0], armR[1]]].map(function (b) { return [S(b[0]), S(b[1])]; }),
        head: S(head), pelvis: S(pelvis), root: [x0, groundY(x0, zc), zc], torso: [S(pelvis), S(neck)],
        feet: [{ p: footL, c: footL[1] - groundY(footL[0], footL[2]) < 0.04 }, { p: footR, c: footR[1] - groundY(footR[0], footR[2]) < 0.04 }]
      };
    }

    /* projection: perspective camera orbiting view.target. The zoom and centre (fit) are computed once per
       canvas size for the initial view so that the whole scene (points, camera path, people) is in frame. */
    var fit = null;
    function orbit(yaw, pitch) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var eye = [view.target[0] + view.dist * sy * cp, view.target[1] + view.dist * sp, view.target[2] - view.dist * cy * cp];
      var f = norm3(sub3(view.target, eye));
      var r = norm3(cross3([0, 1, 0], f));
      return { eye: eye, f: f, r: r, u: cross3(f, r) };
    }
    function computeFit(W, H) {
      var O = orbit(C.yaw, C.pitch), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      function xy(p) { var d = sub3(p, O.eye), z = dot3(d, O.f); return z < 0.3 ? null : [dot3(d, O.r) / z, dot3(d, O.u) / z]; }
      function add(p) {
        var q = xy(p); if (!q) return;
        if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
      }
      /* scene points: 2nd-98th percentile, so a few stray far points do not shrink the whole view */
      var sx = [], sy = [];
      pts.forEach(function (q) { var r = xy(q.p); if (r) { sx.push(r[0]); sy.push(r[1]); } });
      sx.sort(function (a, b) { return a - b; }); sy.sort(function (a, b) { return a - b; });
      if (sx.length) {
        var lo = Math.floor(sx.length * 0.02), hi = Math.ceil(sx.length * 0.98) - 1;
        x0 = sx[lo]; x1 = sx[hi]; y0 = sy[lo]; y1 = sy[hi];
      }
      for (var t = 0; t <= 1.0001; t += 0.05) {
        var cm = C.camera === 'moving' ? camAt(t) : null;
        if (cm) { add(cm.c); frustumCorners(cm).forEach(add); }
        people.forEach(function (pe) { var sk = skeleton(pe, t); add(add3(sk.head, [0, 0.45, 0])); add(sk.root); });
      }
      multi.concat(C.camera === 'static' ? [camAt(0)] : []).forEach(function (cm) { add(cm.c); frustumCorners(cm).forEach(add); });
      var padX = 16, padT = 44, padB = 42;   /* room for the key chips (top) and the tag (bottom) */
      var F = Math.min((W - 2 * padX) / Math.max(1e-3, x1 - x0), (H - padT - padB) / Math.max(1e-3, y1 - y0));
      return { W: W, H: H, F: F, ox: W / 2 - F * (x0 + x1) / 2, oy: padT + (H - padT - padB) / 2 + F * (y0 + y1) / 2 };
    }
    function basis(W, H) {
      if (!fit || fit.W !== W || fit.H !== H) fit = computeFit(W, H);
      var O = orbit(view.yaw, view.pitch);
      O.F = fit.F; O.ox = fit.ox; O.oy = fit.oy; O.W = W; O.H = H;
      return O;
    }
    function proj(p, B) {
      var d = sub3(p, B.eye), z = dot3(d, B.f);
      if (z < 0.3) return null;
      return [B.ox + B.F * dot3(d, B.r) / z, B.oy - B.F * dot3(d, B.u) / z, z];
    }
    function readColors() {
      var cs = getComputedStyle(host);
      ['scene', 'human', 'camera', 'contact', 'robot', 'muted', 'text', 'surface-2', 'border-strong'].forEach(function (k) { col[k] = cs.getPropertyValue('--' + k).trim() || '#888'; });
    }
    function line(a, b, B) {
      var pa = proj(a, B), pb = proj(b, B);
      if (!pa || !pb) return;
      ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]);
    }
    function frustumCorners(cam) {
      var r = norm3(cross3([0, 1, 0], cam.f)), u = cross3(cam.f, r);
      return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(function (k) { return add3(add3(cam.c, mul3(cam.f, 0.55)), add3(mul3(r, k[0] * 0.36), mul3(u, k[1] * 0.24))); });
    }
    function drawFrustum(cam, B, strong) {
      var cs = frustumCorners(cam);
      ctx.beginPath();
      cs.forEach(function (q) { line(cam.c, q, B); });
      for (var k = 0; k < 4; k++) line(cs[k], cs[(k + 1) % 4], B);
      ctx.strokeStyle = col.camera;
      ctx.globalAlpha = strong ? 1 : 0.55;
      ctx.lineWidth = strong ? 2 : 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawPerson(sk, B, alpha, pe, isCurrent) {
      var c = pe.robot ? col.robot : col.human;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c; ctx.fillStyle = c;
      ctx.lineCap = 'round';
      ctx.lineWidth = isCurrent ? 2.6 : 1.6;
      ctx.beginPath();
      sk.bones.forEach(function (b) { line(b[0], b[1], B); });
      ctx.stroke();
      var hp = proj(sk.head, B);
      if (hp) {
        var rad = Math.max(2, B.F * 0.12 / hp[2]);
        ctx.beginPath();
        if (pe.robot) ctx.rect(hp[0] - rad, hp[1] - rad, rad * 2, rad * 2); else ctx.arc(hp[0], hp[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      if (pe.robot && isCurrent) {
        var a = proj(sk.torso[0], B), b = proj(sk.torso[1], B);
        if (a && b) { ctx.lineWidth = Math.max(4, B.F * 0.22 / a[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
    function draw() {
      var W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      var dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var B = basis(W, H);
      var p = progress;
      /* points */
      ctx.fillStyle = col.scene;
      pts.forEach(function (q) {
        if (q.seen > p + 1e-6) return;
        var s2 = proj(q.p, B);
        if (!s2) return;
        var fresh = p < 1 && q.seen > p - 0.08;
        ctx.globalAlpha = Math.max(0.18, Math.min(0.85, 5.5 / s2[2])) * (q.w === 0 ? 0.75 : 1) * (fresh ? 1 : 0.9);
        var sz = q.w === 0 ? 1.6 : 2;
        ctx.fillRect(s2[0] - sz / 2, s2[1] - sz / 2, sz, sz);
      });
      ctx.globalAlpha = 1;
      /* camera trajectory + frusta */
      if (C.camera === 'moving') {
        ctx.beginPath();
        var first = true;
        for (var t = 0; t <= p + 1e-6; t += 0.02) {
          var cp = proj(camAt(Math.min(t, p)).c, B);
          if (!cp) continue;
          if (first) { ctx.moveTo(cp[0], cp[1]); first = false; } else ctx.lineTo(cp[0], cp[1]);
        }
        ctx.strokeStyle = col.camera; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
        for (var f = 0; f < C.frames; f++) { var tf = f / Math.max(1, C.frames - 1); if (tf <= p + 1e-6) drawFrustum(camAt(tf), B, false); }
        drawFrustum(camAt(p), B, true);
      } else if (C.camera === 'multiview') {
        multi.forEach(function (cm) { drawFrustum(cm, B, true); });
      } else {
        drawFrustum(camAt(0), B, true);
      }
      /* human trails and ghost poses */
      people.forEach(function (pe) {
        if (C.trails) {
          ctx.beginPath();
          for (var t2 = 0, st = true; t2 <= p + 1e-6; t2 += 0.02) {
            var rp = proj(skeleton(pe, Math.min(t2, p)).root, B);
            if (!rp) continue;
            if (st) { ctx.moveTo(rp[0], rp[1]); st = false; } else ctx.lineTo(rp[0], rp[1]);
          }
          ctx.strokeStyle = pe.robot ? col.robot : col.human; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        if (C.ghosts) for (var g = 0; g < C.frames - 1; g++) {
          var tg = g / Math.max(1, C.frames - 1);
          if (tg >= p - 0.02) break;
          var skg = skeleton(pe, tg);
          drawPerson(skg, B, 0.28, pe, false);
          if (C.contacts) skg.feet.forEach(function (ft) { if (!ft.c) return; var fp = proj(ft.p, B); if (fp) { ctx.fillStyle = col.contact; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(fp[0], fp[1], 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; } });
        }
      });
      /* current people, far to near */
      var cur = people.map(function (pe) { var sk = skeleton(pe, p); var pr = proj(sk.pelvis, B); return { pe: pe, sk: sk, z: pr ? pr[2] : 0 }; });
      cur.sort(function (a, b) { return b.z - a.z; });
      cur.forEach(function (o) {
        drawPerson(o.sk, B, 1, o.pe, true);
        if (C.contacts) o.sk.feet.forEach(function (ft) {
          if (!ft.c) return;
          var fp = proj(ft.p, B);
          if (!fp) return;
          ctx.strokeStyle = col.contact; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(fp[0], fp[1], 7, 3, 0, 0, Math.PI * 2); ctx.stroke();
        });
        if (C.ids) {
          var hp = proj(add3(o.sk.head, [0, 0.32, 0]), B);
          if (hp) { ctx.fillStyle = o.pe.robot ? col.robot : col.human; ctx.font = '600 11px ' + getComputedStyle(doc.body).getPropertyValue('--font-mono'); ctx.textAlign = 'center'; ctx.fillText(o.pe.robot ? 'robot' : '#' + o.pe.id, hp[0], hp[1]); }
        }
      });
    }
    var pending = false;
    function redraw() { if (pending) return; pending = true; window.requestAnimationFrame(function () { pending = false; draw(); }); }

    /* interaction: drag / arrows rotate; double-click resets */
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      view.yaw += (e.clientX - drag.x) * 0.008;
      view.pitch = Math.max(0.06, Math.min(1.3, view.pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
      redraw();
    });
    function endDrag() { drag = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('dblclick', function () { view.yaw = C.yaw; view.pitch = C.pitch; redraw(); });
    canvas.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft') view.yaw -= 0.1; else if (k === 'ArrowRight') view.yaw += 0.1;
      else if (k === 'ArrowUp') view.pitch = Math.min(1.3, view.pitch + 0.06); else if (k === 'ArrowDown') view.pitch = Math.max(0.06, view.pitch - 0.06);
      else if (k === 'Home') { view.yaw = C.yaw; view.pitch = C.pitch; } else return;
      e.preventDefault();
      redraw();
    });
    readColors();
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(host); else window.addEventListener('resize', redraw);
    redraw();

    this.setProgress = function (v) { progress = clamp01(v); redraw(); };
    host._world = this;
    PP.worlds.push(this);
  }

  /* ─────────── storyboard player: frames × steps; resting state shows everything ─────────── */
  function Story(fig) {
    var stepEls = $$('[data-step]', fig);
    var steps = [];
    stepEls.forEach(function (el) { var k = +el.getAttribute('data-step'); if (steps.indexOf(k) < 0) steps.push(k); });
    steps.sort(function (a, b) { return a - b; });
    if (!steps.length) return;
    var frames = Math.max(1, +fig.getAttribute('data-frames') || 1);
    var ms = Math.max(250, +fig.getAttribute('data-step-ms') || 700);
    var total = frames * steps.length, i = -1, timer = null;
    var worldHost = $('[data-world]', fig);
    var ctr = $('.story-controls', fig);
    if (!ctr) { ctr = h('div', { class: 'controls story-controls' }); fig.insertBefore(ctr, fig.firstChild); }
    var bPlay = h('button', { type: 'button', class: 'btn' });
    var bReplay = h('button', { type: 'button', class: 'btn', 'aria-label': 'Replay from the first ' + LABELS.unit }, icon('g-replay') + ' Replay');
    var status = h('span', { class: 'status', 'aria-live': 'polite' });
    ctr.appendChild(bPlay); ctr.appendChild(bReplay); ctr.appendChild(status);
    function titleOf(k) { var el = $('[data-step="' + k + '"] h3', fig); return el ? el.textContent.replace(/^\s*\d+\s*/, '').trim() : 'step ' + k; }
    function apply() {
      var world = worldHost && worldHost._world;
      if (i < 0) {
        fig.classList.remove('is-playing');
        $$('.is-current', fig).forEach(function (el) { el.classList.remove('is-current'); });
        $$('[data-frame]', fig).forEach(function (el) { el.classList.add('is-on'); });
        if (world) world.setProgress(1);
        status.textContent = frames === 1 ? 'Showing 1 ' + LABELS.unit : 'Showing all ' + frames + ' ' + LABELS.units;
        return;
      }
      var f = Math.floor(i / steps.length) + 1, k = steps[i % steps.length];
      fig.classList.add('is-playing');
      stepEls.forEach(function (el) { el.classList.toggle('is-current', +el.getAttribute('data-step') === k); });
      $$('[data-frame]', fig).forEach(function (el) { var n = +el.getAttribute('data-frame'); el.classList.toggle('is-on', n <= f); el.classList.toggle('is-current', n === f); });
      if (world) world.setProgress((i + 1) / total);
      // with a single frame the "Frame 1/1 · " counter says nothing
      status.textContent = (frames === 1 ? '' : LABELS.unit.charAt(0).toUpperCase() + LABELS.unit.slice(1) + ' ' + f + '/' + frames + ' · ') + k + '. ' + titleOf(k);
    }
    function label() { bPlay.innerHTML = timer ? icon('g-pause') + ' Pause' : icon('g-play') + (i >= 0 ? ' Resume' : ' Play'); bPlay.setAttribute('aria-pressed', timer ? 'true' : 'false'); }
    function tick() {
      i++;
      if (i >= total) { timer = null; i = -1; apply(); label(); return; }
      apply();
      timer = setTimeout(tick, ms);
      label();
    }
    function stop() { clearTimeout(timer); timer = null; label(); }
    bPlay.addEventListener('click', function () { if (timer) stop(); else tick(); });
    bReplay.addEventListener('click', function () { stop(); i = -1; tick(); });
    apply();
    label();
  }

  /* ─────────── pager placeholders ─────────── */
  function initPager() {
    $$('a[data-prev], a[data-next]').forEach(function (a) {
      if (!a.getAttribute('href') || a.getAttribute('href') === '#') { a.setAttribute('data-empty', ''); a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); }
    });
  }

  /* ─────────── init: each component isolated so one failure cannot break the page ─────────── */
  function run(name, fn) {
    try { fn(); } catch (e) { console.error('[site.js] ' + name + ' failed:', e); }
  }
  function init() {
    run('sprite', initSprite);
    run('toc', initToc);
    run('math', function () { renderMath(doc); });
    run('tabs', initTabs);
    run('tables', initTables);
    run('tips', initTips);
    run('lightbox', initLightbox);
    run('bars', initBars);
    run('entities', initEntities);
    run('labels', initLabels);
    $$('[data-world]').forEach(function (el) { run('world', function () { new World(el); }); });
    $$('[data-arch]').forEach(function (el) { run('arch', function () { new Arch(el); }); });
    $$('[data-story]').forEach(function (el) { run('story', function () { new Story(el); }); });
    run('pager', initPager);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
