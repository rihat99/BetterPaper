#!/usr/bin/env bash
# Render a page in headless Chrome (light scheme, full height) at 1280 px (desktop) and 500 px (phone,
# Chrome's minimum window width), cut into slices of at most 1600 px, then check local files and the console.
# Usage: bash check_page.sh <page.html> <vis_dir>
#   writes <vis_dir>/<stem>.desktop-N.png and <vis_dir>/<stem>.phone-N.png; slices of the same stem from an
#   earlier run move to <vis_dir>/.old/ first (never deleted). A screenshot stops at 16000 px: when the phone
#   render is cut, every top-level <main> > <section id> is also rendered alone at 500 px, as
#   <vis_dir>/<stem>.phone-<sectionid>-N.png. Prints "missing: <path>" for every local src/href that does not
#   exist, then "console: clean" or every console line.
# Exit: 0 rendered, no missing file and console clean; 1 missing files or console messages; 2 usage;
#   3 no Chrome or no Pillow; 4 Chrome made no screenshot.
# CHROME=/path/to/chrome overrides the Chrome search. PYTHON=/path/to/python picks the Python (needs Pillow;
# default ~/.claude/venv/bin/python if present, else python3). Nothing is written next to the page.
set -uo pipefail
usage() { echo "usage: bash check_page.sh <page.html> <vis_dir>" >&2; exit 2; }
[ $# -eq 2 ] || usage
[ -f "$1" ] || { echo "check_page.sh: no such page: $1" >&2; usage; }
PAGE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
STEM=$(basename "$PAGE"); STEM=${STEM%.html}
mkdir -p "$2" || exit 2
VIS=$(cd "$2" && pwd)
[ "$VIS" = "$(dirname "$PAGE")" ] && { echo "check_page.sh: vis_dir must not be the page's own folder" >&2; usage; }
MAX_H=16000   # Chrome screenshot height limit (textures top out near 16384); taller pages are cut
if [ -n "${PYTHON:-}" ]; then PY=$PYTHON; elif [ -x "$HOME/.claude/venv/bin/python" ]; then PY=$HOME/.claude/venv/bin/python; else PY=python3; fi
"$PY" -c "import PIL" 2>/dev/null || { echo "check_page.sh: $PY cannot import Pillow (set PYTHON=/path/to/a/python with Pillow)" >&2; exit 3; }
SANDBOX=""; [ "$(uname)" = Linux ] && SANDBOX="--no-sandbox"   # root/containers on Linux need it

find_chrome() {
  [ -n "${CHROME:-}" ] && [ -x "$CHROME" ] && { echo "$CHROME"; return; }
  for c in google-chrome google-chrome-stable chromium chromium-browser chrome chrome-headless-shell; do
    command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return; }
  done
  for p in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    [ -x "$p" ] && { echo "$p"; return; }
  done
  return 1
}
CHROME=$(find_chrome) || { echo "check_page.sh: no Chrome/Chromium found (set CHROME=/path to override)" >&2; exit 3; }

# Earlier slices of this stem go to .old/ (a taken name there gets a timestamp, then a counter).
for f in "$VIS/$STEM".desktop*.png "$VIS/$STEM".phone*.png; do
  [ -e "$f" ] || continue
  mkdir -p "$VIS/.old"
  name=$(basename "$f"); dest="$VIS/.old/$name"
  if [ -e "$dest" ]; then
    stamp=$(date +%Y%m%d-%H%M%S); dest="$VIS/.old/${name%.png}.$stamp.png"; n=1
    while [ -e "$dest" ]; do dest="$VIS/.old/${name%.png}.$stamp-$n.png"; n=$((n + 1)); done
  fi
  mv "$f" "$dest"
done

# Hook copy, built as in shot_state.sh (absolute asset paths, markup before </body>) in a fresh temp dir left
# for the system to clean (never rm). hook.html?<id> shows only that section; plain hook.html measures the page
# and each section alone and writes "<page height> <id>:<height alone> ..." into <body data-check>.
TMPROOT=${TMPDIR:-/tmp}
TMP=$(mktemp -d "${TMPROOT%/}/check_page.XXXXXX") || exit 4
cat > "$TMP/hook.inc" <<'EOF'
<script>(function(){
  var html=document.documentElement,st=document.head.appendChild(document.createElement('style'));
  function only(id){st.textContent=id?'.ph,.toc,.topbar,.pager{display:none} main>section:not([id="'+id+'"]){display:none}':'';}
  only(decodeURIComponent(location.search.slice(1)));
  if(!location.search)addEventListener('load',function(){setTimeout(function(){
    var out=[html.scrollHeight];
    [].forEach.call(document.querySelectorAll('main>section[id]'),function(s){only(s.id);out.push(s.id+':'+html.scrollHeight);});
    only('');document.body.setAttribute('data-check',out.join(' '));
  },400);});
})();</script>
EOF
DIR_ESC=$(printf '%s' "$(dirname "$PAGE")" | sed 's/[&#\\]/\\&/g')
sed "s#\"assets/#\"$DIR_ESC/assets/#g" "$PAGE" | awk -v inc="$TMP/hook.inc" '
  BEGIN { while ((getline line < inc) > 0) hook = hook line "\n" }
  !done && (i = index($0, "</body>")) { printf "%s%s%s\n", substr($0, 1, i - 1), hook, substr($0, i); done = 1; next }
  { print }
  END { if (!done) printf "%s", hook }' > "$TMP/hook.html"
