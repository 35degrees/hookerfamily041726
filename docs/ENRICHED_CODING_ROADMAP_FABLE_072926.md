# HOOKER GENEALOGY — ENRICHED CODING ROADMAP (FABLE PASS)
**Date: July 29, 2026 — overlay on UX_ROADMAP_063026.md. PROPOSED sequencing; Sam approves before anything moves.**
**Companion: ENRICHED_DESIGN_FABLE_072926.md (the what/why for every item below).**
**The 080326 edition (August 3) adds §17 — THE KIN-DISTANCE BAKE SHIPPED, closing §15 and the §19.4 debt behind it. The deck's SAME-LINE test no longer proxies kinship with anything: `regenerate-data.js` stamps a per-CC `kin_distance` (edges through the nearest shared ancestor, ONE marriage allowed to bridge the two blood lines at a cost of 2), and `isVerticalMove` reads it. Uncles, aunts and parents-in-law ride vertical wherever the tidy tree seated them; second cousins, the in-laws of distant collaterals, and true strangers stay lateral. Also records the probe that was asserting the WRONG THING (a father-in-law logged as a cross-branch-peer control), and §17.4 — redirects.json wired as 301s after 673 entries of accumulated dead URLs.**

**The 072426 edition (July 24) adds §15 — DECK VERTICAL MISFIRE (uncle/nephew rides horizontal). A confirmed bug surfaced during a content session: John Pierpont H00388 → uncle-guardian James Pierpont II H00116 transitions HORIZONTAL when it should be vertical. Diagnosed: the CC data is correct (`gen_delta = −1`); the flight engine's `sameLine` test proxies "same line" by seat distance (`|Δseats| ≤ 180`), and these genuine uncle/nephew sit far apart, so it falls through to lateral. NOT hacked mid-content-session. The proper fix is the long-planned §19.4 LCA/kin-distance bake (per-CC shared-common-ancestor depth, used instead of seat proximity). Deferred, scoped, and specced below. Design rationale: design doc §22.2b.**

**This 071226 edition records the July 11 session: the (unplanned) CARD-TRANSITION MAINTENANCE PHASE is CLOSED and pushed — spouse carousel, demotion baseball-card model, velocity-ceiling physics, six ghosts dispositioned, Playwright probe arsenal standing. Statuses updated throughout; §7 added (state of play + what Phase 3a inherits). Repo-side session record: docs/CODING_HANDOFF.md.**

**The 071326 edition (July 13) adds §9 — the CC-arrival Zoom-1 corrections that landed (hard-cut gather, true-vector reciprocity), the SEQUENCING PIVOT (build standalone Zoom 2 first; shelve the arc trajectory as a later camera path over it), the KEPT/SHELVED disposition of the in-flight arc work, the standalone Zoom 2 build spec (the thing Code is building NOW and needs specced), the arc-readiness invariants, the tech verdict (no Threlte), and the 60fps culling spike. Design rationale: design doc §19.**

**The 071626 edition (July 16) adds §10 — the DEMOTE SETTLE shipped + pushed (commits, dials, the four new probes, the 540ms glide anomaly fixed), the PHASE 7 DATA PREREQ CLOSED (siblings tiered + self-contained; the contextIds trap found and reverted; −26% payload vs the first cut), two large payload optimizations logged for a fresh day, and the Phase 7 UX entry point now that its data gate is open. Design rationale: design doc §20.**

**The 071726 edition (July 17) adds §11 — PHASE 7 SHIPPED END TO END (sibling trigger, panel, cascade, carousel, close, flight, retraction), the GHOST SAGA (three z-order bugs from one unstated fact, one of them pre-existing), the SIX FALSE-GREENS and what they have in common, and the probe suite added. Design rationale: design doc §21.**

**The 072326 edition (July 23) adds §13 — THE DECK SHIPPED. The July-22 §12 sequence's item 1 is DONE: the CC transition is built, probe-guarded, and committed (commit 0c652f6c, Stream B). It shipped as the DECK PUSH — two solid weighted cards + an empty gap, not the visible riffle (the convoy read as "adjacent" and shrank the tree; ghosts parked behind DECK_GHOSTS=false). Records the gen_delta direction model, the fixed ping-pong memory, the weight-physics dials, the flight-lock/connector-cut/belt, the seven-probe guard, and the resequence (Shuffle Notables now unblocked). Design rationale: design doc §22 (as built). Also adds §14 — PHOTO-LOADING RESTORED: a hover-preload experiment had degraded foundational chip loading; fixed by making the NEIGHBORHOOD the load unit (batch preload, on-screen chips tiered first, one shared Cloudinary derivative per person, media demoted to on-demand). The Cloudinary warm-up script is queued. Design rationale: design doc §24.**

House convention preserved: this doc is SEQUENCING and risk; decisions live in
the design doc. When Sam approves an item, fold the decision into DESIGN.md and
mark the phase here.

---

## 0. PHASE 0 — DRIFT AUDIT (do first; costs an hour, prevents a wasted week)

The uploaded `regenerate-data.js` and the live Aaron Burr payload both contain
`landmarksResolved` / `artworksResolved` / `documentsResolved` /
`statuesResolved` — i.e., **Phase 1's entity resolution appears BUILT**, while
UX_ROADMAP §1 and DESIGN.md still say raw IDs are pending. First move for Code:

- Confirm the resolution work is committed and RENDERING (RightColumn consuming
  the resolved arrays, no raw `LM106`/`ART113` on a landmark-rich card).
- Report what remains of Phase 1: overflow solve status, row-anatomy polish,
  TYPE_LABELS map.
- Confirm the sibling data gap: neighborhood ships `siblings_count` only
  (verified against the live payload) — the `siblings[]` compact array is a
  prerequisite for Phase 7 and belongs on the regenerate-data.js worklist.
- Reconcile docs to code. The drift is in the good direction, but two stale
  docs will eventually mis-instruct a cold-start session.

---

## 1. REVISED PHASE ORDER

| # | Phase | Status vs old roadmap |
|---|---|---|
| 0 | Drift audit | NEW |
| 1 | RightColumn close-out (overflow, polish) | Was Phase 1; likely part-done |
| 1.5 | **Card-grid refinement** (design doc §14) | ~70% DONE 7/11: grid gutters, measure cap, stacked vitals, shrinkToFit name/labels, line-per-lineage generation labels, header heights, RightColumn narrowed. REMAINING: CC display cap 6, RightColumn row budget, Connect buttons (ride with Phase 6) |
| 2 | Role-color + midnight background **+ stub state design + off-line ambient tint (design doc §15.1)** | Extended |
| 2.5 | **SEO build-out** | NEW — pulled forward from "pre-Vercel" |
| 2.75 | **Layout-tier foundation + VIEWPORT LOCK** (tier store, stage-fit densities, overflow: clip shell) | Interim scrollbar hygiene SHIPPED 7/11 (scrollbar-gutter: stable + overflow-x clip — arc-wobble dead). Full lock/tiers still pending |
| 3a | **Table coordinates + camera store** (data + plumbing, no visuals) | NEW — split from substrate |
| 3b | Substrate (the FIELD) + left timeline **+ anchor figures** | Was Phase 3; extended |
| 3c | **Flyover layer** (near mode first) | NEW |
| 4 | Search modal | unchanged |
| 5 | Shuffle-notable camera fly | unchanged (trivial once 3a exists) |
| 6 | Connect modals (to-Thomas, to-anyone) | unchanged |
| 7 | Sibling bubbles | unchanged order; data prereq flagged |
| 7.5 | **Spouse carousel (4+ spouses)** | ✅ DONE 7/11 (pulled forward): existence-gated strip, pure-pitch travel 420ms, bookend carets, no-blink fades, pivot-aware offset at capture time, hover lift. Overhang cue REJECTED on pixels (peek removed; right caret is the sole more-cue) — supersedes design §6's overhang |
| 7.6 | **Card-transition maintenance** (UNPLANNED — opened 7/11 by the carousel's ghost hunt, closed same day) | ✅ DONE + PUSHED: demotion baseball-card model (flip-early chip-face, counter-scaled undistorted, atomic swap, rides above rows, finishes before hero), velocity ceiling 1.6 px/ms, orphan sweep + prod janitor tripwire, floater fix, six-ghost taxonomy dispositioned. Settle REVERTED (waits for 3a's vector — design §17.2) |
| 8 | Silver-bar glimmer — **CSS-only** (Threlte ruled out for the card) | Hardened |
| 9 | Zoom 2 (grouped grand-tiers) → Zoom 3 (the literal table) **+ pinch detents** | Explicit now |
| 9.5 | **Tier C — the phone composition** | NEW — after zoom work settles the stage |
| 10 | Auth + bookmarks (BetterAuth/Neon/Drizzle) | Was Phase 9 |
| 11 | **Credibility apparatus**: sources UI, landing/about, analytics | NEW — gates public launch |

Rationale for the two big moves:

- **SEO at 2.5:** indexing compounds with time and is independent of every UX
  phase. Every month unwired is crawl time lost on a project whose stated
  discovery channel is Google. It's mostly build-script work in files already
  owned. The richness gate also resolves the 16k-prerender build-time question
  (prerender the indexable set; stubs can serve from a dynamic fallback).
- **3a split from 3b:** coordinates + camera store are DATA and plumbing —
  buildable and verifiable (numbers in payloads, a probe logging camera
  publishes) before any pixel is drawn. The substrate visual pass then starts
  on solid ground, and Phases 3c/5/9 all consume 3a without touching 3b.
- **2.75 tier foundation before 3b:** tablet/mobile is a stated pillar
  (design doc §12). The substrate, timeline, and anchors must be *designed*
  tier-aware — retrofitting parallax and a persistent timeline rail into
  portrait layouts later is rework. 2.75 is small: the tier store, breakpoint/
  orientation/pointer detection, hit-target audit, and the rule that every
  subsequent phase verifies at three viewports. The full phone composition
  (9.5) comes later; the DISCIPLINE starts here.

The enrichment stream's 5–6 month horizon runs in parallel and is the real
launch gate; this order ensures the SEO surface and credibility apparatus are
ready when the content is.

---

## 2. PHASE NOTES (build-order and verification per phase)

### Phase 1.5 — Card-grid refinement (design doc §14)
Ship as a small run of separately-committable fixes, each verifiable on the
three reference cards (Thomas H00001, Pierpont H00386, Burr H00913) plus one
stub (Anne HD0001) and one dual-descent (Florence TD0055):
1. **Interim scrollbar fix, day one:** `html { scrollbar-gutter: stable; }` —
   stops the horizontal jolt before the real lock lands in 2.75.
2. NB measure cap (`max-w-[52ch]`) + per-seam padding — fixes the
   photo-crowding AND the dead gap in one change (§14.1).
3. Stacked full-width vitals (§14.2).
4. CC display cap 6 + type tightening + line-clamp-2 (§14.4). Display-side
   only — canonical untouched; CC ordering curation routes to data.
5. RightColumn ROW BUDGET replacing the internal scroll (§14.5), with the
   media-rich priority regime (Career 2 → Art/Statues/Landmarks → … →
   Education 1, notes → tooltips). Verify: Thomas renders art + statues fully,
   no internal scrollbar, burial pin visible — probe asserts no
   `overflow-y: auto` scroll state in the column.
6. Fixed 84px header + compact dual-descent label in
   `computeGenerationLabels` (§14.6). Verify on Florence TD0055: no wrap, no
   downward shove; content zone starts at identical y across all five
   reference cards.
7. Connect buttons markup can land here disabled-hidden behind a flag, or
   wait for Phase 6 (recommend wait — no dead affordances).

