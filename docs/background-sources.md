# BACKGROUND / GROUND SKIN — SOURCES AND MEASUREMENTS

Working notes for choosing the paper ground behind the featured card. Live skins
are defined in `src/lib/state/ground.svelte.ts` and rendered by
`src/lib/components/Field.svelte`; the toggle sits bottom-right.

_Started August 6, 2026. Nothing here is bought or committed yet._

---

## The brief, as it has evolved

- Dark grounds (Midnight, Pine) were tried and rejected.
- Ledger (`#ece3d2`) and Aged Paper (`#e0cfa9`) both read too dark/brown.
- Nothing had beaten plain white-on-white — because, measured, **every existing
  paper skin was 15–25% darker than the thing Sam kept being drawn to**.
- **August 6, refined: lean WHITER and LESS BROWN than any of the above.**

## Candidate links

**iStock** — better value than Shutterstock for this ($7–12 per image, or 10
images for $70/month; verify current terms before buying):

- **CHOSEN (Aug 6): "abstract paper background retro manuscript texture aged
  paper"** —
  <https://www.istockphoto.com/photo/abstract-paper-background-retro-manuscript-texture-aged-paper-gm1474576470-504360579>
- <https://www.istockphoto.com/photo/old-paper-texture-gm1043539714-279326821>
- <https://www.istockphoto.com/search/more-like-this/1498067485?assettype=image>

**Shutterstock** — the first pair looked at; both measured too warm/dark once
compared against the iStock sheets. 2-image pack, $29:

- <https://www.shutterstock.com/image-photo/old-newspaper-background-blank-grunge-paper-2640530767>

**Free / public domain, not yet explored.** Worth doing before paying, and the
archival option has real provenance value for a genealogy project — a real
period sheet rather than a stock photo of one:

- Unsplash, Pexels (commercial use, no attribution)
- Texture Labs, Lost & Taken (purpose-built free texture libraries)
- Internet Archive — book **endpapers and flyleaves**, often full-page blank at
  high resolution. This is the realistic archival route.
- Scanning a real document Sam owns
- **Library of Congress: tried, and it does not work for this.** It catalogues
  DOCUMENTS, not textures, so there is no path to blank paper — you would be
  finding a manuscript and cropping a clean margin, which yields a small,
  unevenly-lit fragment. Suggested here, then withdrawn: not worth the hunt when
  a measured sheet costs $7–12.

## Measurements

All sampled off the previews with the same method (mean luminance of a 140–200px
patch; "warmth" is R−B; "broad drift" is the luminance range across a downscale,
which is the *structure* a procedural texture cannot fake).

| candidate | lum | warmth R−B | fine grain σ | broad drift |
|---|---|---|---|---|
| **Procedural Parchment** (shipped, `Field.svelte`) | 229 | 34 | 7.5 | **0** |
| Shutterstock A (warm) | 229 (centre) | 33 | 3.5 | 70 |
| Shutterstock B (cool) | 229 (centre) | 5 | 13.4 | 52 |
| **iStock — clean (Dmitr1ch)** | **245** | **17** | 2.4 | 159\* |
| **iStock — stained (paladin13)** | **246** | **18** | 3.1 | 176\* |
| **iStock — retro manuscript (Dmitr1ch) — CHOSEN** | **242–247** | **13–19** | 2.1–4.3 | **19** |

\* includes the dark iStock watermark bar, so the true drift is lower. The
chosen sheet's 19 has the band excluded and is directly comparable.

**What the numbers say:**

- The two Shutterstock sheets and the procedural one all centre on **lum 229**.
  The iStock pair are **+16 lighter and half as warm** — a genuinely different
  class of paper, which is the correction Sam arrived at independently.
- **Broad drift is the whole argument for buying an image.** The procedural
  ground is stationary by construction — statistically identical everywhere, so
  it cannot produce the tonal drift, vignette or stains a real sheet has. No dial
  fixes that, and faking it with stacked gradients is the road that turned the CC
  blade into a panel (design §27.9).
- Fine grain runs the other way: the real sheets are FINER (σ 2–3) than the
  procedural one (σ 7.5). Their character is in the large structure, not speckle.

## Why the retro-manuscript sheet won

Lightness and warmth were the stated brief and it meets them — ~+15 luminance
over the procedural ground, half the warmth. But the number that decided it was
**broad drift of 19**, against 52–70 for the Shutterstock pair.

It is a nearly EVEN sheet: real fibre and organic variation, almost no vignette,
edges sitting only ~5 luminance below centre. That matters because a vignette
was going to cost three things at once — it could not tile, it could not
parallax without dragging dark edges into view, and the sibling panel docks on
the right edge, exactly where a vignetted sheet is darkest. At this drift those
constraints mostly dissolve, and **the field's parallax may survive after all.**

Verify once it is in: whether it tiles cleanly, and whether parallax still looks
right at the extremes of travel.

