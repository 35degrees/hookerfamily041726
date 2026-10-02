#!/usr/bin/env bash
# Rebuild the intro's gilt title plate from Sam's spine photos, then publish to static/intro/.
#   bash scripts/intro/run.sh
# Runs in a throwaway folder (every step reads/writes plain filenames there), so nothing lands in the repo
# except the two finished images. Needs python3 with numpy + Pillow (the Mac's default numpy/PIL is enough).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cp "$HERE"/*.py "$WORK"/; cp "$HERE/source/spine-title.png" "$WORK/src.png"; cp "$HERE/source/spine-year.png" "$WORK/year.png"
cd "$WORK"
python3 1_title_label.py   >/dev/null              # letter components (which pieces are letters, the REV. period)
python3 2_title_build.py 5 2.4 title-gilt.png 0.30 0.17   # the title: gold vs its local leather, grown from sure gold, named touch-ups
python3 3_year_extract.py 7 2.4 >/dev/null         # the year line's digits, glyph by glyph
python3 4_year_fit_zero.py                         # the 0 as the oval its own edges describe
python3 5_year_touchups.py                         # 8's holes, the 6's bowl, the 1's stem, the 5's spike
python3 6_gold_match.py                            # bring the year photo's gold to the title's tone
python3 7_year_line.py | grep -v '^  stroke'       # make the 2 (Cochin), set "1586 - 2026" like hand-set type
python3 8_plate.py                                 # assemble at the spine's proportions (year line at Sam's 0.625 size)
mkdir -p "$ROOT/static/intro"
cp title-plate-1600.webp title-gilt-1600.webp "$ROOT/static/intro/"
echo "published: static/intro/title-plate-1600.webp, static/intro/title-gilt-1600.webp"
