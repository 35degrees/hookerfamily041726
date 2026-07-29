# HOOKER FAMILY DESCENDANTS — ENRICHED DESIGN (FABLE PASS)

**Date: July 29, 2026 — companion/overlay to DESIGN.md (070126). PROPOSALS unless marked confirmed.**
**Prepared by the architect stream for Samuel Talcott Hooker's review. Nothing here is a decision until Sam says so.**
**The 070926 edition added §13 (viewport-lock / scrollbar doctrine) and §14 (Zoom 1 card-grid refinements). This 071226 edition adds §17 (motion physics doctrine — learned the hard way in the July 11 card-transition maintenance phase) and threads the one-physics/velocity-ceiling lessons into §3. The card-transition layer is now CLOSED, probe-guarded, and pushed; see docs/CODING_HANDOFF.md in the repo for the session record and ghost taxonomy.**

**The 071326 edition (July 13) adds §19 — the CC-flight rethink and its resolution: the felt distance of a cross-connection is SCALE, not angle; the "flight" becomes an up→over→down altitude arc through the real Zoom 2 tile table; the CC arc, the Card↔Table hero gesture (§18.9), and Zoom 2 are unified into ONE scale mechanism; and the sequencing pivot — BUILD ZOOM 2 FULLY FIRST, re-attach the arc as a camera path over it later. Also records the tech-stack verdict (no Threlte/3D; plain Svelte + CSS transforms) and the standalone Zoom 2 view design.**