## Recommendation on the stained sheet

**Prefer the clean one.** The foxing is lovely in isolation, but it is baked into
fixed pixel positions — several blotches land where the featured card sits, and
behind portraits and dense blue type that reads as dirt on the screen rather than
character. Aged Paper already exists if that character is wanted. A clean sheet
keeps the option open; a stained one commits every page to blotches that cannot
be moved.

## Implementation notes (decided, not yet built)

- **Buy the largest resolution offered.** At a 1440 viewport and 2× DPR the
  ground wants ≥2880px or it upscales.
- **A vignetted sheet cannot tile** — repeating it prints a grid of dark seams.
  It has to be one `cover` layer, which suits `.field` (already
  `position: fixed; inset: 0`).
- **A vignetted sheet also cannot PARALLAX.** `Field` translates its layers on
  navigation (the "sliding on paper" seek); dragging a vignette pulls its dark
  edges into view. An image ground should be static — a real trade of the
  parallax for the texture, not a detail.
- **Check the right edge.** The sibling panel docks there, which is where a
  vignetted sheet is darkest — the one place white chips meet the darkest paper.
- **Convert to WebP/AVIF.** A 2400px paper PNG is ~4.7MB; as WebP ~300KB.
- **Keep the procedural Parchment** as the zero-download fallback regardless of
  what gets bought.
- **Licence:** confirm it covers use as a website background. "Editorial use
  only" does not.

---

## THE RECIPE — adding another sheet

Settled August 7. Adding a second (or third) photographed ground is **one array
entry plus four files**, because `Skin.image` is a BASE path and `Field` derives
the widths by convention.

1. Buy it; keep the licensed master in `_assets/textures/` (never served — that
   folder is not under `static/`).
2. Generate four WebP widths from the master into `static/textures/`, named
   `<base>-800.webp`, `-1100`, `-1400`, `-2200`. Quality **0.80** for the two
   small, **0.82** for the two large.
3. Add one entry to `GROUNDS` in `src/lib/state/ground.svelte.ts` with
   `kind: 'sheet'`, a `ground` colour equal to the sheet's own MEAN tone, and
   `image` set to the base path with no suffix and no extension.

That is all. No CSS, no component change.

### Why those four widths

| file | serves | size | grain σ |
|---|---|---|---|
| `-800` | phone @1x | 39 KB | 2.90 |
| `-1100` | phone @2x/@3x | 66 KB | 2.20 |
| `-1400` | desktop @1x, tablet | 110 KB | 2.43 |
| `-2200` | desktop @2x | 368 KB | 3.54 |

`image-set()` picks by DPR; a `max-width: 768px` media query picks by viewport.
Only ONE file is ever downloaded.

### The measurements that set them

Taken on a throttled 3G profile (780 kbps, 100 ms RTT):

- **First paint is never blocked.** FCP is ~2.0s on 3G with or without the
  sheet, because `background-color` carries the sheet's mean tone — the ground is
  the right COLOUR immediately and the fibre arrives later. There is no white
  flash and no broken-image gap, on any connection.
- **The cost was bandwidth, not lag.** Before this, a 390px phone downloaded the
  2200px file — 369KB it could display a fifth of — arriving 19.4s after first
  paint and competing the whole time with the PORTRAITS, which are content. The
  ground is decoration and must yield to them.
- After: phone 66KB arriving 5.4s, desktop @1x 110KB arriving 7.3s.

**The rule this encodes: a decorative layer never outweighs the content it sits
behind.** If a future sheet cannot be got under ~110KB at desktop @1x without
losing its fibre, prefer a different sheet.

### Master files

`_assets/textures/` holds the licensed originals at full resolution. It is
deliberately OUTSIDE `static/`, so a 13MB purchase is never publicly served.
Re-encode from there if a quality judgement changes; iStock also allows free
re-download of anything already bought.

### What the encoding actually costs, measured at DISPLAY size

Raw sigma at native resolution understates retention, because the browser
resamples for `background-size: cover` anyway. Compared at the size the browser
paints them, master against shipped:

| | master σ | shipped σ | retained | mean pixel diff |
|---|---|---|---|---|
| desktop @2x (2200) | 8.13 | 7.16 | **88%** | 2.6 / 255 |
| desktop @1x (1400) | 6.95 | 6.19 | **89%** | 2.3 / 255 |
| phone @3x (1100) | 7.26 | 4.59 | **63%** | 4.3 / 255 |

Mean luminance is preserved to within a third of one level (242.45 → 242.16).

**Desktop is effectively lossless to the eye** — 88% of the fibre at a 1% mean
difference, and more texture than the preview that was approved. **The phone
file is where the real trade was made**, deliberately: a third the physical
pixel size and the worst connections. Revisit that one first if a sheet ever
looks flat on a phone; `1100 @ q88` costs ~90KB and recovers most of it.