### Phase 2 addendum — role color, wayfinding ambient, dual descent (design doc §15)
- Role-glow ships WITH the midnight background (invisible on white) — a
  sequencing dependency, not a preference. Tints 3–6% chroma; glow/edge
  carries the role; ID-prefix chip tinted as the colorblind double-cue.
- Same A/B session as the field skin: gold + (lime vs sage vs emerald) on
  the dark ground. Sam's eye decides.
- Decide the dual-descent treatment ONCE (two-tone edge vs gold + green
  accent) — it propagates to cards, timeline lifespan bars, zoom-3 chips.
- X-cards get the neutral tint (§15.1) — the ambient "off the line" signal.
- The compass control ("Return to the Hooker line", §15.2) can land here or
  with Phase 6's connect modals; recommend HERE — it's one CC lookup and a
  chip, and it protects users the moment easter-egg density grows.
- The door pair (§15.3) lands after its data prerequisite (bridge compact in
  X-payloads) — coordinate with the data stream; UI is small once fed.

### Phase 2.75 — Layout-tier foundation + VIEWPORT LOCK (design doc §12–13)
- The tier store (breakpoint/orientation/pointer) AND the stage-fit store
  (`svelte/reactivity/window` innerWidth/innerHeight → density) are ONE
  module — window geometry in, {tier, density} out; nothing else reads the
  window directly.
- The shell lock: `100dvh` + `overflow: clip` + `overscroll-behavior: none`;
  `vw/vh` purged inside the shell in favor of `%`/`fr`/`cqi`.
- Density steps drive card geometry tokens + children-row caps ("+K" chip —
  zoom 2 bracket vocabulary); stage-scale transform below minimum height.
- Verify: fit probe asserting the stage bounding box ≤ viewport at all three
  densities on the richest cards — **proven RED on today's Pierpont overflow
  first**, then trusted green. Flight-during-short-window probe confirms no
  scrollbar flash (the clip makes it impossible; prove it anyway).

### Phase 2.5 — SEO build-out
1. Richness-gate predicate (Sam defines; suggest `notable || nb_count >= 1`)
   → `noindex` meta on gated-out pages + sitemap.xml emit in regenerate-data.js.
2. 301 path: dynamic catch-all reading redirects.json (or vercel.json rules if
   the set is small). Verify with curl: old slug → 301 → current slug.
3. JSON-LD Person on indexable pages; unique title/meta description per slug.
4. Verify relative/CC links are real `<a href>` in prerendered HTML (cold
   path), then wire `handleHttpError` as the dead-link report — high value
   during minnowing.
5. Measure full-prerender wall time at current scale; decide
   prerender-indexable-only if slow.
6. (Later, cheap win) OG images for notables only.

Verification: fetch prerendered HTML for one rich person, one stub, one
renamed slug; assert meta/robots/JSON-LD/301 with a script, then eyeball.

### Phase 3a — Table coordinates + camera store
1. In regenerate-data.js: tidy-tree x-ordering over the descent line
   (role-priority dedupe gives each person one seat); y from birth year with
   the generation-estimate fallback + `y_estimated` flag. **All coordinate
   math and null-guarding happens HERE, never in a runtime `$derived`.**
2. Embed coords in compact records + payloads; emit `table-index.json`
   (lazy-load asset for zoom 3 / flyover) **including parent pointers
   (`father_id`/`mother_id`) per row** — enables the near-mode lineage
   flyover and a client-side path/LCA walker for the connect modals.
3. Camera store: module-level (plain values — the motion-loop hazard applies),
   published by the click handler alongside the existing flight captures:
   `{from, to, duration, easing, kind}`. Flights keep their implementation and
   read the shared duration/easing; `panDir` retires in favor of the vector.
4. Probe: log camera publishes on a click path (child → CC wormhole →
   Thomas) and assert directions/distances match table deltas. No visuals yet.

### Phase 3b — The field + left timeline + anchors
- **The field** (design doc §3.5): 2–3 world-space point layers, seeded/
  deterministic, viewport-culled, one transform per layer per frame; plus the
  far-depth decade rules (the semantic layer that replaced generation
  horizon-lines after the §2 axis decision). **Skin A/B on localhost**
  (star-cold vs archive-warm motes) — same code, Sam's eye decides.
- **Parallax math per design doc §3:** true-vector camera (never quantized —
  the 89°/91° child-drift falls out of real coordinates), depth factors
  (card 0 / near ~0.5 / mid ~0.35 / far ~0.2), dead zone for near-zero
  displacements (spouse swap = head-turn, no pan), soft-compression knob
  reserved for 300+-year flights if tuning demands it.
- The 30–50 ms camera lag + ~2px overshoot-settle (approved feel direction).
- **Left timeline** (design doc §3.6): scale + featured-lifespan highlight
  band (dimmed/hatched when `y_estimated`) + **anchor figures** — ~10 curated
  circular thumbnails at birth-year positions, min-gap collision nudging with
  leader lines, click = growFrom flight originating at the circle's rect.
  Anchor curation + thumbnail crops route to the data stream (§4 below).
- Gondola guard: full-viewport pointer-events lock for flight duration —
  also closes the rapid-click/garbage-rect hazard. `prefersReducedMotion`
  parity throughout (kills twinkle, parallax, wake).
- Verify: CDP frame sampling showing field layers and card share start/end
  frames (two-clock desync is THE failure mode); anchor click produces a
  correct camera publish and flight; all of it at the three tier viewports
  (2.75 discipline); then Sam's eyes — including on a real iPad.

### Phase 3c — Flyover layer (two modes; near mode is the priority)
- **Near mode (1–3 generations):** selection = the true lineage path (parent-
  pointer walk over table-index), 1–4 legible minimally-blurred tiles, and the
  WAKE — tiles linger ~300–500 ms after landing, then dissolve. Flight speed
  unchanged; legibility lives in the settle. This mode ships FIRST — it's the
  tree-familiarity feature, not polish.
- **Far mode (wormholes/shuffle):** corridor query (spatial buckets), cap
  ~40, notable-biased, streakier blur, little/no wake.
- Shared: inert tiles, transform/opacity only, removed after wake; degrade to
  substrate-only if index not loaded.
- Verify near mode: a two-generation ancestor flight surfaces the actual
  connecting parent(s), readable in the wake. Verify far mode: a 1750→1900 CC
  flight shows recognizable names at plausible positions. Frame-rate probe
  confirms no jank vs. baseline flight.