**The 071626 edition (July 16) adds §20 — the DEMOTE SETTLE doctrine earned on pixels (per-seat discreteness; perception tracks the MOVING object's salience, not its destination footprint; transform-vs-layout as the neighbor-stability invariant; the settle is strictly intra-element), and the SIBLING EXPANSION design as confirmed by Sam (trigger bubble right of the spouse chip, soap-bubble nudge, height-derived window, vertical carousel on overflow, no stagger) — including the no-reciprocal / CC-departure catch and the full/half/step tier model.**

**The 071726 edition (July 17) adds §21 — SIBLING EXPANSION AS BUILT (supersedes §20.2 where they differ), THE NOTCH-CUTOUT DOCTRINE (one unstated fact that caused three separate ghost bugs), the FALSE-GREEN taxonomy (six in one session, all the same shape), and the STAGGER REVERSAL (context-dependent, scoped).**
**The 072226 edition (July 22) adds §22 — THE DECK SHUFFLE (the Zoom-1-era CC transition: the archival metaphor that withdraws the spatial claim; generation-delta direction; return-memory), and the HOLD register (§23): the Table (Zoom 2), Zoom 3, and the CC altitude arc move to deliberate hold — preserved, not removed.**
**The 072326 edition (July 23) rewrites §22
AS BUILT — THE DECK PUSH: the shipping CC transition is two solid cards trading places with WEIGHT and an EMPTY-STAGE gap (the visible ghost riffle moved behind a default-off toggle, because a visible convoy read as "adjacent" and shrank the tree). It records the gen_delta direction model (effective generation; the easter-egg child-in-law rule), the FIXED lateral ping-pong memory (replacing the July-22 return-memory that armed permanently), the weight-physics doctrine (accelerating exit, decelerating settle + ~6px overshoot, seeded per-axis tilt, global + travel tempo dials), the offscreen-honesty/belt + connector hard-cut + flight-lock, and the seven-probe guard suite. Built, probe-guarded, committed to main (Stream B). It also adds §24 — the PHOTO-LOADING doctrine (the NEIGHBORHOOD is the load unit; a tiered batch preload warms on-screen chips first; ONE shared Cloudinary derivative per person; person photos are foundational, media tertiary) — earned after a hover-preload experiment degraded the foundations and was undone.**

**The 072426 edition (July 24) adds §22.2b — a CONFIRMED DEFECT in the deck's vertical/lateral choice: the `sameLine` seat-distance proxy (`|Δseats| ≤ SEAT_NEAR`) misfires for genuine close kin who happen to sit FAR apart in the tidy tree, so a real up/down-the-line CC rides lateral. First live case: John Pierpont H00388 ↔ his uncle-guardian James Pierpont II H00116 (uncle/nephew, `gen_delta = −1`, correctly baked) renders HORIZONTAL because their seats are >180 apart. The data is right; the direction test is wrong. This is exactly the failure the §19.4 LCA/kin-distance bake exists to fix — logged now with a repro. Deferred (Stream B); tracked in the roadmap (§15).**

This doc follows the house convention: it holds _what and why_ (durable design).
Sequencing lives in ENRICHED_CODING_ROADMAP_FABLE_072926.md. Where a section
extends an existing DESIGN.md section, it names it, so approved items can be
folded back without conflict.

---

## 1. THESIS — the product is connection, not biography

Every genealogy site renders _records_. This project renders _travel_: you stand
at one person, and every click is a journey to another — down a generation, up a
branch, or through a cross-connection wormhole to someone a century away. The
navigation is already instant and infinite; what the next design phase adds is
**a world for that travel to happen in**, so the speed reads as motion across
history rather than reshuffling on a stage.

Biography still matters more here than in any Ancestry-style tree — the NBs are
the reason a card is worth arriving at. But the load-bearing insight is that a
_stub_ is still a complete product experience if the connective tissue renders:
its position on the table, its lifespan on the timeline, its path to Thomas.
Biography is the reward; connection is the game.

The tree's claim on historians and enthusiasts is that one family line touches a
huge swath of the American experience — Puritan founding, Great Awakening,
revolution and treason, finance, reform, war. And not only the WASP side of it:
the Aaron Burr Jr. household line (see §10) carries the story into Black
abolitionist Philadelphia and the Underground Railroad. A tree that documents
_that_ with the same rigor as the Morgan money is a genuinely different object
from anything online.

---

## 2. THE VIRTUAL TABLE — the coordinate system everything else stands on

_(extends: SPATIAL NAVIGATION / the substrate insight in UX_ROADMAP §2a)_

The single missing structural piece in the current design. Sam's instinct —
flights should travel _diagonally_, as if the destination sits at a real spot on
a table — requires that every person have a **fixed table coordinate**, computed
once, not improvised per flight.

**Proposal: build-time (x, y) per person, embedded in the data.**

- **y = time.** Birth year mapped to a vertical scale (1586 → today). This is the
  same axis as the left timeline — one scale, two renderings.
- **x = branch position.** A deterministic left-to-right ordering of the descent
  tree (tidy-tree layout over the Hooker line; d3-hierarchy class algorithm run
  in `regenerate-data.js`). Spouses sit at their Hooker partner's x with a small
  offset; easter eggs at their connecting descendant's x. Cousin-marriage /
  double-descent people get ONE canonical x via the existing role-priority
  dedupe — a person occupies one seat at the table.
- **Missing birth years (~600 people): estimate, never NaN.** y falls back to a
  generation-based estimate (1586 + generation × ~28), flagged `y_estimated`.
  The estimate keeps everyone seated; the flag lets the UI dim or annotate.
  This is computed and guarded ONCE at build time — precisely so no runtime
  `$derived` ever does date arithmetic on raw, hole-prone fields. (Direct answer
  to "is that how $derived could make mistakes": yes — a runtime derivation
  computing flight geometry from a null birth year yields NaN transforms or a
  throw that tears down the card subtree, the exact failure class of the gps
  bug. Build-time coordinates make flight geometry a lookup, not a computation.)
- **Where it lives:** on the compact record (`t: {x, y}` or similar), in every
  person payload, and in a new lightweight **`static/data/table-index.json`**
  (id, slug, name, years, role, x, y, **and parent pointers
  `father_id`/`mother_id`** for all ~16k — a one-time lazy download, likely
  1–2 MB gzipped) that powers Zoom 3 and the flyover layer. The parent
  pointers make the index a client-side ancestry walker: near-mode flyovers
  show the true connecting lineage (§4), and the connect-to-anyone modal
  inherits a free path/LCA substrate later.

**The axis decision, made explicit (surfaced by the starfield/parallax
discussion): y is TIME, not generation index.** By generation 8+, generations
overlap each other's birth-year ranges by decades — clean "generation strata"
on the table are a fiction. Time is the axis the left timeline, the anchor
figures (§3.6), and the lifespan highlight all speak, so the table speaks it
too. Consequences: (a) the earlier notion of labeled _generation_ horizon-lines
is retired in favor of faint decade/era rules (§3.5); (b) generation renders as
a card-level label and soft contextual band, never a spatial line; (c) a
same-generation CC to a cousin born 35 years later legitimately pans down as
well as across — on a time table, they ARE later.

Once the table exists, five features become _renderings of the same data_:
the substrate offset, the timeline, flight direction/distance, the shuffle
flyover, and Zoom 3. That is the deepest version of the "build the linchpin
once" insight.

---

## 3. THE CAMERA — one clock, many subscribers

_(extends: MOTION LANGUAGE)_

A small module-level store (plain module values, per the motion-loop hazard —
not `$state` read-and-written in effects). On any navigation, the click handler
publishes ONE camera move at the same instant it captures flight state:

    { from: {x, y}, to: {x, y}, duration, easing, kind }

Subscribers: the flight transitions (already TICK-based — they keep their own
implementation, just share the duration/easing), the substrate layers, the
timeline thumb, and the flyover layer. Direction falls out of the vector — a
1750 person clicking a CC to a 1900 person pans DOWN and OVER, diagonally, in
exact proportion to the table displacement. A 1950 person navigating to Thomas
pans up-and-across the same way. No per-feature direction logic ever again;
`panDir` ('up'/'down'/'lateral') is superseded by the vector.

**Camera feel (confirmed direction from Sam):** a 30–50 ms ease-in lag and a
~2px overshoot-and-settle on the substrate relative to the card flight — the
"camera has mass" cue. Cheap, high-yield.

**PARALLAX MATH (the weeds, per Sam's request).**

World mapping, chosen once and shared by the substrate, zoom 3, the flyover,
and the timeline-thumb proportion:

    worldPx(p) = ( p.x · PX_PER_SEAT ,  (p.birthYear − 1586) · PX_PER_YEAR )
    Δ          = worldPx(to) − worldPx(from)          // the camera's travel
    layerShift = −Δ · depth[k]                        // world moves opposite
    θ          = atan2(Δx, Δy)                        // felt direction

Depth factors: featured card 0 (the camera's subject never parallaxes); near
field ~0.5; mid ~0.35; far field + decade rules ~0.2. Every layer animates its
single transform over the SAME published duration/easing — one clock.

- **The child-click angle (Sam's 89°/91° question): never quantize to 90°.**
  The camera always travels the true vector. Clicking the leftmost of five
  children descends at the angle the table actually dictates — and because
  sibling seat-spacing is small relative to a generation's ~25–30-year drop,
  θ lands naturally in the ~88–92° band. The subtle drift is not styling;
  it is world-model honesty: zoom 3 renders the literal table, and flights
  must teach the same geography zoom 3 will later confirm. Nobody ever
  hand-picks an angle again; it falls out of coordinates.
- **Dead zone:** below a small |Δ| threshold (spouse swap — same seat, tiny
  offset), the camera does NOT move. That's a head-turn, not travel. Prevents
  anxious micro-pans.
- **Lateral travel:** a same-year cousin CC produces a near-horizontal pan —
  desired and automatic. Birth-year differences within a generation add the
  honest vertical component (see the axis decision, §2).
- **Extreme flights (300+ years):** true-linear substrate displacement at far
  depths is acceptable streak-feel, and the existing distance-scaled duration
  clamp (0.75×–1.3×) bounds the tempo; if tuning shows strobing, apply a soft
  compression (e.g., tanh-style) to substrate displacement ONLY — the flyover
  and timeline thumb still convey true magnitude. A tuning knob, not a
  redesign.
- All of this is arithmetic on build-time coordinates — runtime derivations
  are lookups and multiplies, guarded by construction (no date math, no NaN
  path; the §2 estimates seat everyone).

**LEARNED IN PRODUCTION (July 11, binding on this design): direction-
dependent motion must not exist anywhere until the travel vector is a
first-class captured value — which THIS section provides.** The arrival-
settle feature was built before 3a existed, had no vector to overshoot
along, was implemented as an origin-anchored scale puff (always bulging
down-right regardless of approach direction), and was reverted on Sam's
eyes. The lesson is doctrine: the camera vector defined here is the ONE
well — card flights, the arrival settle, the flyover, and the camera pan
all read direction, distance, and duration from the same captured
{from, to} pair. No feature hand-rolls its own direction again.

**The gondola rule (confirmed direction):** during a flight the scene is
non-interactive — a full-viewport pointer-events guard for the flight duration,
released on landing. Flights stay quick (existing distance-scaled durations),
so the lockout is never felt as a wait. This same guard fixes the rapid-click
hazard (clicks landing mid-flight capturing garbage rects).

---

## 3.5 THE FIELD — what actually moves (stars, motes, and one semantic layer)

_(new; answers Sam's starfield idea and "is there a better indicator than
stars?")_

**Verdict: the mechanic is right; the skin is a taste decision; add one
semantic garnish.** A sparse multi-depth point field is the correct parallax
instrument — better than a grid, which reads as graph paper (the Ancestry
aesthetic this project exists to escape).

**Mechanics (settled regardless of skin):**

- Points live in **world space** — seated at fixed table coordinates,
  generated deterministically (seeded hash) so regions of the table always
  look the same. They translate with the camera at their layer's depth factor
  (§3 math); horizontal travel across lines moves them sideways exactly as
  vertical travel moves them down — automatic, no extra code.
- **2–3 layers, a handful of points each** (per Sam: not a wall — order of
  60 far / 40 mid / 20 near visible per viewport). Far: tiny, dim. Near: few,
  slightly larger, soft glow. Viewport-culled; one transform per layer per
  frame; DOM divs or a single SVG per layer.
- **Rest state has a pulse:** an occasional slow twinkle / opacity
  micro-drift so the world feels alive between flights — subtle, and fully
  disabled under `prefers-reduced-motion` (as is all parallax).
- **The semantic garnish:** one far-depth layer of faint horizontal decade
  rules or tiny year labels (~every 50 years). The point field gives MOTION,
  the decade rules give ORIENTATION, the timeline gives MEASUREMENT. This
  layer replaces the retired generation horizon-lines (§2 axis decision).

**Skin — decide in the Phase 3b design pass, same code either way:**

- _Star-cold:_ classic points on midnight blue. Proven vocabulary, zero
  ambiguity about depth.
- _Archive-warm:_ the same points styled as dust motes in lamplight — warmer
  tint, softer edges. Matches the project's semantics (a table in an archive)
  over space semantics.
- A/B both on localhost in an afternoon; Sam's eye decides.

**Considered and set aside:** faint ancestor-name typography as the far field
(on-brand but competes with UI text — the flyover layer already delivers names
where they mean something); constellation lines linking anchor figures
(charming, noisy — parked as a possible later delight/easter egg); paper
texture drift (too subtle to carry motion alone).

---

## 3.6 THE LEFT TIMELINE — scale, lifespan highlight, anchor figures

_(extends the roadmap's time-slider; new: anchor figures per Sam 0703)_

The timeline is the table's y-axis rendered as an instrument: 1586 → today,
persistent at the left edge in every layout tier (§12 — Sam's explicit
requirement includes phone).

- **Lifespan highlight (confirmed direction):** the featured person's lifespan
  renders as a highlighted band on the scale — the "you are here, and here is
  how much history this life spanned" cue. Estimated years (`y_estimated`)
  render the band dimmed/hatched — the apparatus stays honest even here.
- **Anchor figures (new, confirmed direction):** ~10 curated people, the most
  prominent and era-representative across the 440 years, as small circular
  portrait thumbnails seated at their birth-year position. Each is a shortcut:
  click → they become featured. Implementation is nearly free: capture the
  circle's rect as the flight origin and the thumbnail GROWS into the featured
  card via the existing growFrom pattern — the timeline literally hands you a
  person. Anchors double as era wayfinding during pans ("passing Edwards
  now") and as the phone tier's primary explore affordance (§12).
- **Curation is DATA, owned by Sam:** an anchor designation (e.g., a
  `timeline_anchor` flag or ordered top-level list in canonical.json — Sam
  approves per person, like notable) flowing through regenerate-data.js into a
  small build artifact (name, slug, years, thumb, y). Requires small optimized
  thumbnail crops — build-time resize; routes to the data/pipeline stream.
- **Collision handling:** anchors clustered in the same decades get min-gap
  nudging with a hairline leader back to the true year position. Ten anchors
  over 440 years rarely collide, but Edwards-era density is real.
- **Active states:** the anchor nearest the featured person gets a quiet
  emphasis; if the featured person IS an anchor, its circle gets an active
  ring. The timeline thumb/viewport indicator subscribes to the same camera
  publishes as everything else (§3).

---

## 4. THE FLYOVER LAYER — real names, fake fidelity, TWO MODES

_(new; answers "can we actually show real cards below?" — revised 0703 per
Sam: short flights PRIORITIZE the in-between names; they are comprehension,
not decoration)_

Show **real people at their real table positions, rendered as fakes.** Not
actual PersonBox components (mounting dozens of interactive components for a
600 ms flight is waste and risk), and not pure abstract blur (wastes the magic
of a recognizable name streaking past). And the layer behaves differently by
range, because the in-between people MEAN something different by range:

**Near mode (≈1–3 generations of displacement) — the priority mode.**
On a short flight the passed-over people are the _explanation of the journey_:
the connecting parent is why the destination relates to the origin. So:

- **Selection = the lineage path, not the spatial corridor.** Show the actual
  connecting people in order (the parent chain for ancestor-line flights),
  walked client-side from parent pointers in `table-index.json` (see §2 —
  each index row carries `father_id`/`mother_id`; the walk is trivial and the
  same walker later serves connect-to-anyone).
- **Legible, minimally blurred, few** — typically 1–4 tiles. Familiarity is
  the goal: users learn who sits between the generations and why.
- **The WAKE resolves speed-vs-legibility:** the flight stays quick and
  snappy; the passed tiles fade in during flight and then LINGER ~300–500 ms
  after the card lands — a readable afterimage that then dissolves. Reading
  happens in the settle, not mid-streak, so nothing slows down.

**Far mode (wormholes, shuffle, timeline jumps).**

- Selection = the swept spatial corridor (rectangle between from and to,
  spatial-bucketed against precomputed coordinates), capped (~40), **biased
  toward notables** — recognizable names streaking past is the payoff.
- Pre-styled soft blur / low contrast (avoid `backdrop-filter` — expensive),
  faster fade, no lingering wake (or a much shorter one).

Shared mechanics: ultra-cheap inert tiles (name, lifespan, card-shaped div),
`pointer-events: none`, transform/opacity only, layered beneath the featured
card, removed after the wake. Degrade: index not yet lazy-loaded →
substrate-only flight (the layer is a bonus, never a blocker). The old
"skip short flights" rule is REVERSED — short flights are where the layer
earns its keep.

This is honest fakery: the same data Zoom 3 renders for real, drawn at flyover
fidelity. You can't get off the gondola, but you can see the villages — and on
a short ride, you're meant to recognize the stops.

---

## 5. ZOOM MODEL

_(extends: Re-focus choreography / zoom levels)_

**Zoom 1** — unchanged. The neighborhood stage; per-person payload; the flights.

**Zoom 2 — the grandchildren problem, solved by grouping, not shrinking.**
Ancestor tiers are bounded (4 grandparent slots — cheap). Descendant tiers are
not: many families put 25+ grandchildren on screen. Proposal:

- Grandchildren render **grouped by the child they descend through** — a
  condensed family bracket under each child box, not one undifferentiated row.
  The payload already carries `via_parent_id` per grandchild; the grouping is
  free.
- Within a bracket: up to N compact tiles (N ≈ 4–5) + a `+K` overflow chip.
  Clicking the overflow chip either fans the bracket open in place or (simpler,
  recommended first) navigates to that child — whose OWN zoom-1/2 view shows
  their children properly. Lean on the navigation strength instead of cramming.
- Bracket tiles are a smaller PersonBox variant, same flight-id discipline, so
  a grandchild click flies exactly like any other.
- Sort within brackets reuses the roster-time children ordering (birth-year
  asc, died-young last).

**Zoom 3 — the literal table.**

- **Data: the per-person payload pattern does NOT apply here** (direct answer).
  Zoom 3 is corpus-wide by definition; it draws from `table-index.json`,
  lazy-loaded on first invocation and cached for the session. Zoom 1/2 stay on
  per-person payloads. Two data planes, each right for its job.
- **Rendering: DOM with viewport culling, not canvas.** 16k nodes is too many;
  a few hundred visible chips is trivial. Precomputed coordinates + spatial
  buckets → render only chips in viewport + margin. Keeps chips as real
  elements (hover, a11y, consistent styling) without a second rendering
  technology.
- **Pan/drag: transform + Pointer Events, not native scroll.** One `table`
  container translated by pointer drag (`touch-action: none`, pointer capture),
  with simple inertia (sample velocity at pointerup, decay). Reasons: identical
  behavior for iPad swipe and desktop drag; the camera store drives it (so
  parallax and timeline stay in sync during a drag); no scroll-chaining fights.
- **Chip click → featured:** capture the chip's on-screen rect (the existing
  `captureFlightOrigin` pattern), set featured, revert to zoom 1; the card
  grows from the chip exactly as flights do today. Zoom 3 is thus a _view_,
  never a separate app.
- Same-size chips at zoom 3 (confirmed direction) — role color remains the
  differentiator, which is another reason Phase 2's palette precedes this.

**PINCH — discrete levels with magnetic detents, not continuous zoom.**
Zoom 1 and 2 are _compositions_ (distinct stage layouts), not magnifications
of one image; a free pinch would demand rendering meaningless in-between
states. The gesture model:

- Two-finger pinch (Pointer Events on the stage, `touch-action: none`)
  accumulates a scale factor. While pinching, the stage gives a small
  **elastic live hint** (~0.95–1.05 scale flex) so the gesture feels heard.
- Crossing a threshold triggers the STAGED zoom transition (the same
  choreography a zoom button fires) and the hint snaps into it. Thresholds
  carry **hysteresis** (e.g., commit outward below ~0.8 cumulative, inward
  above ~1.25) so the level can't flap at the boundary. Pinch-in (fingers
  together) = outward: 1 → 2 → 3; spread = inward.
- **Zoom 3 is the exception — the one true continuous plane.** Within it,
  pinch scales the table continuously between bounds (with pan, this is the
  full map gesture set). Spreading past the inner bound over a chip dives to
  zoom 1 on the nearest/centered chip (tuning decision: nearest vs. centered —
  test on iPad).
- Desktop equivalents: trackpad pinch (`wheel` + `ctrlKey`) drives the same
  accumulator; zoom buttons remain for everyone.
- Touch targets across all zooms: ≥44 px hit areas (chips can render smaller
  than they hit); hover-only affordances get touch equivalents (§12).

---

## 6. SPOUSE CAROUSEL (4+ spouses)

_(extends: FEATURED CARD LAYOUT / spouse chips; supersedes "4+ spouse
horizontal scroll" in the NOT-BUILT list)_

Confirmed direction from Sam, recorded as spec:

- The notch shows **at most 3 chips**; carve stays capped at `min(chipCount, 3)`.
- **Right arrow** sits left of the third chip when more spouses exist. Click →
  page forward by one: leading chip exits left (fade + short fly), the next
  spouse enters from the right. Keyed each over the visible window;
  `animate:flip` handles the middle chip's shift.
- **The overhang cue:** whenever the window is offset (page ≥ 2), the trailing
  visible chip renders **partially outside the card's right edge** — the visual
  clue that you're looking at a later group. Architecturally free: chips are
  already siblings of the card `<article>` (the chip-lift), so the card's
  clip-path cannot clip them. Requires a small reserved gutter on RightColumn's
  left so the overhanging chip never sits over interactive column content
  (z-index above card, below modals).
- **Left arrow** appears at the leading edge when offset > 0, with a gap before
  the first visible chip; paging back reverses the motion; arrow disappears at
  offset 0 (and the overhang retracts).
- **Guard rails:** carousel is inert during flights (the gondola guard covers
  this); a chip that pages out mid-hover cancels cleanly; spouse-swap flights
  capture origin from the chip's CURRENT rect, which the click-time capture
  already does correctly.
- **Open decision for Sam:** do the children rows below re-filter to the
  visible spouses, or continue showing all marriages' children? Recommend: show
  all (children rows are already grouped per marriage; paging the notch is a
  chip affordance, not a filter).

---

## 7. SIBLING BUBBLES

_(extends: Action buttons in footer / siblings; roadmap Phase 7)_

Confirmed direction, recorded as spec, with two implementation insights:

- **The nudge is a transform on the card GROUP, never a layout change.** Wrap
  the card + docked chips in one group element; on open, translate the group
  ~16–24 px left with a soft spring-ish ease (slight overshoot). A layout-level
  shift would reflow the notch, connectors, and rows — the "push" Sam
  explicitly doesn't want. A transform moves the painted card as one object:
  it _yields_, it doesn't _relocate_. RightColumn and CC footer do not move —
  only the card breathes left, which is what "feeling their presence" means.
- **Bubble entrance:** sibling chips in a vertical stack anchored to the group's
  right edge, each entering with scale (from ~0.85) + fade + a tiny y-settle,
  staggered ~50 ms apart, oldest-first (same ordering rules as children).
  Closing reverses with a faster, tighter stagger. `prefersReducedMotion` →
  instant show/hide, no nudge.
- **Data prerequisite (routes to the DATA/pipeline side):** the payload today
  carries `siblings_count` ONLY — verified against the live Aaron Burr payload.
  The neighborhood must ship a `siblings: PersonCompact[]` array (same compact
  shape, same died-young ordering) before this feature can render. Small
  regenerate-data.js addition; payload growth is a few hundred bytes typical.
- Sibling chips carry flight-ids; clicking one captures its bubble rect and
  flies it to featured like any relative. Panel state resets on navigation
  (same pattern as NB state reset).

---

## 8. SEO & DISCOVERABILITY — the richness gate

_(extends: URL STRUCTURE / data delivery; new decisions)_

Sam's call, endorsed and formalized: **only substantive pages are indexable.**

- **Richness gate at build time:** a person is indexable iff `notable` OR
  meets a content threshold (e.g., ≥1 NB, or blurb + photo + resolved dates —
  exact predicate is Sam's to set). Below the gate: `<meta name="robots"
content="noindex">`, excluded from sitemap. Pages remain fully navigable.
  Entries graduate into the index automatically as enrichment lands — the
  5–6 month content push continuously widens the indexed surface with zero
  extra process.
- **sitemap.xml** generated by `regenerate-data.js` from the gated set (one
  file is fine at this scale), referenced from robots.txt.
- **301s wired** (redirects.json is generated but dead): a server-side redirect
  path on Vercel — dynamic catch-all consulting redirects.json, or generated
  vercel.json rules if the set stays small. Slug renames (birth-year fills,
  suffix changes) are routine here; each unwired rename leaks any equity the
  old URL earned.
- **JSON-LD `Person`** per indexable page (name, birthDate, deathDate, parent,
  spouse, sameAs → the notable URL). Genealogy is the textbook schema.org fit;
  this is what makes a person-name search surface the page with rich context.
- **Unique title/description** per page from name + blurb + lifespan (verify
  present in prerendered HTML); relative/CC links confirmed as real `<a href>`
  anchors in the cold path (also the precondition for the `handleHttpError`
  dead-link report).
- **OG images for notables** (build-time, satori/resvg class tooling): portrait,
  name, lifespan, "descendant of Thomas Hooker · Generation N." Gated to
  notables so it's hundreds of images, not 16k. This is the sharing loop —
  a link that unfurls as a designed card is the difference between a share and
  a click-through.

---

## 9. THE CREDIBILITY APPARATUS — what the roadmap is missing

_(answers "anything missing to reach your goals?")_

For the stated audience — CHS, NEHGS, academic historians — the make-or-break
feature isn't motion. It's **visible method.** Historians decide in thirty
seconds whether a site is a source or a toy, and they decide by looking for
apparatus. Three gaps in the current roadmap:

1. **A sources affordance on the card.** The data already carries `sources` /
   `research_sources` and the documentation-tier model exists in DESIGN.md, but
   no phase renders it. Even minimal — a quiet "Sources" affordance opening the
   citation list with tier indicators (primary / institutional / community) —
   converts the site from "beautiful hobby project" to "citable reference."
   EH-1909 entry numbers (the H-prefix) shown as provenance would delight
   exactly this audience.
2. **The editorial front door.** Landing page + "About the Sources" +
   methodology + who made this. It's in DESIGN.md's not-built list but absent
   from the phased roadmap; for the academic audience it should ship WITH the
   public launch, not after.
3. **Measurement.** GSC shows search queries only. A privacy-respecting
   analytics layer (page-level is enough) tells you which people, paths, and
   wormholes users actually travel — which should then steer the enrichment
   worklist. Engagement is the stated key metric and currently nothing measures
   it.

Also worth naming: a per-card "share" affordance (copy canonical URL), and a
designed 404/stub-landing experience so an unindexed stub reached from outside
still orients the visitor ("part of the documented line of Thomas Hooker —
enrichment in progress — here is their path to Thomas").

**Source capture doctrine (process design; implementation routes to the data
stream).** Sam's observation: he tries to share sources during research but
can't rely on remembering to. The fix is to make capture STRUCTURAL — attached
to moments that already happen — instead of an act of memory:

1. **Capture at ingestion, automatically.** Standing rule for the data stream:
   whenever raw text is pasted for distillation (the "distill" and
   "paste a source block" commands), Code records the source (URL or citation
   string + tier + access date) into `research_sources` as part of the SAME
   pass — never a separate step Sam must remember. The paste IS the citation
   event.
2. **A `source_add` row in the tasks grammar** (`source_add url="..."
tier=primary note="..."`), so a Sheets research session can carry
   provenance inline on the row where the finding lands.
3. **A minimum viable citation** — URL + tier + accessed date. Not Chicago
   style. A low bar that gets met beats a high bar that gets skipped; the
   card-side apparatus (§9.1) renders tier + link, which is what the audience
   actually checks.
4. **A retroactive lint, not retroactive guilt:** a remediation pass (the
   blurb-worklist pattern) flagging enriched entries — has NBs — with empty
   `sources`/`research_sources`, emitted as a sources_worklist.tsv, worst
   first. Debt becomes a ranked list to draw down instead of a memory burden.
5. Optional, later: fold "has ≥1 source" into the SEO richness gate for
   NB-bearing pages, so the indexed surface is also the cited surface.

---

## 10. THE BURR–EMMONS LINE — the thesis exemplar

_(content direction, for the enrichment stream — recorded here because it
shapes design)_

Aaron Burr Jr.'s second family — his children with Mary Emmons, a servant in
the Burr household — leads to John Pierre Burr and Louisa Charlotte Burr and
into the heart of free Black Philadelphia: abolition, the Underground Railroad,
civic institution-building, and descendants formally recognized by the Aaron
Burr Association in 2018 after Sherri Burr's and others' research. This line is
the strongest possible answer to "isn't this just a WASP tree" — the American
experience the project claims to capture runs straight through it.

Two notes for the enrichment pass, in the spirit of the project's precision:

- **Historiography care on Mary Emmons herself:** the sourcing commonly
  describes her as a woman of color from Calcutta (accounts vary on her origins
  and name — "Eugénie" appears in some traditions), and much of the record is
  reconstructed through descendant research rather than contemporary documents.
  The tier-indicator system in §9 is exactly the right instrument: present the
  line proudly, cite what each claim rests on, and let the apparatus carry the
  uncertainty honestly. That treatment will earn more academic respect than
  false confidence would.
- Design-wise this argues for the sources UI landing before or with the public
  launch: the line the project is proudest of is also the one where visible
  method matters most.

---

## 11. STUB DESIGN — degrade beautifully

_(extends Phase 2 role-color work)_

A deliberate stub state, designed in the Phase 2 palette pass: a stub card
leads with what it HAS — position (generation label, horizon-line context),
lifespan bar, path-to-Thomas affordance, role color — rather than rendering as
a rich card with holes. Null beats weak applies to layout too: hide empty
sections cleanly (mostly done), and give the card's center of gravity to the
connective elements when biography is absent. The 5–6 month enrichment horizon
means most visitors' random-walk clicks will land on stubs; the stub IS the
median product experience and deserves one focused design session.

---

## 12. LAYOUT TIERS — desktop, tablet, phone

_(new per Sam 0703: tablet/mobile is a big part of the project)_

**The architectural rule that makes this tractable: tiers are layout
compositions over the SAME state, data, and camera.** One neighborhood payload,
one camera store, one table coordinate system; each tier is a different
arrangement of the same subscribers. No forked logic, no per-tier data plane —
a tier store + CSS decide composition, and the camera publishes identically
everywhere (tiers may scale depth factors and field density, nothing else).
Tier detection: viewport width + orientation + `pointer: coarse`, not
user-agent sniffing.

**Tier A — Desktop & tablet landscape (the full stage).** Everything in this
doc. Touch adds: pinch detents (§5), ≥44 px hit targets, zoom-3 drag/inertia
(already Pointer-Events-based, so tablet came free), and touch stand-ins for
hover affordances — the glimmer becomes a quiet idle sheen or tap-feedback
glint rather than cursor-tracked. Tablet landscape is a first-class citizen of
the primary design, not an adaptation — verify each phase on iPad as part of
its close-out, not in a later "mobile pass."

**Tier B — Tablet portrait (narrowed stage).** Zoom 1 + zoom 3 (zoom 2's
grand-tier spread is the width casualty). The card narrows toward its minimum
comfortable width; RightColumn folds BELOW the card as collapsible sections
(or a slide-in drawer — design-pass choice); CC footer becomes horizontally
scrollable chips; parents/children rows persist. Timeline persists at full
function including anchors. Flights, field, and wake all run — the world model
is identical, just recomposed.

**Tier C — Phone (the essential instrument).** Stripped but genuinely useful,
per Sam — not a business-card site:

- **Zoom 1 only** at first (a simplified zoom 3 is a candidate later, never a
  launch gate). Vertical stack: compact parent chips → full-width featured
  card (notch simplified to a spouse chip row; carousel still pages) →
  children as wrapped chips → entities/CC as accordion sections below.
- **The timeline SURVIVES — Sam's explicit requirement.** A narrow rail
  (~32 px) at the left edge: the 1586→today scale, the featured person's
  lifespan highlight band, and anchor figures as small dots. Tapping the rail
  expands a timeline overlay with full anchor thumbnails — on phone, the
  anchors are the primary explore affordance.
- Motion diet, not motion absence: flights simplify (crossfade + reduced
  substrate travel), field density drops, near-mode wake keeps its 1–4 tiles
  (the comprehension feature earns its place even here), far-mode flyover is
  skipped for performance.
- Phone is where share links land (§8's OG images) — the person a shared URL
  reaches is most often holding a phone. Tier C's card is therefore the first
  impression surface for the entire sharing loop, and deserves its own design
  session like the stub state.

**Verification discipline:** Code's CDP probes run at three representative
viewports (desktop, iPad landscape/portrait, phone) once tiers exist;
"verified" means verified per tier. Sam's localhost eyeball extends to a real
iPad — simulator rendering lies about touch feel.

---

## 13. VIEWPORT-LOCK & SCROLLBAR DOCTRINE

_(new 070926; answers the scrollbar pop and establishes the "god view" model)_

**The doctrine: this is an exhibit, not a document. The stage owns the whole
viewport; there are no scrollbars anywhere in zoom 1. Movement is clicking;
surveying is zoom 3's pan.** Two scrollbars currently violate it: the document
scrollbar that pops in/out on busy cards (shifting the layout ~15 px
horizontally — the jarring effect), and RightColumn's internal scrollbar on
content-rich cards (§14.5). Both are eliminated, differently.

**13.1 Why the pop happens.** The zoom-1 composition (parents row + card +
children rows) can exceed viewport height on short windows — and even on
fitting layouts, flights TRANSIENTLY change document height (leavers pin out
of flow; rows reflow mid-transition). The scrollbar appears for a few frames,
steals its gutter, shifts everything, and vanishes.

**13.2 The shell lock (the fix for the document scrollbar):**

```css
/* app shell — the stage owns the viewport */
html,
body {
	height: 100%;
}
.app-shell {
	height: 100dvh; /* dvh: honest on iPad/mobile URL-bar resize */
	width: 100%; /* prefer % / cqi over vw everywhere inside */
	overflow: clip; /* NOT hidden — see below */
	overscroll-behavior: none; /* no iPad rubber-band / pull-to-refresh */
}
```

- **`clip`, not `hidden`:** `overflow: hidden` still creates a scroll
  container — focus events and `scrollIntoView` can silently scroll it,
  producing "mysteriously cropped layout" bugs with no visible scrollbar.
  `clip` removes scrollability entirely, is cheaper, and supports
  `overflow-clip-margin` if flights ever need sanctioned overdraw room.
- With the shell clipped, the **mid-flight transient overflow can never
  summon a scrollbar** — the pop is dead even before any fit work.
- The full-bleed/`100vw` trap (Bushell/Comeau/Bell, July 2026): `100vw`
  includes the classic scrollbar's width on Windows/always-scrollbars macOS.
  Inside a clipped shell there is no document scrollbar, so the trap is moot —
  but the discipline stands: **inside the shell, size with `%`, `fr`, or
  container-query units (`cqi`), never `vw/vh`.** If any interim page keeps a
  scrollable document (e.g. a future About page), `html { scrollbar-gutter:
stable; }` is the correct reservation there.
- **Interim one-liner (ship tomorrow, before the lock):**
  `html { scrollbar-gutter: stable; }` — the scrollbar may still appear, but
  it stops shifting the layout. Removes the jarring effect in one line while
  the real lock lands with 2.75.

**13.3 The fit contract (what makes clipping honest).** Clip without a fit
policy = amputation — an 11-child family would just be silently cut. The lock
therefore ships WITH a stage-fit policy, centralized in the Phase 2.75 tier
store (never per-component window coupling):

```ts
// stage-fit store (module scope, consumed by the stage; Svelte 5.11+)
import { innerWidth, innerHeight } from 'svelte/reactivity/window';

export type Density = 'roomy' | 'normal' | 'compact';

// SSR: innerHeight.current is undefined → default 'normal'; one settle on hydrate.
export function stageDensity(): Density {
  const h = innerHeight.current ?? 900;
  if (h >= 980) return 'roomy';
  if (h >= 820) return 'normal';
  return 'compact';
}
```

- **Density steps first.** The NORMAL/COMPACT spouse-chip constants in
  FeaturedCard are already this pattern — extend it: each density sets the
  card's geometry tokens (card height, chip sizes, children-chip size) and
  the CHILDREN-ROW CAP. Beyond the cap: a "+K more" chip — the same
  vocabulary zoom 2's brackets use. (Open decision for Sam: the +K chip
  expands in place vs. navigates; recommend expand-downward is NOT allowed
  under the lock — it navigates or swaps a row.)
- **Stage-scale fallback below minimum.** Under ~700 px of height, scale the
  whole stage group (`transform: scale(...)`) to fit. Semantically free in
  the world model: a smaller window = the camera sits slightly higher above
  the table. Transform doesn't affect layout → no scrollbar math, no reflow.
- **Verification (the check that must exist):** a probe asserting
  `stage.getBoundingClientRect()` fits the viewport at all densities on the
  richest cards (Thomas, Pierpont, Burr) — proven RED on today's Pierpont
  overflow first, then trusted green.

**13.4 RightColumn's internal scrollbar** is solved by budget, not by
clipping — §14.5.

---

## 14. ZOOM 1 CARD GRID — REFINEMENTS (with code)

_(new 070926; from live review of FeaturedCard.svelte + RightColumn.svelte +
screenshots of Pierpont Edwards, Thomas Hooker, Anne Hooker, Aaron Burr,
Florence Talcott Hope. No revamp — the layout is close; these are the last
six turns of the screwdriver.)_

**14.1 The reading measure is the root of the middle-column complaints.**
`grid-cols-[23%_54.5%_22.5%]` gives the NB column ~500 px of text at
13–14 px — a ~90-character line, far past the comfortable 60–75ch measure.
That's why the middle feels simultaneously cramped against the photo and
gapped from the right column: the text runs too wide and stops nowhere.

```svelte
<!-- FeaturedCard content row: name the seams, bound the measure -->
<div class="content grid grid-cols-[23%_1fr_22.5%] overflow-hidden p-6">
	<div class="portrait-column space-y-4 pr-4">…</div>
	<div class="narrative min-h-0 overflow-hidden pr-6 pl-4">
		<div class="max-w-[52ch]">
			<!-- the measure cap: readability + gutter -->
			<NarrativeBlocks blocks={person.narrative_blocks ?? []} />
		</div>
	</div>
	<div class="h-full min-h-0"><RightColumn … /></div>
</div>
```

One change, two fixes: NB prose becomes readable, and the slack width becomes
the visual gutter before RightColumn that today's uniform `gap-1.5` can't
provide. (Grid has no per-seam gap; asymmetric padding IS the per-seam gap.)

**14.2 Vitals: stack Birth over Death, full column width (confirmed
direction).** The current side-by-side `flex gap-6` wraps asymmetrically when
one location is long ("Northampton, MA"). Stacked, each block owns the full
column width and never fights its sibling:

```svelte
<div class="vitals space-y-2.5 pl-1">
  {#snippet vital(label: string, date: string, loc: string | null, map: string | null)}
    <div class="vital-block">
      <div class="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">{label}</div>
      <div class="font-lora text-[13px] leading-tight text-slate-700">
        {date}{#if loc}<span class="text-slate-600"> · {loc}</span>{/if}
        {#if map}<a href={map} target="_blank" rel="noopener noreferrer"
          class="ml-1.5 text-[9px] tracking-wider text-blue-700 uppercase hover:underline">Map</a>{/if}
      </div>
    </div>
  {/snippet}
  {#if birthDate}{@render vital('Birth', birthDate, birthLocation, birthMapUrl)}{/if}
  {#if deathDate}{@render vital('Death', deathDate, deathLocation, deathMapUrl)}{/if}
</div>
```

Date + place + MAP on one full-width line per event; wraps only when truly
long, and symmetrically.

**14.3 The Connect buttons live under the vitals.** Two stacked quiet buttons
in the portrait column — personalized with the focus person's first name
("Connect Pierpont to Thomas Hooker" / "Connect Pierpont to anyone"). Notes:
suppress both on Thomas himself and the to-Thomas button on anyone whose
featured card IS an ancestor-line terminus; buttons can ship BEFORE the Phase 6
modals as disabled-with-tooltip or simply land with the modals (recommend the
latter — no dead affordances). The portrait column has the vertical room:
photo (3:4 at ~200 px wide ≈ 265 px) + vitals + two 32 px buttons fits the
~430 px content zone.

**14.4 CC footer: cap at 6, tighten type (confirmed direction).** A
render-side display cap — canonical keeps everything (no-delete law; display
policy ≠ data policy). CC display order is curation and routes to the data
stream (worklist: order CCs by wormhole quality per person).

```svelte
const CC_DISPLAY_CAP = 6; let visibleCCs = $derived(crossConnections.slice(0, CC_DISPLAY_CAP));
```

Type: `text-[12px]` → `text-[11.5px]`, `gap-y-1` → `gap-y-0.5`, and
`line-clamp-2` per row so the footer's worst case is bounded (3 rows × 2
lines). The footer extends the card downward (by design), so bounding it is
part of the §13 fit contract. If more than 6 exist, a quiet "+N more"
non-affordance text is acceptable; an expanding footer is NOT (violates the
lock).

**14.5 RightColumn: replace the internal scroll with a ROW BUDGET.** An
internal scrollbar on Thomas is unacceptable (agreed), and `overflow: clip`
alone would cut a row mid-glyph. The column should render sections in
priority order until a deterministic budget is spent, then stop cleanly —
null beats weak, applied to layout:

```ts
// Row-unit budget: how many "units" fit the measured column height.
// A unit ≈ one 13px line + leading (~18px). Measured once via bind:clientHeight
// on the scroll-group's replacement (the budget-group), reactive to density.
const UNIT_PX = 18;
const COST = { eduEntry: 2, eduEntryBare: 1, careerEntry: 1.5, mediaRow: 2.5,
               textRow: 2, sectionHeader: 1.5 } as const;

let columnH = $state(0);                       // bind:clientHeight
let budget  = $derived(Math.floor((columnH - burialHeight - 12) / UNIT_PX));

// Spend the budget in PRIORITY order; a section renders only if its header
// + first row fit; rows render until the section cap or the budget stops them.
```

Two priority regimes (the Thomas lesson — his statues are his most engaging
content and his degrees his least):

- **Default order:** Education → Career → Landmarks → Art → Documents →
  Statues → Video (today's order).
- **Media-rich order (any of landmarks/art/statues/documents/videos
  non-empty):** Career (cap 2) → Art → Statues → Landmarks → Documents →
  Video → Education (cap 1, notes suppressed). Education notes move to a
  `title` tooltip exactly as career notes already do — the verbose
  "B.A. 1608; M.A. 1611; Fellow…" line is the single biggest space offender
  on Thomas's card.

Editorial doctrine to pair with it (routes to the data stream): **the card is
the page budget.** Career/education arrays are written to fit the card, not
the CV — trim at the source (Thomas: one pastorate line, degrees collapsed).
The budget renderer is the safety net, not the excuse.

**14.6 Header stability (the Florence Talcott Hope wrap).** The header row is
`minmax(70px,auto)` inside a fixed 580 px card-top — when a dual-descent
label wraps and a blurb follows, the header GROWS and eats the content row,
shoving photo/NB/RightColumn downward per card. Two fixes together:

- **Compact dual-descent notation** (change in `computeGenerationLabels`):
  one line, `text-[11px]`:
  `9th-Gen Descendant of Thomas Hooker · 8th-Gen of John Talcott`
  (The code already styles ' / ' labels at 11px — the fix is emitting a
  string short enough to actually hold one line at the card's width.)
- **Fix the header height** so every card's content zone starts at the same y:

```svelte
<div class="card-top grid h-[580px] grid-rows-[84px_minmax(0,1fr)]">
  <div class="header overflow-hidden px-6 py-4" …>
    <!-- name (1 line, truncate) + up to 2 label lines + blurb (line-clamp-1) -->
  </div>
  …
```

Bonus beyond the fix: an invariant content-zone origin makes the flight
morphs visibly calmer — photo and NB no longer jump vertically between
cards with different header bulk.

**14.7 The Burr "imbalance" — mostly defend it.** Museum labels aren't
justified blocks; three columns with different natural lengths read as
curation, not error. The genuine fixes are bounding the worst cases (14.4,
14.5) and the shared header origin (14.6) — not equalizing every card. One
cheap balancer if wanted later: when NB count ≥ 5 and the right column is
sparse, the burial pin's anchor already gives the right column a floor; no
further intervention recommended.

**14.8 The stub portrait slot (ties to §11).** ~70 % of entries have no
photo; today the slot is a flat grey box (Anne Hooker). In the Phase 2 stub
design, this slot is the opportunity: a quiet role-color-tinted panel with
the person's lifespan rendered as a miniature timeline segment (build-time
data — no runtime date math), or a period-appropriate monogram. The slot is
the card's largest single area; on stubs it should carry the connective
identity instead of reading as a missing image.

---

## 15. WAYFINDING OFF THE LINE — the easter-egg problem

_(new 070926, second session; from the William Pantry X00090 review. Answers:
"should the Hooker spouse appear beside Mary Pantry, or should a glow point
off-screen?")_

**The problem:** an X-entry's zoom-1 view can contain zero Hooker-line people
(Pantry: X-focus, non-line wife, non-line daughter). A user three clicks into
orbit has no visual answer to "where am I relative to the line?"

**Rejected: the off-screen glow.** A glow bleeding from below the stage is a
scent without a door — it demands interpretation, and it contradicts §13's
own doctrine: zoom 1 just established that nothing exists off-stage. An
exhibit that says "there are no edges" cannot then hint around an edge.

**Adopted (proposed): three layers, cheapest-first.**

1. **Ambient role signal (with Phase 2):** X-cards carry the neutral/grey
   tint — the ABSENCE of gold itself says "off the line" at a glance. Gold
   = home; grey = orbit; the system is legible before any affordance is.
2. **The compass:** a persistent, quiet "⌂ Return to the Hooker line"
   control on every non-line card (near the ID chip), resolving through the
   focus person's `family_orbit` CC (the CC `type` field ships in payloads —
   verified against the live Pierpont payload). The museum "return to tour"
   pattern; boring and correct.
3. **The door pair (the headline move, X-cards only):** the bridge child
   renders with their Hooker-line spouse docked beside them as a small
   gold-glowing companion chip — Mary Pantry, and beside her the husband who
   makes her the way home. Clicking the gold chip returns to the line in one
   flight. This does NOT generalize to child-in-law chips everywhere (it
   would double 11-child rows and break the neighborhood grammar); X-cards
   are grammatically special — their entire purpose is the bridge, so
   rendering the bridge IS their correct form.

**Data prerequisites (route to the data/pipeline stream):**

- Audit: every easter_egg entry has its automatic `family_orbit` CC to its
  Hooker connector (the doctrine exists; Pantry's footer suggests drift).
- The door pair needs the bridge couple resolvable in X-entry payloads —
  a small regenerate-data.js addition shipping the bridge person's compact
  (and which child they attach to) on X-focus payloads.

**Role-color calibration notes (for the Phase 2 pass; Sam decides):**

- The glow cannot read on white — role-glow ships WITH the midnight
  background, not before. Sequencing dependency, now explicit.
- Surface tints at very low chroma (3–6%); the glow/edge carries the role,
  or text contrast pays for it.
- Test lime green against deeper sage/emerald on the dark ground — pure lime
  vibrates and carries "success state" UI baggage. Sam's eye decides in the
  same A/B session as the field skin (§3.5).
- **Colorblind double-cue for free:** the ID prefix already on every card
  (H / HD / T / TD / X / I) is the role in text form — tint the ID chip with
  the role color and the system is legible to deuteranopia without any new
  element.
- **Open decision — dual descent:** Florence (TD0055) is 9th-gen Hooker AND
  8th-gen Talcott, and both lines are canonically equal. Dual-descent cards
  need one defined treatment: two-tone edge, or gold primary + green
  secondary accent. Decide once in Phase 2, apply everywhere (cards,
  timeline lifespan bars, zoom-3 chips).

---

## 16. PAYLOAD & CONTENT FINDINGS — July 9 audit (Pierpont H00386 live payload)

_(grounding notes; small items, recorded so they don't evaporate)_

- **Payload hygiene is already good:** 155 KB with 68 context people;
  `research_*` fields contribute ~220 bytes. The suspected research-notes
  bloat does NOT exist — no action. (Optional micro-trim of empty
  arrays/null keys is not worth priority.)
- **CC `type` ships to the client** (civic_peer, family_connection,
  family_orbit, …) — the §15 compass and door pair are data-supported today
  wherever the family_orbit discipline held.
- **Pierpont validates the §14 caps:** 5 compliant NBs (all headers ≤8
  words), 8 CCs (the display cap of 6 will bite — CC ORDER curation is
  therefore real work, not hypothetical), career 1 / education 0.
- **X-entry content drift (data-stream lint, from Pantry X00090):** headers
  over 8 words truncate mid-phrase in the UI — fatal for the element defined
  as the primary product — and at least one NB body opens by repeating its
  header verbatim. Lint: flag headers > 8 words; flag bodies whose first
  sentence duplicates the header. Render-side truncation is not the fix;
  the content is.
- **Chip date degrade:** a fully-unknown lifespan currently renders "?–?"
  (Mary Pantry). Suppress the dates line when both ends are unknown — null
  beats weak applies to chips.

---

## 17. MOTION PHYSICS DOCTRINE — earned in the card-transition maintenance phase

_(new 071226; the July 11 session closed the card-transition layer — carousel,
demotion model, six ghosts — and produced motion principles that BIND the
camera/parallax design. Recorded here so Phase 3 inherits them as constraints,
not suggestions.)_

**17.1 Perceived weight is velocity, not duration (Sam's "cm/ms" insight).**
Distance-scaled durations with a duration clamp force far flights to high
px/ms — they read as missiles, not objects. The shipped fix for card flights
is a VELOCITY CEILING (~1.6 px/ms, one tunable constant): far flights take
the time they need rather than speeding up. **This binds the camera:** §3's
distance-scaled camera durations must be velocity-capped in world-px terms,
or a Gen-10 → Gen-6 diagonal CC flight becomes a strobe. The far-flight
"soft compression" knob in §3 remains available, but the ceiling is the
primary instrument — same physics as the cards, same constant family.

**17.2 One physics, one vector (the settle lesson, §3 note).** The arrival
settle returns in Phase 3a as a TRANSLATE overshoot along the captured
travel vector — a card (or the camera) carries a few px past its destination
in its direction of travel and springs back. Never an origin-anchored scale
puff. Cards and camera share the same easing family so the whole world
speaks one dialect of mass.

**17.3 Directional perception asymmetry (observed, unresolved by design).**
Downward motion reads faster than upward at identical px/ms (the eye expects
falling). A blanket 12% downward duration multiplier was tried and reverted —
it degraded more than it fixed at card scale. Status: a REAL phenomenon with
no adopted mechanism; the camera design pass (3b) should revisit it with the
true vector available (e.g., mild direction-aware duration term), prototyped
and judged on pixels, never assumed.

**17.4 Occlusion is legitimate language.** A solid object passing in front
of a stationary one (the accepted "Artifact C": a demoting card crossing the
parents row) is honest physics consistent with the table world model — and
it previews the flyover, where the featured card passes OVER field tiles by
design. Do not suppress occlusion; choreograph it (the corridor-hold option
is logged for 3a's flyover corridor work if it ever bothers Sam's eye).

**17.5 Structural doctrine from the ghost taxonomy (binding on all future
features):**

- **Existence-gating:** features serving a minority of cards (4+ spouse
  carousel, sibling bubbles, the door pair, connect buttons) must not exist
  in the DOM on cards that don't need them. The median card never pays for
  the exceptional card's machinery.
- **Capture-time settlement:** navigation-time state settles BEFORE flights
  measure; transitions belong to user gestures, never to arrival.
- **Invisible at rest → invisible exit:** an element hidden by design must
  exit hidden, via a NON-degenerate transition (a {duration: 0} outro gives
  the framework no frame to clean up — degenerate cases of framework
  machinery are never the safe path).
- **Probes evolve first, prove red, then trust green.** The Playwright
  arsenal (flight, carousel-regression, stress + orphan detector + prod
  janitor tripwire) is the standing gate for ALL motion work, including
  every Phase 3 layer. Sam's eyes remain the final instrument — three times
  in one day they caught what green probes weren't yet asserting.

---

## 18. THE PARALLAX RECIPE — post-mortem of the first field session (July 12, evening) and the composition that will work

_(added after the live 3b Block 1 attempt. The mechanics shipped and are
probe-verified; the ILLUSION did not read. This section records why, so the
next session — whoever runs it — builds the composition instead of
rediscovering the lesson.)_

**18.1 What happened.** The field was built correctly: midnight ground,
three mote layers, camera-store subscription, one-clock drift, dead-zone on
spouse swaps, foreground layer past the card plane. Probes green. Sam's
verdict on the rendered result: "zero parallax illusion, even pretending."
Both are true. The lesson:

**18.2 THE LAW: one instrument cannot carry the illusion.** In this
architecture the stage never moves — cards fly, everything else is static —
so any single background cue must carry the entire "I traveled" story alone.
Twenty dots translating for 400ms reads as "dots slid," not "I moved,"
no matter how correct the math. Parallax is not a feature; it is a
COMPOSITION of mutually-reinforcing cues, and it only clicks when several
play at once:

1. **The world-anchored field** (Block 2, deferred): motes seeded on TABLE
   coordinates, not viewport-relative — so regions have stable, faintly
   recognizable star-patterns and the drift is the world scrolling, not a
   texture sliding. (Block 1's viewport-seeded field also accumulates
   offset under sustained navigation — it must be replaced, not patched.)
2. **The decade rules** (§3.5): faint horizontal time-lines at far depth —
   the semantic layer. Dots can slide; a labeled 1750 line drifting past
   is unambiguous travel.
3. **The left timeline thumb** gliding in sync (§3.6) — the instrument
   panel confirming the motion the field implies. Sam independently
   re-derived this pairing on July 12: "paired with the left side
   timeline… there is something to it."
4. **The near-mode flyover names** (§4) — people streaming past between
   origin and destination. Names are the strongest travel cue this
   project owns.
5. **The dark palette pass (Phase 2) as a PREREQUISITE, not a garnish:**
   the July 12 field looked wrong largely because ONLY the ground changed —
   connectors, labels, shadows, and cards were all designed for white.
   A dark world needs its whole room painted (role glows, text-on-dark,
   light shadows). Judging the field on an unpainted room was unfair to
   both; do not repeat it.

**18.3 What DID land and stands (keep, don't rebuild):** the camera store
with verified vectors; the field component with depth-differentiated motes
(far dim/small, near bright/haloed — depth must read as two obviously
different populations); the spouse dead-zone (spouse + featured are one
object; the world holds still); the foreground layer model (card plane =
1.0; near motes at 1.5–2.0 so something visibly outruns the cards);
PARALLAX_SIGN as the one-flag direction flip; the three-way ground toggle
(Light default / Midnight / Pine) as the workbench that lets Sam revisit
the dark world in thirty seconds without blocking light-mode progress.

**18.4 Build order for the session that finishes this** (each step
verifiable alone; the illusion is expected to click around step 4, not
step 1):

1. Block 2 seeding — motes on table coords, culled by viewport, stable per
   region. (Prereq: none; the coords exist.)
2. Decade rules at far depth (same world-space layer family).
3. The left timeline rail + lifespan highlight + gliding thumb on the
   camera clock (§3.6 — independently valuable in light mode too).
4. CC/table-index destination lookup at capture (closes the to:null gap)
   so long diagonal flights publish true world vectors.
5. Near-mode flyover names (§4) riding the same corridor math.
6. THEN the Phase 2 dark-palette pass, with the toggle as the A/B tool —
   and only then judge the composition. Acceptance stays Sam's sentence,
   unchanged: "I can see the world move," on a child click, without
   squinting, without pretending.

**18.5 Complexity verdict, for the record (Sam asked):** the project is
complex like a WATCH, not like a tax code — many small mechanisms, each
simple and individually pinned by probes, whose composition is the product.
The week's evidence cuts both ways and both matter: two correct mechanisms
touching wrong produced the ghost taxonomy; mechanisms sharing primitives
produced angles, settles, and seating that worked for free. The moral is
already doctrine (§17.5): shared wells, existence gates, geometry over
clocks, probes that learn from Sam's eyes. Keep feeding the wells and the
watch keeps time.

**18.6 SUBSTRATE SKINS — the day form and the night form (July 12, late).**
Sam's grid instinct, examined against tonight's lesson, resolves the
substrate question:

- **The axis-legibility law:** lines carry only the motion PERPENDICULAR to
  themselves (a horizontal rule sliding vertically = unambiguous travel;
  sliding laterally = invisible). Dots are isotropic but weak in every
  direction (tonight's failure). Therefore: HORIZONTAL DECADE RULES carry
  the dominant vertical (generational) travel; the lateral axis (CC
  cousin-jumps) needs an isotropic partner — faint verticals (a true grid)
  or a sparse mote layer behind the rules.
- **DOCK-TO-LINE (Sam's "entries fixed to a line," translated to this
  architecture):** the card never moves; the GRID comes to rest with the
  featured person's birth-year rule at a fixed alignment against the card
  (e.g. under the header). Every navigation, the world slides until the new
  person's line docks — the parallax IS the seeking of the line. Uses t.y
  directly; composes with the left timeline (same axis, two instruments).
  This is the strongest single upgrade available to the illusion.
- **One skeleton, two skins:** decade rules + dock-to-line are
  mode-independent. LIGHT MODE dresses them as archival LEDGER (warm rules,
  margin year labels — the 1909 register made ambient; most on-brand) or
  BLUEPRINT/SURVEY-PLAT (pale architect blue; the "American land and time"
  accent — Hartford's founder, Western Reserve townships). DARK MODE
  dresses them as dimmed rules + the fairy-light motes carrying the
  lateral axis. The ground toggle is the A/B instrument. Decisive
  practical win: the light-mode skins deliver parallax WITHOUT waiting for
  the Phase 2 dark palette — §18.4's step 2 can ship into the world Sam
  already loves.

**18.7 THE LEDGER SKIN — artifact anatomy (July 12, from Sam's period
inventory example).** Period account books and registers (1700s–1800s)
supply the light-mode skin ready-made, and their anatomy maps 1:1 onto the
substrate skeleton:

- **Faint ink HORIZONTAL rules** = the decade lines (vertical-travel
  carriers), warm brown at low alpha on aged-paper ground.
- **Sparse RED VERTICAL column rules** = the lateral-axis carriers — the
  isotropic partner the horizontal rules need (the period artifacts solve
  §18.6's two-axis problem natively: red verticals, brown horizontals).
- **FOXING** (age-spots) = the light-mode mote layer — sparse deterministic
  flecks at their own depth, the organic texture the grid parallaxes
  against. Dark mode: fairy lights; light mode: foxing. Same mechanism,
  period dress.
- **Quill-script** reserved for one or two ceremonial moments (landing
  masthead; possibly margin decade numerals) — NEVER body UI. The
  restraint rule: THE SUBSTRATE WEARS THE PERIOD; THE CARDS STAY MODERN —
  clean museum labels pinned over an archival sheet. That is the exhibit
  metaphor, literally rendered.
- **Provenance note for the record:** period ruled documents include the
  darkest records in the American archive (estate inventories of enslaved
  people; Sam's own media holds Sue Suah's document and the Tunxis deed).
  The aesthetic evokes the PRACTICE of record-keeping, which this project
  already treats with tier-honest care — coherence, not nostalgia. Say so
  on the About page when the time comes.
- Tokens to prototype: paper ~#ece3d2 family with subtle mottle (texture
  stays quiet — rules carry the motion); horizontals rgba(ink-brown, ~.14);
  red verticals rgba(160,60,50, ~.16), sparse (every N seats); margin
  decade labels. A/B against the blueprint skin via the ground toggle
  (the toggle graduates from grounds to SKINS).

**18.8 THE ZOOM-1 VERDICT (July 12, late — conclusive, do not re-litigate).**
The world-anchored ledger was built correctly (dock-to-line, revisit-
identical, settle-synced) and judged on the rendered result. Sam's verdict,
final: **no moving substrate at zoom 1 (or zoom 2).** The zoom-1 UX is a
FIGURE-GROUND composition — luminous cards on a quiet wall — and any
articulated moving background competes with the figure ("makes something
beautiful look amateur"). The white/quiet ground is the designed matting,
not an empty slot. Consequences:

- Zoom 1/2 ground is STATIC. Permitted: subtle static texture (true
  parchment grain — a real texture asset or SVG turbulence; NOT thin CSS
  rule-lines, which read as wireframe errors, and NOT broken-dash "ink
  gaps," which read as bugs).
- **The LEFT TIMELINE RAIL is the sense of time and travel at zoom 1/2** —
  promoted from companion to THE instrument (§3.6). Honest instrumentation
  over strained illusion; the audience is historians.
- The SETTLE survives untouched — it was approved against the quiet ground
  and only clashed with the moving grid.
- ZOOM 3 keeps the paper dream (fixed tiles at true t-coords = the
  geometrically honest cards-on-register), with a CRAFT BAR: real parchment
  texture + drawn rules, never wireframe CSS. The dock-to-line world
  mapping committed tonight (c334b6e4) is zoom 3's foundation — keep the
  code, repoint the zoom.
- The field (motes) + skins stay dormant behind the toggle for Sam's
  intermittent dark-mode exploration; nothing ships moving at zoom 1.

**18.9 TWO LEVELS, NOT THREE (July 12, closing — Sam's call, endorsed).**
Zoom 2 is CUT. Its only imagined job (mid-density context) is served
better by the timeline rail (temporal orientation), sibling bubbles
(lateral browse), and the Table itself (structure, grandkids and beyond).
What it would actually render — cards shrunk halfway — is the
neither-gallery-nor-map mush the §18.8 figure-ground verdict already
rejected. The model becomes a NAMED BINARY:

- **THE CARD** (reading view — today's zoom 1, the gallery, untouched);
- **THE TABLE** (map view — fixed tiles at true t-coords on crafted
  parchment, the §18.8 zoom-3 dream, dock-to-line code as foundation).
- Pinch/control is a THRESHOLD TOGGLE, not detents. One transition to
  perfect instead of two — and that transition is THE HERO MOMENT: the
  featured card shrinks and lands on its own seat among the tiles (the
  baseball-card physics performed once, full-screen, onto the register).
  Design it as such; it is the product's signature gesture.
- Architecture stays data-driven (a level = camera scale + density rules)
  so a middle view could be added someday cheaply — cut from the roadmap,
  not forbidden in code.

**18.10 REAL DOCUMENTS ARE FOREGROUND, NEVER WALLPAPER (July 12, closing).**
Actual archival documents (the Tunxis deed confirmation, John Hooker's 1738
Indian Neck statement, the Wawowos deed, Sue Suah's document) are EVIDENCE:
they appear as media on the relevant person cards, in NBs, or as captioned
landing/About artifacts — never faded behind the UI as texture. Text behind
text is the maximal figure-ground violation (§18.8), and dissolving a land
deed into decor would trivialize precisely the records the project handles
with tier-honest care. Ground textures use BLANK period paper only.
Caption doctrine for the Tunxis materials: the Tunxis engaged colonial law
actively and expertly for over a century (petitions, litigation, the
Mossuck claims, later Brothertown); John Hooker's 1738 statement affirmed a
claim the Tunxis were pressing — frame as affirmation of Tunxis title,
never as benevolence toward people who "didn't understand ownership."

**18.11 THE ARRIVAL CLASS + THE PASSAGE LAYER (July 12, final session
entries — CC navigation solved; the flyover arrives in its legal form).**

- **The arrival class** (built, probe-guarded): all NON-CHIP navigations
  (CC now; search modal, timeline anchors, shuffle later — reuse verbatim)
  use directional arrival, never growFrom-from-a-text-rect. The old card
  departs WHOLE opposite the travel vector (no chip-face — you are leaving
  the neighborhood, not staying in it); the new card enters from the
  vector's edge, settling with overshoot ALONG its entry direction.
  Root cause it fixed: the CC "flash" was structural and ancient — the
  demote never found a destination box on the target page, so the old card
  never left (exposed, as ever, by honest speeds).
- **Angle semantics = DIRECT vs COLLATERAL** (Sam's decision, forced by
  data): tidy-tree Δx is anti-correlated with kin-intent (a granddaughter
  can sit 829 seats from her grandmother's centroid; an uncle 51). So
  relation_class is derived at BUILD TIME by parent-chain walk and stamped
  on each CC: direct line → vertical flight (0-8°), collateral →
  compressed-Δx diagonal capped ~45° (the uncle-at-45° reference case,
  preserved exactly). Never derived from label text.
- **GATHER → FLY → UNFURL:** before a CC flight, old parents fold DOWN
  into the card and children fold UP into it (fully hidden before motion;
  the beat of stillness is the card collecting itself); the lone card
  flies; on landing the new family emanates outward — the inverse gesture.
  Chip navigation's approved reveals untouched.
- **THE PASSAGE LAYER — distance made felt** (the §4 flyover in its
  §18.8-compliant form: TRANSIENT, flight-only, never at rest): every
  arrival ends one viewport away, so distance must be synthesized. Far
  flights earn a mid-beat (scaled to true table distance, 0ms for near
  hops, up to ~400-500ms; total cap ~1300ms) in which faint decade markers
  sweep past opposite the travel direction — scenery from a train window,
  gone at landing. Decades first (data-free, from the year span);
  surname/branch corridor labels LOGGED for after an index-loading
  strategy exists. The future timeline-rail thumb glides the same decades
  in sync — instrument and scenery agreeing is when 16,000 people becomes
  something a visitor FEELS.

---

## 19. THE CC-FLIGHT RETHINK — SCALE, NOT ANGLE; AND THE ZOOM-2-FIRST PIVOT

_(July 13, 2026. Supersedes the angle-centric framing of the CC arrival work in
§18.11 for the FELT-DISTANCE problem specifically. The §18.11 arrival-class
mechanics — hard-cut departure, directional entry, gather/unfurl — stand; what
changes is the diagnosis of why short CC flights feel cheap and the architecture
that fixes it. Recorded after a long working session in the architect stream;
Code executed the Zoom-1 corrections and began standalone Zoom 2.)_

### 19.1 The diagnosis — the "adjacent desktop" problem

Sam's verdict on the CC flights as built: they read like macOS "switch to the
next desktop" — a constant-altitude pan one viewport over, revealing a cousin
who is supposedly five generations and a whole branch away sitting _coincidentally
right there_. It cheapens the project: it exposes the structure in a bad way
("behind-the-scenes of a show, more amateur than you thought"), and no pan angle
rescues it. A flat lateral move, an 87° near-vertical, a 45° diagonal — all feel
like the same parallel-plane slide, because the thing missing is not direction.

**The mechanical truth: the destination card always re-centers, so the literal
pan is ALWAYS exactly one viewport, for every CC, by design** (already stated in
§18.11 — "every arrival ends one viewport away, so distance must be
synthesized"). All sense of travel must come from synthesized air-time and
scenery, never from the pan magnitude. The passage layer (§18.11) was that
synthesis, but it keyed on YEAR-SPAN and fired only past ~60 years — so same-era
CCs (attorney↔client, both born 1874: the Debevoise↔Rockefeller reference case)
got nothing: short pan, no decades, dead flat. **Year-span is the wrong metric.**
Two people the same age can sit on entirely different branches — an enormous
GRAPH distance. The felt distance of a CC is how far apart they are in the family
STRUCTURE, not in time. That is what "wormhole to someone a century away" always
meant.

**The missing ingredient is SCALE (altitude), not angle.** A pan at any angle
moves sideways at constant altitude — the parallel-plane feeling. What reads as
"flew to a distant part of the tree" is _rising up, seeing the landscape, and
coming back down somewhere far._ Altitude change is the entire difference between
"adjacent desktop" and "crossed the family." Everything prior had been
rearranging the sideways move.

### 19.2 The gesture — up → over → down, through the real Zoom 2 table

_(Sam's formulation, endorsed. This is the durable design for the far CC flight.)_

A far CC is a three-phase camera path over ONE shared clock, gondola-locked
(no clicks / user actions) across ALL THREE phases:

1. **RISE** — the Zoom 1 featured card scales out to the Zoom 2 resting scale.
   The revealed view is the true tile table, looked down upon.
2. **TRAVERSE** — at Zoom 2 altitude, the camera pans from the origin seat to
   the destination seat over the REAL tile field. Quick even at altitude; the
   altitude supplies the felt distance, not a long dwell.
3. **DESCEND** — scale back into Zoom 1 on the destination card, landing on its
   seat.

The revealed territory during TRAVERSE **must be the true Zoom 2 tile table** —
real people at real `table-index.json` seats — never arc-only placeholder
scenery. Text-behind-emptiness or a bespoke "flyover world" that Zoom 2 will not
later confirm reads as a lie the moment Zoom 2 ships (data-quality-is-geography
applies to the flyover exactly as it applies to the map). The rise reveals a
PLACE WITH STRUCTURE or it should not rise at all.

### 19.3 The unification — one scale mechanism, three features

The rethink collapses three things previously treated as separate into a single
mechanism:

- **The CC altitude arc** (§19.2).
- **The Card↔Table hero gesture** (§18.9 — the featured card shrinks and lands
  on its seat among the tiles). This is the arc's RISE/DESCEND taken all the way
  to the Zoom 2 resting scale, performed by the user rather than automatically.
- **Zoom 2 itself** — the resting tile table the arc flies over and the hero
  gesture lands in.

So the arc is simply **Zoom 2 entered and exited automatically, with a pan in
the middle.** One scale channel on the camera store serves the manual zoom, the
hero transition, and the CC arc. This is the deepest version of "build the
linchpin once": scale-on-one-clock is the linchpin, and it was already partially
built (the Slice 2a camera scale channel — see the coding roadmap).

**The §18.8 static-ground verdict is NOT violated.** That verdict prohibits
AMBIENT motion AT REST at zoom 1. The arc is a TRANSIENT transition — static card
at both ends, motion only in the air, gone at landing. It is the flight, not the
wallpaper.

### 19.4 The felt-distance trigger — graph distance, not year-span

The arc fires on GRAPH distance (branches crossed / LCA depth), never on
year-span. Per the build-time doctrine (§2), this is baked onto each CC in
`regenerate-data.js` — an LCA-depth / relation-distance value stamped on the CC
object, not walked at runtime. This same value later serves any Zoom 2
"how far apart are these two" affordance and the connect-to-anyone modal, so it
is shared infrastructure, not arc-only scaffolding.

- Direct-line dives (the granddaughter case, ~6° vertical) and short collateral
  hops (the uncle case, real generation gap) keep the clean, modest Zoom 1
  flight — they do not need altitude.
- Far collateral CCs (Debevoise↔Rockefeller: same era, branches apart) earn the
  arc.
- Interim trigger until the LCA-depth bake lands: `relation_class == collateral`
  above a seats/threshold. Re-key onto true LCA depth when baked.

### 19.5 THE SEQUENCING PIVOT — build Zoom 2 fully first

_(Sam's call, July 13. This is the load-bearing decision of the session.)_

**Build Zoom 2 completely, as its own standalone hand-panned view, BEFORE
implementing the CC arc. Re-attach the arc as a camera path over the finished
Zoom 2 later, when Sam is comfortable.** The reasoning is dependency order, not
just calm:

- The arc is a camera path OVER Zoom 2. You cannot tune a flight over terrain
  that does not exist. Every "does the reveal feel like a real place" judgment
  was really a judgment about Zoom 2 smuggled into a flight test.
- Building Zoom 2 as its own object — judged on its own terms ("is this a good
  tile table") — removes the compound uncertainty of tuning a flight + a world +
  a gesture all entangled. One hard thing at a time.
- The HARD parts of Zoom 2 are the interaction parts (pan/inertia, pinch,
  culling, image policy). The arc needs NONE of them — only "draw inert tiles at
  true seats + move the camera over them on rails." So building Zoom 2 does not
  require solving the arc first; it builds the foundation that makes the arc
  trivial later.

**Consequence, stated so it is a deliberate choice and not a regression:** Zoom 1
CC flights STAY QUIET — a modest, honest directional pan, no grandeur — for
however long Zoom 2 takes. This is not "the feature is broken"; it is "the
feature is deliberately quiet until its other half exists." The claustrophobia is
reframed from a bug into a known, temporary, half-built state.

### 19.6 The standalone Zoom 2 view — what and why

Zoom 2 (a.k.a. THE TABLE, per §18.9's named binary) is the overhead tile view:
every person a same-size tile (≈ chip scale), seated at true table coordinates,
which the user pans over like tiles on a table. Zoom 1 (THE CARD) remains the
default and the richer, reading-focused view; Zoom 2 is the map.

- **Single seat per person for v1.** All 16,411 IDs are unique (confirmed at
  build); the role-priority dedupe (§2) means no double-descent second-seats in
  v1. Cousin-married-cousin double-seating (a tile in both lines — the Florence
  TD0055 honesty) is a LATER data-stream enhancement (alternate-branch ghost-seat
  emit), never a v1 renderer concern. Ship one-seat-per-person first.
- **Regions must read as distinct LINES at rest.** Region derives cleanly from
  flags: `hd` → Hooker spine; `td && !hd` → Talcott grove; else → orbit/gutter.
  A minimal line-tint (enough to distinguish spine / grove / orbit at a glance)
  should land with the first build even ahead of Phase 2's full role palette —
  without some line distinction the reveal is an undifferentiated name-field, the
  very claustrophobia the arc exists to escape. The whole point of rising is to
  SEE that you left your branch and crossed to another.
- **The bar (Sam's, explicit):** "recognizable as a family tree, even something
  like Ancestry-basic, I'll be OK." Busy is acceptable — even desirable in the
  arc's fast flyover, where density reads as scale. Busy-but-recognizable is the
  target, not clean-and-sparse.
- **Arc-readiness built into Zoom 2's bones (so the arc stays cheap later):**
  (a) the tile renderer and coordinate→screen mapping is a MODULE DRIVEN BY THE
  CAMERA STORE, never native scroll or its own private pan state — the arc later
  just publishes camera moves to that same store; (b) SCALE is a CONTINUOUS
  INPUT, not a hardcoded Zoom-2 constant — the arc's rise/descend sweeps through
  intermediate scales, so the renderer must accept any scale; (c) the Card↔Table
  transition is the CLEAN SEAM — build the manual hero transition as part of
  Zoom 2, and the arc becomes a thin wrapper on it.

### 19.7 TECH-STACK VERDICT — plain Svelte + CSS transforms; NO Threlte/3D

_(July 13. Answers Sam's "is this doable with standard tools, or do I need
Threlte / a flyover flight-sim library?")_

**All of Zoom 2 and the arc are doable with the existing stack. Do NOT install
Threlte, three.js, or any 3D / flight-sim library for this.** It is not settling;
a 3D library solves problems this project does not have and cannot help with the
ones it does.

- **Everything here is 2D.** The table is a flat plane of tiles at (x, y) seats.
  "Altitude" is a metaphor for SCALE — rise is `scale()` 1 → ~0.4, pan is
  `translate()`, descend is scale returning. Three CSS transform properties on a
  couple of containers, interpolated over the existing TICK clock. No third
  dimension, no camera frustum, no perspective, no meshes, no lighting. The
  flight-sim feeling is an ILLUSION produced by 2D parallax + scale change —
  exactly what §3's `worldPx` / `layerShift = −Δ · depth[k]` math already
  commits to.
- **Threlte would actively hurt.** §5 already mandates DOM-with-culling, not
  canvas, for the table; §8/Phase 8 already ruled Threlte out for the card. A
  WebGL tile is a texture in a canvas: it has no rect (breaks the
  `captureFlightOrigin` grow-from-chip machinery every flight uses), no `<a
href>` (breaks the SEO phase's cold-path link requirement), no hover, no a11y,
  no shared styling. You would be inventing a WebGL↔DOM bridge for the
  chip-click-to-featured path — a self-made nightmare — to gain nothing.
- **The performance recipe (standard, already proven by the card flights):**
  transform/opacity only (never animate layout props — no top/left/width);
  ONE transform on the container, not per-tile transforms per frame;
  `will-change: transform` on the moving layer; viewport culling via spatial
  buckets so the live DOM node count stays in the HUNDREDS, never 16k. GPU
  compositing a few hundred absolutely-positioned divs under one transformed
  parent is precisely what browser compositors are built for.
- **Where the real difficulty lives** (none of it library-shaped): the
  culling/bucketing logic (array math over coordinates), the pan/inertia gesture
  (Pointer Events + velocity sample + decay — §5 specs it), and interpolation
  feel. A 3D library gives a scene graph + camera you don't need and NOTHING for
  culling, inertia, or DOM-tile interaction.
- **The honest exception, parked:** a genuinely 3D showcase — a rotatable
  family "galaxy" in real depth — would be Threlte territory, but as a SEPARATE
  marketing/delight page, never the substrate of the working product (§8 already
  parks this). For the Card, the Table, and the arc between them, plain
  transforms do it better for this project's needs.

Standing stack, unchanged: Svelte 5 runes for state; CSS transforms for all
motion; Pointer Events for gestures; the camera store + TICK clock as the one
animation authority; D3 only for build-time tidy-tree coordinate COMPUTATION
(already the case). The only NEW code is the tile renderer module and the culling
logic — plain TypeScript over data 3a already generates.

---

## 20. THE DEMOTE SETTLE + SIBLING EXPANSION

_(July 16, 2026. §20.1 records doctrine EARNED ON PIXELS during the demote-settle
build — it generalizes beyond that feature and should be read as standing law.
§20.2–20.4 supersede parts of §7 (Sibling Bubbles) where they conflict; §7's
core instincts — the group-transform nudge, chips carrying flight-ids, panel
reset on nav — all survive and are reaffirmed.)_

### 20.1 Settle doctrine — what the pixels taught

The demote settle (featured card + spouse chip overshoot their seats and spring
back on demotion) shipped. Four principles were earned the hard way and now
govern all motion work:

1. **PER-SEAT DISCRETENESS.** Parent-seat and child-seat demotions are DIFFERENT
   SITUATIONS — different travel (276px vs 851px), different scale delta,
   different landing context — and must not share dials, clocks, or amplitudes.
   Final values: card→parent **1.84px** (pinned at the floor), spouse→parent
   **3.61px**, card→child **~5px** (`DEMOTE_SETTLE_CHILD_FACTOR` 1.6). One
   shared number cannot serve them; independent dials are the design, not a
   workaround.
2. **PERCEPTION TRACKS THE MOVING OBJECT'S SALIENCE, NOT ITS DESTINATION
   FOOTPRINT.** The original "amplitude proportional to destination size" model
   is WRONG and was falsified twice: the spouse overshoots MORE in absolute px
   (3.61) than the card (1.84) yet reads fainter; the child seat needs ~5px to
   read what the parent achieves at 1.84px, because its 851px travel + dramatic
   shrink swamp a small flourish. Big, fast, far-travelling objects need a
   BIGGER flourish to register, not the same one.
3. **THE SETTLE IS STRICTLY INTRA-ELEMENT.** Only an element that actually flew
   (promoted or demoted) may move. A settle NEVER displaces a neighbour, a row,
   or any stationary chip. **"Jello screen" — nearby elements wobbling along —
   is the failure state.** Sam's framing, recorded because it is the governing
   philosophy: the child chips are not "pushed" by the Featured Card; they are
   _independent discrete baseball cards_ that slide to their own final positions,
   not knowing the card is going to overshoot. They position themselves _around_
   a parent; they are not subsets of it. Now machine-guarded by
   `probe-neighbor-stability.mjs`.
4. **TRANSFORM vs LAYOUT is the whole mechanism** — and it is why (3) is
   enforceable. A CSS transform cannot reflow, therefore cannot push a sibling.
   Anything that displaces a neighbour is a LAYOUT property animating, always.
   Corollary, proven on the Burr row: when a stationary element appears to
   overshoot, decompose `rect.top = layout(t) + transform(t)` — the bounce is
   usually two MONOTONE curves on MISMATCHED CLOCKS summing to a false
   overshoot, not any element actually springing.

**The diagnostic lesson (process, not pixels).** Twice a "bad-looking motion"
verdict was contaminated by a bug elsewhere, and twice the instinct to _tune the
thing that looked wrong_ would have been wrong: the child settle read as
"theatrical swooping" only because it was landing on a row still sliding beneath
it. **Fix the ground, then re-judge.** A verdict rendered under contaminated
conditions is not a verdict. Corollary that nearly cost the feature: mitigating a
bug by deforming the innocent party (gating the children's reveal, then
stretching their clock to 540ms) is a band-aid Sam will correctly reject — the
fix belongs on the guilty mechanism (here: the featured-slot height glide, whose
540ms was the outlier against every other 300ms clock).

**The root-cause finding, recorded because it is load-bearing:** the
`.featured-slot` `transition: height` is an ANTI-SNAP SMOOTHER (it prevents the
children row jumping when `cardHeight` changes between focuses). It sits BETWEEN
the parent row (above) and children row (below), and height grows DOWNWARD — so
the parent row never rides it (which is why the parent path was clean all along)
and the children row always does. It ran 540ms against everyone else's 300ms;
matching it to 300ms collapsed `rect.top` to a single monotone curve and removed
a ~23px pre-existing row wobble that predated the settle work entirely. Removing
the glide outright was rejected: `cardHeight` updates reactively after render, so
with no transition the slot jumps in one frame — reintroducing the exact snap the
glide exists to prevent.

**Reduced motion:** instant dock, no settle, everywhere.

### 20.2 Sibling expansion — the confirmed UX

_(Sam's direction, July 16. Extends §7; where they conflict, this governs.)_

- **The resting layout is unchanged.** No reserved space, no reflow. A person
  with siblings looks exactly like one without, except for the trigger.
- **The trigger:** a bubble sitting **to the RIGHT of the spouse chip**, at
  **~75% of a spouse chip's size**. Renders only when siblings exist
  (`siblings_count > 0` — null beats weak applies to affordances too).
- **Sibling chips are ~20% smaller** than spouse and child chips. Their own
  size tier.
- **THE NUDGE LIVES** (§7 reaffirmed, and Sam's framing sharpens it): on open,
  the card GROUP translates left — a **transform, never a layout change**. Sam's
  words: _"a family thing — like taking a step to the left to let the siblings
  in… a soap bubble push, occupying and sharing the same space gracefully."_ It
  **yields**, it does not **relocate**. RightColumn and the CC footer do not
  move. Per §20.1(4) this is also why the nudge cannot disturb anything —
  transforms don't reflow — and `probe-neighbor-stability` guards it for free.
- **The panel slides out and DOWN vertically** from the trigger, chips
  emanating from where the trigger sits (consistent with discrete card travel:
  everyone comes from somewhere).
- **NO STAGGER.** §7's ~50 ms staggered bubble entrance is **RETIRED** on the
  evidence of July 13/16: sequenced or slowed chip arrivals were rejected three
  separate times (the gather beat; the Option-A reveal gate; the Option-B 540ms
  crawl). Chips arrive TOGETHER at the established ~300ms clip, matching the
  parent/children entrance Sam approved. Stagger may be revisited only if
  simultaneous proves flat on pixels.
- **NO settle/overshoot on the reveal.** §7's "tiny y-settle" is cut. The panel
  opening is not a flight.
- **The window is DERIVED FROM CARD HEIGHT** — "the list only extends as far as
  the bottom of the Featured Card." A short card shows fewer chips, a tall card
  more; overflow is impossible by construction. (Chosen over a hardcoded count:
  same principle as deriving the glide duration from `getComputedStyle` rather
  than hardcoding 540 — derive, don't assume.)
- **Overflow → a VERTICAL CAROUSEL** with a down-arrow caret, "similar or
  identical to the multispouse carousel." **Architectural note:** neither
  carousel is built yet (both Phase 7/7.5), so build **ONE orientation-agnostic
  component** used twice — horizontal window-of-3 over spouses, vertical
  height-derived window over siblings. Same paging, keyed+flip, overhang cue,
  arrow-at-offset, gondola guard. Build-the-linchpin-once, at zero extra cost
  because both are greenfield. No refactor of a working thing.
- **Panel state resets on navigation** (§7 reaffirmed; the list is never visible
  by default).

### 20.3 The no-reciprocal catch — sibling nav is a HYBRID

_(Sam's observation, and it has a consequence bigger than it first appears.)_

Sam: _"there's no reciprocal — the Featured Card doesn't need to move into the
sibling list because the sibling list is not visible by default."_ Correct, and
the consequence is: **the departing card has NO DESTINATION BOX on the target
page.** Navigate Anson → sibling Fred, and Anson is not Fred's parent, child, or
spouse; he is Fred's sibling, and Fred's sibling panel is closed. Anson has
nowhere to dock.

**That is precisely the July-12 CC-flash condition** (root cause: a demote that
never found a destination box, so the old card never left). Therefore:

- **Promotion behaves like a CHIP NAV:** grow from the sibling bubble's captured
  rect into featured, with the promotion settle.
- **Departure MUST follow the CC PATH:** the old card leaves **whole**, opposite
  the vector, **no chip-face, no settle**. Not because a sibling nav is a CC
  (siblings are explicitly EXCLUDED from CCs in the data model — exclusions are
  ONLY parent, child, spouse, sibling), but because it shares the
  no-destination-box condition. Same mechanism, different trigger.
- **The vector falls out honestly and is LATERAL.** Siblings sit at ADJACENT
  SEATS IN THE SAME GENERATION, so true Δy ≈ 0 — a horizontal flight. This is
  the July-13 true-vector doctrine paying off (same-era Debevoise↔Rockefeller
  pans flat; no cap may manufacture a fake vertical). The sibling enters from
  the right (where the bubble lives); the old card departs left. Reciprocal by
  construction, no new machinery.

### 20.4 Sibling tiers — full / half / step

- **Tiers:** `full` (shares BOTH parents) · `half` (shares ONE parent —
  blood-related) · `step` (shares NO biological parent; related only via a
  parent's marriage). The distinction is biological, and both half and step are
  genuine family history worth showing.
- **Ordering (the two rules NEST, they do not conflict):** **died_young sorts to
  the END WITHIN EACH TIER.** So: full (by birth) → full died-young → _Half-
  siblings_ header → half (by birth) → half died-young → _Step-siblings_ header
  (only if non-empty) → step. Headers are list items in the flat sequence, so a
  carousel window slides over them with no special casing.
- **Half and step tiers render only when non-empty** (null beats weak).
- **Measured reality, project-wide** — the earlier prediction that step-siblings
  would be "vacuous" was WRONG and the data disproved it: **1,216 people have
  half-siblings** (common) and **93 people have a non-empty step tier** (T01046
  has 12; several have 8). The step tier earns its place.

### 20.5 THE NUDGE — TABLED (and why)

_(July 16, later the same day. SUPERSEDES §7's group-transform nudge and
§20.2's "THE NUDGE LIVES". Recorded in full because a tabled feature with no
recorded reasoning gets re-proposed in six months.)_

**The nudge is deleted.** Not flagged, not parked behind a constant — removed.
It was built, it worked (15px translate at −20% speed, transform on the card
group, `probe-neighbor-stability` green), Sam saw it on pixels, and killed it.

**Sam's reasoning, verbatim in substance:** it is a _nice-to-have_ at this
point; he can see it causing issues with other animation; the payoff is "a tiny
subtle wink," and that is **not worth the extra work or the fallout**. Residual
transition issues without a big payoff.

**Why this is the right call and not a loss of nerve.** The nudge was a second
moving thing with its own clock, living on the card group, that had to release
at exactly the right moment relative to a flight it did not own. It was
introducing a **two-clock desync surface** (the standing failure mode — see
§20.1, §18.x) into the sibling promotion path in exchange for a sub-perceptual
flourish. The day's own doctrine applies to itself here: _perception tracks the
moving object's salience_ (§20.1.2) — a 15px translate on a large stationary
card is near the perception floor, exactly the "spouse chip at 3.61px reads
fainter than the card at 1.84px" lesson in another costume. It was paying a
coordination cost in a category of coordination that has burned this project
repeatedly, for a gesture most users would never consciously register.

**The immediate payoff of deleting it:** the **un-nudge question is MOOT.** The
card was nudged LEFT while the panel was open, so it had to return RIGHT on
navigation regardless — meaning the sibling promotion flight would have had to
own, or sync against, a nudge-release. With no nudge there is nothing to
release, no timing decision, and **one less clock** in the flight path. Slice 3
got simpler and less likely to produce exactly the residual issues Sam
predicted.

**What dies with it:** §7's "the nudge is a transform on the card GROUP, never a
layout change" and its "it yields, it doesn't relocate" framing; §20.2's
soap-bubble push ("a family thing — like taking a step to the left to let the
siblings in… occupying and sharing the same space gracefully"). The _reasoning_
in those passages remains correct and is preserved for reference — a
transform-not-layout nudge IS how you would build one. The judgment is simply
that this project should not build one.

**The general principle it establishes (this is the durable part):** a
transition that (a) requires coordination with another transition's clock, and
(b) delivers a sub-perceptual or "wink"-sized payoff, is **NOT worth its
fallout** — the coordination surface is the cost, not the pixels. Weigh new
motion against the clock it forces someone else to keep, not against how nice it
looks in isolation. **Null beats weak applies to motion, not just content.**

**If it is ever revisited:** the preconditions are that the sibling promotion
flight is settled and stable on pixels, and that the nudge can be proven to ride
the flight's existing clock rather than introduce its own. Absent both, the
answer stays no.

---

## 21. SIBLING EXPANSION AS BUILT — AND THE NOTCH-CUTOUT DOCTRINE

_(July 17, 2026, in the small hours. §21.1 SUPERSEDES §20.2 wherever they
differ — §20.2 was the design; this is what survived contact with pixels. §21.2
is the durable one: a single unstated fact about the card's geometry that caused
three separate ghost bugs. §21.3 is the session's epistemic lesson.)_

### 21.1 The sibling panel, as it actually shipped

Every item below was set on Sam's rendered-pixel verdict, most of them reversing
a specced value. Where this contradicts §7 or §20.2, **this governs.**

**The trigger.** NOT a pill or a bubble (§20.2's "trigger bubble"). **Plain
text: gray, ALL CAPS, dashed underline** to signal clickability. Sam: "the button
takes away from the other elements" — it must read peripheral. Label is
`SIBLINGS (N)` where **N = full + half + step**, computed from the RENDERED
TIERS, deliberately NOT from `siblings_count` (which excludes step, so for the
93 step-tier people the two disagree — a button whose number lies about its own
list is the "16,411" problem in miniature). Gate: `siblings_count > 0 &&
(focus.hd || focus.td) && !focus.ee` — no trigger for easter eggs, married-in
spouses, or anyone outside the Hooker/Talcott lines. It sits **right of the
spouse chip's last affordance** (after the chips at ≤3 spouses; after the paging
caret at 4+) — a FLOW position, not a fixed one, which is what makes one rule
serve both cohorts. Its underline aligns to the spouse chip's bottom edge
(t≈325). It **fades in a beat after the spouse chip lands** and is hidden
mid-flight (see §21.3 — its first implementation caused the session's first
regression).

**The anchor.** The chip column's top = **the card-edge resume beneath the notch
carve** (t≈340 normal, 328 compact) — NOT the spouse chip's bottom (325/315).
These are different lines: the notch has clearance around the docked chip. The
15px distinction was worth two passes to get right, and it is now the line the
retraction's endpoint also honors (§21.2).

**The chips.** ~**119×54** (width −25% from the first cut; height held).
**First names only** — Sam: "from the POV of the Featured Card, he just knows
them as Abigail." This required a DATA field (`fn` = `bio.first_name` on every
compact), NOT a string split — splitting `sn` breaks on titles ("Rev. Thomas
Hooker" → "Rev."). Long first names clamp 11px→8px via the FeaturedCard's
existing `shrinkToFit` machinery (reused, not re-rolled). Died-young gets a
**third line** ("died young", 9px) below `by–dy` — siblings only; child chips
keep their inline form.

**The reveal — a per-chip cascade.** The first implementation put the transition
on the CONTAINER, which animates ONE BOX with the chips as cargo: that is
literally "all six grow from a single sliver." **The transition must live INSIDE
the `{#each}`.** Each chip flies from `y: -PITCH` (PITCH = 54 + 16 = **70px** —
exactly where its predecessor sits, so "each drops from the one above" is
literal, uniform, and needs no special-casing), delay `i × 38ms`, duration
150ms, easing = the demote settle's own `easeOutBack` via `solveBackS` for a
**2.5px micro-overshoot** (small object, short trip — the inverse of the child
seat's 851px needing ~5px; see §20.1.2).

**THE STAGGER REVERSAL.** §20.2 says NO STAGGER, earned when chips arrived
_alongside a card flight_ (the gather beat, the reveal gate, the 540ms crawl) —
supporting cast slowed while the main event competed. **This is a standalone
reveal with nothing competing, and per Gestalt COMMON FATE, objects moving in
lockstep are perceived as ONE GROUP no matter how well each is animated.**
Breaking lockstep is therefore what makes them read as discrete baseball cards —
the doctrine's own goal. The reversal is **scoped to this reveal only**; the
no-stagger rule stands everywhere else. Recorded because a bare "we staggered it
after all" would look like drift.

**The close — container-collapse, 80/20.** A per-chip `|global` outro is exactly
what stranded the card (§21.3), so the close CANNOT be a reverse cascade. It is
ONE element folding: `max-height → 0` over 170ms (cubicIn), with **opacity held
at 1 until the final ~20%** then dropped. The first version animated opacity
across the whole 170ms and read as 60% fade / 40% roll-up — because opacity
affects EVERY PIXEL AT ONCE and dominates perception, while max-height only moves
a boundary. Delaying the fade inverted the ratio. **Bonus discovered by the
fix:** a max-height collapse clips **bottom-up**, so chip 7 goes first and chip 1
last — LIFO, the natural reverse of the top-down entrance. The reverse-cascade
feel was already there; the fade was masking it. `FADE_TAIL = 0.2` is the dial.
On NAVIGATION the panel vanishes **instantly** — the close animation is for the
user's click only, never for teardown.

**The window — FIXED HEIGHT, not a chip count.** Final model: the window is a
fixed **404px (6×54 + 5×16, derived)** and **headers CONSUME SLOTS** (6 chips
with none, 5 with one, 4 with two). "6" is a consequence of the height, not a
law. **Never render a partial chip** — an item appears only if its whole box
fits; leftover space stays empty. This replaced two earlier models that both
failed: a fixed 474px window budgeted for chips only (headers pushed the 7th chip
out → sliced in half), and a dynamic height that grew with headers (fixed the
slicing but made the **caret bob ±44px**, which sabotaged the acceleration —
a moving target during rapid clicking means the user fat-fingers a chip). The
fixed window fixes both and eliminates the child-row overlap entirely (panel now
ends ~45px ABOVE the card bottom, vs a ~6px overlap before).

**The carousel — acceleration, deliberately diverging from spouses.** The spouse
carousel keeps its `pagingLock`; **siblings do not.** Sam's reason: 3–5 spouses
means you're never more than a click or two from your target, but 15 siblings
means a lock is fifteen sequential waits. Implemented as an **accumulating
target**: every click moves the offset immediately (never dropped, never
ignored), the strip glides toward it, rapid clicks re-aim it further so it
chases — acceleration without judder or interruption. **The GONDOLA GUARD
STAYS** (paging inert during a card flight); only the paging-to-paging lock is
removed. Carets: the shared `<Caret>` component (same as the spouse notch), glyph
centering scoped via measured ink bias (⌃ sits 2.79px high, ⌄ 4.92px low —
measured with canvas TextMetrics, not eyeballed, which is why it was scopable
with the spouse carets byte-identical), `cursor: pointer`, and an `:active`
depress (sinks 1px, shadow flattens).

**The flight (Slice 3) — a HYBRID, as §20.3 predicted.**

- **ARRIVAL:** grows from the sibling chip's captured rect, WITH the promotion
  settle. Standard chip-nav machinery.
- **Velocity — clocked off CENTER travel, not corner travel.** `growFrom` clocks
  flights off the top-left corner's path; a card unfolding from a 119×54 chip has
  ~960px of corner travel but only ~588px of center travel, so at the 1.6
  corner-velocity ceiling its center crawled at 1.01 px/ms and it "floated over."
  The center is the honest translation the eye tracks. `SIBLING_V_CEIL = 1.2`
  (~490ms) — the midpoint between the 1.01 float and a 1.42 that was far too
  fast. The 1.6 relative ceiling is untouched; parent (1.03) and child (1.33) are
  byte-identical. **The mass limit is preserved because heft IS the constant
  px/ms ceiling** — snappier came from fixing what was measured, not from
  raising the ceiling.
- **DEPARTURE — the spouse-swap RETRACTION, not the CC path.** §20.3 specced the
  CC path (whole card, opposite vector) because the old focus has no destination
  box on the sibling's page. Built that way, it was **inconsistent** — "sometimes
  shoots off screen left, sometimes off screen bottom right" — because the CC
  path travels opposite the arrival vector and sibling seats differ slightly per
  pair. **Sam's fix: exit exactly as when a spouse chip is promoted — retract
  into the corner, size down.** This is better for a reason beyond appearance:
  **the retraction has a FIXED destination, so it needs no vector, no capture,
  and has zero per-pair variance** (verified: two different siblings retract to
  an identical rect, Δ=0 on every axis). And it is honest to the model — a whole
  card fly-off is the CC gesture for crossing to a distant branch; a sibling is
  beside you, in your own neighborhood, which IS the spouse-swap situation. The
  lateral-vector work is retained on the ARRIVAL only.

### 21.2 THE NOTCH-CUTOUT DOCTRINE

_(The durable finding of the session. One unstated fact caused three separate
bugs — D, E, and F in the ghost taxonomy.)_

**THE FEATURED CARD IS NOT A SOLID RECTANGLE.** The spouse notch is a CUTOUT in
its top-right corner. Therefore:

1. **"Behind the card" is NOT a reliable hiding place.** A `z:-1` element is
   occluded by the card body and NOT occluded wherever the cutout is.
2. **`.flat` and the resting card occlude DIFFERENTLY.** During flight the
   incoming card is `.flat` — solid, no cutout, occludes everything behind it. At
   landing the cutout reforms, and anything parked behind the card at the notch
   **shows through.**
3. **Any z-based occlusion must account for both states and for the transition
   between them.** The dangerous window is the frame the cutout reforms.

**The three bugs this one fact produced:**

- **D** — the sibling retraction rode at `z:1`; at `introend` the landed hero
  cleared to `z:auto(0)`, so `1 > 0` and the departing card **painted over the
  new card's content**. (Fixed: `z:-1`.)
- **E** — at `z:-1` the retraction was correctly hidden for its entire journey,
  then became visible for **2 frames (~17ms) at its destination**, because its
  endpoint sat in the corner where the reformed cutout left no card behind it.
  Fixed by **ending the retraction below the notch line** (`SIB_SEAT_TOP_INSET
= 100`) so it lands in the opaque card body. Note the pleasing consequence: its
  endpoint is now **the card-edge resume** — the same anchor line the sibling
  column and the caret already use (§21.1).
- **F** — the outgoing spouse chip is visible at op1 for ~50ms during fetch
  latency, showing through the OUTGOING card's own resting cutout. **Pre-existing
  and project-wide** (parent/child navs too). **LOGGED UNFIXED** — Sam cannot see
  it, the fix requires hiding the notch at nav-start (the exact "delay at the
  start of a nav" class he rejected three times in one day), it touches every
  navigation in the app, and it risks a visible empty notch which would read
  worse than the flash.

**The generalization:** when an element must hide behind another, verify the
occluder is actually opaque **at every phase and across every state transition**
of the flight — not just at the moment you happen to screenshot.

### 21.3 THE FALSE-GREEN TAXONOMY — six in one session, all the same shape

_(The epistemic lesson. Worth more than any individual fix.)_

Six times in one session a probe reported GREEN on a bug Sam could see in
seconds. **Every one measured a NEAR-MISS of the real invariant:**

| #   | The probe asked                          | The real invariant                      | Why it missed                                                                        |
| --- | ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | did the new spouse chip stay hidden?     | is ANY stale element visible?           | measured the incoming, never the outgoing                                            |
| 2   | did person X leave?                      | did person X leave IN THIS ROLE?        | X legitimately persisted as a parent chip while a stale SPOUSE-role render flickered |
| 3   | "0 orphans" (stress)                     | are there two renders of one person?    | counted a different thing entirely                                                   |
| 4   | pristine "clean — chips gone by t=415"   | was the same person doubled mid-flight? | the identity-only measure; the chip DID leave, while a second render existed         |
| 5   | is the spouse chip hidden during flight? | HOW does it arrive — fade or fly?       | nobody ever asserted the arrival MECHANISM                                           |
| 6   | `elementsFromPoint` — what's on top?     | numeric z + overlap                     | flight elements are `pointer-events:none`, so the DOM answered "nothing"             |

**The pattern: every probe checked whether the INCOMING element behaved, and
none checked that the OUTGOING one left.** A ghost is by definition an old
element that persisted, so the entire suite was **structurally blind to the
class**.

**What finally cracked it: COUNTING RENDERS PER PERSON PER RELATION, per frame.**
Four probes and hours of theorizing lost to a question nobody asked — "how many
of this person are on screen right now?" It answered in one run: two simultaneous
Frances Tracy renders, one correct (`morphIn` to the parent slot, op1), one ghost
(an unmount outro from the notch, op1→0 over ~185ms). **`data-relation="spouse"`
node count swelling 2→3 mid-flight and settling to 1** — the flicker, quantified.

**Standing rules earned:**

- **The identity unit is (id + `data-relation`), never id alone.** A person may
  change roles; a stale render in the OLD role must not survive.
- **Assert the mechanism, not just the state.** "Hidden during flight" is not the
  same claim as "arrives by fading."
- **`elementsFromPoint` is blind to `pointer-events:none`.** Ask for numeric z +
  geometry.
- **A probe that has never been seen to fail is decoration.** Prove RED first,
  always — the opacity guard was validated by deliberately injecting a raw-`t`
  leak, watching it fire, and reverting.
- **Sam's rendered-pixel verdict outranks any green probe.** It was right six
  times out of six against a suite that was wrong six times out of six.
- **Sam's RE-TESTS corrected two wrong hypotheses** (including the architect
  stream's): the "spouse chip flying in" was the retraction seen at the wrong
  z-layer, and the "overhang past the right border" was an illusion — the
  retraction's right edge measured **exactly `cardRight`, `rightVsCard = 0`, the
  entire time**. **When the person looking at the pixels says "wait, I re-tested
  and it's actually…" — believe them, and discard the theory.**
- **Never slow something down to hide a bug.** The velocity fix (582→414ms)
  UNMASKED the z-order bug by opening the gate 168ms earlier; slowing back down
  would have re-masked it INTERMITTENTLY — strictly worse than a consistent bug.
  Same shape as the child settle reading "swoopy" only because the glide was
  sliding beneath it: **fix the ground, then re-judge** (§20.1).

---

## 22. THE DECK PUSH — the Zoom-1-era CC transition (AS BUILT)

_(July 22 design → July 23 as built, probe-guarded, committed to main (Stream B).
Supersedes the flat directional pan as the SHIPPING CC transition for the Card
era. The §19 altitude arc remains the Table-era candidate, ON HOLD (§23) behind
`ARC_ENABLED=false` — the deck proved sufficient; the arc may never be needed,
and that is a fine outcome.)_

**What shipped vs. what was proposed.** The July-22 proposal was an archival
RIFFLE — a convoy of blurred ghost cards streaming past between the old card and
the new. In build, on pixels, a visible convoy read as "these people are right
next door" — it SHRINKS the tree instead of selling its scale (the whole reason
the CC animation was redone). So the shipping form is simpler and heavier: **two
solid cards trade places with weight, separated by an EMPTY stage.** The old card
leaves, the stage is briefly bare (that emptiness IS the distance across the
tree), the new card arrives. The full ghost convoy is preserved behind a
default-off toggle (§22.6) — the loser is parked, not deleted.

**22.1 The move: withdraw the spatial claim, keep the archival identity.** The
pan felt wrong (§19.1) because every destination sat exactly one viewport away,
forever ("adjacent desktops"). The deck makes NO spatial claim: clicking a CC
deals a different card from the archive. The Featured Cards ARE cards; the
project IS an archive; the transition is the archive dealing a new page.

**22.2 Direction = generation, resolved once per nav, by graph — never seat, never
year.** Decided in `deckDirFor`/`resolveLateralDir` (flight.ts) from a build-time
`gen_delta` baked per CC (regenerate-data.js). Seat-targeted direction was
explicitly REJECTED by Sam (the first lateral CC must be predictable, not a
function of where the target happens to sit).

- **VERTICAL** iff `gen_delta ≠ 0` AND same-line — where same-line =
  `relationClass === 'direct'` OR seat-near (`|Δseats| ≤ SEAT_NEAR`, 180). Older
  tier (`gen_delta < 0`) enters from the TOP, younger (`> 0`) from the BOTTOM; the
  old card exits the opposite edge.
- **LATERAL** otherwise (`gen_delta` null or 0, or a cross-branch peer that is
  seat-far).
- **Why `sameLine`, not gen alone:** two people on DIFFERENT branches can differ
  in generation without being up/down each other's line (the Jonathan-Edwards /
  "Pennoyer→Strong" case — collateral, seat-far, gen≠0 → correctly lateral).
  `SEAT_NEAR` is the interim proxy for the §19.4 LCA/kin-distance bake — replace it
  when that ships.

**22.2b CONFIRMED DEFECT (July 24) — the seat proxy fails close kin who sit far
apart.** `sameLine` conflates "same genealogical line" with "seated within 180
seats." A real up/down-the-line pair whose tidy-tree seats are far apart therefore
falls through to LATERAL even though `gen_delta ≠ 0` is baked correctly. Live repro:
**John Pierpont H00388 → his uncle-and-guardian James Pierpont II H00116** —
uncle/nephew, `gen_delta = −1` (James one tier up), `relationClass = collateral`,
seats >180 apart → renders HORIZONTAL; it should ride vertical (enter from the TOP).
The DATA is correct; the DIRECTION TEST is the bug. **The fix is the §19.4 bake, not
a wider `SEAT_NEAR`** (widening the seat threshold would wrongly verticalize far
cross-branch peers like Pennoyer→Strong). Bake a per-CC shared-common-ancestor
(LCA) depth / kin-distance in `regenerate-data.js`; in `deckDirFor`, define
`sameLine` as `relationClass === 'direct' OR kinDistance ≤ K` (small K — uncle,
grandaunt, first-cousin-once-removed all qualify), never on seat proximity. Then any
close kin with a generation gap rides vertical regardless of where they sit.
Deferred to a Stream-B session (touches flight.ts + the bake); roadmap §15.

**22.2a Effective generation — how in-laws get placed.** `gen_delta =
effGen(target) − effGen(source)`, where effGen is: the person's own
`generation_from_thomas`; else a married Hooker-line PARTNER's (a spouse rides the
line via marriage — a spouse of a grandparent is grandparent-tier); else, **for
EASTER EGGS only**, one generation ABOVE a CHILD-IN-LAW (a famous figure who joins
the tree solely through a child's marriage in — William Henry Vanderbilt, whose
son married gen-9 Alice, reads as gen 8, so the CC to his daughter-in-law goes
vertical); else null (orbit → lateral). Scoping the child-in-law rule to easter
eggs keeps ordinary orbit figures — and easter eggs with no such marriage, like
Rockefeller — correctly ungenerationed, so their CCs to other lines stay lateral.
The direction is telling the genealogical truth: a man who married the daughter is
a generation down; a father-in-law is a generation up. (Two illustrative cases —
Széchenyi-vs-Vanderbilt and William-Henry-vs-Rockefeller — are in the chat record;
the durable rule is the effGen ladder above.)

**22.2b Lateral ping-pong memory (one-deep, edge-exact) — direction is HISTORY,
not seat.**

- A FRESH lateral CC exits the old card LEFT / enters the new from the RIGHT — a
  fixed, predictable default.
- Clicking the RECIPROCAL link straight back (reversing the exact edge just
  traversed) FLIPS the last direction — so toggling A↔B ping-pongs (left, right,
  left, right).
- ANY other move — a fresh lateral CC to a NEW card, a vertical/family CC, or a
  chip nav — resets to the fresh default and ENDS the back-and-forth.
  Vertical needs no memory: it self-reciprocates through the `gen_delta` sign (A→B
  and B→A negate). Resolved ONCE per nav (deckDirFor is a pure READ — it runs
  several times per flight for the two cards, so it must never mutate, or the
  ping-pong would double-flip). This replaces the July-22 "return memory," which
  armed permanently while ping-ponging (every hop looked like a return).

**22.3 The weight physics — cards have weight, not engines.**

- **Exit (old card):** accelerates from rest (easeIn) on EVERY axis — it leans
  into leaving its slot and builds speed. Heft, not a uniform dart.
- **The empty gap:** the old card fully exits BEFORE the new one appears — they
  are NEVER on screen together (probe-guarded). The empty-stage beat, scaled by
  relation (shorter same-line, longer cross-tree), is the felt distance. Making
  the cards overlap "ruins the illusion of a large tree" (Sam).
- **Entry (new card):** enters quick and DECELERATES through the house curve into
  the slot, with the whole-path easeOutBack SETTLE — a ~6 px overshoot PAST the
  slot, then it rocks back. A heavy card taking a moment to settle.
- **Tilt (seeded per flight; protected variation — "these are people, not a
  conveyor belt"):** a FLOORED draw so a card is never flat-axial, PER-AXIS — a
  vertical fall LEANS (2.5–4°), a lateral slide only BANKS (1.5–2°; more reads as
  a speedboat). The tilt is a TRANSITION, never a snap: the exiting card draws its
  angle in (0° → full as it leaves); the entering card arrives angled and irons to
  level.
- **No blur on the real cards.** The animated directional-blur ramp that once
  sharpened the moving cards was a tuning-fork SHIMMER (an animated filter forces a
  full re-raster each frame). Removed — the two real cards are sharp at every
  frame. (Ghost blur survives in convoy mode as a STATIC filter, which is cheap.)
- **Tempo dials:** `DECK_TEMPO` (global — scales every duration + the beat; the
  whole operation faster with all curves AND spacing preserved) and
  `DECK_TRAVEL_TEMPO` (the two cards' TRANSIT only — leaves the beat/spacing and
  the easing shapes untouched). Overshoot distance and tilt angles are spatial —
  no tempo touches them.

**22.4 Offscreen honesty, the belt, the connector cut, the flight lock.**

- **Viewport-honest offscreen + the belt (no frozen jut):** every offscreen
  coordinate is derived from the LIVE viewport at flight time — never a fixed
  constant that sits INSIDE a real window and leaves a delayed card frozen-visible.
  Belt: the entering card is opacity-0 from mount until its first MOTION frame — a
  stationary card never paints. Proven at TWO viewport sizes (the
  "green-at-one-size caused the miss" lesson).
- **Connector hard-cut:** the parent/child connector STEMS + LABELS ("George's
  parents", "Three children") are cut the same frame as the roster chips and
  return only with the landing unfurl — nothing of the old family apparatus
  survives on the empty stage. Gated on `familyLanded` (the shown person having
  ACTUALLY landed), not merely `featuredLanded` (true during the stale-frame
  window).
- **Flight lock (the §3 gondola rule, realized):** a warm nav engages a lock that
  swallows every further nav click until the incoming card LANDS with its chips
  extended (safety-timed so it can never stick; reduced motion never locks). No
  overlapping flights, no nav off a card the user can't yet read.

**22.5 Magnitude & the ghost convoy behind the toggle.** Riffle magnitude (ghost
count ~2–3 near → cap ~6 far) keys on the flight metric, and the full v3 CONVOY —
N opaque, blurred ghost cards, 1–2 carrying a seeded PROCEDURAL portrait — is
preserved behind `DECK_GHOSTS` (default FALSE). Honesty rule for those portraits:
warm sepia radial vignettes generated from the camera seed — NOBODY, never real
data; §19.2's "never show scenery the map won't confirm" applies to NAMED scenery
only. If the empty-gap push ever needs scenery, the convoy is one flag away.

**22.6 Implementation stack (ruled July 22, held): NO new animation libraries.**
GSAP (or any timeline library) would be a second animation authority against
§17/§19.7's one-clock doctrine, and every probe frame-samples against OUR clock.
The deck decomposes entirely onto existing tools: ghost cards = raw WAAPI
`element.animate()` (fire-and-forget, staggers computed once — the carousel-strip
coexistence pattern); the two real cards = existing tick-based flight + whole-path
settle. Static directional blur via a tiny inline SVG filter (`feGaussianBlur`,
travel-axis heavy), never an ANIMATED `blur()` (the retired shimmer). Adjacent
rulings hold: AutoAnimate PROHIBITED; View Transitions API rejected (browser owns
the pixels; probes go blind); progressive-blur edge masks approved as GARNISH for
static seams only; svelte-inview bookmarked for lazy-load/prefetch, not motion.

**22.7 The probe suite (the guard).** Seven Playwright probes frame-sample the
real behavior and gate every change: **direction** (gen-sign + same-line, incl.
the cross-branch-peer and easter-egg cases), **ping-pong** (fresh=left, toggle
alternates, non-reciprocal resets — run in one SPA session, where the bug lived),
**phantom** (filter-none on the real cards, NEVER both on screen, the empty gap,
per-axis tilt), **jut** (entering card fully offscreen + belt, at two viewport
sizes), **connector** (dark through the whole flight, back at landing),
**physics** (every exit accelerates; the ~6 px settle overshoot), and **flight-
lock** (mid-flight clicks swallowed, released at landing). The sibling FORK-GUARD
(notch + z-order) stays byte-green throughout. Probes live at `scripts/probe-deck-
*.mjs`.

**22.8 Reuse doctrine:** the deck is THE transition for every teleport-class
navigation — CC now, SHUFFLE NOTABLES next (same mechanism, random notable
target), and SEARCH (modal closes → deck deals the result). Build once, inherit
twice. Shuffle Notables therefore FOLLOWS the deck, never precedes it.

**The dials (flight.ts constants), for the next tuning pass:** `DECK_GHOST_V`
(velocity/heft), `DECK_HERO_V_MULT` (entry quicker than exit), `DECK_TEMPO` /
`DECK_TRAVEL_TEMPO` (overall + transit tempo), `DECK_BEAT_DIRECT` /
`DECK_BEAT_COLL` (the empty gap by relation), `DECK_BRAKE_MS` + `settleBackFor`
(deceleration tail + overshoot), the per-axis tilt floors/ceilings, `SEAT_NEAR`
(the same-line threshold), `DECK_GHOSTS` (convoy toggle). Angles, overshoot, and
spacing are independent of the tempo dials by construction.

---

## 23. HOLD REGISTER — deliberate pauses, preserved in full

_(July 22. Sam's call. Nothing here is removed or superseded; each item resumes
exactly where its spec left off. Do not re-litigate; do not delete.)_

- **THE TABLE (Zoom 2)** — ON HOLD at the v1 scaffold checkpoint (roadmap §9.8:
  `/table` shipped, tiles at true seats, pan/inertia/culling proven; entry
  worklist recorded, connector lines first). Resumes on Sam's word.
- **ZOOM 3 / deep table density work** — ON HOLD with it (the §18.9 two-view
  model stands; the Table remains the second view when it returns).
- **THE CC ALTITUDE ARC (§19)** — ON HOLD behind `ARC_ENABLED=false`, machinery
  intact. Explicitly subordinate to the deck (§22): revisit only after the Table
  ships AND if the deck proves insufficient. May be permanently superseded;
  that outcome is acceptable and should be judged on pixels then, not now.
- **The field/motes + dark skins** — dormant behind the ground toggle (standing
  since §18.8). The parchment sourcing (§18.7/§18.10 blank-paper rule) is the
  ACTIVE ground task and is not on hold.

---

## 24. PHOTO LOADING — the neighborhood is the load unit (AS BUILT)

\*(July 23. Earned the hard way: a hover-enlarge preload experiment degraded
foundational chip loading; the fix returned the site to "how it used to be" and
made the loading model explicit so it isn't relitigated. Lives in `$lib/photo.ts`

- a one-line `$effect` in the person `+page`; the components render through it.)\*

**The lesson, first, because it's the load-bearing one: photos load by
NEIGHBORHOOD, not by `<img>`.** A person page's neighborhood (§types
`Neighborhood`) is a complete, finite set delivered in ONE payload — focus,
spouses + their children, parents, grandparents, grandchildren, every sibling
tier — each a `PersonCompact` carrying a `p` photo URL. Per-`<img>` `lazy`/`eager`
tuning fights the architecture; the correct unit is the set. Chips are people,
and a chip painting in top-to-bottom ruins the discrete baseball-card illusion —
so the bar is "never seen loading," and the neighborhood is how you clear it.

**24.1 The batch preload (the core mechanism).** The instant a neighborhood is
known — cold-load hydration, and on a warm nav the moment the incoming payload is
fetched (DURING the ~1s flight, before chips reveal at landing) — every person
photo in it is warmed as one batch: `preloadNeighborhood(n)` walks the set and
fires a `new Image()` per URL. Wired as a single `$effect(() =>
preloadNeighborhood(f.neighborhood))`. So a chip is a CACHE HIT by the time it
renders — on screen, off screen, inside a collapsed panel, or promoted to
featured on the NEXT nav (a grandchild here is a child there, already loaded).
Client-only (effects don't run under SSR; cold-load chips are already in the
prerendered HTML). The flight's own duration is the preload window — the reason
the empty-stage deck (§22.3) and the preload cooperate: while the stage is bare,
the next neighborhood's faces are loading.

**24.2 Tiered priority — the on-screen chips win the pool.** The batch is
ORDERED, not flat. PRIMARY — the featured portrait, the NOTCH spouses, the
parents row, the children rows (everything on screen at landing) — is warmed
FIRST at `fetchpriority=high`. SECONDARY — grandparents, grandchildren, every
sibling tier (off screen / behind a panel) — fills in AFTER at `low`. This was
the last regression's fix: the spouse chip was warmed DEAD LAST, behind every
off-screen grandchild, so on a real family an unseen in-law (a first-time
derivative) was still in flight when the notch revealed. Tiering put the visible
chips at the front of the queue and the holdout disappeared.

**24.3 One shared Cloudinary derivative per person.** Photos are sized to ≤500KB,
but a 60px chip loading a 459KB original is exactly what paints in. For
Cloudinary-hosted photos (`res.cloudinary.com`), ONE transform inserted after
`/upload/` — `w_600,c_limit,q_auto,f_auto` (~40–60KB) — is used EVERYWHERE that
person appears: chip, featured display, hover-zoom. So the photo loads exactly
ONCE and every later use is a cache hit — no reload on chip→featured promotion, no
third fetch on zoom. Using DIFFERENT sizes per surface was itself a regression:
the chip's `w_200` couldn't serve the featured's `w_700`, so the photo visibly
loaded twice AND each size was a separate first-time Cloudinary generation. Non-
Cloudinary hosts (Wikimedia) are warmed at their full URL, unchanged (a data-side
migration to Cloudinary would let them share the resize too — logged, not gating).

**24.4 Foundational vs tertiary — the load-scale rule.** PERSON photos (chips +
featured) are FOUNDATIONAL: batch-preloaded, high priority, they own the
connection pool. MEDIA (landmark / art / statue) thumbnails are `lazy`; their
hover-enlarge popouts load ON DEMAND (on hover), which measures lag-free because
it's the same small image. The rule, stated so it stays: nothing tertiary ever
contends with a person photo for a byte. A speculative media-popout WARMER that
violated this — even at low priority behind a hold-off — starved the foundations
and was removed. (This is the concrete form of the §3 "one well" discipline, now
for bytes instead of vectors.)

**24.5 The remaining floor + the remedy (queued to the data/deploy stream).** The
one cost the client cannot erase: Cloudinary generates each derivative on its
FIRST request (~0.7s, then CDN-cached globally). The tiered preload gives the
visible chips the head start to win that race during the flight, but a brand-new
in-law's photo is still a first-time build. To eliminate it for EVERY user, first
visit included: (a) a post-deploy WARM-UP SCRIPT that requests every person's
`w_600` URL once so Cloudinary pre-generates + caches them all, or (b) Cloudinary
EAGER TRANSFORMATIONS (build the `w_600` at upload). Either makes every chip
instant on first visit. Until then, the neighborhood preload + tiering keeps it
invisible in practice.

Verified by `scripts/probe-photo-preload.mjs`: on a warm nav, every chip relation
(parent / spouse / child / …) is loaded (`img.complete && naturalWidth > 0`) by
the time it reveals at landing.

**The 072926 edition (July 29) adds §25 — THE TALCOTT SEVERANCE AS BUILT. 1,264 people are hidden from the UX and none are deleted. Records the visibility field (`classification.hidden`, a string tag and a curation fact rather than a genealogy claim), the one architectural idea that made it cheap (`byId` IS the visibility graph — every chip already degrades through `cm()`, so NO chip-filtering code was written), why `slugMap` and `computeTableCoords` deliberately keep the FULL list (slug reservation; seat stability), the single emit path that cannot self-degrade (the CC resolver reads slugMap, not byId), and THE RE-SEW PROCEDURE in five steps. Amends §19.6 (the three-band table is now two — the grove is empty), §14.6 and §15 (the dual-descent header wrap and its open styling decision are both moot while the gate is off), and flags `hidden_by_default` as keying on the wrong test. §25.6 records three smaller doctrines earned alongside: `genderOf()` and the rule that a gendered word must never fall through to a default; the wholesale married-surname display convention and why it left slugs untouched; and that `hartford_founder` reaches the card but not the compact.**

---

## 25. THE TALCOTT SEVERANCE — a visibility layer, not a deletion (AS BUILT, July 28–29)

Sam narrowed the project to the Hooker line. The Talcott grove — people who descend from
John Talcott and **not** from Thomas Hooker — leaves the UX. His framing, and the whole
constraint: *"this is not a deletion. it's a pause for many years, hiding them, they can sit
in the JSON."*

**1,264 people are hidden. Zero are deleted.** Every one is complete in `canonical.json`.

### 25.1 The field

```
classification.hidden: "talcott_2026"      // absent = visible
```

A **string tag, not a boolean**, so a later severance uses its own tag and one cohort can be
re-sewn without disturbing another.

This is a **curation fact about the project, not a genealogy claim**, which is why it is a new
field rather than a flipped `is_talcott_descendant`. Those people *are* Talcott descendants;
writing a falsehood into the source to change a render would be murder to unwind. The same
reasoning governs the label gate (§25.3).

### 25.2 `byId` IS the visibility graph — the one architectural idea

`regenerate-data.js:main()` derives **two lists** from one canonical:

| list | membership | feeds |
|---|---|---|
| `people` | **all 18,119** | `slugMap`, `computeTableCoords` — **only** |
| `visible` | the 16,855 without `hidden` | `byId`, and every emission loop |

Everything follows from that split.

**Why chips needed no filter.** `neighborhood()` builds every chip through one helper —
`cm = (id) => (id && byId[id] ? compact(...) : null)` — with children/grandchildren/siblings
`.filter(Boolean)` and parents `if`-guarded. Dropping a person from `byId` makes them vanish
from every chip **through machinery that already existed and was already exercised by dangling
ids**. Verified across all 16,855 payloads: zero chips reference a hidden id. *No chip-filtering
code was written, and none should be.*

**Why `slugMap` keeps the full list.** A hidden person's slug stays **reserved**. Two reasons:
collision suffixes on visible people never shift, and no future person can claim
`samuel-talcott-sr-1708` and collide on re-sew. The page is simply never written, so the URL
404s as a static miss. **No redirect** — they did not move.

**Why `computeTableCoords` keeps the full list.** Seating on `visible` would repack the x-axis
and **move every remaining seat**, reflowing the table and invalidating flight captures. Hidden
people hold seats nothing consumes; every visible seat is exactly where it was.

**The one path that does not self-degrade.** `personPayload`'s CC resolver reads
`slugMap.get(related_id)`, never `byId` — and slugMap still holds hidden people by design. So a
CC to a hidden target would render a **live-looking link to a page that was never written**.
That needs an explicit `.filter()`, and it is the only new logic the whole severance required.
`validate.py` now errors on it as a second net (`SEV_cc_to_hidden`, firing 48× at the seam).

**Marriage rows survive their spouse.** `spouses[].spouse` is deliberately left `null` rather
than dropped, so the row keeps its order, year and children. 120 cards read *married 1732* with
no wife chip. That is correct, not a hole.

### 25.3 Labels — a render switch, never a data edit

`SHOW_TALCOTT_DESCENT = false` in `src/lib/utils/generation.ts` gates four call sites: the
person's own Talcott line, the derived spouse phrase, `computeSpouseCompact`'s founder string,
and `getDescendantOrdinalShort`'s Talcott branch. **1,918 labels changed; one word reverts all
of them.**

**The seam labels compute themselves.** Setting `is_easter_egg` on a kept in-law makes
`computeInLawLabel` walk that person's children's spouses and derive *"Father-in-law of Fourth
Generation Hooker"* unaided. Of eight seam people, **six needed nothing**; only two took a
`relational_label_override`. Do not hand-write what the graph can derive.

### 25.4 CONSEQUENCES FOR EXISTING SECTIONS

- **§19.6 — the three-band table is now two.** Regions derive from `hd` → spine, `td && !hd` →
  grove, else orbit. **`td && !hd` is exactly the severed set**, so the grove band at
  x 7834–8515 is empty. `/table` still renders; it is spine and orbit. A known, accepted cost —
  the doc's argument that the bands exist so the reader can "SEE that you left your branch" is
  now half-served.
- **§14.6 — the dual-descent header wrap can no longer occur.** The two-line
  `9th-Gen Hooker · 8th-Gen Talcott` case that ate the content row does not exist while the gate
  is off. The header-height fix remains worth doing on its own merit; the compact-notation half
  is moot.
- **§15 — "open decision: dual-descent card treatment" is moot** for the same reason. No card
  carries two descent lines.
- **`hidden_by_default` on CCs is now semantically stale.** It still keys on the old
  `td && !hd` grove test, so it stamps kept in-law eggs (Gov. Joseph Talcott, Samuel Talcott
  Jr.). Nothing consumes it, so nothing is broken — but when the Talcott toggle is built it must
  key on `hidden`, not on Talcott descent.

### 25.5 SEWING THEM BACK — the procedure, for whoever needs it

Designed to be cheap. In order:

1. **Un-hide.** Strip `classification.hidden` from the cohort (`process_tasks.py` `field_set`,
   or one script). `_review/talcott-sever.tsv` is the roster, with a `why` column on every row.
2. **Rebuild.** `node regenerate-data.js canonical.json`. Pages, search rows, table seats and
   chips all return **by themselves** — `byId` refills, and every degrade path reverses. Slugs
   are unchanged because they were never released.
3. **Labels.** `SHOW_TALCOTT_DESCENT = true`. Every Talcott descent line returns verbatim.
4. **CCs return by themselves** — the reciprocals were never removed from canonical, only
   filtered at emit. The 48 `SEV_cc_to_hidden` errors clear on their own.
5. **Then, and only then, the hand work.** Un-hiding does *not* undo the editorial decisions
   taken alongside it: seven Bryan-side records and several others were genuinely **deleted**
   (their content is preserved verbatim in surviving relatives' `research_notes` — search
   `DELETED` there); `relational_label_override` strings on the seam people; and the blocks
   rewritten to stop describing a Hooker-Talcott convergence. Those are re-authored, not
   restored.

**Partial re-sew is supported by design** — the tag is a string, so `hidden == "talcott_2026"`
can be lifted for a subset (one branch, one notable) without touching the rest.

### 25.6 SMALLER DOCTRINES EARNED ALONGSIDE (durable, done)

- **`genderOf()` — null is a real answer.** All gender reads in `generation.ts` route through one
  resolver that takes the first valid value from `person.gender`, `bio.gender` or `name.gender`
  and normalises case. It returns **null** rather than guessing, and every consumer degrades on
  it: the ordinal form, "Spouse of", "Parent-in-law". `computeInLawLabel` previously had no
  guard and silently defaulted to **"Father-in-law"** — nine women were labelled that way.
  *Never let a gendered word fall through to a default.*
- **Display-name convention, applied wholesale.** A woman whose `married_names` is non-empty
  carries her married surname in `display_name` — *Mehitable Russell Wadsworth*, not *Mehitable
  Russell*. 300 records. **Slugs are unaffected**: slugging reads `first_name` and
  `structuredSurname`, never `display_name`, except as a fallback when the structured fields are
  empty. Chips are unchanged by design — the spouse chip keeps the maiden short name (`sn`),
  only **child** chips prefer the married surname (`cm`).
- **`hartford_founder` reaches the card but not the compact.** It is a **tag** (11 holders), and
  `person.tags` ships in full on the person payload — so featured-card styling can read it
  today. It is **not** in `compact()`, so chips and table tiles cannot see it. Orbit-plus-founder
  styling on the tiles needs one flag emitted beside `ee`/`hd`/`td`. Not built.
