"""favicon.py — the site icon: the H of HOOKER, lifted from the intro's raised gilt (Sam, Oct 24).

The H is the one that starts HOOKER on the third line of the title plate, in the state it holds once the
painting is full screen: the warm gold, RAISED (the relief filter at relief = 1). That is exactly the baked
layer `deboss-1`, so nothing here re-draws the letter — it is cropped out of the same render the intro shows.
No painting, no cast shadow, no ground: the letter alone on transparency.

Run (≈5s):
    BAKE_WIDTH=1600 BAKE_OUT=/tmp/fav BAKE_ONLY=deboss-1 node scripts/intro/bake-intro-layers.mjs
    python3 scripts/intro/favicon.py /tmp/fav/deboss-1.webp

1600 is the plate's native width, so the H is ~140px tall before any downscale. The 960px intro bake would
give ~84px and a soft apple-touch icon.

Writes, to static/ (served from the site root):
    favicon.ico           16, 32, 48 — the file browsers, email clients and Google ask for at /favicon.ico
    icon-192.png          the PNG <link rel="icon">
    apple-touch-icon.png  180, iOS home screen and share sheets
"""

import sys
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fav/deboss-1.webp'
OUT = 'static'

# Where the H sits on the 1600×660 plate: the THIRD text line, glyph run 7. The runs are NOT one per
# letter — the spine's crowded lettering joins "TH" and "MAS" of THOMAS into single runs — so the line
# scans as R E V . TH O MAS | H O O K E R and HOOKER's H is run 7. (Run 8, the O, passed a loose
# aspect check on the first attempt; the shape test below is what tells an H from an O.)
LINE = 2
GLYPH = 7


def runs(profile):
    out, start = [], None
    for i, v in enumerate(profile):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(profile)))
    return out


im = Image.open(SRC).convert('RGBA')
assert im.size == (1600, 660), f'expected the 1600×660 bake, got {im.size} — run with BAKE_WIDTH=1600'
a = np.array(im)[:, :, 3]
ink = a > 30

lines = runs(ink.sum(1))
assert len(lines) == 4, f'expected 4 text lines on the plate, found {len(lines)}'
y0, y1 = lines[LINE]
glyphs = runs(ink[y0:y1].sum(0))
assert len(glyphs) == 13, f'expected 13 glyph runs on REV. THOMAS HOOKER, found {len(glyphs)}'
x0, x1 = glyphs[GLYPH]

# Tight box on the H itself, keeping every soft (low-alpha) edge pixel of the relief.
box = a[y0:y1, x0:x1] > 0
ys, xs = np.nonzero(box)
h = im.crop((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1))
w, hh = h.size
assert 0.55 < w / hh < 0.9, f'the crop is {w}×{hh} — not an H-shaped box; check LINE/GLYPH'
# AN H, NOT AN O: down the centre column there is ink at the crossbar and open space above and below it.
# An O is the reverse (ink top and bottom, open in the middle), so this cannot pass on the wrong letter.
mid = np.array(h)[:, w // 2, 3] > 30
assert mid[int(hh * 0.45):int(hh * 0.6)].any(), 'no crossbar at the centre — not an H'
assert not mid[int(hh * 0.12):int(hh * 0.3)].any() and not mid[int(hh * 0.75):int(hh * 0.9)].any(), \
    'ink above or below the crossbar at the centre — not an H'


# A DEEPER GOLD (Sam, Oct 24). The intro's lemon gilt (faces ~rgb 248 216 104) all but vanished on a light
# browser tab at 16px. A per-channel multiply keeps every highlight and shadow of the relief in proportion and
# moves only the metal. First set at 0.84/0.70/0.40 (faces ~rgb 208 151 42), then "a little lighter" (Sam):
# halfway back toward 0.92/0.80/0.55, faces ~rgb 218 162 49. 0.76/0.60/0.30 read as brown. The intro is untouched.
DEEPEN = (0.88, 0.75, 0.47)
px = np.array(h).astype(float)
px[:, :, :3] *= DEEPEN
h = Image.fromarray(px.clip(0, 255).round().astype('uint8'), 'RGBA')


def square(size, fill=0.94):
    """The H centred on a transparent square, its height `fill` of the side (an H is taller than wide)."""
    side = max(w, hh) / fill
    canvas = Image.new('RGBA', (round(side), round(side)), (0, 0, 0, 0))
    canvas.alpha_composite(h, ((canvas.width - w) // 2, (canvas.height - hh) // 2))
    out = canvas.resize((size, size), Image.LANCZOS)  # Pillow premultiplies RGBA for resampling
    if size <= 48:
        # At tab size the relief's thin dark edges blur into the gold; a light unsharp keeps the letter's
        # silhouette and its hand-cut irregularity legible. Applied to colour only, never to alpha.
        rgb = out.convert('RGB').filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=0))
        out = Image.merge('RGBA', (*rgb.split(), out.split()[3]))
    return out


ico = [square(s) for s in (16, 32, 48)]
ico[-1].save(f'{OUT}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:-1])
square(192, 0.9).save(f'{OUT}/icon-192.png', optimize=True)
square(180, 0.9).save(f'{OUT}/apple-touch-icon.png', optimize=True)
print(f'H at plate ({x0 + xs.min()},{y0 + ys.min()}) {w}×{hh}px → favicon.ico, icon-192.png, apple-touch-icon.png')
