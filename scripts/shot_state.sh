#!/usr/bin/env bash
# Screenshot a hidden state of a page (a tab, a selected node, tensor shapes, a step, a stage).
# Usage: bash shot_state.sh <page.html> <out.png> [--section <id>] [--query '<q>'] [--js '<code>'] [--width 1280] [--height 1500]
#   Makes a temporary copy of the page with absolute asset paths and a load hook, shows only <section id=...>
#   (default architecture), applies the query and screenshots the window (width x height, top of the section).
#   Query keys: node=<id> (select a node), shapes=1 (tensor shapes on), step=<1-based>, stage=<0-based>,
#   tab=<tab button id>, arch=<0-based> (which [data-arch] diagram inside the section; default 0);
#   e.g. --query 'node=enc&shapes=1'. --js runs extra JavaScript after the query, for states the keys do not
#   cover (e.g. on an index: --section map --js "FamilyMap.pin('smith2024')").
#   An existing <out.png> moves to <dir>/.old/ first (a taken name there gets a timestamp), never overwritten.
# Exit: 0 saved, 1 saved but the query did not apply (e.g. "no step K (the diagram has N steps)") or the page
#       logged console messages (printed), 2 usage, 3 no Chrome, 4 Chrome made no screenshot.
#       CHROME=/path overrides the Chrome search.
set -uo pipefail
usage() { echo "usage: bash shot_state.sh <page.html> <out.png> [--section <id>] [--query '<q>'] [--js '<code>'] [--width 1280] [--height 1500]" >&2; exit 2; }
[ $# -ge 2 ] || usage
[ -f "$1" ] || { echo "shot_state.sh: no such page: $1" >&2; usage; }
PAGE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); OUT=$2; shift 2
SECTION=architecture; QUERY=""; JS=""; WIDTH=1280; HEIGHT=1500
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || usage
  case $1 in
    --section) SECTION=$2 ;; --query) QUERY=$2 ;; --js) JS=$2 ;; --width) WIDTH=$2 ;; --height) HEIGHT=$2 ;;
    *) usage ;;
  esac
  shift 2
done
case $OUT in *.png) ;; *) echo "shot_state.sh: <out.png> must end in .png" >&2; usage ;; esac
case $SECTION in ''|*[!A-Za-z0-9_-]*) echo "shot_state.sh: bad --section id: $SECTION" >&2; usage ;; esac
case $WIDTH$HEIGHT in *[!0-9]*) echo "shot_state.sh: --width and --height take whole pixels" >&2; usage ;; esac
[ -n "$WIDTH" ] && [ -n "$HEIGHT" ] || usage
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
CHROME=$(find_chrome) || { echo "shot_state.sh: no Chrome/Chromium found (set CHROME=/path to override)" >&2; exit 3; }

# The hook copy lives in a fresh temp dir, left for the system to clean (never rm).
TMPROOT=${TMPDIR:-/tmp}
TMP=$(mktemp -d "${TMPROOT%/}/shot_state.XXXXXX") || exit 4

cat > "$TMP/hook.inc" <<EOF
<style>.ph,.toc,.topbar,.pager{display:none} main>section:not(#$SECTION){display:none}</style>
<script>addEventListener('load',function(){setTimeout(function(){
  var q=new URLSearchParams(location.search),sec=document.getElementById('$SECTION');
  function fail(what){console.error('[shot_state] '+what);}
  if(!sec)return fail('no section #$SECTION');
  var host=sec.querySelectorAll('[data-arch]')[+(q.get('arch')||0)],
      A=host&&PaperPage.archs[[].indexOf.call(document.querySelectorAll('[data-arch]'),host)];
  if((q.get('step')||q.get('node')||q.get('shapes')||q.get('stage'))&&!A)return fail('no [data-arch] diagram '+(q.get('arch')||0)+' in #$SECTION');
  if(q.get('step')){var k=+q.get('step'),n=(JSON.parse(host.querySelector('script[type="application/json"]').textContent).steps||[]).length;
    if(k>=1&&k<=n&&k%1==0)A.showStep(k-1);else fail('no step '+q.get('step')+' (the diagram has '+n+' steps)');}
  if(q.get('node')){A.select(q.get('node'));if(!host.querySelector('.node.sel'))fail('no node '+q.get('node'));}
  if(q.get('shapes')){var cb=host.querySelector('.arch-bar input[type=checkbox]');if(!cb)fail('no tensor-shapes checkbox');else if(!cb.checked)cb.click();}
  if(q.get('tab')){var t=document.getElementById(q.get('tab'));if(!t)fail('no tab #'+q.get('tab'));else t.click();}
  if(q.get('stage')){var th=host.querySelector('.stage-mat th[data-stage="'+q.get('stage')+'"]'),m=host.querySelectorAll('.stage-mat th[data-stage]').length;
    if(th)th.click();else fail('no stage '+q.get('stage')+' (the diagram has '+m+' stages, counted from 0)');}
},400);});</script>
EOF
[ -n "$JS" ] && printf '<script>addEventListener("load",function(){setTimeout(function(){\n%s\n},600);});</script>\n' "$JS" >> "$TMP/hook.inc"
DIR_ESC=$(printf '%s' "$(dirname "$PAGE")" | sed 's/[&#\\]/\\&/g')
sed "s#\"assets/#\"$DIR_ESC/assets/#g" "$PAGE" | awk -v inc="$TMP/hook.inc" '
  BEGIN { while ((getline line < inc) > 0) hook = hook line "\n" }
  !done && (i = index($0, "</body>")) { printf "%s%s%s\n", substr($0, 1, i - 1), hook, substr($0, i); done = 1; next }
  { print }
  END { if (!done) printf "%s", hook }' > "$TMP/hook.html"

log=$("$CHROME" --headless=new --disable-gpu --hide-scrollbars $SANDBOX --blink-settings=preferredColorScheme=1 \
  --window-size="$WIDTH,$HEIGHT" --virtual-time-budget=3000 --enable-logging=stderr --v=0 \
  --screenshot="$TMP/shot.png" "file://$TMP/hook.html?$QUERY" 2>&1 >/dev/null)
[ -s "$TMP/shot.png" ] || { echo "shot_state.sh: Chrome ($CHROME) produced no screenshot:" >&2; echo "$log" | tail -5 >&2; exit 4; }
mkdir -p "$(dirname "$OUT")" || exit 4
if [ -e "$OUT" ]; then # an earlier shot goes to .old/ (a taken name there gets a timestamp, then a counter)
  OLD=$(dirname "$OUT")/.old; name=$(basename "$OUT"); dest="$OLD/$name"
  if [ -e "$dest" ]; then
    stamp=$(date +%Y%m%d-%H%M%S); dest="$OLD/${name%.png}.$stamp.png"; n=1
    while [ -e "$dest" ]; do dest="$OLD/${name%.png}.$stamp-$n.png"; n=$((n + 1)); done
  fi
  mkdir -p "$OLD" && mv "$OUT" "$dest" || exit 4
fi
mv "$TMP/shot.png" "$OUT" || exit 4
echo "$OUT"
console=$(echo "$log" | grep -E "CONSOLE|Uncaught")
[ -z "$console" ] && exit 0
echo "shot_state.sh: the query did not fully apply or the page logged to the console:" >&2
echo "$console" | sed 's/.*"\[shot_state\] \(.*\)", source: .*/shot_state.sh: \1/' >&2; exit 1
