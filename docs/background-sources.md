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