### Phase 9 — Zoom 2 then Zoom 3, + pinch
- **Zoom 2:** grand-tier grouping by `via_parent_id`; bracket of ≤4–5 compact
  tiles + `+K` overflow chip (overflow navigates to the child — lean on
  navigation, don't cram). Grandparents render fully (bounded). Roster/zone
  seams already exist (`buildRoster(f, zoom)`).
- **Zoom 3:** table-index + viewport-culled DOM chips; transform-based pan
  with Pointer Events + inertia (`touch-action: none`); chip click captures
  rect → featured → zoom reverts to 1 with a growFrom flight. Per-person
  payload pattern explicitly does NOT apply here — zoom 3 draws from the
  bundle plane.
- **Pinch detents (design doc §5):** accumulator + elastic live hint +
  hysteresis thresholds snapping into the staged zoom transitions; continuous
  scale only WITHIN zoom 3; trackpad ctrl-wheel drives the same accumulator.
  Verify the detents on a real iPad — threshold feel can't be probed.
- Build zoom 2 first: it exercises grouping and roster changes inside the
  proven zoom-1 stage before the new rendering plane of zoom 3.

### Phase 9.5 — Tier C, the phone composition (design doc §12)
- Vertical stack recomposition of zoom 1; timeline rail (~32 px) with lifespan
  highlight + anchor dots, tap-to-expand overlay with anchor thumbnails;
  entities/CC as accordions; motion diet (simplified flights, reduced field,
  near-mode wake KEPT, far-mode flyover skipped).
- Treat as a design session + build, not a CSS squeeze — Tier C is the landing
  surface for every shared link and OG unfurl, i.e. most first impressions.
- Verify: probes at a phone viewport + Sam on a real device.

### Phase 7 / 7.5 — Siblings, spouse carousel
- Siblings: **data prereq** — add `siblings: PersonCompact[]` to the
  neighborhood in regenerate-data.js (payload today has count only). Then:
  transform-nudge on the card GROUP (~16–24 px, soft spring), staggered bubble
  entrances, panel reset on nav, bubbles carry flight-ids.
- Carousel: window-of-3 over the spouse list, page-by-one, keyed each +
  flip; overhang cue on offset > 0 (chips are card-siblings, so the clip-path
  can't clip them — reserve a RightColumn left gutter); left arrow at
  offset > 0. Inert during flights (gondola guard). Open decision routed to
  Sam: children rows keep showing all marriages (recommended) or filter to
  visible spouses.

### Phase 8 — Glimmer, CSS-only
Cursor-tracked specular sweep via CSS custom properties + masked pseudo-element,
1.5–2° tilt, layered shadows. Gated off during flights. **Threlte ruled out for
the featured card** (would trade the DOM architecture — flights, anchors,
a11y — for a hover effect). If real 3D ever happens it's a separate showcase
view, not this card.

---

## 3. RISK REGISTER (additions to the existing one)

- **NaN geometry** — the substrate/timeline compute over birth-year holes; the
  gps crash proved a throw in `$derived` presents as an unrelated render
  collapse. Mitigation: ALL coordinate math at build time with estimates +
  flags; runtime derivations are lookups that degrade to null.
- **Two-clock desync** — substrate on its own transition timing vs TICK-based
  flights reads as two unrelated animations and kills the table illusion.
  Mitigation: single camera publish; CDP frame-sampled verification, proven
  red before trusted green.
- **Mid-flight input** — clicks during flights capture rects of pinned,
  mid-animation elements. Mitigation: the gondola guard (Phase 3b), verified
  by a rapid-click probe.
- **Content growth vs fixed geometry** — the enrichment stream is actively
  fattening entries; the 580px card and RightColumn heights were tuned on thin
  data. Test overflow against the richest cards (Thomas, Morgan, Burr), not
  the average. The two streams collide exactly here.
- **Zoom-3 payload plane** — loading table-index eagerly would tax first
  paint; loading it late starves the flyover. Mitigation: lazy-load on idle
  after first card render; flyover degrades gracefully until it lands.
- **Carousel/flight interaction** — a spouse paging animation overlapping a
  flight capture corrupts origin rects. Mitigation: carousel inert during
  flights; flights capture from current rects (already the pattern).
- **Silent clipping under the viewport lock** — `overflow: clip` without the
  fit contract amputates content invisibly (no scrollbar to reveal it). The
  fit probe (2.75) is the guard; every density change re-runs it on the
  reference-card set.
- **Budget-renderer starvation** — the RightColumn row budget could hide a
  section Sam expects (e.g. burial-adjacent content on an unusually short
  density). Mitigation: burial is NEVER in the budget (pinned, always
  rendered); the probe set includes a compact-density Thomas.
- **Zoom-3 image flood** — portraits on pannable tiles turn a fast fling
  into thousands of image requests. Guard: the §6.5 photo policy (text
  tiles by default, notable/anchor thumbs only, dwell-gated attach).
- **Prerender wall time at 16k routes** — measure before Vercel CI commitment;
  the richness gate offers prerender-indexable-only as the escape hatch.

---

## 4. ROUTED TO THE DATA / PIPELINE STREAM (not frontend)

- `siblings[]` in the neighborhood payload (regenerate-data.js) — Phase 7 prereq.
- Table coordinates + `y_estimated` + table-index.json emit — Phase 3a (build
  script, but it's pipeline code; coordinate with the data chat on the
  generation-estimate constant).
- Carried from before: 10 string-form gps cemeteries; 225 unresolvable burial
  cem-ids; ~600 birth-year holes (now doubly relevant — they become estimated
  table seats); notable-URL gaps (now gate JSON-LD `sameAs`).
- **Timeline anchor curation (design doc §3.6):** Sam designates ~10 anchor
  figures (per-person approval, like notable) via a flag or ordered list in
  canonical.json; regenerate emits the anchors artifact; small optimized
  portrait thumbnail crops produced at build time. Photo availability may
  steer the final ten.
- Enrichment priority input (once analytics exist): let observed traffic and
  GSC queries steer the Tier-1/Tier-2 worklist ordering.
- **X-entry wayfinding prerequisites (design doc §15):** audit every
  easter_egg for its automatic `family_orbit` CC (doctrine exists; Pantry
  X00090 suggests drift); ship the bridge couple's compacts on X-focus
  payloads (regenerate-data.js) for the door pair.
- **NB lint (from Pantry X00090):** flag headers > 8 words (UI-truncation =
  fatal for the primary product) and bodies whose first sentence repeats the
  header. X-entries likely the concentration.
- **Chip date degrade:** suppress "?–?" when both lifespan ends unknown
  (render-side, but noted here since stubs dominate the data).
- **"The card is the page budget" editorial doctrine (design doc §14.5):**
  career/education arrays trimmed at the source to card scale — Thomas
  content sweep first (one pastorate line, degrees collapsed, education
  notes shortened). CC display ORDER curated per person (best wormholes
  first) since the render cap shows the first 6.
- **Source capture doctrine (design doc §9):** standing rule — every distill/
  paste ingestion auto-records its source into `research_sources` in the same
  pass; add a `source_add` op to the tasks grammar; run a sources lint
  (blurb-worklist pattern) flagging NB-bearing entries with no sources →
  sources_worklist.tsv, worst first. Minimum viable citation = URL + tier +
  access date.

---

## 5. LAUNCH DEFINITION (proposed, for Sam to edit)

Public share-ready =
enriched spine without major gaps (Sam's 5–6 month content horizon)
+ Phase 2.5 live for ≥2–3 months (indexing takes time)
+ credibility apparatus (sources UI + about/landing) shipped
+ stub state designed
+ the table motion system (3a/3b) — the demo that makes historians and
  hiring managers understand in ten seconds that nothing else is like this.

Everything after (zoom 3, auth, contributions) deepens a launched product
rather than gating it.

---

## 6. DELIVERY ARCHITECTURE & RUNTIME PERFORMANCE — deploy reference
*(added July 9 session; the "will users ever feel the 38 MB?" analysis,
recorded for deploy time. Verified against the live Pierpont payload and the
current featured.svelte.ts / navigate.ts / buildFeatured.ts.)*

### 6.1 The delivery model (why the 38 MB never ships)

canonical.json is BUILD-TIME source only. regenerate-data.js compiles it into
~15k individual payloads; a browser only ever fetches
`/data/person/<slug>.json` for the card on screen. Opening Thomas loads
Thomas — his neighborhood, context records, resolved entities — and nothing
else. The corpus lives on the CDN as thousands of small static files.
Minifying canonical helps git pushes and build wall-time, never users.

Measured reference point (Pierpont H00386, a RICH card): 155 KB raw with 68
context records → roughly 25–35 KB over the wire (Vercel serves
brotli/gzip automatically). Median cards are far smaller.

### 6.2 Memory over a long session (the 20-minute question)

No accumulation by design: `featured.set()` REPLACES `#current` — there is
deliberately no cache layer — so each navigation releases the previous
FeaturedData to GC. The DOM is one page's worth of components; flight
elements are per-nav and cleaned; the popout portal and listeners have
destroy handlers. The browser's HTTP cache grows (that's disk, self-evicting,
and it's why revisits are instant), JS heap does not.

Caveat: leak-freedom is verified, not assumed — one stray listener or
uncleared module-level capture away. **Soak probe (add to Code's arsenal):**
an automated loop of 200–500 navigations sampling JS heap via CDP, asserting
return-to-baseline. One session to build; guards every future phase. Prove it
red first by temporarily retaining payloads in an array.

### 6.3 Localhost vs deployed (the one difference you will feel)

Localhost fetches cost ~1 ms; deployed, each navigation is one CDN fetch —
50–150 ms typical. `focusPerson` awaits the fetch BEFORE pushState/flight, so
that latency appears as a dead gap between click and motion — exactly where
"instant and infinite" would degrade to "slightly sticky." Two mitigations
erase it; together they are the prefetch unit below.

### 6.4 THE PREFETCH UNIT (self-contained; can land any time after Phase 0)

**a) Prefetch on intent** — in `warmPersonLinks` (already the single choke
point for every person-link interaction):

```ts
// intent = hover (desktop) or finger-down (touch). ~200–400 ms of hover, or
// the ~100 ms press-to-click window, hides most of the CDN round trip.
const prefetched = new Set<string>();
function prefetch(slug: string) {
  if (prefetched.has(slug)) return;
  prefetched.add(slug);                       // dedupe per session
  fetch(`/data/person/${slug}.json`).catch(() => prefetched.delete(slug));
}
// in the action: listen pointerenter + pointerdown (capture), extract the
// /person/<slug> match exactly as onClick does, call prefetch(slug).
```

The click's real fetch then resolves from HTTP cache. No state, no cache
layer of our own — the browser IS the cache.

**b) Neighborhood prefetch on idle** — after a card lands, the next click is
almost certainly on-screen family. In `requestIdleCallback` (fallback
setTimeout ~200 ms), fetch payloads for visible relatives — parents +
children first, then spouses/CCs — with capped concurrency (~4), skipping
when `navigator.connection?.saveData`. ~15–20 files × ~30 KB ≈ 0.5 MB of
idle work per landing → every subsequent navigation feels like localhost.
Cancel the queue on navigation (stale neighborhood).

Verification: CDP network probe asserting the click-time fetch is
cache-served after hover; a throttled-network run (Fast 3G) showing flight
start latency < ~30 ms with prefetch vs. 300+ without.

### 6.5 Zoom 3 under fast iPad panning (the "many tiles" concern)

**Zoom 3 is the LEAST network-dependent view.** Tiles render from
table-index.json — one lazy idle-time bundle (~16k rows ≈ 1.5–2 MB raw,
~300–500 KB compressed, fetched once and held for the session). After that,
flinging across the whole table fires ZERO fetches; per-person payloads load
only at the dive (chip tap → zoom 1), one file, hidden inside the dive
flight (plus a `pointerdown` prefetch makes even that invisible).

The real risks at zoom 3 are rendering and images, with policies:

- **Photo policy (the one true loading hazard, softened by the data):**
  portraits on pannable tiles = many image requests under fast panning —
  but most entries have no photo, so the field is sparse by nature. Default
  zoom-3 tile = text + role color; photos for notables/anchors only, via
  **Cloudinary URL transforms, not build-time crops** — images are already
  Cloudinary-hosted (≤500 KB originals), so a tile thumb is just
  `/upload/w_64,h_64,c_fill,q_auto,f_auto,dpr_2.0/` inserted into the
  existing photo_url (~3–8 KB AVIF/WebP, generated on first request,
  CDN-cached; the RightColumn popout already uses this exact pattern).
  `loading="lazy"`, attached only after a tile is stationary ~150 ms so a
  fling never queues images. Timeline anchor thumbnails (§3.6 of the design
  doc): same transform, no pipeline.
- **DOM budget:** viewport culling from spatial buckets; at the fixed zoom-3
  scale expect a few hundred visible tiles — cap rendered nodes (~800) and
  the density can be generous ("a lot" is fine; 16k at once is not).
- **Overscan follows velocity:** cull with a margin biased in the drag
  direction (e.g. +1 viewport ahead, +¼ behind), rAF-throttled cull updates,
  transform-only tile positioning, `content-visibility: auto` as belt.
- **Dwell prefetch:** hovering/resting on a tile ≥ ~200 ms → prefetch that
  person's payload, so the eventual dive is warm.

Verification: CDP frame sampling during a scripted max-velocity drag
(iPad viewport) asserting no dropped-frame clusters and zero network
requests mid-fling; then Sam's thumb on real glass.

### 6.5b Zoom-1 portrait weight (one-line win, do before deploy)

FeaturedCard renders the RAW photo_url — up to 500 KB for an image shown
~210 px wide. Change the `photoUrl` derivation to inject
`w_520,c_fill,q_auto,f_auto` (520 ≈ 2× rendered width for retina): typical
result 30–60 KB, an 80–90 % cut on the heaviest asset of every card load.
On a prefetched navigation the portrait is the only thing left that can
arrive late and pop in; this mostly eliminates that. Guard the rewrite to
Cloudinary-hosted URLs only (same host test the popout uses) so any odd
external image degrades to its original URL.

### 6.6 Deploy checklist (the section to reread before Vercel)

1. Prefetch unit live (6.4a + 6.4b) — the localhost feel depends on it.
2. Soak probe green on a 300-nav loop (6.2).
3. Compressed-size histogram across all payloads (flag outliers > ~80 KB
   wire; consider trimming context records to the fields `enrich()` reads —
   only if the histogram says it matters).
4. Cache headers: payloads are content-hashed OR short-max-age +
   must-revalidate (slugs are stable but content updates with each
   regenerate — verify Vercel's static caching matches the update rhythm).
5. Throttled-network pass (Fast 3G) on the five reference cards.
6. table-index.json + people.json confirmed lazy/idle, never blocking first
   card render.
7. Cloudinary transform sizes live on featured portraits (6.5b), zoom-3/
   anchor thumbs (6.5) — never ship a raw ≤500 KB original to any slot
   smaller than the portrait column.


---

## 7. STATE OF PLAY AFTER JULY 11 — what Phase 3a inherits
*(added 071226; read this section first when opening the Phase 3a session)*

**Closed and pushed:** the card-transition layer. Spouse carousel (7.5) and
the maintenance phase (7.6) are done; the flight primitives are the
cleanest they have ever been — no fades on demotions, atomic landings,
velocity-capped physics, every ghost fixed or accepted-with-reasons.
Repo-side record: docs/CODING_HANDOFF.md (created 7/11; CLAUDE.md already
references it).

**The verification posture changed project-wide.** Playwright is installed
(via sv CLI) with a standing arsenal: probe-flight (checks A–G incl. the
Morgan wife round-trips, paged-nav guard, atomic-swap and aspect-distortion
assertions; Artifact A + C logged as accepted annotations), probe-carousel-
regression (frozen rects, no-scrollbars, no-protrusion), probe-stress +
orphan detector + prod janitor tripwire, and the measurement scratch tools
(frame samplers, settle capture). EVERY subsequent phase's "verify" bullets
are now real executable gates, not aspirations. House rule proven three
times on 7/11: probes evolve first, prove red, then trust green — and Sam's
rendered-pixels verdict outranks any green probe.

**Phase 3a is now load-bearing for a BACKLOG, not just the future.** Three
deferred items are explicitly parked on 3a's travel vector:
1. The arrival settle (translate overshoot along the vector — design §17.2).
2. The corridor-hold option for demotion occlusion (rides with the flyover
   corridor computation, if Sam ever wants it).
3. The Artifact-A demotion-exposure clip (only meaningful if the spouse
   demotion regime ever changes; currently accepted).
Plus the velocity-ceiling constant family (design §17.1) that the camera
must share. This strengthens the sequencing verdict: 3a (coordinates +
camera store, DATA AND PLUMBING ONLY, no pixels) is next, exactly as
ordered — and its first block should be the regenerate-data.js coordinate
work verified by numbers in payloads, with the same report-before-build
patience that carried 7/11.

**Doctrine now binding on all future phases (design §17.5):** existence-
gating for minority-card features; capture-time state settlement;
invisible-at-rest → invisible-exit via non-degenerate transitions; no
direction-dependent motion outside the shared vector; per-layer commits
with Sam's pass between layers — no compound holds, ever again.

**Small carried debts (don't lose these):** CC display cap 6 + CC order
curation (data stream), RightColumn row budget, caret reachability at
<1030px viewports (rides with 2.75 tiers), the finished-animation Svelte
teardown edge (janitor-belted, on the deferred list), and the Phase 1.5
remainders noted in the phase table.


---

## 8. JULY 12 EVENING ADDENDUM — motion layer CLOSED; field dormant-but-live

- **Motion layer CLOSED:** settle extended to relative promotions (own-vector
  angles, ~5px, endpoints frozen); demotion micro-settle deliberately skipped
  (atomic-swap protection outranks a 2px flourish). Spouse regime complete
  (geometry-keyed crossfade, honest-velocity coupling at 1.85, first-frame
  fix). All pinned in probes.
- **Field (3b Block 1) shipped as MECHANICS, not look:** parallax plumbing
  verified; illusion did not read alone — see design §18 (the recipe). The
  three-way ground toggle (Light default / Midnight / Pine) keeps the dark
  world thirty seconds away without blocking light-mode work.
- **Known debts, all named:** flight.ts concentration (consider a per-regime
  split before the flyover lands there); prod janitor (tripwired framework-
  teardown belt); field Block-2 seeding REQUIRED before dark mode ships;
  CC camera to:null lookup; Phase 1.5 remainders; viewport lock (2.75).
- **Next session opens on design §18.4's build order** — timeline rail (step
  3) is the highest-value single move: independently useful in light mode,
  and the field's essential partner in dark.

- **JULY 12 FINAL VERDICT (see design §18.8):** no moving substrate at
  zoom 1/2 — ever. Static ground (optional true-parchment texture).
  Phase 3b re-centers on the LEFT TIMELINE RAIL as the time/travel
  instrument; the field stays toggle-dormant; the world-anchor/dock-to-line
  code (c334b6e4) is retained as zoom 3's foundation. Camera store remains
  load-bearing (timeline thumb, flyover, zoom 3, settle).

- **ZOOM MODEL SIMPLIFIED (design §18.9):** two named views — THE CARD and
  THE TABLE. Zoom 2 cut (its jobs go to the timeline rail, sibling
  bubbles, and the Table). The Card↔Table transition is the signature
  gesture (featured card lands on its seat among the tiles) and gets
  designed as a hero moment when the Table phase opens. Tier system stays
  data-driven so a middle view remains cheap to add if ever justified.

- **JULY 12 CLOSING STATE (final):** CC flash bug root-caused (structural,
  pre-existing) and fixed by the ARRIVAL CLASS (directional entry/exit for
  all non-chip navigation — search modal reuses it verbatim). CC objects
  carry embedded target t + build-time relation_class (direct/collateral)
  driving flight angle. In flight or queued at session end: settle-
  direction fix (overshoot along entry vector, proven red-first),
  gather→fly→unfurl family choreography, the passage layer (decade markers
  on far flights). Next major build remains the LEFT TIMELINE RAIL (§3.6),
  now doubly motivated: it is both the time instrument (§18.8) and the
  passage layer's synchronized partner (§18.11).
- **STANDING ARCHITECTURE, one paragraph for whoever opens the next
  session:** two views (Card/Table, §18.9); static ground at the Card
  (§18.8); all motion = solid objects on one velocity family drinking from
  the camera store; coordinates and relation classes derived at build
  time; canonical never touched by UX; probes pin every approved state and
  evolve red-first; Sam's rendered-pixel verdict outranks any green probe.

---

## 9. JULY 13 SESSION — CC-ARRIVAL CORRECTIONS, THE ZOOM-2-FIRST PIVOT, AND THE ZOOM 2 BUILD SPEC
*(added 071326. Design rationale: design doc §19. Read this first when opening
the Zoom 2 session — it is the live spec for the view currently under
construction.)*

### 9.1 What landed at Zoom 1 (CC arrival — kept, correct on their own merit)

These corrections make Zoom-1 CC navigation HONEST regardless of Zoom 2; they
stand permanently:

- **Hard-cut gather (commit `fccd565c`).** The pre-flight "gather" pause is gone.
  On a CC nav the parent/child roster is removed at FRAME 0 — the same frame the
  flight origin is captured — instant `opacity:0`, no transition, no `GATHER_MS`.
  The lone card launches that frame. This reverted the design doc's "beat of
  stillness" hypothesis on Sam's pixel verdict (it flashed and read amateur).
  Verified: zero chips from frame 0, slot height stable (no card jump), roster
  still unfurls at landing, chip-nav reveal untouched.
- **True-vector reciprocity (commit `1a3303b9`, proved red-first).** Removed the
  ~45° angle cap and the `vy=0` default-down that were injecting a fake downward
  component into same-era collateral flights (the both-descend reciprocity bug
  Sam caught: Debevoise→Rockefeller and the reciprocal both panned DOWN). New
  direction normalizes to `(sign · compressed Δx, true Δy)`. Results: same-era
  CCs pan horizontal (no fake descent); A→B is the exact reverse of B→A
  (`|sum|` reciprocity 0.000, was 1.414); granddaughter stays ~6° vertical;
  uncle keeps ~45.6° from his real gen gap, reciprocal now inverts up↔down.
  A standing **probe-reciprocity** guard was added.
- **Parent/child unfurl symmetry — FLAGGED, confirm status.** Sam observed the
  children correctly wait for the destination card's final position before
  transitioning in, but the PARENTS transition in during flight. Fix specced:
  gate the parent-row unfurl on the SAME landing signal (`introend`/final-
  position) the children use, so both emanate together from the landed card
  (mirror of the July 11 children-row entrance symmetry fix). Probe: zero
  parent-chip pixels before the landing signal. **Verify whether this landed
  before the pivot; if not, it rides into the quiet-Zoom-1 state as a small
  correctness fix, independent of Zoom 2.**

### 9.2 The pivot — Zoom 2 first; the arc becomes a later camera path

**Decision (design doc §19.5):** build Zoom 2 FULLY as a standalone hand-panned
view FIRST. Re-attach the CC altitude arc as a camera path over the finished
Zoom 2 LATER, when Sam reopens it. The arc is a camera path over terrain that
must exist before the flight can be tuned; the hard parts of Zoom 2 (interaction)
are parts the arc does not need, so building Zoom 2 does not depend on the arc.

**Zoom-1 CC flights stay QUIET** (modest honest directional pan, §9.1) until the
arc's other half exists. Deliberate temporary state, not a regression.

### 9.3 KEEP / SHELVE disposition of the in-flight arc work

The arc build was mid-Slice-2b when interrupted. Disposition:

**KEEP (Zoom 2 / Card↔Table infrastructure, not arc-specific):**
- **Camera scale channel — Slice 2a (`9cb27c88`).** Scale-on-one-clock is needed
  by the manual Card↔Table hero transition too. The scale-transform application
  bug hit during 2a was fixed and stays fixed. Retain.
- **The tile primitive** being written under Slice 2b — but RE-HOMED as the
  standalone Zoom 2 view component, not the arc's reveal layer. Same component,
  unwrapped from the arc.
- `tableCamera.svelte.ts` (the Zoom 2 camera store, `{cx, cy, scale}` in table
  coords) — already authored as the store the parked arc will later publish to.
  Correct; keep.

**SHELVE (commit-and-park, do NOT delete, do NOT push, flag-gated inactive):**
- The arc trajectory: the up→over→down camera path, `arcClock` corridor
  endpoints (`fx/fy → tx/ty`), the auto-flight, the gondola extension across
  phases, `arc-math.ts` / `arc.svelte.ts` arc logic. It returns unchanged when
  Sam reopens the arc, flying over a real Zoom 2.

### 9.4 STANDALONE ZOOM 2 — BUILD SPEC (the live target)

The view currently under construction (`/table` route, `tableCamera` store).
Build it as THE TABLE (design doc §18.9), hand-panned, on its own:

1. **Tiles.** Inert, same-size (≈ chip scale), one per person at true
   `table-index.json` seats. Single seat per person (16,411 unique IDs;
   role-priority dedupe → no double-descent second-seats in v1). Tile content:
   name + lifespan; `pointer-events` active for the click-to-featured path (this
   is a real interactive view, unlike the arc's inert flyover tiles).
2. **Regions as distinct lines.** `hd` → spine; `td && !hd` → grove; else →
   orbit/gutter. Minimal region TINT at rest so lines read at a glance — land it
   with the first build even ahead of Phase 2's full palette (a name-field with
   no line distinction is the claustrophobia restated).
3. **Pan + inertia.** Pointer Events, `touch-action: none`, pointer capture;
   sample velocity at pointerup, decay. Writes `tableCamera`.
4. **Culling.** Spatial buckets over coordinates → render only tiles in viewport
   + margin. Live DOM node count stays in the HUNDREDS on any pan, including a
   fast fling.
5. **Rendering discipline.** ONE transform on the container (driven by
   `tableCamera`), transform/opacity only, `will-change: transform`. No per-tile
   per-frame transforms; no layout-property animation.
6. **Click → featured.** Capture the tile's on-screen rect (existing
   `captureFlightOrigin` pattern) → set featured → return to Zoom 1 with a
   growFrom flight. Zoom 2 is a VIEW, never a separate app.

**Arc-readiness invariants (bake into Zoom 2's bones so the arc stays cheap —
design doc §19.6):**
- (a) Renderer + coordinate→screen mapping is CAMERA-STORE-DRIVEN, never native
  scroll or a private pan state. The arc later publishes moves to the same store.
- (b) SCALE is a CONTINUOUS INPUT to the renderer, not a hardcoded Zoom-2
  constant. The arc (and future pinch) sweep intermediate scales.
- (c) The manual **Card↔Table transition is built as part of Zoom 2** and is the
  clean seam — the arc is a thin wrapper on it later. (§18.9's hero moment: the
  featured card shrinks and lands on its seat among the tiles.)

**Verify:**
- Static table renders recognizably as a family tree — Sam's eyes; the bar is
  "recognizable, even Ancestry-basic." Busy-but-recognizable is the target.
- Regions visibly distinct at rest.
- 60fps frame-sampled on a real iPad (not just the dev machine) during pan and
  fling.
- Culling keeps visible-node count bounded on a fast fling (probe/assert an
  upper bound).

### 9.5 TECH VERDICT — no Threlte/3D (design doc §19.7)

Zoom 2 and the arc are 2D: "altitude" = `scale()`, "flight" = 2D
parallax + scale over the TICK clock. Stack stays Svelte 5 runes + CSS transforms
+ Pointer Events + camera store + TICK clock; D3 only for build-time coordinate
computation. Do NOT add three.js/Threlte/flight-sim libs — a WebGL tile loses
rect-capture (breaks grow-from-tile), `<a href>` (breaks SEO cold path), hover,
a11y, and shared styling, to gain nothing 2D transforms don't already do. §5
(DOM+culling not canvas) and §8/Phase 8 (Threlte ruled out for the card) already
established this; §19.7 extends it to the table. Real 3D only ever as a separate
showcase page, never the working substrate.

### 9.6 De-risking spike (recommended before Zoom 2 proper goes deep)

A throwaway spike: render ~300 absolutely-positioned tiles under one transformed
container and pan them, CDP frame-sampled, on the real iPad. Proves the
load-bearing 60fps assumption for the cost of ~an hour, before committing much to
Zoom 2. If smooth (it will be), the rendering-tech question is closed and the
library temptation never returns.

### 9.7 Carried forward / routed

- **LCA-depth / graph-distance bake → data stream (design doc §19.4).** Stamp a
  relation-distance value on each CC in `regenerate-data.js` (build-time, never
  runtime). It is the correct arc trigger AND shared infrastructure for any Zoom
  2 "how far apart" affordance and the connect-to-anyone modal — not arc-only
  scaffolding. Queue now so the arc keys right from the start when reopened.
- **Passage-layer re-key** (from year-span to graph distance) is DEFERRED with
  the arc — do not touch until the arc reopens over a real Zoom 2.
- Sam's stated NEXT stages after this pause: the LEFT TIMELINE RAIL (design doc
  §3.6 / §18.8 — the highest-value single move, time+travel instrument at the
  Card) and the start of MOBILE SIZING (tier foundation, design doc §12 / §2.75).
  Neither depends on Zoom 2; both can precede the arc's return.

### 9.8 ZOOM 2 v1 CHECKPOINT (July 13, ~9:30am) — shipped scaffold, phase closed

Zoom 2 v1 is committed (local, pushed on Sam's word) and the coding phase is
PAUSED here deliberately — a working-but-ugly checkpoint, not a finished view.
Sam's verdict on the render: a bare scaffold ("looks like nothing, but above
zero"), correct for a v1 whose recognizability features aren't drawn yet. This is
the FLOOR (plumbing proven), not the ceiling.

**Committed and dormant:**
- Arc parked (`e8af1b6f`, `ARC_ENABLED=false`) — full machinery intact
  (clock, corridor endpoints, growFrom/shrinkTo branches, scale-transform-via-
  tick fix); every CC flies the flat directional arrival again (reciprocity /
  arrival / choreography green). Flip one flag to reactivate over a finished
  Zoom 2. Slice-2a scale channel retained for the manual Card↔Table transition.
- Zoom 2 v1 (`23957f45`) — `/table`, standalone hand-panned view. Tiles at true
  single-seat coordinates; `tableCamera` store (arc will publish fly-to here, no
  rebuild); one container transform; spatial-bucket culling (~130 live nodes,
  fling peak ≤ cap 500, proven); Pointer-Events pan + inertia + capture,
  `touch-action:none`; three regions tinted (spine warm / grove green / orbit
  gray). `probe-table.mjs` standing (TABLE PROBE GREEN). Superseded arc-reveal
  scratch primitive (`Zoom2Field.svelte`) removed.

**Entry-point worklist when Zoom 2 reopens — PRIORITY ORDER:**
1. **Connector lines (parent→child edges) — THE recognizability lever.** The v1
   is a scatter positioned like a tree; drawn edges make it a TREE. This is most
   of the gap to "reads as genealogical." Do this FIRST — it changes the whole
   character and is why the scaffold currently "looks like nothing."
2. **Descendant-count reframe.** The "104 of 16,411" counter is a
   rendering-progress number that means nothing to a visitor, and 16,411 is
   off-thesis (most are spouses married in, not Hooker blood). The headline count
   should be BLOOD DESCENDANTS OF THOMAS HOOKER, spouses secondary/dimmed. The
   spine/grove tint already knows blood vs married-in, so the data is present.
   This is framing, not polish — a historian's eye snags on the wrong number.
3. **Couple de-overlap** — spouses sit ~0.4 seats apart, tiles collide in dense
   spots. Needs a small offset/spread rule.
4. **Region overview** — spine (x 0–7037) and grove (x 7078–7758) are far apart;
   they can't sit on screen readably at once. A zoomed-out overview so the three
   bands read as distinct territories (also the arc's future altitude view).
5. **Dial tuning** — `PX_X 46 / PX_Y 2.6 / default scale 0.85`, adjust once the
   above land.

**Known real gaps (Sam's eyes, recorded honest):** no edges yet (#1); dense-spot
overlap (#3); regions not co-visible (#4). 60fps verified only by bounded culling
+ one transform + inertia — NOT tested on a real iPad; that verification is still
owed before Zoom 2 is called done.

**Discipline note for the next coding session (from the July 13 experience):**
long autonomous agent runs (2.5h this morning) produced a lot of motion for a
little residue and were depleting to supervise. The residue that mattered — the
two Zoom-1 corrections, the pivot, the v1 scaffold — came from tight, specced,
short-leash passes. Prefer small specced batches with a rendered-pixel check
between them over long autonomous spins; §9.4 is the standing Zoom 2 spec to hand
Code so it builds to a target instead of improvising.

---

## 10. JULY 16 SESSION — DEMOTE SETTLE SHIPPED; PHASE 7 DATA PREREQ CLOSED
*(added 071626. Design rationale: design doc §20. Both items PUSHED — nothing
local, nothing pending.)*

### 10.1 Demote settle — SHIPPED + PUSHED (`5c512cf5..f0e6d494`)

The demoting couple (featured card + spouse chip) now overshoot their seats and
spring back. Additive only: the demotion Sam was happy with is byte-identical —
departure, arrival, unfurl schedule, easing all unchanged, machine-asserted
against a baseline captured BEFORE any edit.

**Mechanism:** a `u`-remap through `easeOutBack` in `shrinkTo` + `morphIn` — the
reciprocal of the promotion settle, reusing existing machinery.
`easeOutBack(0)=0` / `easeOutBack(1)=1` freeze departure and arrival, so the
overshoot lives only in the middle. The CC branch returns early (before the
tick), keeping CC byte-identical (the July-12 flash). Angles fall out of each
element's own captured rect — no father/mother branching (card −31.7°, spouse
−74°, naturally 42.3° apart).

**Final dials (all top-of-file in `flight.ts`):**

| path | dial | measured | note |
|---|---|---|---|
| card → parent | `DEMOTE_SETTLE_PARENT_FACTOR` 0.6 | **1.84px** | pinned AT `DEMOTE_SETTLE_FLOOR_PX` 2.2 — **factor is INERT here**; further reduction requires lowering the FLOOR |
| spouse → parent | (unchanged) | **3.61px** | |
| card → child | `DEMOTE_SETTLE_CHILD_FACTOR` 1.6 | **~5px** | ratio-driven, NOT floored; +20%/+120% points are 1.2 / 2.2 |
| — | `DEMOTE_SETTLE_CAP_PX` 6.5→9 | | raised for bracket headroom; parent/spouse sit far below |

**The glide fix (`+page.svelte`) — a real bonus win.** `.featured-slot`'s
`transition: height` ran **540ms** while every other clock (children entrance,
parents entrance, flight) ran 300ms. That mismatch made `rect.top =
layout(t) + transform(t)` sum into a **~23px false overshoot on the whole
children row** — the "jello screen" Sam flagged. **Bisect proved it PRE-EXISTING,
not a settle regression** (pristine 62.3px vs settle build 62.1px — identical).
Matching the glide to 300ms collapsed `rect.top` to a single monotone curve and
killed a wobble that predated this entire exercise. Children's 300ms entrance
untouched. See design §20.1 for why removal (vs matching) was rejected.

**Four probes added, all standing:**
- `probe-demote-baseline.mjs` — captures the pre-change demotion (departure /
  arrival / unfurl frames + easing). The reference that made "additive only"
  ENFORCEABLE rather than aspirational.
- `probe-demote-settle.mjs` — overshoot on both bodies along their OWN vectors;
  non-identical angles; departure/arrival byte-stable; unfurl unchanged
  (relative-timing, jitter-immune); CC byte-identical; reduced-motion zero-settle;
  **opacity on its geometry contract**.
- `probe-neighbor-stability.mjs` — **the doctrine guard**: a chip that did NOT
  fly must not overshoot. Drives the Burr repro
  (`/person/aaron-burr-jr-1756` → click Aaron Burr Sr.; H00912 Sarah must reach
  rest without dipping past it). Catches "jello screen" forever — a class that
  was previously uncatchable.
- Reciprocity guard (from July 13) still standing.

**Process notes worth carrying forward:**
- The opacity guard was **teeth-proven**: a raw-`t` leak was deliberately
  injected, the probe fired RED (0.715 drift) while geometry stayed green, then
  reverted. A guard that has never been seen to fail is decoration.
- The `easing:` flip (`cubicOut` → identity, base curve moved inside the tick)
  was safe only because `shrinkTo`'s tick **declares `t` but never uses it** —
  everything keys off `u`. AUDIT EVERY `t` CONSUMER before any such flip; a stray
  one silently retimes the whole transition.
- Cold-vs-warm route compilation produced a 550ms unfurl outlier vs 441–444ms
  warm. Fixed by **warming the route**, not by loosening tolerance — loosening
  tolerance to hide noise is how a guard quietly stops guarding.
- `probe-smoothness` flakes ~1-in-3 on a single-frame promotion accel spike;
  **confirmed pristine flakes at the same rate** — pre-existing headless
  rAF-contention noise, not a regression. Do not chase.

### 10.2 Phase 7 data prereq — CLOSED + PUSHED (`14ca4d9a`, `7ae3b46a`)

`siblings` now ships in the neighborhood payload. **The Phase 7 gate is OPEN.**

**What shipped (`regenerate-data.js` only — no canonical change, so
process_tasks/validate/derive_generations were not in play):**
1. `neighborhood.siblings: { full, half, step }` as PersonCompact via the
   existing `cm()` — the Set was already being built and discarded for
   `.size`. Seat `t` coords come along free (the flight machinery needs them).
2. Tiered by pure set math: `full` = father's ∩ mother's children; `half` =
   symmetric difference; `step` = a parent's step-spouse's other-marriage
   children minus own-parents' kids.
3. `siblings_count` **untouched** — byte-identical (still full+half union, no
   step). Additive, non-breaking.
4. **No sort in the generator** — natural `children_ids` order; the UI applies
   the died-young sort exactly as it does for `children[]`.
5. `p` (photo_url) + `sn` (computeShortName) added to `compact()`; `dy_young`
   added to sibling compacts.

**The payload trap — found, measured, reverted.** The first cut (`14ca4d9a`)
extended `contextIds()` to ship siblings' FULL records, so the UI's
`enrich`/`diedYoung` logic had something to read. Cost: **Anson 42.1KB → 60.4KB
(+43%)**. Measurement isolated it exactly: the sibling compact array is **1,154
B**; the six full context records were **17,494 B** — **93.7% waste**. Reading
the actual source settled it:

| consumer | needs | verdict |
|---|---|---|
| `diedYoung` (buildFeatured.ts:90) | `birth.year` / `death.year` | already in compact as `by`/`dy` (regenerate-data.js:104–105) — **buys nothing** |
| `computeGenerationLabels` (generation.ts) | focus only, called ONCE (buildFeatured.ts:157) | never per-chip; siblings not in its path — **buys nothing** |
| `enrich` (buildFeatured.ts:76) | `p` = `bio.photo_url`, `sn` = `computeShortName` | **the ONLY real need** — a naive revert would have shipped photoless grey boxes + wrong names |

**The fix (`7ae3b46a`):** move `p`+`sn` into the compact (~484 B for 6 siblings
= **2.8%** of what item 5 spent), then drop siblings from `contextIds`. `enrich`
already reads `compact.p ?? full…` / `compact.sn ?? computeShortName(full)` — it
PREFERS the compact, so the change no-ops for existing chips. **Result: 60.4KB →
43.0KB (−26% / −15.3KB); context 14 → 8 records.** Net cost of the whole sibling
feature ≈ **2.2KB/payload** — back in line with the original design estimate.

**Two catches that would have shipped silently:**
- `diedYoung(byId[id])` reads the **full record**, not the compact — so pulling
  siblings from context would have returned `false` for every sibling, silently
  (no error; died-young ordering just quietly stops working). Fixed by baking
  **`dy_young`** onto the sibling compact (computed from `by`/`dy`, matching
  diedYoung's ≤15) rather than changing the UI function.
- Porting `computeShortName` TS→JS could have diverged silently across 16,590
  people. **Verified byte-identical: 0 sn mismatches, 0 photo mismatches**, title
  branch exercised ("Rev. Thomas Hooker"). Existing parent/child/spouse chips
  unchanged.

**Measured reality (a prediction disproved — record it):** step-siblings are NOT
vacuous. **93 people** have a non-empty step tier (T01046 has 12; several have
8); **1,216 people** have half-siblings. Both tiers earn their place. Verified:
Anson HD4106 → 6 full / 0 half / 0 step, count 6 ✓ (3 died young visible in the
data: Jane 1869–1869, Walter 1876–1879, Henrietta 1881–1883). Ingersoll
(H00907×X00543) → all 13 children found, 12 full each ✓. HD1917 → 4 half, all
"share father" (Aaron Burr Jr's other-marriage children) ✓. HD5993 →
mother-unknown → all-half ✓.

### 10.3 Payload optimizations — LOGGED, NOT ACTED ON

Both surfaced during 10.2's measurement. Real wins; deliberately deferred to a
fresh day. **Do not chase mid-feature.**

1. **Context may be over-shipping for EVERY member (~28KB/payload).** Now that
   every compact carries `p`+`sn`, parents / grandparents / grandchildren likely
   don't need full context records either — the `dy_young` precompute pattern
   extends to them, letting `context` shrink to what generation-labels + the
   focus actually need. Context is **33.7KB of Anson's 42.1KB (80%)** for only 8
   people, and the bulk of each record is `narrative_blocks` (2,395 B on the
   father — 57% of it) that a chip never renders.
2. **The focus is duplicated.** `person` (6,309 B) and `context[<focus>]`
   (5,805 B) — context's copy is a STRICT SUBSET (`only in context: []`; person
   adds only the five `*Resolved` fields). ~5.8KB of pure redundancy per payload,
   × 16,590 files.

### 10.4 Phase 7 UX — UNBLOCKED; entry point

Data gate open. Design fully specced at design §20.2–20.4. Build order:

1. **The orientation-agnostic carousel component FIRST** — neither the spouse
   nor the sibling carousel exists yet, so build ONE used twice (horizontal
   window-of-3 over spouses; vertical height-derived window over siblings).
   Greenfield both ways: zero refactor cost, and it collapses Phase 7 + 7.5 into
   one mechanism. Same paging, keyed+flip, overhang cue, arrow-at-offset,
   gondola guard.
2. **The trigger + panel** — bubble right of the spouse chip at ~75% its size
   (renders only when `siblings_count > 0`); sibling chips ~20% smaller than
   spouse/child chips; panel slides out and DOWN from the trigger; window derived
   from card height; **no stagger, no reveal settle**; panel resets on nav.
3. **The soap-bubble nudge** — transform on the card GROUP, never layout
   (`probe-neighbor-stability` guards it automatically).
4. **Sibling nav = HYBRID (the catch — design §20.3):** promotion grows from the
   bubble rect like a chip nav (with settle); **departure MUST use the CC path**
   — whole card, opposite vector, no chip-face, no settle — because the old card
   has NO destination box on the target page (the July-12 flash condition).
   Vector is LATERAL (adjacent seats, same generation, true Δy ≈ 0).
5. Tiers + headers as flat list items (design §20.4); died_young sorts to the
   end WITHIN each tier; half/step render only when non-empty.

**Open question for Sam when this starts:** does the spouse notch (right edge)
collide with the trigger bubble sitting right of the spouse chip? Layout check
before building.

### 10.5 Standing discipline (reaffirmed, July 16)

The day's residue came from **tight, specced, short-leash passes with a
rendered-pixel check between them** — not long autonomous spins (§9.8). Two
further rules earned today:
- **Fix the ground, then re-judge.** A verdict rendered under contaminated
  conditions is not a verdict (the child settle read as "swooping" only because
  it landed on a sliding row; on a still row at the same amplitude Sam accepted
  it). Twice, tuning the thing that *looked* wrong would have been wrong.
- **Never mitigate a bug by deforming the innocent party.** Gating or slowing the
  children to hide a glide desync is a band-aid; the fix belongs on the guilty
  mechanism. Sam will (correctly) reject the band-aid, and reverting costs a
  round trip.

---

## 11. JULY 16–17 SESSION — PHASE 7 SHIPPED END TO END
*(added 071726. Design rationale: design doc §21. All work COMMITTED AND PUSHED —
nothing local, nothing pending.)*

### 11.1 What shipped

**The sibling feature is COMPLETE**: trigger → panel → cascade → carousel →
close → flight → retraction. Plus three ghost bugs found and fixed (one
pre-existing), and the probe suite that catches all of them.

| commit | what |
|---|---|
| `055d318d` | Sibling pass — Slice 1 + 2 (trigger, panel, cascade, carousel) + the reveal-gate fix |
| `3c4ff4fe` | **Spouse-ghost fix — PRE-EXISTING bug**, `chipExit` instant-hide extended to `flightKind === 'relative'` |
| `9c9eaff2` | Carousel final (fixed 6-chip window, fixed caret, acceleration, centered glyphs) + velocity + header gaps |
| `0a99321e` | Slice 3 flight + retraction + the notch-cutout endpoint fix (option B) |

Final dials, all top-of-file: `SIBLING_V_CEIL = 1.2` (~490ms, center-travel
clocked); `SIB_SEAT_TOP_INSET = 100`; `WINDOW_H = 404` (6×54 + 5×16, derived);
`STAGGER_MS = 38`; `CLOSE_MS = 170`; `FADE_TAIL = 0.2`; sibling settle 2.5px;
`HEADER_H = 28`; header gaps −40% above / −80% below (asymmetric BY DESIGN —
proximity grouping; do not "correct" it).

### 11.2 The ghost saga — three bugs, one unstated fact

All three trace to a single fact nobody had written down: **the featured card is
not a solid rectangle — the notch is a cutout.** Full doctrine at design §21.2;
taxonomy entries D/E/F now in `docs/CODING_HANDOFF.md`.

- **The spouse ghost (D's predecessor) — PRE-EXISTING, confirmed on `7ae3b46a`.**
  Two simultaneous renders of one person: the correct `morphIn` to the parent slot
  (op1) plus an unmount outro from the notch (op1→0 over ~185ms). Root cause:
  `chipExit` short-circuited to instant-hide for `spouse`, off-window chips, CC
  (line 741) and the clicked box (line 758) — **the relative-promotion notch chip
  was the missing case**, so it fell through to `flyOut`'s default opacity-1→0
  pan-fade. **This construct has now caused THREE separate bugs** (CC, relative,
  and later a near-miss on sibling). **A `default:` branch that re-animates from
  opacity 1 is a trap — enumerate every flight kind explicitly and make the
  unhandled case fail loudly.**
- **D — retraction at `z:1` painting over the landed card.** At `introend` the
  hero clears to `z:auto(0)`; `1 > 0`. Fixed with `z:-1`.
- **E — retraction at `z:-1` showing through the REFORMED cutout** for 2 frames
  (~17ms) at its endpoint. Fixed by ending the retraction below the notch line
  (`SIB_SEAT_TOP_INSET = 100`) so it lands in the opaque card body. **Its
  endpoint is now the card-edge resume** — the same anchor the sibling column and
  caret use.
- **F — LOGGED UNFIXED.** Outgoing spouse chip visible ~50ms during fetch
  latency through the outgoing card's own resting cutout. **Pre-existing,
  project-wide (parent/child too).** Deliberately not fixed: Sam cannot see it;
  the fix needs the notch hidden at NAV-START (the exact class he rejected three
  times in one day — gather beat, reveal gate, 540ms crawl); it touches every
  navigation; and it risks a visible empty notch that would read worse than the
  flash. **Bad trade. Leave it.**

### 11.3 New probes (all RED-proven before their fix)

- `probe-reveal-gate.mjs` — zero incoming spouse-chip pixels AND zero sibling-
  trigger pixels flight-start → landing, both directions; the trigger never
  renders the incoming count over the outgoing card.
- `probe-ghosts.mjs` — **tracks (id + `data-relation`)**, asserts no outgoing
  person renders in two roles at once; plus no node accumulation across repeated
  navs. **This is the class the whole suite was blind to.**
- `probe-sibling-zorder.mjs` — numeric z + overlap (NOT `elementsFromPoint`,
  which is blind to `pointer-events:none`); the incoming must be paintable above
  the departing wherever they overlap.
- `probe-sibling-notch.mjs` — the retraction's endpoint is never inside the notch
  cutout region.
- `probe-neighbor-stability.mjs` (from the settle work) — still standing.

### 11.4 The false-green record — six in one session

Every probe checked whether the INCOMING element behaved; none checked that the
OUTGOING one left. Full taxonomy and the standing rules at design §21.3. The
short version for anyone opening this cold: **assert (id + relation), assert the
MECHANISM not just the state, prove RED first, and when Sam says "I re-tested and
it's actually X" — believe him and discard the theory.** He was right six times
out of six against a suite that was green six times out of six, and his re-tests
corrected two wrong hypotheses including the architect stream's.

### 11.5 Open / next

- **Data audit (queued, report-only, NOT started).** Sam found **Abigail
  Pierpont Noyes (X03177)** has no half-siblings while being listed AS a
  half-sibling of someone else. Half-sibling is symmetric, so the DATA is
  asymmetric. **Cause hypothesis:** the generator walks UP via
  `person.parents.{father_id, mother_id}` and DOWN via
  `parent.marriages[].children_ids` — two redundant stores that can drift. If
  X03177's `parents` block omits the parent whose `children_ids` includes her,
  her loop finds nothing while her sibling's finds her. **Report project-wide
  asymmetry both directions as a TSV worklist; do NOT repair canonical** (Sam's
  content stream, per-row approval). **Blast radius is bigger than siblings** —
  `derive_generations.py` walks `children_ids` down but reads `parents.*` for
  conflict detection.
- **`first_name` worklist (queued, never run).** `computeShortName` reads
  `bio.first_name`, and some records stuff the whole name into it (e.g. `Florence
  Frances "Sal" Pierpont Marple`, 38 chars) — so these are already producing
  wrong `sn` on parent/child/spouse chips today. The sibling work exposed a
  pre-existing canonical error; it didn't cause it. Report-only, TSV, worst-first.
- **Payload optimizations (logged §10.3):** ~28KB/payload from extending the
  p/sn-in-compact pattern to parents/grandparents/grandchildren; ~5.8KB from the
  duplicated focus.
- **Zoom 2** — still at the v1 scaffold (§9.8). **Connector lines first** (the
  recognizability lever), then the descendant-count reframe.
- **CC altitude arc** — parked, `ARC_ENABLED=false`, waits on Zoom 2.
- **Left timeline rail** and **mobile sizing** — the two Sam named as next before
  this session began. Neither depends on Zoom 2.
- **`probe-demote-settle`'s baseline is GITIGNORED.** It was found RED on
  committed HEAD from a stale reference (1.2 recorded vs 1.83 actual) and
  re-recorded. It failed LOUD this time, which is the safe direction — but an
  ungitignored reference can drift the other way and hand you a false green. **Commit
  the baseline.** Same family as §11.4.


---

## 12. JULY 22 — HOLD + RESEQUENCE (current marching orders)

**ON HOLD (design §23 — preserved, not removed):** the Table (Zoom 2, at the
§9.8 scaffold checkpoint), Zoom 3, and the CC altitude arc (`ARC_ENABLED=false`).
Their specs, worklists, and code stand untouched for resumption.

**ACTIVE SEQUENCE (Sam's gates, in dependency order):**
1. **THE DECK SHUFFLE (design §22)** — the CC transition rebuilt as the archival
   riffle: generation-delta direction, return-memory, graph-distance magnitude,
   abstract passing cards. Depends on nothing; unblocks Shuffle Notables and
   Search (both inherit it verbatim). Kills the "abominable" flat pan.
2. **PARCHMENT GROUND** — Sam sources one light photo-quality blank scan
   (Etsy one-time / public-domain flyleaf; §18.10 blank-paper rule); small
   integration pass (static ground + vignette, toggle gains the skin). GATES the
   line-shading contrast decision (Hooker vs non-Hooker entry tinting — do not
   start shading without the real ground under it).
3. **MOBILE/TABLET TIER PLAN** — design session, no code: how the Card, the
   notch, and especially the future timeline rail behave at Tier B/C (§12).
   Early sketch to beat: rail collapses to a slim edge ribbon with the thumb,
   expandable; Card goes single-column; spouse notch becomes a horizontal strip.
   GATES the timeline build per Sam's rule.
4. **THE LEFT TIMELINE RAIL (§3.6)** — built only after 2 + 3 exist: 1600→today
   vertical scale, featured card slotted dynamically, lifespan band, anchor
   figures, thumb on the camera clock.

**Also queued from §11.5, unchanged:** half-sibling asymmetry audit (TSV,
report-only), first_name worklist, demote-settle baseline commit, payload
optimizations.

---

## 13. JULY 23 — THE DECK PUSH SHIPPED (design §22 as built)

**§12's active-sequence item 1 is DONE.** The CC transition is built,
probe-guarded, and committed to main (commit `0c652f6c`, Stream B). It shipped
NOT as the July-22 visible riffle but as the **DECK PUSH** — two solid cards
trading places with weight and an EMPTY-STAGE gap; the ghost convoy is parked
behind `DECK_GHOSTS=false`. On pixels a visible convoy read as "adjacent" and
shrank the tree; the empty gap sells the distance instead. Full what/why in
design §22 (rewritten as-built).

**What landed (all probe-guarded, `scripts/probe-deck-*.mjs`):**
- **Direction by `gen_delta`** — effective-generation ladder (own → Hooker-line
  spouse → easter-egg child-in-law); vertical iff `gen≠0` AND same-line
  (`relationClass === 'direct'` OR seat-near ≤180), else lateral. `SEAT_NEAR` is
  the interim proxy for the §19.4 LCA/kin-distance bake.
- **Lateral PING-PONG memory** (fresh = left, reciprocal flips, non-reciprocal
  resets) — replaced the July-22 "return memory," which armed permanently while
  toggling A↔B.
- **Weight physics** — accelerating exit, decelerating settle + ~6px overshoot,
  seeded per-axis tilt (drawn in, never snapped), `DECK_TEMPO` +
  `DECK_TRAVEL_TEMPO` dials, no animated blur on the real cards.
- **Offscreen-honesty + belt** (no frozen jut, proven at two viewport sizes),
  **connector hard-cut** during flight, **flight-lock** (the §3 gondola rule
  realized — nav clicks swallowed until the incoming card lands with chips out).
- **Seven probes** (direction, ping-pong, phantom/no-overlap, jut×2 sizes,
  connector, physics, flight-lock) + the sibling fork-guard stay byte-green.

**Uncommitted follow-ups (on top of `0c652f6c`), Sam's call whether to fold in:**
the +5% travel-tempo tweak; the easter-egg child-in-law rule in
`regenerate-data.js` (needs a regenerate on deploy — `gen_delta` lives in
gitignored `static/data/`); and these two design/roadmap docs.

**ACTIVE SEQUENCE now advances** (design §22.8 reuse doctrine — the deck is THE
teleport transition, inherited not rebuilt):
1. **SHUFFLE NOTABLES** — unblocked; inherits the deck verbatim (random notable
   target, same push). **SEARCH** follows (modal closes → deck deals the result).
2–4. **PARCHMENT GROUND → MOBILE/TABLET TIER PLAN → LEFT TIMELINE RAIL** —
   unchanged from §12, shifted up now the deck is done.

Still queued from §11.5/§12: half-sibling audit, first_name worklist,
demote-settle baseline commit, payload optimizations.

---

## 14. JULY 23 — PHOTO-LOADING RESTORED (design §24)

A hover-enlarge preload experiment (a speculative media-popout warmer + per-`<img>`
priority tuning) had degraded FOUNDATIONAL photo loading — chips painting in
top-to-bottom, and one photo loading twice (chip then featured). Root cause and
fix are in design §24; the disposition:

- **DONE — the neighborhood IS the load unit.** `preloadNeighborhood()`
  (`$lib/photo.ts`) warms every person photo in the payload as one batch, fired
  from a single `$effect` on `f.neighborhood` in the person `+page` — so on a warm
  nav the incoming faces load DURING the flight and are cache hits at landing.
- **DONE — tiered priority.** On-screen chips (focus, notch spouses, parents,
  children) warm FIRST at `fetchpriority=high`; off-screen (grandparents,
  grandchildren, siblings) fill in behind at `low`. This fixed the spouse-chip
  holdout (it had been warmed last, behind every grandchild).
- **DONE — one shared Cloudinary derivative** per person (`w_600,c_limit,q_auto,
  f_auto`, ~40–60KB) used by chip + featured + zoom, so it loads once. Reverted
  the split (chip `w_200` / featured `w_700`) that caused the double-load.
- **DONE — media demoted.** The popout warmer is removed; landmark/art/statue
  popouts load on demand. Nothing tertiary contends with a person photo.
- **REMOVED regression, not a feature.** The hover-enlarge FEATURES (portrait
  zoom, media popout) are intact; only the loading tuning was undone.
- Guard: `scripts/probe-photo-preload.mjs` (every chip relation loaded at landing).

**QUEUED (data/deploy stream) — kill the first-time-generation floor.** Cloudinary
builds each `w_600` on its first request (~0.7s, then CDN-cached). To make every
chip instant on first visit for every user, either (a) a post-deploy WARM-UP
SCRIPT that GETs every person's `w_600` URL once, or (b) Cloudinary EAGER
TRANSFORMATIONS at upload. Code can write the warm-up script on Sam's word. Also
logged: migrate the remaining Wikimedia-hosted photos to Cloudinary so they share
the resize too.

---

## 15. JULY 24 — DECK VERTICAL MISFIRE (deferred; design §22.2b)

**Symptom (Sam, content session):** clicking the CC between John Pierpont H00388
and his uncle-guardian James Pierpont II H00116 slides HORIZONTAL. Same-line
uncle/nephew should ride vertical (older tier enters from the TOP) — "we worked
hard to make CC transitions vertical."

**Diagnosis — the data is right, the direction test is wrong.**
- The baked CC is correct: `gen_delta = −1` (James one generation up), `relation_
  class = collateral`. Confirmed in the payload.
- `deckDirFor` (flight.ts) rides vertical only when `gen_delta ≠ 0` **AND**
  `sameLine`, where `sameLine = relationClass === 'direct' OR |Δseats| ≤ SEAT_NEAR
  (180)`.
- Uncle/nephew is `collateral` (neither is the other's ancestor), and John and
  James sit >180 seats apart in the tidy tree → `sameLine` is false → it falls
  through to lateral. The seat proxy is standing in for real kinship and getting
  it wrong.

**Why not just widen `SEAT_NEAR`:** the seat threshold is the WRONG lever — raising
it would wrongly verticalize far cross-branch PEERS (the Pennoyer→Strong /
Jonathan-Edwards case: collateral, gen≠0, but genuinely across branches). Seat
distance ≠ kin distance.

**Fix (the §19.4 LCA/kin-distance bake, now with a concrete trigger):**
1. In `regenerate-data.js`, stamp each CC with a `kin_distance` — the depth to the
   nearest shared ancestor (LCA) walking the parent graph (uncle = 2, first cousin
   once removed = small, cross-branch peer = large/none). Reuse the existing
   `isAncestorOf`/parent-walk machinery.
2. In `deckDirFor`, redefine `sameLine = relationClass === 'direct' OR kin_distance
   ≤ K` (start K small; tune on localhost). Delete the `SEAT_NEAR` seat proxy.
3. Verify: John↔James now vertical (from TOP, `gen_delta<0`); Pennoyer→Strong stays
   lateral; direct-line dives unchanged. Add a probe asserting the John↔James
   vertical vector, `svelte-check` clean, SSR 200.

**Status: SHIPPED August 3 — see §17.** The diagnosis above held, with one correction found on opening
the code: `SEAT_NEAR` had ALREADY been cut from the vertical test before this session (the mirror bug —
Lovejoy and J.P. Morgan sit 0.4 seats apart and flew a family vertical as strangers), leaving
`relationClass === 'direct'` as the whole test and every real uncle riding lateral as a stated interim
cost. The bake specced here is what ended that interim. Step 2 landed as written except that `sameLine`
also bridges ONE MARRIAGE — Sam's ruling the same day; see §17.2.

**The 072926 edition (July 29) adds §16 — THE TALCOTT SEVERANCE SHIPPED. Phases 0/1/2a/2b and the validator guard, all landed and verified rather than assumed: zero chips reference a hidden id across 16,855 payloads, zero CC links resolve to a missing page, zero slugs moved. Also fixed a missing payload returning 500 instead of 404 — the dev server throws ENOENT and escapes the `res.ok` check — which had been mis-reporting retired slugs all along. Six open severance items (the 48 SEV_cc_to_hidden errors, `is_orbit` and the compact flag the tile styling needs, the empty grove, the stale `hidden_by_default` test, one interrupted payload audit, and the lateral-vs-vertical decision on John Talcott), plus the Stream-A debt the work surfaced. Design rationale: design doc §25.**

---

## 16. JULY 28–29 — THE TALCOTT SEVERANCE SHIPPED (design §25)

A Stream-A/Stream-B hybrid. **1,264 people hidden, none deleted.** Design rationale and the
re-sew procedure: design doc §25.

### 16.1 What shipped

| phase | what | state |
|---|---|---|
| **0** | Roster built from a descent walk ∪ the `is_talcott_descendant` flag, minus Hooker descendants, minus keeps. Spouse rule to fixpoint (4 rounds). | `_review/talcott-sever.tsv` (1,264, `why` column) + `talcott-keep.tsv` (11) |
| **1** | `SHOW_TALCOTT_DESCENT = false` — labels only, no data touched | shipped |
| **2a** | `classification.hidden: "talcott_2026"` written to canonical | shipped |
| **2b** | The `visible`/`hidden` split in `regenerate-data.js`; CC filter in `personPayload` | shipped |
| **guard** | `validate.py`: a visible person may not CC a hidden one | shipped, fires 48× |

**Verified, not assumed:** zero chips reference a hidden id across all 16,855 payloads; zero CC
links resolve to a missing page; zero slugs moved; collision-suffix count held at 122.

Also fixed en route: a **missing payload returned 500, not 404** — the dev server reads static
assets off disk and throws ENOENT, escaping the `res.ok` check in `person/[slug]/+page.ts`. Had
been mis-reporting retired slugs all along; would have hit all 1,264 severed URLs. Wrapped.

### 16.2 Open — severance

1. **The 48 `SEV_cc_to_hidden` errors.** Visible people cross-connecting into the grove. Dropped
   at build, so nothing renders broken; they are the marker of where the line was cut and they
   clear automatically on re-sew. **Decision needed:** strip them, or leave them as the record.
2. **`is_orbit` never added.** 23 clean orbit figures identified in
   `_review/orbit-candidates.tsv` (easter-egg, no descent, no marriage, ≥1 CC edge), plus 4 of
   Sam's own personal entries excluded and 7 floating records that need his eye. Sam wants
   orbit-plus-`hartford_founder` to carry unique styling — **which needs a compact flag**, since
   tags reach the card but not chips or tiles (design §25.6).
3. **The empty grove band** (design §25.4). Accepted cost; revisit if the table reads wrong.
4. **`hidden_by_default` keys on the wrong test** (design §25.4). Harmless until the Talcott
   toggle is built; then it must key on `hidden`.
5. **One audit interrupted.** Aggregates and page files are confirmed free of hidden ids. **Not
   yet checked:** whether a hidden id survives *inside* a payload — in the `context` block, a
   registry roster, or a `marriages[].spouse_name` string. One scan.
6. **`T01001 → T00011` rides lateral.** John Talcott has no Hooker anchor anywhere in his
   descent, so `effectiveGen` cannot place him and `gen_delta` is null; `relationClass` also
   returns collateral because the three intervening ancestors left `byId`. **Design decision
   pending:** accept it (orbit → lateral is correct per §19.6), or let `effectiveGen`/
   `relationClass` walk the full map so hidden people act as invisible scaffolding for motion.

### 16.3 Open — carried, not severance

- **Production 404s unverified.** The `+page.ts` fix is confirmed in dev only. Run
  `npm run build && npm run preview` before shipping.
- ~~**`redirects.json` is still unwired** — 510 entries, nothing in `src/` reads them.~~
  **CLOSED August 3 (§17.4).** Wired as 301s at 673 entries. The count is the argument: it grew
  163 in five days off ordinary name corrections and birth-year fills.
- **`table-index.json` is now gitignored** (3.4 MB off every push). Note CLAUDE.md's claim that
  `static/data/` is ignored is inexact — the `.gitignore` lists members individually.

### 16.4 Stream-A debt surfaced (routed to the data stream)

Not UX work, but each one distorts what a card renders:

- **751 records carry a parent's *name* with no parent *id*.** They read as unconnected orphans.
  Four people nearly deleted as such turned out to be fathers-in-law of the tree.
- **229 people have a marriage and no gender** in either field → label degrades to "Spouse of".
  (Was 3,138; a normalization pass cleared 2,909 — design §25.6.)
- **341 education rows** carry a degree or year in a non-rendering key with no `dates`.
- **2,087 career rows have no `start_year`** and render without a date.

---

## 17. AUGUST 3 — THE KIN-DISTANCE BAKE SHIPPED (closes §15 and the §19.4 debt)

*(Stream B. The deferred item from §15, plus the §16.3 redirect wiring. Design rationale: design doc
§22.2b, which still reads "deferred" and wants an as-built amendment.)*

### 17.1 What was actually wrong when the session opened

Not what §15 said. The seat proxy was already gone — someone had hit the mirror bug (Lovejoy → J.P.
Morgan, collateral with `gen_delta −2`, seated 0.4 apart at 5292.15 vs 5291.75, flying a family-line
vertical between two strangers) and cut `|Δseats| ≤ SEAT_NEAR` out of the test, leaving

```ts
gd != null && gd !== 0 && m?.relationClass === 'direct'
```

with a comment naming the cost honestly: every real uncle now rides lateral until the LCA bake lands.
So the session's job was not "remove a bad proxy" but "supply the thing that was supposed to replace
it." The standing `probe-deck-direction` was **already RED, 6/7**, on Aaron Burr Jr. → his aunt Mary
Dwight — the same defect Sam reported on the Pierponts, sitting unnoticed in the probe suite. That was
the red-first proof; no probe had to be written to manufacture one.

### 17.2 What shipped — the bake

**`regenerate-data.js`.** `bloodDistance()` walks each side's ancestors breadth-first (memoized per id,
`KIN_MAX_DEPTH` 10) and takes the minimum `|a→LCA| + |LCA→b|`. `kinDistance()` wraps it with **one
marriage hop allowed on each side**, priced at `KIN_MARRIAGE_COST = 2`. Emitted per CC as
`kin_distance`, omitted entirely when null (`KIN_EMIT_CAP` 8), so the far/orbit majority costs nothing
on the wire. Build cost: unmeasurable — full regenerate held at 8.8s.

**Why marriage counts at all (Sam, same day):** `effectiveGen` had ridden marriages since §22.2a — a
spouse of a grandparent is grandparent-tier — so with a blood-only kin test the two halves of ONE
direction test disagreed: generation said "one tier up," kinship said "strangers," and the tie-break
sent it sideways. Esther Edwards Burr H00378 → Daniel Burr X03446, her husband's father, came out
`gd −1 / kin None` → lateral. One graph, one answer; both halves ride the marriage now.

**Why the hop costs 2, not 1** — this is the whole tuning, and it was chosen on the numbers:

| | ladder |
|---|---|
| blood | parent 1 · sibling/grandparent 2 · **uncle/niece 3** · **grandaunt 4** · **1C1R 5** · second cousin 6 |
| in-law (+2) | **parent/child-in-law 3** · **spouse's grandparent 4** · **spouse's uncle 5** · grandniece's husband 6 |

At cost 1 the in-laws of *distant* collaterals slip in: James Pierpont II → William Bristol, the husband
of his grandniece, would verticalize on a tie nobody would call "up my line." At cost 2 it lands at 6
and stays lateral, the documented blood ladder keeps its exact meaning, and every class Sam named goes
vertical. `KIN_NEAR = 5` in `flight.ts` stays the single dial.

**`flight.ts`.** `isVerticalMove` — the one test `deckDirFor` and `resolveLateralDir` must agree
through — is now `gen_delta ≠ 0` AND (`'direct'` OR `kin_distance ≤ KIN_NEAR`). `SEAT_NEAR` was left in
place as a commented tombstone rather than deleted.

**Plumbing:** `camera.ts` (`kinDistance` on `CameraMove`) → `FeaturedCard.svelte`
(`data-kin-distance` on the CC anchor) → `navigate.ts` (read at capture time, into the provisional move
before `resolveLateralDir` reads it, and into the publish).

**Scope of the change:** of 2,983 CC edges, 1,435 are collateral with a generation gap. 665 of those now
ride vertical; the rest — same-generation cousins, orbit, and everything with no route inside the radius
— are untouched.

### 17.3 The probe that was asserting the wrong thing

`probe-deck-direction` carried `aaron-burr-sr-1716 → jonathan-edwards-1703` as the **"cross-branch peer
must stay LATERAL"** control, annotated as the Pennoyer→Strong class. It is nothing of the kind:
Jonathan Edwards is Aaron Burr Sr.'s **father-in-law** (Burr married his daughter Esther) — the identical
relationship Sam ruled vertical that morning. A mislabelled control had been defending the bug. Its
expectation is corrected to TOP with the reason written into the case, and the coverage it was pretending
to give is replaced by a real cross-branch peer: `john-morgan-1837 → francis-lovejoy-1854`, gen-gapped
with no route on the family graph at all — which is also the pair sitting 0.4 seats apart, so it guards
the retired seat proxy's grave at the same time.

**Lesson worth keeping:** a green probe proves the code matches the expectation, never that the
expectation matches the tree. Both of this session's real finds — the already-red aunt case and the
mislabelled father-in-law — were in the probe suite the whole time.

**New: `scripts/probe-deck-kin.mjs` (6/6).** Asserts the bake AND the flight, because a missing
`data-kin-distance` would silently reinstate the bug with the flight logic perfectly correct. Cases:
John Pierpont ↔ James Pierpont II (uncle, kin 3, both directions, reciprocating through the gen sign);
Esther Edwards Burr ↔ Daniel Burr (parent-in-law, kin 3, both directions); Morgan → Lovejoy (no route);
James Pierpont II → William Bristol (kin 6, the radius's outer edge).

**Suite state:** deck-kin 6/6, deck-direction 8/8, ping-pong 5/5, phantom 4/4, jut 4/4, connector 2/2,
physics 3/3, lock 3/3, probe-flight GREEN, probe-cards GREEN. `svelte-check` 2 errors, both the
pre-existing `@fontsource` side-effect imports in `+layout.svelte`. **`probe-reciprocity` and
`probe-arrival` are RED and were red at baseline** — verified by reverting `flight.ts` and re-running,
not assumed. They assert the pre-deck flat-slide vector model and are stale; this change strictly
improved `probe-arrival` (8 failures → 5, the uncle case stopped flashing both cards). They want
rewriting against the deck or retiring — do it deliberately, not as a side effect.

Sam's verdict on pixels: "Francis Thomas Fletcher Lovejoy X02851 is lateral, burrs are vertical looks
good."

### 17.4 redirects.json wired as 301s (roadmap §2.5 item 2, §16.3)

`src/lib/data/redirects.ts` + a miss-branch in `person/[slug]/+page.ts`. Verified dead first:
`/person/thomas-hooker-iii-1553` returned 404.

**Payload-FIRST is the correctness rule, not an optimization.** The generated map holds 36
self-redirects and **3 keys that are also live slugs** (`john-newton-1726`, `mary-hooker-1796`,
`harriet-newton-1866` — a retired slug later re-issued to a different person by the collision rule).
Consulting the map first would redirect three live pages away from themselves. Chains are followed (11
exist) under a hop cap with a cycle guard, so a visitor gets ONE 301 to the final slug. The map is
fetched only on a miss, never on the happy path, and a missing map degrades to a clean 404.

Verified by curl: retired slug → 301 → 200; ID key `T00001` → 301 → `john-talcott-1594`; chain `HD3156`
→ single 301; live-but-in-map → 200 with no redirect; unknown → 404.

**Known and left alone:** 2 of the 673 entries (`dakota-edmund-burr-1981`,
`ason-william-leroy-foster-2009`) 301 into the severance hole — both targets are Talcott-hidden, so the
redirect is correct *data* pointing at a page that does not exist yet. It resolves itself on re-sew.
**Still open from §16.3:** production 404s remain dev-verified only — `npm run build && npm run preview`
before shipping, and that check now covers the 301 path too.

### 17.5 What this does NOT fix

`T01001 → T00011` (§16.2 item 6) still rides lateral and is untouched by the bake. John Talcott has no
Hooker anchor anywhere in his descent, so `effectiveGen` cannot place him and `gen_delta` is null — and
kin distance cannot help a move that has no generation SIGN to point with. It still needs the design
decision in §16.2: accept orbit → lateral, or let `effectiveGen`/`relationClass` walk the full map so
hidden people act as invisible scaffolding for motion.

Also unchanged: `kin_distance` is baked for CC edges only. When the arc reopens (§19.4) or a
connect-to-anyone modal needs it, the same function serves both — that was the point of baking a
distance rather than a boolean.