measure() { # width: prints "<page height> <id>:<height alone> ..." at that window width
  "$CHROME" --headless=new --disable-gpu $SANDBOX --window-size="$1,$MAX_H" --virtual-time-budget=3000 \
    --dump-dom "file://$TMP/hook.html" 2>/dev/null | sed -n 's/.*data-check="\([^"]*\)".*/\1/p'
}

shoot() { # width name url: Chrome writes slice 1, Python trims the empty bottom and cuts the rest off into -2, -3 ...
  local out="$VIS/$STEM.$2-1.png" err
  err=$("$CHROME" --headless=new --disable-gpu --hide-scrollbars $SANDBOX --blink-settings=preferredColorScheme=1 \
    --window-size="$1,$MAX_H" --screenshot="$out" "$3" 2>&1 >/dev/null)
  [ -s "$out" ] || { echo "check_page.sh: Chrome ($CHROME) produced no screenshot:" >&2; echo "$err" | tail -5 >&2; exit 4; }
  "$PY" - "$out" 1600 <<'PYEOF'
import sys
from PIL import Image
first, max_h = sys.argv[1], int(sys.argv[2])
im = Image.open(first).convert("RGB"); w, h = im.size; px = im.load()
bg = px[w - 1, h - 1]
last = h - 1
while last > 0 and all(px[x, last] == bg for x in range(0, w, 8)):
    last -= 1
im = im.crop((0, 0, w, min(h, last + 48)))
base = first[:-len("-1.png")]
for n, top in enumerate(range(0, im.size[1], max_h), 1):
    im.crop((0, top, w, min(im.size[1], top + max_h))).save("%s-%d.png" % (base, n)); print("%s-%d.png" % (base, n))
PYEOF
}
shoot 1280 desktop "file://$PAGE"
set -- $(measure 1280)
[ "${1:-0}" -gt $MAX_H ] && echo "check_page.sh: at 1280 px the page is $1 px tall; the desktop slices stop at $MAX_H px" >&2
shoot 500 phone "file://$PAGE"
set -- $(measure 500)
if [ "${1:-0}" -gt $MAX_H ]; then
  echo "check_page.sh: at 500 px the page is $1 px tall; the phone slices stop at $MAX_H px, so each section is also rendered alone" >&2
  shift
  [ $# -gt 0 ] || echo "check_page.sh: no <main> > <section id> found; the bottom of the phone page is not rendered" >&2
  for pair in "$@"; do
    id=${pair%:*}
    shoot 500 "phone-$id" "file://$TMP/hook.html?$id"
    [ "${pair##*:}" -gt $MAX_H ] && echo "check_page.sh: section #$id alone is ${pair##*:} px tall at 500 px; its bottom is cut off" >&2
  done
fi

# Local files: every relative src/href outside comments and inline scripts must exist (query and #fragment dropped).
missing=$("$PY" - "$PAGE" <<'PYEOF'
import os, re, sys, urllib.parse
page = sys.argv[1]
html = re.sub(r"<!--.*?-->", "", open(page, encoding="utf-8").read(), flags=re.S)
html = re.sub(r"(<script\b[^>]*>).*?(</script>)", r"\1\2", html, flags=re.S | re.I)
for ref in sorted(set(re.findall(r'\b(?:src|href)="([^"]*)"', html))):
    path = urllib.parse.unquote(re.split(r"[?#]", ref)[0])
    if path and not re.match(r"[A-Za-z][A-Za-z0-9+.-]*:|/", path) and not os.path.exists(os.path.join(os.path.dirname(page), path)):
        print("missing: " + path)
PYEOF
)
[ -n "$missing" ] && echo "$missing"

# Console check: only lines from the page (CONSOLE ..., Uncaught ...); Chrome's own log lines are noise.
console=$("$CHROME" --headless=new --disable-gpu $SANDBOX --enable-logging=stderr --v=0 --virtual-time-budget=8000 \
  --dump-dom "file://$PAGE" 2>&1 >/dev/null | grep -E "CONSOLE|Uncaught")
if [ -z "$console" ]; then echo "console: clean"; else echo "console: $(echo "$console" | wc -l | tr -d ' ') message(s)"; echo "$console"; fi
[ -z "$missing$console" ] || exit 1
