# HOOKER FAMILY DESCENDANTS — ENRICHED DESIGN (FABLE PASS)

**Date: August 8, 2026 (originated July 29, 2026; the filename tracks the latest edition) — companion/overlay to DESIGN.md (070126). PROPOSALS unless marked confirmed.**
**Prepared by the architect stream for Samuel Talcott Hooker's review. Nothing here is a decision until Sam says so.**
**The 070926 edition added §13 (viewport-lock / scrollbar doctrine) and §14 (Zoom 1 card-grid refinements). This 071226 edition adds §17 (motion physics doctrine — learned the hard way in the July 11 card-transition maintenance phase) and threads the one-physics/velocity-ceiling lessons into §3. The card-transition layer is now CLOSED, probe-guarded, and pushed; see docs/CODING_HANDOFF.md in the repo for the session record and ghost taxonomy.**

**The 071326 edition (July 13) adds §19 — the CC-flight rethink and its resolution: the felt distance of a cross-connection is SCALE, not angle; the "flight" becomes an up→over→down altitude arc through the real Zoom 2 tile table; the CC arc, the Card↔Table hero gesture (§18.9), and Zoom 2 are unified into ONE scale mechanism; and the sequencing pivot — BUILD ZOOM 2 FULLY FIRST, re-attach the arc as a camera path over it later. Also records the tech-stack verdict (no Threlte/3D; plain Svelte + CSS transforms) and the standalone Zoom 2 view design.**

**The 071626 edition (July 16) adds §20 — the DEMOTE SETTLE doctrine earned on pixels (per-seat discreteness; perception tracks the MOVING object's salience, not its destination footprint; transform-vs-layout as the neighbor-stability invariant; the settle is strictly intra-element), and the SIBLING EXPANSION design as confirmed by Sam (trigger bubble right of the spouse chip, soap-bubble nudge, height-derived window, vertical carousel on overflow, no stagger) — including the no-reciprocal / CC-departure catch and the full/half/step tier model.**

**The 071726 edition (July 17) adds §21 — SIBLING EXPANSION AS BUILT (supersedes §20.2 where they differ), THE NOTCH-CUTOUT DOCTRINE (one unstated fact that caused three separate ghost bugs), the FALSE-GREEN taxonomy (six in one session, all the same shape), and the STAGGER REVERSAL (context-dependent, scoped).**
**The 072226 edition (July 22) adds §22 — THE DECK SHUFFLE (the Zoom-1-era CC transition: the archival metaphor that withdraws the spatial claim; generation-delta direction; return-memory), and the HOLD register (§23): the Table (Zoom 2), Zoom 3, and the CC altitude arc move to deliberate hold — preserved, not removed.**
**The 072326 edition (July 23) rewrites §22
AS BUILT — THE DECK PUSH: the shipping CC transition is two solid cards trading places with WEIGHT and an EMPTY-STAGE gap (the visible ghost riffle moved behind a default-off toggle, because a visible convoy read as "adjacent" and shrank the tree). It records the gen_delta direction model (effective generation; the easter-egg child-in-law rule), the FIXED lateral ping-pong memory (replacing the July-22 return-memory that armed permanently), the weight-physics doctrine (accelerating exit, decelerating settle + ~6px overshoot, seeded per-axis tilt, global + travel tempo dials), the offscreen-honesty/belt + connector hard-cut + flight-lock, and the seven-probe guard suite. Built, probe-guarded, committed to main (Stream B). It also adds §24 — the PHOTO-LOADING doctrine (the NEIGHBORHOOD is the load unit; a tiered batch preload warms on-screen chips first; ONE shared Cloudinary derivative per person; person photos are foundational, media tertiary) — earned after a hover-preload experiment degraded the foundations and was undone.**

**The 072426 edition (July 24) adds §22.2b — a CONFIRMED DEFECT in the deck's vertical/lateral choice: the `sameLine` seat-distance proxy (`|Δseats| ≤ SEAT_NEAR`) misfires for genuine close kin who happen to sit FAR apart in the tidy tree, so a real up/down-the-line CC rides lateral. First live case: John Pierpont H00388 ↔ his uncle-guardian James Pierpont II H00116 (uncle/nephew, `gen_delta = −1`, correctly baked) renders HORIZONTAL because their seats are >180 apart. The data is right; the direction test is wrong. This is exactly the failure the §19.4 LCA/kin-distance bake exists to fix — logged now with a repro. Deferred (Stream B); tracked in the roadmap (§15).**

**The 080426 edition (August 4) adds §26 — THE SIBLING PANEL AS A PERSISTENT COLUMN (as built; SUPERSEDES §21.1 wherever they differ). §21 described the panel as a transient drop-down; this is the panel as a FIXTURE that travels with the card, and almost every finding in it is the same shape: what changed is not the pixels but the panel's LIFETIME. It records the in-place mutation model, the durable rule that a seat in a MOVING container is a resting position rather than a live rect (third instance of the §18.9 family), the SHAPE-EARLY-THEN-SLIDE finding (direction is read from what changes LAST), the way-station rule for a different-tier landing (§18.4's second instance), the RECIPROCAL-GATE rule earned on Alice Lee Roosevelt and 57 other one-way doors, open-by-default, the fixed anchor, the chevron/alpha-hover header, the leaver's-alpha doctrine extending §17 — and §26.12, the NEGATIVE SPACE: four things built and reverted (including one documented-invariant violation) plus two measurement failures that produced confident false greens.**

**The 081026 edition (August 10) adds §36 — THE LEFT TIMELINE AS AN INSTRUMENT, written deliberately for someone arriving cold: where every piece lives, the stacking order and its two traps, the ground's colour/curve/grain (including the three grain attempts that failed and exactly why a blend mode cannot work inside an isolated stacking context), the anchor portraits as built (sixteen of them — this replaces §35.9's "anchors are not built"), who gets a lifespan bar and why a bloodline card is deliberately a dead end, real ages via the card's own `ageAtDeath`, what `lv` means and why it is not `pv`, how a bar navigates without the rail containing any navigation code, the three motion clocks, the guardrails that have already been re-broken once, and how to MEASURE any of it. §35 remains true and is still the derivation; §36 is the instrument it became.**

**The 080926 edition (August 9) adds §34 — HOW A ROW OF CHILDREN BREAKS (new doctrine; there was no prior convention): the two rules that generate every count (four per row maximum, never strand a single child), why six is 4,2 and not 3,3 (the taper is what makes the row read as birth order rather than a block), why it had to become a GRID of eight half-chip tracks (Svelte forbids a sibling break element next to `animate:`, and eight tracks is what lets a ragged row centre on integers), and the child chip's own size tier at 90% box / 0.945 type with the aspect ratio preserved EXACTLY because flight.ts's same-tier test reads it. And §35 — THE LEFT TIMELINE AS BUILT, which supersedes §3.6 on three points: the rail is NOT the Field's axis (10.5 px/year anchored vs ~1.9 px/year absolute), uncertainty is per-END and dissolves rather than hatching (the hatch is removed and tombstoned — it marked a birth-year proxy and contradicted the dissolve), and the estimated lifespan is MEASURED FROM THIS TREE (14,323 people with both dates) with the recent end deliberately not trusted because a cohort that has not finished dying reports only those who died early. Also records the line-anchor bake — an egg's route home is one hop deeper than a payload holds, so it is baked rather than fetched, and the two findings that will be re-broken by anyone tidying the walk (spouses expand first; a pair collapses only when the chain holds without them).**

**The 080826 edition (August 8) adds §30 — THE STAGE MUST NOT MOVE WHILE ANYTHING IS FLYING: the one arithmetic fact the grandparent tier taught, that an in-flow element is painted at layout(t) + transform(t) and two different curves compose into the ideal path PLUS an error of ΔL·(e−c). It records why that error hides on an object with real travel and IS the entire motion on one with none, the shipped answer (an instantaneous collapse plus an arithmetic correction to every FLIP, rather than trying to settle the layout before measuring), the three consequences that are easy to undo by accident, the six attempts that were built and reverted with the measurement that killed each — including two that looked correct and measured WORSE — and the two rules added alongside it: a person's motion is owned by their morphIn, and a traveller tracks its seat.**

**The 080726 edition (August 7) adds §29 — THE COLOUR SYSTEM (as built): shadows, line-status shading, and the ground that governs them. Everything in it was measured against ONE background, the photographed manuscript parchment, and every number is a property of the PAIR (colour, ground) rather than of the colour — a second sheet moves all of them, so re-measure rather than porting hexes. Leads with the measurement that explains the whole session (the ground is Lab L* 96.3 / a* -0.0 / b* +5.4, i.e. WARM, so every cream moves toward it, and a plain white card already separates by DeltaE 6.5 — the floor below which shading makes a card LESS visible than leaving it alone). Records all ten values Sam rejected with his verdicts and their measurements, the two pivots that worked (cool rather than cream; mark the outsiders rather than the line), why translucency is not an option for a card (it shows its own drop-shadow through itself, and inner masks double-composite), the near-white compression trap, why alpha is not transferable between tints, source order as the precedence rule, and §29.10 — the SPINE, an edge treatment built and left dormant at `--edge-w: 0px` because an edge separates by contrast at a boundary rather than by area.**

**The 080626 edition (August 6) adds §27 — THE CROSS-CONNECTIONS BLADE (as built). The cross-connections leave the featured card's FOOTER and become a carved blade that lives INSIDE the card and is drawn out of it — which makes every card exactly `CARD_TOP_H` tall, the footer having been the only thing that ever varied it. Records the ONE idea that fixed everything else (it is a tool inside the case, not a neighbour: nested, it inherits every transform for free, measured at 0.00px drift, and needs neither an opacity gate nor a shadow of its own), the carved edge's geometry and THE BULGE at 7+ rows (a corner rounded along a slant that had been flattened to vertical, plus the depth cap that should have been deleted with the layout it was built for), the SHEATH and its tang, the CLAMP reasoning end to end (10.8–11.5, why the floor is the dial that matters, and the retired "two 70-character CCs" spec that set the original 10px), type and width as SEARCHES on the real DOM rather than chosen values, the three break rules (bound names, bound years, and the `<wbr/>` after each separator that was the largest single win), and §27.9 — BUILT AND REVERTED, headed by the two-column layout that was deleted rather than patched, with the full downstream chain of every "fix" that followed the first wrong move. §27.10 collects seven measurement failures, each of which produced a confident wrong answer.**

**The same 080626 edition also adds §28 — THE FEATURED CARD'S FIXED GEOMETRY AND TYPE (as built), the card-surface work that ran alongside the blade and is easy to mistake for cosmetics. Two of its constants are now structural (`CARD_TOP_H` is exact for every person and `CORNER_R` is exported, because the blade is carved with the card's own radius — `DeckRiffle` imports rather than duplicating). It records the REVERSED header rule (a fixed header row buys a constant lower-content start and pays with a variable gap; the old auto-sizing rule swung the content start 23px between a blurb card and a no-blurb one), the durable face-swap rule (apparent size is CAP HEIGHT, not px — Outfit at 26 reads as exactly the size Inter read at 24), one ink at different strengths with ALPHA rather than a second colour token (so it composes with the died-young dimming), age-at-death's honesty rule including when it returns null rather than a number it cannot stand behind, and §28.6 — what was tried and returned from, Carlito included.**

**Correction carried in the same edition:** §22.2b's "Deferred" is stale — the §19.4 LCA/kin-distance bake SHIPPED August 3 and closed it (roadmap §17). The defect it describes is fixed; the section is kept for the reasoning and the repro.

This doc follows the house convention: it holds _what and why_ (durable design).
Sequencing lives in ENRICHED_CODING_ROADMAP_FABLE_081026.md. Where a section
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

**22.2b CONFIRMED DEFECT (July 24) — FIXED August 3 by the §19.4 kin-distance bake (roadmap §17); kept for the reasoning and the repro. The seat proxy fails close kin who sit far
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

---

## 26. THE SIBLING PANEL AS A PERSISTENT COLUMN (AS BUILT, August 4)

_(**SUPERSEDES §21.1 wherever they differ.** §21 describes the panel as a
transient drop-down: a gesture the user performs, which closes on every
navigation. This describes it as a FIXTURE — something that lives on the card
and travels with you. Almost every §21.1 decision still holds; the ones that
change, change because the panel's LIFETIME changed, not because the pixels
were wrong. Every item below was set on Sam's rendered-pixel verdict, and the
things that were built and reverted are recorded in §26.11 so they are not
re-attempted.)_

### 26.1 The insight, and everything that falls out of it

**A sibling promotion barely changes the sibling list.** Promote X and the list
loses X and gains the person you left; everyone else is unchanged. Sam: _"it's
not like the siblings list changes for a sibling promotion, only the one sibling
needs to be removed from the menu."_

So the panel **persists and mutates** rather than tearing down a list that was
90% correct and re-animating it. Four things follow, and only the first is
obvious:

1. The promoted chip vanishes, its neighbours close the gap, and the demoted
   card flies INTO the vacated list as a chip while the carousel scrolls to
   catch it.
2. **The panel stops being a gesture and becomes a fixture.** A thing you
   perform is reasonably hidden until asked for; a thing that lives on the card
   should be present. This is why it now opens by default (§26.8) and why its
   anchor stopped following the card (§26.9).
3. **"Nothing incoming paints before landing" is deliberately relaxed here** —
   the one place in the app. It is safe only because the list is *mostly the
   same people*; the single chip that is genuinely new (the demoted person) is
   still held hidden until the card lands. The exception is bounded by holding
   the exception's exception.
4. **Latent bugs in the panel became visible bugs.** A per-card anchor, a
   carried-over scroll offset, and a 6.4px error in the leading-header layout
   were all invisible while the panel was rebuilt on every navigation. Making
   something persistent is a way of auditing it.

### 26.2 RE-FILED, NOT DEPARTED — §18.12 finally has a destination

§18.12 established the half of this that could be built at the time: children
who become siblings are **re-filed, not departed**, so the row keeps marching
and holds formation, and where its members end up is the panel's business.

But the DEMOTED CARD had nowhere to go. §21.2 deliberately hid its retraction in
the card's corner at `z:-1`, on the honest reasoning that _"a sibling has no such
box — it lands in the closed panel, not a roster seat."_ That was true of a panel
that was always shut. With the panel open, the seat exists, and the gesture
inverts: **the card is watched all the way into the list** instead of being
hidden on the way out.

**Layering, which is not a detail.** The demote rides `z 1` — where every other
demote rides, under the arriving card — and `.sibling-zone` moved to `z 0` so the
landing is visible. The first cut put the demote at `z 3` to clear the panel, and
that is ghost-taxonomy **bug D** all over again: the departing card sat opaque and
full-detail on top of the arriving one. **The doctrine is two baseball cards
trading places with the ARRIVING one in front**, and when no single z satisfies
that, the thing to move is the third object, not the card.

### 26.3 A SEAT IN A MOVING CONTAINER IS A RESTING POSITION, NOT A LIVE RECT

**The durable rule, and the third instance of its family.** §18.9 established
that anything flying to a seat must be sure the seat is RENDERED, not merely
present in the roster. `shrinkTo` established that a destination box can MOVE
mid-flight and must be re-queried. This adds the third: **when the container
itself is animating, the traveller must target where the seat COMES TO REST.**

Sam's ruling on the fork — the carousel scrolls to catch the card *while* it
flies, so the two motions resolve together rather than sequentially — means the
strip is gliding for most of the flight. A seat's live rect during that glide is
an animating value that is wrong in both directions: too far before, too near
after. Measuring it is not a small error, it is measuring the wrong quantity.

So the seat is **computed, not measured**, at the one synchronous seam where
everything needed is knowable: after the incoming payload arrives and before the
state swap starts the flush. At that instant the incoming list is in hand and the
outgoing panel is still on screen — and, measured, the panel's geometry is
invariant across a navigation anyway (the zone is anchored to the featured slot,
which does not move).

**The layout model was EXTRACTED, not copied.** The seat is a function of the
panel's cumulative layout — asymmetric header gaps, headers consuming window
slots, never-a-partial-chip — and a second copy of that arithmetic at the call
site is how two answers drift apart. One home, two readers.

### 26.4 SHAPE EARLY, THEN SLIDE — direction is read from what changes LAST

**The most transferable finding in this arc.** Sam on the demoted card: it
_"looks like it's coming down from a high level and being vacuumed up,"_ and its
direction fights the promotion, which _"doesn't feel like it's moving up, it's
expanding out."_

The cause: scale and translation rode ONE progress, so the card was still
shrinking hard in the final 100ms — measured, 271px wide at t=506 of a 555ms
flight, in full view. **A large, late scale change reads as descent** regardless
of the actual path, because the eye takes its direction cue from whatever is
still changing at the end.

So the FOOTPRINT resolves on its own faster progress and finishes at ~55% of the
travel, decelerating into its final size rather than snapping to it; the rest of
the journey is pure lateral translation of a finished object. Position keeps the
original progress, so the landing rect and the settle are untouched.

**And the occlusion window is a resource.** Measured, the arriving card hides the
demote from t≈200 to t≈470 (peak 93–99%). That window is where the shape change
and — because every face crossfade is geometry-keyed — the entire content change
now happen. What emerges has been finished for ~100ms. Sam's spec, and it is a
good general rule: _"when it emerges into view from below the incoming
transitioning Featured Card it should be in its final form already for a long
time."_

### 26.5 A DIFFERENT-TIER LANDING NEEDS THE DESTINATION'S OWN FACE

§18.4 hit this wall with a 3+-spouse notch seat and solved it by carrying the
destination's face as a second layer. This is the second instance, and it
confirms the rule is general: **there is no single transform that lands a
different footprint AND keeps a face undistorted.**

The demote's chip-face is a `relation="parent"` box — 220×75, full short name,
parent type scale. A sibling seat is 119×54, FIRST NAME ONLY, its own type scale;
a different aspect ratio and a different object. Mirroring the name got the WORD
right and could never get the OBJECT right.

**The way-station rule, new here.** The card's own face → a parent-style chip →
the sibling seat's face is **two content changes where the story has one.** On a
sibling mutation the intermediate face never paints at all; the seat's face takes
over its crossfade band outright. An object in flight should change its identity
once, not pass through a costume it never needed.

### 26.6 A SMALL OVERSHOOT IS WEIGHT; A LARGE ONE IS THEATRE

Sam: _"maybe we even should add overshoot similar to how the spouse chip slightly
overshoots… not dramatic theatrical overshoot, but it gives a sense of weight and
timing."_ Measured at **2.0–2.2px** of carry past the seat — deliberately the
smallest of the three demote settles, sized to the panel's own mount cascade
(2.5px). The amplitude scales to the DESTINATION footprint, not the travel: a
119×54 chip at the end of a ~960px path earns a chip-sized carry, not a
path-sized one.

The exclusion that had kept siblings out of the settle was real, not an
oversight — this branch is shared with the SPOUSE demote, whose linear curve is
load-bearing (constant velocity so the photo never strobes). It stopped applying
only once the footprint resolved early (§26.4), which makes the tail a small chip
translating rather than a photo shrinking.

### 26.7 A GATE MUST BE RECIPROCAL — the one-way door

**A general rule for every affordance gate in the app, learned here.** §21.1
gated the sibling trigger on `siblings_count > 0 && (hd || td) && !ee` — no
trigger for easter eggs, married-in spouses, or anyone off the lines. Correct
reasoning for a card the user merely *landed on*. Wrong for a card the user
reached **by clicking a sibling chip**, which makes it a one-way door: the
relationship the visitor just traversed does not exist from the other side.

Alice Lee Roosevelt Longworth is a half-sibling in Theodore Roosevelt Jr's panel
and had no panel of her own. **No data fix could reach it** — she genuinely is
not a Hooker descendant; the line runs through Theodore Sr's second wife, so her
five half-siblings are on it and she is not. Marking her `hd` would be a lie.
Scanned across all 18,621 payloads: **58 people** were reachable as a sibling
chip with no panel of their own, the dominant cause being the off-line clause
(49), not easter-egg (4).

The gate grew a second, **ADDITIVE** clause: it also renders when at least one of
the person's own rendered siblings is on the line — which is exactly the
statement _somebody on the line can reach me here, so I can go back._ Measured:
+57 cards, 0 lost, doors 58 → 3 (the remainder are data gaps where the reciprocal
sibling edge was never emitted at all).

**It must stay additive.** Gating on the LIST ALONE was measured first and takes
the panel off **Thomas Hooker himself** — his siblings are not his own
descendants. A rule that reads better and deletes the root of the tree.

### 26.8 OPEN BY DEFAULT, AND THE PREFERENCE STICKS

Sam: _"it should start for all users default in the visible mode but users can
close it anytime."_ Once a hand is on the trigger the panel keeps that state as
you travel — open stays open, closed stays closed. Sam on the sticky half,
before he asked for the default: _"that wasn't part of my original idea but
that's very convenient."_

Two rules this makes load-bearing:

- **The first paint must be QUIET.** §18.12's finding — the per-chip cascade is
  _"a deliberate, attention-taking gesture, correct when a hand is on the
  trigger, intrusive when it performs itself"_ — becomes critical when the panel
  is open by default, because otherwise it performs itself on every page load.
  A user toggle still gets the full cascade.
- **The panel still closes for the FLIGHT on every non-sibling arrival** and
  reopens at landing, so nothing belonging to the new person paints early. From
  the visitor's seat it is simply open on every card they land on.

### 26.9 A PERSISTENT COLUMN DOES NOT TAKE ITS POSITION FROM THE CARD BESIDE IT

§21.1 anchored the chip column to _"the card-edge resume beneath the notch
carve"_ — 12px higher on a compact notch (≥3 spouses). That was right, and _"the
15px distinction was worth two passes to get right,"_ while the panel closed and
reopened on every navigation.

Once it persists, a per-card anchor is a column that **jumps 12px as you travel**.
Sam, on Rodman Lent Hooker (3 spouses) ↔ his brother John (1): _"the sibling menu
moves up and down 5-10px each time you toggle between them."_ One value for every
card now. **What changed is not the anchor; it is the panel's lifetime** — and
that is the shape of several findings in this section.

The cost is named rather than buried: on a compact-notch card the column starts
~12px below the carve instead of tight against it, and the trigger's underline no
longer aligns to the compact spouse chip's bottom edge.

### 26.10 THE HEADER — peripheral still, and hover is ALPHA

§21.1's core ruling holds: the trigger must read **peripheral** — _"the button
takes away from the other elements"_ — and the page _"already feels crammed with
details so I'm not looking to make it flashy."_ What changed is the treatment,
not the weight.

- **A chevron, as an SVG, not a text glyph.** The requirement is that it grow
  AND hold the same position through the open/closed turn, and a text glyph
  cannot guarantee that: its ink sits at a font-dependent offset inside its line
  box, so rotating about the box centre swings the mark. **In an SVG the ink IS
  the box** — symmetric about the viewBox centre by construction, so the default
  origin is the mark's own centre and no font metric, size change or typeface
  swap can move it. Narrowing is done in the GEOMETRY, since
  `preserveAspectRatio` scales uniformly and shrinking the box would take the
  height with it.
- **Hover changes ALPHA only** — 0.6, which is `NarrativeBlocks`' own
  `hover:opacity-60`. Sam asked for that specific match and it is the right one:
  **this control and an NB header are the same kind of object** — a quiet,
  expandable label the reader may never touch — and the same kind of object
  should give the same response. Applied to the children, never the button's own
  opacity, which is the reveal gate.
- **Nothing moves on hover.** A 1px chevron nudge plus a colour deepen plus a
  press depress read as instability on a small mark: _"all it needs to do is
  rotate up and down on click… and on hover, you make siblings get lighter."_
  Two responses, not four.
- The dashed underline and the `+`/`−` are gone.

### 26.11 THE LEAVER'S ALPHA IS SPENT BEFORE THE KNEE (extends §17)

**Motion doctrine, general to every row, earned here.** §18.3 keys the row fade
to DISTANCE COVERED because the march decelerates. That is the point of the dial
— and 0.5/0.92 had it on the wrong side of the knee. Under `cubicOut` the
instantaneous speed at `ROW_GONE` is `3·(1−g)^(2/3)` of the average: **0.56× at
0.92, 1.34× at 0.70.**

**A chip that dims while visibly slowing does not read as leaving. It reads as
stopping.** Sam, three times across two sessions: _"they transition up but then
freeze — that means stop, halt, pause their transition — and fade on stuck on one
position."_ Now 0.34/0.70: the chip is spent having covered ~70% of its tier,
moving at 1.24–1.80× its own average speed, gone by ~33% of the clock.

The companion rule, which is the part that was learned expensively: **a leaver is
not a thing the user is meant to follow.** Sam: _"the incoming FeaturedCard is
the main place of attention. the user is not going to be like, it's really
important to me to watch the child chips exit high up and then I can look at what
I want."_ When a leaver reads wrong, the answer is almost always to spend it
SOONER, not to give it further to travel.

### 26.12 BUILT AND REVERTED — the negative space, so it is not re-attempted

- **Linear easing for the army's leavers.** Changed the curve for EVERY row in
  the app to stop three chips stalling on one card. §18.3 states the coupling in
  as many words — _"same distance, same direction, same clock, **same curve** as
  the row arriving behind it"_ — and §17.2 states it at design level: cards and
  camera share one easing family _"so the whole world speaks one dialect of
  mass."_ Sam: _"an epic disaster, a violation of the documents."_ **A bug report
  names a symptom AND a scope; the scope is part of the report.**
- **Extending a toward-card row's march** so the chips would tuck under the card,
  tracking the slot's receding bottom edge per frame. Two failures: a row wider
  than the card has chips outside its horizontal extent that can never be
  occluded however far they travel (so a longer march is simply more visible
  travel), and putting the parents row on a per-frame path introduced a new ghost
  on a row that had none — the css path pins in the keyframe at 0%, a tick path
  pins one frame later.
- **`z 3` for the sibling demote** — §26.2.
- **An ink-bias correction INSIDE the rotating element.** The 180° turn flips it,
  so the error doubles instead of cancelling; measured, the mark jumped 10.80px.
  Moving the `transform-origin` instead made it worse again — rotating about an
  off-centre point TRANSLATES the element.

**Two measurement lessons, both of which produced confident false greens:**

- **`Range.getBoundingClientRect()` returns the LINE BOX, not the glyph's ink.**
  It reported a ~5px chevron as 20px tall and yielded a "0.00px of travel"
  reading while the rendered pixels plainly disagreed. §21.3's shape exactly. **A
  screenshot settled it in seconds**, as it has every other time in this document.
- **Per-navigation captures must be read at INIT, never inside a frame loop.**
  `clearFlightCaptures()` resets them one frame after the swap, so a tick that
  reads `panDir` sees `'lateral'` and silently computes zeros. The css paths never
  noticed because they bake their direction in at init.

---

## 27. THE CROSS-CONNECTIONS BLADE (AS BUILT, August 5–6)

_(The CCs left the featured card's FOOTER and became a carved blade that lives
INSIDE the card and is drawn out of it. Because the footer was the only thing
that ever varied card height, every card is now exactly `CARD_TOP_H` tall — a
constant the deck, the flight and `DeckRiffle` had all been working around.
Built against Sam's hand drawing `7AFB3D6D`, which measures ~1:1 with the card's
925px width. §27.9 records what was built and REVERTED; read it before
re-attempting any of it.)_

### 27.1 The one idea: it is a tool inside the case, not a neighbour

The blade was first mounted by the PAGE, as a sibling of the card inside
`.featured-slot`. Everything about it was then a tracking problem — it had to
follow the card's position, its scale, its tilt — and on a vertical CC
navigation it visibly **detached and flew its own path**. Sam:

> _"The CC blade is 100% a subcomponent of the FeaturedCard. It has no existence
> outside of the FeaturedCard… imagine the Featured Card is the red case of the
> Swiss Army knife. I could throw a swiss army knife off a cliff and the blades
> and inner components will not float off or have their own arcs."_

It now renders inside `.featured-card-wrap`, so it inherits every transform the
flight applies **for free**. Measured across a full navigation on untilted
frames: `blade.left − card.left` is **0.00px constant**, `blade.width /
card.width` constant. On the deck's tilted frames those numbers vary, which is
what a rigid blade rotating WITH the card looks like — an axis-aligned bounding
box comparison is not a rigidity test under rotation.

Three things follow, and each one got simpler, not harder:

- **No opacity anywhere.** "Sheathed" means translated up behind the card. The
  card is opaque and painted above (`.cc-blade-mount` is `z-index: -1` inside
  it), so the blade is hidden WHEREVER the card is — mid-flight, offscreen,
  scaled down to a chip. The page-mounted version needed an opacity gate to fake
  this, because the card wasn't there yet to hide behind.
- **No shadow of its own.** The wrap's `drop-shadow` filter renders card + blade
  as ONE silhouette, so the pair casts a single shadow with no seam. What the
  blade does carry is an INSET shadow at its top, offset down by the tang, so
  the card's bottom lip casts onto it at ~35% of the card's outer values. Sam's
  original complaint — the blade's top edge shadowing the CARD — was a z-order
  bug, not a shadow that shouldn't exist.
- **It is positioned ABSOLUTELY and contributes no layout height.** This is
  load-bearing: `.featured-flight`'s rect is the flight's destination geometry,
  and a taller box rescales the whole chip→card morph (the card renders smaller
  than the chip it grows from). The page reserves the blade's visible depth
  separately, in `.featured-slot`.

### 27.2 The carved edge — geometry, and the bulge at 7+ rows

Carved with the card's own `shape()` machinery and the card's own `CORNER_R`,
now **exported from FeaturedCard** for the same reason `CARD_TOP_H` is: a second
literal would silently diverge the first time the radius moved. The first
version used a flat `polygon()` with hard corners; Sam caught it immediately
(_"did you use similar path carving as the spouse notch?"_ — no, I hadn't).

| constant | value | why |
|---|---|---|
| `BLADE_LEFT_TOP` | 125 | where the slant meets the card's bottom edge. Was 145; moved 20px left on Sam's ask to widen the blade |
| `BLADE_RIGHT_INSET` | 25 | the blade's MAXIMUM right extent, not a fixed inset — see §27.4 |
| `SLANT_TAN` | 0.83 | ≈40° off vertical; the drawing runs 73px right over an 88px drop |
| `BLADE_TANG` | 14 | blade that lives permanently up inside the case (§27.3) |
| `SLANT_X0` | `125 − TANG·TAN` | the slant's x at the top of the TANG, chosen so the edge passes through exactly 125 at the card's bottom edge. The tang EXTENDS the line; it does not bend it |

**Rounded: the two bottom corners. Square: the two top corners**, which sit at
or above the card's bottom edge and are never seen. The bottom-left vertex is
stepped back along BOTH its edges (`upX = B − r·sin θ`, `upY = r·cos θ`) so the
acute corner does not come to a needle.

**THE BULGE — the failure worth remembering.** A `SLANT_MAX_DEPTH = 145` cap
once flattened the edge to vertical below that depth. The corner rounding still
stepped back **along the slant**, so on any blade deep enough to reach the cap
the corner moved ~5px LEFT and the vertical edge then came back right — a
visible jut on the bottom-left of every 7+ row blade. Sam found it on Jeremiah
Wadsworth. Traced by hit-testing the silhouette row by row (clip-path governs
hit-testing, so this reads the REAL carved shape, not the CSS string):

```
before   232 → 231 → 230 → 229 → 230 → 232      the edge walks left, then back
after    234 → 234 → 234 → 234 → 234 → 235      vertical
```

It was fixed twice. First correctly-but-locally: round the corner along
whichever edge actually meets it (vertical when capped). Then properly — **the
cap was deleted**, because it had only ever existed to bound the two-column
layout's insets, and those columns were gone (§27.9). Leaving it behind was
flattening the last stretch of the deepest blades into a stub with a corner,
breaking the one continuous line the edge is supposed to be. The lean now runs
the whole way down, per the drawing's own rule — _"the slant continues as long
as there are CCs"_. Measured on Wadsworth: a single constant lean, 131 → 246.

**The text follows the edge**, via a `shape-outside` polygon on an invisible
float. Two non-obvious constraints, both learned by breaking them:

- The cutout is drawn over a FIXED over-tall run, not the measured height.
  Sizing it from `bladeH` made layout self-referential — height fed the cutout,
  the cutout re-wrapped the text, the text set the height. It converged, but
  only on the second pass, so anything reading the height on pass one got a
  too-short blade.
- The float must be WIDER than the shape ever gets, because `shape-outside` is
  clipped to the float's margin box. At `width: 100%` inside a narrow container,
  everything past the clip counts as blocked. The float is also contained by the
  nearest block-formatting context, so an over-tall one drags its container to
  600px unless the body has an explicit height and clips it. The obvious
  neutraliser — a matching negative bottom margin — does NOT work: the shape is
  clipped to the margin box, so zeroing the margin box zeroes the cutout with it
  (measured: every line went back to starting at x=0).

### 27.3 The sheath — and the tang

_"Like a swiss army knife there will always be a transition from sheathed —
hidden from view under the Featured Card — to fully exposed."_

**The tang.** `BLADE_TANG` (14px) of blade lives permanently inside the case and
is never seen at rest. Without it the blade's top edge IS the card's edge, so
the settle overshoot pulled the whole thing clear and **opened a gap** — for a
few frames the blade was a detached slab floating below the card. With a tang,
an overshoot simply exposes more blade, which is what a real blade does.
Measured across a navigation: the gap between the card's bottom and the blade's
top **never goes positive**; worst case −8.6px, i.e. the overshoot consumed
5.4px of tang with 8.6px still in hand.

**THE CARRY IS 0.011 OF TRAVEL — the house ratio**, lifted straight out of
`settleBackFor` (`distance * 0.011`). Getting this wrong is what made the draw
read as _"someone flicking something off their finger"_: the card carries
4.5–5.4px over a flight of ~900px, well under 1% of its travel, and the blade
was carrying a hand-rolled 5px over a travel of ~116px — **nearly 4%, four to
eight times the overshoot the rest of the world uses**. As a ratio it also
scales the way mass should: a one-line blade settles almost instantly, a
nine-line blade carries further. And it needs no pixels, so travel and carry
ride ONE curve in ONE unit — `easeOutBack` in pure percent.

**Travel is a percentage, never a measured pixel count.** A blade does not know
its height when its animation is built — the text has not been laid out. Every
pixel route tried here read the empty 22px padding box (measured: 17px against a
final 132px), and on a deck arrival a `getBoundingClientRect` reads a SCALED
rect because the card is mid-flight. `translateY(-100%)` resolves against the
border box when the browser samples the animation, by which time the real height
exists.

**TWO CLOCKS, because a CC arrival and a chip promotion are not the same
journey**, plus a third case that is purely about axis:

| arrival | draw | ends at | carry |
|---|---|---|---|
| CC, lateral | 420ms | 0.95 of on-screen travel | 0.011 |
| CC, vertical | 420ms | the settle, +300ms lag, −5% | 0.011 |
| from an on-screen chip | 260ms | 0.88 | **0** |

- **`endsAt` is a fraction of the hero's ON-SCREEN travel** (after its `delay`,
  which on a deck arrival is dead time with the card still offscreen). Run at
  the start of a flight instead, the draw is simply never seen — the blade
  appears already open every time.
- **A VERTICAL deck arrival hides a vertical draw.** Measured: the card waits
  offscreen until ~900ms, then falls from y −675 to 252 in ~370ms — and the draw
  was running inside that descent, extending the blade ~100px down while the
  card moved ~350px down. Same direction, three times the distance: the blade's
  own motion is **invisible by subtraction**. Nothing was broken; it was hidden
  behind a bigger move in its own axis. So a vertical arrival waits for the card
  to stop. Card movement during the draw: **364px before, 6px after**.
- **The axis comes from the deck's own entry vector (`deckDirFor`), NOT from
  `panDir`.** `capturePanDir` is set from the clicked RELATION (parent→down,
  child→up, spouse→lateral) and says nothing about a CC's deck direction.
- **NO carry on a chip arrival.** The card itself lands with an `easeOutBack`
  settle, and a second overshoot underneath does not add weight — the two read
  as one another's echo and blunt the card's own. `easeOutBack(u, 0)` is
  `1 + (u−1)³`, which IS `cubicOut` (verified numerically, max difference 0), so
  "no overshoot" stays in the same curve family rather than becoming a second
  dialect.

**Mechanism, and why it is not a Svelte transition.** Svelte does **not** run a
nested element's intro when the component around it is created — the `in:`/`out:`
pair simply never fired and the blade sat fully drawn from frame 0. Both
directions are plain WAAPI. The stow is DECLARATIVE in the markup (`class:stowed`)
so there is never a frame painted already-open, and `fill: 'backwards'` holds the
first keyframe through the delay. The retract is fired from the departing card's
`outrostart` **in the page**, because once a keyed block is outroing Svelte stops
running its effects and the card can no longer notice its own departure.

### 27.4 Type and width are MEASURED, not chosen

`fitBlade` (`src/lib/actions/fitBlade.ts`) runs two searches on the real DOM, in
this order. It is the sibling of `shrinkToFit` and deliberately its mirror:
`shrinkToFit` keeps one line on one line by SHRINKING; this grows until one more
line would appear.

1. **TYPE** — grow from the floor while the blade's DEPTH is unchanged.
2. **WIDTH** — then pull the right edge in. Among the widths that hold that
   depth, prefer the one leaving the fewest TAILS (§27.5); among equals, the
   narrowest. **The left edge never moves** — the blade always emerges from the
   same point under the card, so all the give is on the right.

**Why the DOM and not a predictor.** This is Pretext's idea (binary-search the
size whose line count is still "nice") with the browser as the oracle instead of
a canvas re-implementation. Pretext's pitch is avoiding reflow across thousands
of items; there is ONE blade holding at most eleven connections, so a dozen
synchronous measurements cost nothing. What is NOT cheap is accuracy: the
blade's lines are cut by a slanted edge, and the browser is the only thing that
knows exactly how text wraps around that shape. A canvas predictor would have to
model the slant itself and agree with CSS perfectly, or silently pick a size
that then wraps differently.

**THE CLAMP — where the numbers came from.**

| | value | reasoning |
|---|---|---|
| floor | **10.8** | Started at 10.2 = the old flat 10px + 2% (Sam: _"the lower clamp font size needs to be even 2% bigger than this"_). Raised to 10.8 when the densest entries bottomed out around 10.4 and read as too small — Sam on Daniel Wadsworth: _"I'd rather have it wrap onto seven rows of text with a slightly larger min font"_ |
| ceiling | **11.5** | Was 13. At 13 a one-connection blade read as _an extension of the card's NBs when it's really below in hierarchy_. The ceiling is what keeps the blade subordinate to the card |

**The floor is where the TARGET DEPTH is measured**, which is the whole reason it
is a meaningful dial: lifting it buys type at the price of rows. Daniel
Wadsworth went 10.39px/6 rows → **11.49px/7 rows** on that change alone.

**The retired spec.** The original flat 10px was sized to a stated rule — _"two
70 character CCs should fit completely in the first row"_ — measured at the time
(12px held 115 characters, 10.5px held 135, 10px held 150). That rule described
a full-width SINGLE column and cannot survive a half-width one; it was retired
with the two-column experiment and should not be reinstated without re-deriving
it.

**Two arithmetic traps in the search itself:**

- **FLOOR the chosen size, never round it.** `toFixed(2)` rounds UP, which can
  write a size larger than any actually tested — and the accepted size sits by
  definition right against the threshold. Measured: the search accepted
  11.0390625 (2 lines), wrote `11.04`, and at 900px 11.04 wraps to **3**. A whole
  extra row out of a hundredth of a pixel.
- **Write the width with a `style:` DIRECTIVE, not a `style` attribute.** A
  `style="clip-path: …"` attribute is rewritten WHOLESALE whenever the clip
  changes — and the clip changes precisely BECAUSE the fit changed the depth, so
  the two collided on exactly the multi-line blades. A five-line blade snapped
  back to full width while a one-line blade kept its fit. Same hazard already
  documented on the card's name with `shrinkToFit`.

### 27.5 Where a connection may break — and where it may not

The blade is ONE continuous flow with `●` separators, not a grid. Three rules
govern its line breaks, and all three are display transforms only —
`canonical.json` is frozen in this stream.

- **A name is one thing.** Every space inside a linked name becomes
  non-breaking. _"Edwards Pierrepont"_ split across two lines reads as two people
  for the half-second it takes to reassemble, and the name IS the link.
- **A year never starts a line alone.** `"…ordination, November 25,"` would fill
  a line and drop `"1706"` onto the next by itself. 419 of 2879 connections (15%)
  contain a year that can split this way. **`text-wrap: pretty` and `balance` do
  NOT fix this** — measured on the same blade, both produced identical breaks,
  because the problem is not how the lines are balanced but that a date is being
  treated as two separable words.
- **`<wbr/>` AFTER each separator is the only place a connection may break from
  the next.** This was the largest single win and the least obvious. There is no
  whitespace around the separator — the spacing is padding — so the browser read
  `…prisoner of war●Paul Geddes Pennoyer` as ONE unbreakable word, the linked
  name having just been made unbreakable itself. A line with 220px still free was
  handed a ~360px atom and threw the whole thing onto the next line, which is why
  words appeared to wrap with obvious room beside them. There is deliberately no
  break opportunity BEFORE the separator, so the dot stays on the line with the
  connection it closes rather than leading the next one.

Measured as unused space at the end of each non-final line: **mean 92px → 55px,
worst 182px → 105px**, and one six-line blade collapsed to five.

**TAILS are the structural residue.** A tail is the end of one connection
stranded at the start of the next line, so the line opens mid-sentence. After
the `<wbr/>` fix, 6 of 10 sampled blades have none — and for every blade that
still has one, the count **equals the minimum achievable at that line count**
(swept across every width from 420 to 900px). The width search prefers fewer
tails at equal depth and never trades a line for them, so it cannot make a blade
worse. Removing them entirely requires ONE CONNECTION PER LINE — a block per
connection — which is a different layout, not a tuning value.

### 27.6 Dynamic width — the blade is sized to what it holds

The blade's left edge is fixed; its right edge is pulled in to the tightest
width that still holds the text in the same number of lines. `width:
fit-content` would NOT do this — it sizes a box to its widest WRAPPED line and
leaves the dead space anyway. The floor for the search is the paragraph's own
`min-content` width, so an unbreakable atom (a bound name) can never be squeezed
into overflowing.

This also retired a special case: a lone connection was to be CENTRED so it
wasn't stranded in a wide blade. A blade sized to its content cannot strand it,
so there is nothing to centre.

| entry | connections | result |
|---|---|---|
| Alexander Morgan Hamilton | 1 | 660px @ 11.49px, 1 row |
| Alfred Bacon | 2 | 690px @ 11.49px, 2 rows |
| Daniel Wadsworth | many | 870px @ 11.49px, 7 rows |
| Jeremiah Wadsworth | 11 | 900px @ 11.15px, 7 rows |

### 27.7 The label

"CROSS / CONNECTIONS" sits OUTSIDE the blade, in the wedge the slant opens,
always on two rows _"even if there's only one row of Cross Connections"_. Its
hover tooltip — the only place the site explains what a cross connection IS —
survived the move from the old footer verbatim, and now opens DOWNWARD: the card
paints over the blade (it has to, so the blade can slide out from under it), so
an upward tooltip landed behind the portrait.

**Each row gets its own right edge.** Aligning both rows to one edge cannot hold
a constant gap against a leaning edge — measured, "Cross" sat 10px off it and
"Connections" 21px. Stepping them makes the label lean WITH the blade, which is
the rule the blade's own text follows. The gap is 16px, borrowed from the card's
own portrait-to-narrative gap (`.narrative`'s `pl-4`) at Sam's instruction.

**The label does not bounce.** It rides out with the blade and stops dead at
full extension — it is lettering beside the case, not part of the moving steel,
so it has no momentum to carry. The draw cancels only the part of the curve past
1, which works because the label's layer is exactly as tall as the blade: a
percentage has to mean the same distance to both.

### 27.8 Colour

| element | value | |
|---|---|---|
| body text | `--color-inkblue` | the card's own ink |
| **clickable names** | `--color-darkgreyblue` = `hsl(224, 30%, 27%)` | greyer and quieter than inkblue; the blade sits below the card in the hierarchy |
| non-clickable names | `--color-inkblue`, weight 500 | the difference IS the affordance |

`hsl(252, 100%, 67%)` (slate blue) was trialled and returned from. It is kept as
a commented line beside the live one in `.cc-blade-row`; the link colour, its
underline (35%) and the hover state all derive from a single `--cc-link`
variable, so switching is one line. NOTE: `layout.css` also carries an unused
`--color-slateblue` at **57%** lightness, not 67 — left untouched.

### 27.9 BUILT AND REVERTED — do not re-attempt without reading this

**The two-column layout for long lists. Deleted, not patched.** The idea is
sound — a full-width line here runs ~170 characters against the 45–75 that prose
reads at — but every version of it deepened the blade instead of halving it. Sam:

> _"instead of maximizing space on the existing CC blade, lets just turn the
> blade into a giant rectangle… I'd rather delete the project and look for a job
> at Starbucks than ever look at this layout again."_

The root error and its whole downstream chain, because each fix was downstream
of the first mistake:

1. **Two columns exist to make the blade SHALLOWER** — the same connections in
   half the lines. Pinning the type to the 13px ceiling in the same breath sent
   the depth back up. Everything else followed from that.
2. A deep blade threw the slant far right → so the slant was CAPPED → which made
   it read as a vestigial notch (and left the corner bug of §27.2 behind).
3. A deep blade needed a big column inset → which opened a wedge of dead white
   INSIDE the blade → and the inset **fed back on itself** (deeper → wider inset
   → narrower columns → deeper), settling at the worst equilibrium.
4. `shape-outside` cannot survive columns at all. It only shortens LINE boxes
   inside the float's own formatting context, and a grid item — or a multicol
   container — establishes its own and CONTAINS the float instead. A
   three-connection blade rendered **636px tall**, exactly the float's height
   plus the padding.

If it is rebuilt: the constraint is that two columns must make the blade
shallower, never deeper, and the type must be FITTED in columns exactly as it is
in one flow.

**An orphan/tail-scoring width search — built, measured, removed, then partly
restored.** The first version priced one extra line at two tails and produced
**twelve tails across ten blades either way**. It was also measured against a
layout that could not break between connections at all (the missing `<wbr/>`),
so its conclusion — "width alone cannot fix tails" — was drawn from bad data and
should not be cited. What survives is the reduced form in §27.4: prefer fewer
tails at EQUAL depth, never trade a line.

**Also reverted:** a `z-index: 3` demote (ghost-taxonomy bug D); the blade's own
drop-shadow (§27.1); centring a lone connection (§27.6); `text-wrap: pretty` and
`balance` (§27.5, no effect).

### 27.10 Measurement lessons — every one of these produced a confident wrong answer

- **A wrapped link has TWO client rects, and the centre of their union is in the
  gap between them.** Two probes clicked that centre, hit the paragraph, and went
  red. Nothing was wrong in the app; larger CC type made links wrap, exposing an
  always-fragile assumption. ~30 other scripts share the pattern.
- **`scrollHeight` is an INTEGER, so a proportional-height test drifts.** "Did
  the line count change" tested as "did height grow in step with size" gave up
  early and cost a one-line blade 1.5px of size. Count line boxes instead.
- **Count only content.** A per-column line count that walked `children`
  included the invisible shaping float and reported a three-connection blade as
  eight lines deep, so the search saw no room and jumped to the ceiling.
- **Get the tie-break direction right.** "Cheapest wins, narrower wins ties"
  inverted to "widest wins ties" silently retired the entire dynamic width —
  every blade went back to full width because the first candidate always tied.
- **A metric measured from the wrong origin is worse than no metric.** Scoring a
  separator's distance from the BLADE's left edge is meaningless when a slanted
  edge starts every line at a different x.
- **Scan, don't binary-search, a non-monotonic objective.** Tail count runs 2 at
  690px and 8 at 735px. There is no midpoint to compare against.
- **`elementFromPoint` never returns an element with `pointer-events: none`** —
  so it cannot be used to verify a tooltip is visible. A screenshot settled it,
  as it has every other time in this document.

---

## 28. THE FEATURED CARD'S FIXED GEOMETRY AND TYPE (AS BUILT, August 4–6)

_(The card's own surface, reworked alongside the CC blade (§27) and easy to
mistake for cosmetics. It is not: two of these are structural invariants the
flight and the deck depend on, and the rest are rules about how a face, a
colour and a number are allowed to change. Every value here was set on Sam's
rendered-pixel verdict. §28.6 records what was tried and returned from.)_

### 28.1 Two constants the rest of the app now depends on

```
CARD_TOP_H = 575    // header row + content row. EXPORTED.
CORNER_R   = 8      // the carved silhouette's radius. EXPORTED.
HEADER_H   = 82     // the header ROW. Fixed.
```

**`CARD_TOP_H` is now the WHOLE card.** The CC footer was the only thing that
ever varied card height; with the connections moved out (§27) every card is
exactly this tall. That retires the height variance behind the row-leaver
"receding edge" problem, and it makes `DeckRiffle`'s phantom sizing exact
instead of approximately right — it imports the constant now, where it used to
carry its own literal beside a comment saying "matches FeaturedCard's card-top
height." **A comment is not a mechanism**, and the two would have diverged the
first time the number moved. `CORNER_R` is exported for the same reason: the CC
blade is carved with the card's own radius.

**`HEADER_H` REVERSES the previous rule, deliberately.** The header used to
auto-size (`minmax(72px, auto)`) so that every card had the same ~12px breathing
gap under its last text line. The cost was that the LOWER CONTENT — the photo,
the narrative, the RightColumn — began at a different y depending on whether the
person had a blurb or a second descent line, a 23px swing measured between a
blurb card and a no-blurb one. A fixed header row buys a **constant content
start** and pays for it with a variable gap underneath. The dial is `HEADER_H`
and there are no other height inputs. The rare dual-descent 4-line card keeps
its own fixed 96px `headerIsCrowded` variant.

### 28.2 A face swap is a CAP-HEIGHT swap, not a px swap

The card's `<h1>` is Outfit 500 at **26px** — chosen because Inter Variable 500
at 24px has an 18px cap height and Outfit has a 16px cap at the same px. 26px is
therefore the size at which Outfit reads as **exactly the size the Inter name
always did**. It is a like-for-like swap, not an enlargement, and the
`shrinkToFit` floor moved by the same ratio (17 → 18.5).

**This is the durable rule: apparent size is CAP HEIGHT, not font-size.** Swap a
face at the same px and the name changes size; swap it at the same cap and it
does not. `NAME_FACE`, `NAME_SIZE` and `NAME_MIN` sit together at the top of the
component so the pair cannot be moved independently.

Scope is deliberately narrow — Sam: _"this request is 100% only for the
FeaturedCard name. I am not interested in changing the font for the name on any
of the other chips."_ The per-person `bio.display_font` override still wins where
it is set.

### 28.3 One ink, at different strengths

`--color-inkblue: oklch(0.307 0.146 265.522)` carries the card's name, its
descent lines, its blurb (at 60%), and **every chip's text across every
relation** — parent, spouse, sibling, child.

**The years drop to 70% ALPHA rather than to a lighter blue.** Alpha keeps them
the same hue as the name above them, so a chip reads as one object at two
strengths rather than as two colours. It also composes correctly with the
died-young dimming — a died-young chip is already `opacity-65`, so its years land
at 0.65 × 0.7 without a third value to maintain. A second colour token would
have needed one.

The CC blade's clickable names are the one deliberate exception
(`--color-darkgreyblue`, §27.8): the blade sits below the card in the hierarchy,
so its links are quieter than the card's own ink.

### 28.4 Age at death — and the honesty rule

`ageAtDeath()` in `dates.ts` renders `(Age 76)` beside the death date, and
`(~Age 76)` when the sources cannot support the exact number. The tilde is not
decoration; it is the whole point.

- **Either end year-only → approximate.** A bare year, or the Jan-1 sentinel
  this data uses for "year known, date not", makes the difference an upper bound.
- **Both ends full dates → exact**, decremented when the death month/day falls
  before the birthday.
- **Same month, unknown day → approximate**, because the unknown day is what
  decides it.
- **A negative span, or one over 120 years → RETURN NULL.** The underlying dates
  disagree; the card says nothing rather than printing a number it cannot stand
  behind. This is the §27-era instinct in a different place: null beats weak.

### 28.5 The vitals stack

Open Sans, at sizes and spacings that were converged on by eye and are recorded
here only so the next pass knows they are measured values rather than round
numbers: portrait→vitals `10.94px`, inter-vital `7.6px`, date `12.45px/normal`,
location `12.08px/light`, MAP `9px` on the baseline. Birth and death blocks are
identical in gap, leading, weight, size and colour — the age span is the only
difference between them, at 70% alpha.

**The bio blurb is NOT clamped.** A `line-clamp-1` was added and removed on Sam's
instruction: an over-long blurb is a DATA defect, and hiding it in the UI means
it never gets fixed. It surfaces. (The 65 over-length blurbs it surfaces are
logged for a Stream A session in `_review/blurb-over-length.tsv`.)

### 28.6 Tried and returned from

- **Carlito** — trialled for the card name and the chips, returned from. Still in
  `package.json`, **not imported**; a dangling dependency, logged in roadmap §29.
- **A 20px card-height cut** — read as too much; the reduction landed at 5px
  (580 → 575).
- **`line-clamp-1` on the blurb** — see §28.5.
- **Slate blue for the blade's links** — §27.8.
- Two font-size instructions were **misread as increases when they were
  reductions**. When Sam says "size the font by 4%", the direction is his to
  state and mine to confirm, not to infer.

### 27.11 The tail preference, verified (August 6)

§27.4's "prefer fewest tails at equal depth" was challenged on the suspicion
that it was inert — a documented feature doing nothing. It is not, and the
check is worth recording because the first two conclusions drawn from it were
both wrong.

**First wrong conclusion: the metric is broken.** It was diagnosed on a blade
that has NO tail, where `0` is the correct answer. Measured against a
line-reconstruction ground truth over twelve blades, the shipped reading agreed
on eleven.

**Second wrong conclusion: the twelfth proves it misreads.** It does not. The
disagreement is `"Pierson was first rector."` at **125px against a 124px
limit** — one pixel. The reading was right; the THRESHOLD was slightly tight,
because `AVG_CHAR_W` claimed to be measured and was not: real blade text runs
0.449px per character per px of font-size, not 0.43. Corrected to 0.45, and
agreement is **12 of 12**.

**Then the actual question — does the preference change anything?** A/B over the
same candidate widths, one rule picking fewest-tails-then-narrowest and the
other picking narrowest outright:

| | with | without |
|---|---|---|
| Thomas Shepard | 675px, 0 tails | 615px, 1 tail |
| Alfred Bacon | 690px, 0 tails | 645px, 1 tail |
| Sherman Thacher | 645px, 0 tails | 615px, 1 tail |
| all twelve | **8 tails** | 11 tails |

Three blades in twelve, each held 30–60px wider than the absolute minimum to
avoid stranding a word. **That is the trade, and it is the right way round** —
Shepard is the entry whose stranded "verdict." prompted the check in the first
place.

**The lesson underneath all three steps: verify a metric against a case that
exercises it.** A metric tested only where its answer is zero tells you nothing,
and "this feature does nothing" is a claim that needs an A/B, not an inspection.

### 27.12 The blade's layout must not depend on how you arrived (August 6)

Sam: _"when I arrived at Thomas Shepard via CC from Thomas Hooker, 'verdict.' was
on the top line. When I navigated to Shepard's father and back down, it had
wrapped again… why would it shift based on where it comes from?"_

Reproduced exactly — the same person, three routes, two answers:

| arrival | width | line 1 ends |
|---|---|---|
| cold load | 675px | `…verdict. ●` |
| via a CC (deck) | 675px | `…verdict. ●` |
| **via a chip promotion** | **615px** | `…Wilson's` |

**`getClientRects()` is the one measurement in `fitBlade` that a transform
affects.** `scrollHeight` and `offsetWidth` are layout metrics and ignore
transforms entirely, which is why the depth search and the min-content floor
were identical on every route. The tail metric reads rects, and it runs while
the card may still be mid-flight:

- a **chip promotion** mounts the card scaled DOWN, so every rect came back
  small, every candidate width looked equally full of tails, and the preference
  degraded silently to "narrowest" — which is precisely the 615px the A/B in
  §27.11 predicts for the no-preference rule;
- a **deck arrival** enters at full size, and a **cold load** has no flight at
  all, so both measured correctly.

Fixed by dividing the flight's own scale out of the measurement, taken as
`hypot(a, b)` of the flight element's transform matrix so it stays correct when
the deck has also tilted the card. All three routes now produce 675px, and
`verdict.` stays on line 1. Verified path-independent across six more entries
(cold load vs leave-by-parent-chip-and-return): zero differ.

**The durable rule: any measurement taken during a flight must be scale-honest,
or it is measuring the flight rather than the content.** This is the third
appearance of the same family — §27.3 records travel being expressed as a
percentage because a pixel measurement read a scaled rect, and §27.4 records the
type search reading a 17px box against a final 132px. A layout value must be a
fact about the PERSON, never about the route taken to them.

---

## 29. THE COLOUR SYSTEM — SHADOWS, LINE-STATUS SHADING, AND THE GROUND THAT GOVERNS THEM (AS BUILT, August 7)

**Everything in this section was measured against ONE background: the photographed manuscript
parchment (`paper-manuscript-*.webp`, design §—/`docs/background-sources.md`).** No second sheet
existed yet. Sam intends to buy another once he has lived with this one, and **every number below is a
property of the pair (colour, ground) rather than of the colour** — a new sheet moves all of them.
Re-measure; do not port the hexes.

### 29.1 The one measurement that explains the whole session

```
manuscript ground = rgb(249, 244, 234)  =  Lab  L* 96.3   a* -0.0   b* +5.4
```

`b*` is the blue–yellow axis and the ground sits **warm** on it. Two consequences drove every
decision that follows:

1. **Every cream moves TOWARD the ground.** A cream is warm by definition, so tinting a card cream
   reduces its distance from the parchment. This is why six of them failed.
2. **A plain WHITE card already separates from the ground by ΔE 6.5.** That is the floor. Any status
   colour below 6.5 makes the card it marks *less* visible than leaving it alone — a perverse result,
   and the single most useful number to keep.

### 29.2 The colours Sam rejected, in order, and why

| # | value | Sam's verdict | measured |
|---|---|---|---|
| 1 | `#fffdf2` banana cream, lightest of his sheet | "so close to parchment… works better against the parchment solid background you created but not this paper image background" | ΔE **3.0** vs ground — under the floor |
| 2 | `#fefada` (4 rungs down the same row) | rejected alongside the burial bug | 11.1 — cleared the floor but read loud |
| 3 | `hsl(30, 38%, 92%)` | "not working either" | 3.3 — failed the *opposite* way: darker than the ground, same hue |
| 4 | `#fffcea` @ 50% **opacity** | "something went very wrong" | see §29.5 — translucency broke two things |
| 5 | `#fffef5` (= `#fffcea` at 50% intensity) | — | 3.4, i.e. back on rejection #1 |
| 6 | cool pair `hsl(195 62% 94%)` / `hsl(160 78% 96%)` | "too rich and dark" | cleared everything, but loud |
| 7 | `#8e9894` / `#8a9295` (HSB brightness ×0.6) | never shown — built, looked at, discarded | mid grey-greens; a different design language |
| 8 | `#e6fcf4` / `#dcf0f7` (40% deeper) | "still too bold and bright" | — |
| 9 | `#d1faeb` / `#d1eaf4` (8 pts bolder) | "way too much change… back by 90%" | see §29.6 |
| 10 | grey `#efefef`, then `#f7f7f7` | "way too dark", then "still too dark" | landed at `#fcfcfc` |

**The through-line:** attempts 1, 3 and 5 all died at ΔE ~3 against the ground. That is not three
unlucky swatches; it is the same wall three times, and §29.1 is the reason.

### 29.3 What actually worked — and the two pivots that got there

**PIVOT ONE — cool, not cream.** A cool tint moves *away* along `b*` and clears the floor at a quarter
of the departure from white:

```
#fefada  warm cream    vs white 16.5    vs ground 11.1
cool tint              vs white  4.3    vs ground  7.2     same legibility, a quarter as loud
```

Sam: *"lets go cooler instead of lighter."* Search, don't guess — the winning tint was found by
sweeping HSL space against **three** simultaneous constraints (≥6.5 vs ground, ≥4.0 vs a white card,
≥5.0 vs the CC blade's own pale blue). That third one is why the palette leans **green-side**: the blue
side collides with the blade (`#f2f5f8` scored **1.8** against it — two different signals reading as
one surface).

**PIVOT TWO — mark the outsiders, not the line.** The first build tinted Hooker descendants. They are
the overwhelming majority, so nearly every card on the page went coloured — no signal at all. Inverting
it (bloodline ≈ the paper; spouses and easter eggs tinted) is what finally read.

### 29.4 The shipped palette

```
Hooker descendant   #fffdf8   warm near-white   + descent line #827400 (see 29.8)
spouse / married-in #f3fefa   mint
easter egg          #f1f8fb   light blue
no status           #fcfcfc   true neutral grey (a* 0.0, b* 0.0)
shadow ink          rose400 hsl(7 20% 60%) @ 0.38 / 0.30
CC blade paper      hsl(223 64% 98%)
```

Note the endpoint: `#fffdf8` sits **ΔE 3.0 from `#fffdf2`**, the very first swatch Sam tried and
rejected — the same instinct, 3 points less yellow, which is exactly the amount that was drowning it.

### 29.5 Translucency is not an option for a card (built, reverted)

`#fffcea` at 50% **opacity** was tried. Two things broke, both structural rather than tunable:

1. **A translucent card shows its OWN drop-shadow through itself.** `filter: drop-shadow()` builds the
   shadow from the element's alpha silhouette and composites it behind; at 50% alpha you see half of it
   through the card. The body rendered **13 points darker** than plain compositing predicts — so the
   colour on screen was never the colour specified.
2. **Any opaque mask inside the card double-composites.** The burial pin paints a fill behind its text;
   against a 50% card the two layers reach ~75% and the patch reads lighter (measured: card body
   `rgb(238 229 217)` vs burial patch `rgb(244 236 221)`).

If translucency is ever wanted, the tint must go on a layer ABOVE an opaque base, or the shadow must
come off the wrap. `--card-fill` exists for exactly this and currently just tracks `--card-bg`.

### 29.6 The near-white compression trap — the best tip in this section

Down at L\* 98 a tint is squeezed against white and has almost no chroma. Lightness and saturation stop
being independent, so **a small lightness move releases a great deal of colour**:

```
              before         chroma      after          chroma    ×
mint    (246, 254, 251)         8    (209, 250, 235)      41    5.1
blue    (242, 249, 252)        10    (209, 234, 244)      35    3.5
```

Eight points of HSL lightness multiplied the colour by 3.5–5×. Sam: *"way too much change… get it back
by 90%"* — the value he actually wanted was **0.8 of a point**. **Up here, move these in fractions of a
point.**

### 29.7 Alpha is not transferable between tints

The same trap in the shadow system. How dark a shadow reads depends on the DISTANCE from ink to ground,
so an alpha means something different for every colour. Measured as luminance drop in the 6px band
under a chip, ground ~247:

```
black    @ 0.10  (the pre-Aug-7 shadow) ...... Δ 4.9
rose300  @ 0.10  (l 72%) ..................... Δ 4.8   <- a 3.2x BIGGER shadow, not one shade darker
rose300  @ 0.38 .............................. Δ16.6
rose400  @ 0.38  (l 60%) ..................... Δ25.0   <- shipped
rose500  @ 0.38  (l 44%) ..................... Δ34.3
rose500  @ 0.50 .............................. Δ44.8   ("too much")
rose500  @ 0.90 .............................. Δ77.6
```

Row 2 is the trap in one line: at black's own alpha, a rose shadow **3.2× larger** is not one shade
darker — the size increase is cancelled exactly by the lighter ink. **Read the Δ column, never the
alpha, when comparing two tints.**

### 29.8 The descent line in gold, scoped to the bloodline

"Founder of the American Hooker Line" / "Eighth Generation Descendant of Thomas Hooker" render in
`#827400`, scoped under `.hooker-line`. Non-descendants get descent lines too — an in-law's reads "Wife
of Hooker Descendant" — and those keep the ordinary ink, so the gold means specifically **this person
IS the line**. Walked `#bba600` → `#594f00` → `#827400`.

All three of the label's render branches (merged cousin-marriage, dual-descent, ordinary) carry the
`.descent-line` hook, so the colour cannot apply to two of three and silently miss the rare one.

### 29.9 Source order IS the precedence rule

All the status selectors are (0,2,0), so the cascade decides by declaration order. Current order and
why:

```
spouse-line     mint     declared first
hooker-line     cream    blood beats marriage for someone who is both (cousin marriages are common here)
ee-line         blue     declared last: an easter egg is usually ALSO a spouse, so if mint won,
                         the category would be invisible
```

This is load-bearing. Reordering silently reclassifies people.

### 29.10 The alternative that is built and dormant — the SPINE

Before the fills were settled, a 4px rule down the card's left edge was built (gold = bloodline, teal =
married-in). It solves the problem the fills fight: **an edge separates by contrast at a boundary
rather than by area**, so it can be saturated and warm without competing with the parchment, and N
statuses become N legible rules instead of N near-identical washes.

Sam: *"don't delete that but definitely lets revert."* It is intact, switched off by **`--edge-w: 0px`**
— set it to `4px` and it returns exactly as it was. Notes worth keeping if it comes back:

- It must be a **pseudo-element**, not a border (a border joins layout and shoves every chip's portrait
  4px right) and not an inset box-shadow (which paints *beneath* child content — a chip's left edge IS
  its portrait, so the photo would hide it).
- It inherits the card's `clip-path`/rounding for free, so it follows the carved notch.

### 29.11 The palette is crowded — where it will pinch first

All four card colours now live inside ~5 ΔE. Tightest pairs: grey-vs-hooker **2.7**, grey-vs-blue
**3.4**. The grey is **boxed in** — lightening moves it away from the blue and toward the cream — so
past `#f7f7f7` there is no separation to buy by keeping it dark:

```
#f7f7f7   vs hooker 3.4   vs mint 4.6   vs blue 2.8
#fcfcfc   vs hooker 2.7   vs mint 4.4   vs blue 3.4
```

Take the lightness the eye wants. **If the set ever needs pulling apart, move a TINT, not the grey.**

---

## 30. THE STAGE MUST NOT MOVE WHILE ANYTHING IS FLYING (AS BUILT, August 8)

The grandparent tier is the first thing in this project that changes the LAYOUT during a flight, and it
took a whole session to learn that that is the only fact about it that matters. Everything that went
wrong — a hero born a hundred pixels below its own chip, a spouse chip parked in mid-card, a stage that
sagged and lifted right before settling — is one cause wearing different clothes.

### 30.1 The arithmetic, which is the whole section

An element that is IN FLOW during a transition is painted at

    layout(t) + transform(t)

Both halves are usually right on their own. The transform is a FLIP: it measures a destination and
animates to it, and it lands on its element's real layout position whatever that turns out to be. The
layout is a CSS transition or a block collapsing. Each is monotonic. But if they ride DIFFERENT CURVES,
the sum is not the path either of them describes.

Write the collapse as ΔL and let `c` be its curve, `e` the element's own. The composite works out to

    ideal path  +  ΔL · (e − c)

That error term is the entire subject. It is zero only when `e ≡ c`, and on a real stage there are four
curves at once — `growFrom`'s easeOutBack on the hero's ~500ms, `morphIn`'s fixed 360ms, the row
entrance's 420ms, `flyOut`'s pinned leavers on their own. No choice of `c` cancels them all.

**Why it hides.** The error is a fixed number of pixels regardless of how far the object travels. Give an
object 145px of real vertical travel and an 8px error is a slightly uneven descent nobody can see. Give it
ZERO real travel — which is exactly a parent chip promoted while the tier is open, chip at y250 and card
seat landing at y250 — and that error IS the entire vertical motion: the object sags and recovers, and
does it in unison with everything else in flow, because they all share the same ΔL. Sam saw it as "a very
small inverted arc … all elements pulling up right at the final moment", and read the cause correctly off
the screen before the instrument found it: *"the chips meet them slightly below their finished place."*

**The corollary that actually ships.** A FLIP measured BEFORE a pending layout change is wrong by exactly
that change. Do not try to make the layout settle before the measurement (see §30.3). Correct the delta
ARITHMETICALLY — `flight.ts pendingCollapse()` — and let the layout change in one frame. Then no object
composites anything, because there is no second curve to composite against.

### 30.1b The same cause, three symptoms — with the numbers

Every one of these was reported separately, by eye, over four exchanges, and each was measured against the
`--control` reading before it was believed. They are one defect.

| symptom | measured | what the delta was actually saying |
|---|---|---|
| **The promoted grandparent doesn't travel** — "it just morphs right there … there is a gap." | Hero **born at y205 — 100px BELOW the chip it came from at y105** — and covering **45px** where an ordinary promotion covers 145. The floor teleported −145px on the swap frame. | `dest` was measured while the tier still occupied layout, so the FLIP aimed at a seat one pitch too low. The card was not travelling; the stage was rising to meet it. |
| **The spouse chip parks in mid-card** and "jumps" into the notch. | Ghost lands at 421ms; the card's own corner arrives at 538ms — **119ms parked in open space**. | Two faults at once: her clock was the dead constant 454ms (see roadmap §32.1), and her seat's rect was baked before the collapse lifted it, so she flew to the card's TIER-OPEN corner. |
| **Everything sags and lifts right at the end.** | The arriving row chips dip **8px at 305ms**; hero, leavers, floor and notch all provably direct. | The error term itself, on objects whose true travel is zero. |

**The grandparent promotion reads as a real journey now for one reason:** `dy` finally describes the
journey. `origin.top − dest.top + pendingCollapse()` is the honest delta, so the card is born on its own
chip at y105 and descends the full 145px on a single curve, exactly as a parent promotion does — same
distance, same clock, same settle. Nothing about the motion was styled or tuned to achieve that; the
measurement was corrected and the existing physics did the rest. That is the shape of every real fix in
this section, and the reason `settleTrim` (which DID tune something) was deleted the moment the delta
became honest.

### 30.2 The shipped shape

- **The collapse is INSTANTANEOUS.** One frame, on the navigation, never animated.
- **Every FLIP is told about it.** `growFrom` and `morphIn` add `pendingCollapse()` to `dy`. The demoting
  card — the one object that is neither pinned nor FLIP'd, because it is still in flow — carries it as a
  CONSTANT offset, since its own rect was measured in the pre-collapse frame; its seat is re-queried live
  in the post-collapse frame and the two cancel.
- **The block must leave LAYOUT immediately, which a `duration: 0` outro does not do.** Svelte keeps a
  block mounted until every outro INSIDE it finishes, and the tier's chips carry real ones (~500ms). The
  block therefore held its full 145px for the whole flight and vanished in one frame at the end — the
  same defect wearing a different hat. It is removed from layout by a class instead.
- **That class may NOT be armed on `clickcapture`.** §6's dead end is precise about why arming a flag
  there is safe — *it changes no geometry*. The moment the same flag drove a `display: none`, the row left
  between capture and handling and `warmPersonLinks` read the clicked chip's origin off a hidden element:
  the card flew from a 63×39 box at (17,175). It is armed in the navigation effect, one flush later.
- **`captureTierOpen` asks whether the tier OCCUPIES LAYOUT, not whether it exists.** A collapsed block is
  still in the DOM for as long as its chips outro, so a presence test answers "yes" to a navigation made
  in that window and hands it a 145px correction for a collapse that is not coming.

### 30.3 What was built and reverted, and why each looked right

| attempt | verdict |
|---|---|
| Animate the collapse on the ARMY's clock | The army is four clocks, not one. Fixes nobody. |
| Animate it on the HERO's clock | Fixes the hero exactly and nothing else; the arriving row chips then dipped 8px at 305ms. |
| Trim the SETTLE amplitude (`settleTrim`) | Treats a symptom. Right for the hero — 4px carry back to 2px — and irrelevant to any object whose dip is not a settle. Deleted once `dy` became honest, which is the tell that it was a correction for a wrong measurement rather than a design value. |
| Feed the settle solver the SHORTER (true) distance | **Backwards, and it measures as backwards: 254 → 256.** The solver targets a carry in PX and returns it as a FRACTION of the distance it is given; the fraction is then applied to the unchanged transform delta. |
| Collapse in `$effect.pre` so the layout is settled before measurement | The right instinct, the wrong lever. Forcing it into the same flush makes `growFrom` measure during the reflow — the exact hazard `captureFlightOrigin`'s note exists for — and it read garbage. Also two hydration deaths: `$effect.pre` runs during SETUP, so anything it touches that is declared BELOW it is in its temporal dead zone. That does not warn; it kills the client while SSR still returns 200. |
| Move the tier closer to the top of the screen (reduce the push) | A real lever but not the cause: the error is ΔL·(e−c), so halving ΔL halves it and never removes it. Sam's own test settled it — the dip survived the move. |

### 30.4 Two rules this session added that are not about layout

**A person's motion is owned by their `morphIn`.** `chipExit` already said this for a departing spouse who
also arrives as a parent; it simply had no way to reach a ROW leaver, because until the tier there was
never a row leaver who also arrived in a row. Click a parent with the tier open and the grandparent above
it becomes a parent of the new focus: he morphs in correctly AND his tier chip ran the row march, so a
second copy of him slid down and faded out under the card. `morphIn` now hides every other copy of the
person it is carrying. It must be `visibility`, not `opacity` — `flyOut` sets opacity from a compiled CSS
animation, and an animation beats an inline style in the cascade.

**A traveller tracks its seat.** Baked WAAPI keyframes resolve an endpoint once. That is right only for a
seat that is already at rest, and the split between "notch seats hold still, row seats don't" stopped
being true the moment a tier could lift the whole slot mid-flight. Every traveller now re-queries its seat
per frame, which is `shrinkTo`'s own moving-destination rule stated for a portalled ghost. Where the seat
IS static the tracker reproduces the baked path exactly — same solver, same inputs, same curve.

---

## 31. THE DESCENDANT TIER — HOVER-REVEALED GRANDCHILDREN (AS BUILT, August 8)

_(§31.5b gained an August 10 note: the two tiers no longer share a trigger. The DESCENDANT tier is still
hover-revealed and everything here describes it accurately; the ANCESTOR tier is now opened by a click
and its dismissal rules diverged with it. See the block quote in 31.5b.)_

The mirror of §29's ancestor tier, pointed down: hold a child chip for `HOVER_INTENT_MS` and that child's
own children open beneath it. Same hold, same grace, same region-based dismissal. What is NOT the same is
the thing that matters.

### 31.1 A descendant tier moves nothing above the card — and must never inherit the ancestor's correction

The grandparent tier opens ABOVE the parents row, so it pushes the whole stage down and every flight
afterwards has to know about the collapse (§30, `pendingCollapse`). A descendant tier opens INSIDE the
children section, below everything: no push, no collapse, no FLIP measured against a layout that is about
to change. Promoting a grandchild therefore measures **0 steps** of floor movement, and that is asserted
in `probe-tier.mjs --gcpromote` precisely so it stays true.

**`pendingCollapse()` keys on `.grandparent-tier` specifically. Do not generalise it to "any tier."** It
reads like a tidy-up waiting to happen, and the moment it happens every grandchild promotion is handed a
145px correction for a collapse that never comes — §5.3.1 of the handoff, arriving by a new road.

### 31.2 The gestures are the house's, scaled — not new ones

The first build clipped a growing box to reveal the row. Sam rejected it on sight and was right: *"I don't
do the scroll banner reveal style, the chips are representing individuals."* A card is an object that
moves, not content that is uncovered. What shipped is the existing vocabulary:

- **Arriving** — `revealPending`'s directional entrance, which is already what a children row does: fade in
  while settling DOWN from above. The one thing that cannot be copied verbatim is the DISTANCE: that
  entrance travels a full tier, and a full tier above these chips is the children row itself. The travel is
  therefore the gap that exists — the chip's top to the block's top — which starts them level with the
  bottom edge of the child they belong to and never above it.
- **Leaving** — a quick fade with 10px of drift. Not the army march: once the pointer is off the chip the
  user's attention has moved on, and a full march swept through the rows below on a tall page.

### 31.3 The hovered chip keeps its column

The first build removed the siblings from FLOW, which let the row re-centre the survivor for free — and
slid the chip sideways out from under the pointer hovering it. Leaving them in flow at opacity 0 means
NOTHING reflows: x is preserved by doing nothing, and the only movement is one row pitch of `translateY`
when the chip is not already on the top row. The rise is measured off the DOM, never computed from an
index — which row a chip wraps onto is a layout decision, and index arithmetic is a second answer that
disagrees at other viewport widths.

The slot's height collapses to one row so the tier hangs off the chip rather than under an empty second
row, and that height is driven between two explicit px values **because a CSS transition cannot run from
`auto`** — the class-only version snapped the slot up 87px instantly while the chip rose over 420ms, and
the tier's first chips were painted 17px into the children row.

### 31.4 Generations are never on screen in each other's rows — in EITHER direction

Asserted per frame, against every VISIBLE child chip rather than the hovered one alone (on dismissal the
slot re-expands and row 2 reoccupies the band the grandchildren stand in — testing the hovered chip cannot
see it). Three things enforce it, and each was found by that assertion failing:

1. The arrival's travel is the gap, not a tier (above).
2. The siblings step aside FIRST, with a deliberate ~60ms overlap so the exchange reads as one gesture —
   Sam wanted *"some kind of flip moment of connection"* — and no more, because more is a generation
   standing in another's row.
3. On dismissal the focused layout is **HELD** until the grandchildren have finished fading. The chip stays
   risen, the siblings stay hidden, the slot stays collapsed. Only then does anything come back.

### 31.5 The connector belongs to ONE chip, so a grandchild is CENTRED under it

The grandchildren sit in a normal centred row; the line hangs off the hovered chip wherever it is. Those
two facts conflict whenever the chip is off-centre, and the row slides just far enough to resolve it —
**centring** the nearest chip on the line, clamped so a full-width row is never pushed off the stage.

Three attempts, each failing in a way worth keeping:

| aimed at | result |
|---|---|
| the CHIP's centre | 6px off. The connector is centred within the tier BLOCK while the row is centred on the STAGE, and those centres are not required to agree. Aim at the LINE and the assumption disappears. |
| the minimum shift that brings a chip UNDER the line | Landed on a chip's outer EDGE — technically connected, visibly wrong. |
| the minimum shift that makes CONTACT | Missed by 6px on a wide row, because the line was in the 12px GAP between two chips. Same defect as the far-edge case, so one rule must cover both. |

### 31.5b The keep-alive region must test PAINTED parts, and one edge means intent

Two bugs at once, with opposite causes, and both reported as "it closes when I move onto a grandchild."

**It tested the wrong box.** `.grandchild-tier` is the block's LAYOUT rect; the row inside it is translated
by gcRowX so a grandchild sits under the hovered chip, and a transform on a CHILD does not move the
parent's rect. So the region was correct for a chip near the centre (shift ≈ 0) and wrong for one out at
the edge — the real chips were outside the box being tested. Sam isolated it without the code: Nancy, near
centre, worked; Edith, out on the right, did not. Test the painted parts (the chips and the connector),
whose rects carry every ancestor transform.

**And it treated every exit alike.** Leaving a chip through its BOTTOM is the one exit that means "I am
going to look at those" — it is the direction the tier is in. Every other edge means the opposite, and a
300ms grace on those left a row the user had already dismissed hanging around, while a generous 24px pad
made a corner exit read as still hovering. So the bottom opens a CORRIDOR down to the row with no timer in
it at all, the chip itself gets almost no pad, and any other edge closes at once.

The corridor spans the chip's column UNION the row's, because the row slides to put a grandchild under the
line and a pointer heading for a chip at the far end of a wide row would otherwise leave the corridor
before it arrived.

**BOTH TIERS NOW CARRY THIS RULE, with the sign flipped** — the ancestor row sits ABOVE its chip, so there
the TOP edge is the one that means intent and bottom/left/right close at once. Sam asked for the same
guardrails on both, and they are the same rule: a region test on every move, a corridor on the one side the
row is on, immediate close everywhere else.

> **THE TWO TIERS DIVERGED ON August 10, and everything above still describes the DESCENDANT tier
> exactly. The ANCESTOR tier changed in five ways, all downstream of one decision — it is no longer
> opened by a hover.**
>
> **It opens on a click.** A small "Show parents" sits above each parent chip's right edge at 55%
> opacity, present only where there is something to show. Sam's argument was a ratio: "hovering on the
> parent chips is going to reveal the grandparent chips 9x more unintentionally than intentionally —
> users are going to naturally leave their mouse on the parent chips after clicking them." A gesture the
> user makes for another reason cannot also be a command.
>
> **The no-parents SHAKE is gone with it.** It existed to answer a hover that would otherwise do nothing,
> and had to perform that answer AFTER the user had already committed. A chip carrying no trigger says
> the same thing earlier and more quietly. (The descendant tier keeps its shake — `SHAKE_MS` and
> `HOVER_INTENT_MS` are both still live for it.)
>
> **The parent chip is no longer a keep-alive region.** It was one only because hovering it is what
> opened the tier, and a chip cannot dismiss a row it is still summoning. Dropping back onto it now
> dismisses, which is what Sam asked for; its top edge survives only as the corridor's reference.
>
> **The corridor's floor is the MIDPOINT** between the row's chips and the parent chip, not the chip's
> top edge. Reaching to the chip meant leaving downward cost the user the whole descent. The reason this
> did not work on the first attempt is worth keeping: the `.connector` spans the ENTIRE gap (measured
> 155 → 225 with the chip's top at 225), and it was being counted as part of the row — so `rowBottom`
> equalled the chip's top and the midpoint was arithmetically identical to the old floor. The connector
> is out of the parts list; it lies inside the corridor anyway.
>
> **The side exits get a 200ms grace** (0 → 400 → 200) and the pad is **12px, not 24** — both because a
> click needs far less forgiveness than a hover did.
>
> One addition with no descendant equivalent: **leaving the WINDOW through the top closes the ancestor
> tier.** Above the row is otherwise not an exit at all — there is nowhere up there to go — so the roof
> keeps it alive for any pointer merely high on the page. Detected with `mouseout` on the window plus
> `relatedTarget === null`; `mouseleave` on `<svelte:body>` was tried first and silently never fired,
> proven not to be the event (a synthetic one reached a hand-added body listener on the same page).

The reason an edge rule is safe NOW when it was reverted before (handoff §6) is that the old one watched
for the CROSSING EVENT. Opening the ancestor tier drops the stage 145px under a motionless pointer, so the
cursor lands inside the grandparent row without the user moving — that fired a spurious top-exit, and
nothing could then dismiss the tier. Asking "is the pointer still somewhere this tier is about" on every
move has no such failure mode: a stage that moves under a still pointer simply answers the question again,
correctly. The 300ms grace is retired with it — the motion it protected is the one heading for the row, and
that motion now has a corridor instead of a timer.

### 31.6 A CSS transition on a shared element will collide with a navigation

The chips' fade needs `transition: opacity` on `.children-slot > .flight` — the same elements every
navigation animates. Left unscoped it turned the demote's atomic swap into a race: `revealPending` exposes
the landed chip as a STEP (fade 0) precisely because the card was sitting on it, and a 200ms transition
made that step a fade competing with its own WAAPI reveal. **The demoted card flashed once after it had
already settled in its child seat** — measured α0 at 315ms, and confirmed by restoring the bug on purpose
before believing the fix. The transitions are now scoped to a focus/settling window and can never be live
during a flight. Any future hover state on a `.flight` element inherits this hazard.

---

## 32. A SECOND DESCENT — THE PYNCHON LINE AND ITS PRISM (AS BUILT, August 8)

The project has always had one line: Thomas Hooker's. This adds a second — Hon. William Pynchon down to
Thomas Ruggles Pynchon Jr. and his son Jackson — and the interesting part is not the rainbow, it is what
shape the membership takes.

### 32.1 A LIST, not a boolean — because the titles are ordered

The obvious design is `classification.is_pynchon_ancestor: true` on the ~20 people. Two things are worth
recording about why it is not that:

- **The "18,000 false entries" objection is unfounded.** Absent means false; a flag is only ever written
  where it is true. That is not a reason to avoid one.
- **A boolean still cannot express the titles.** They are ORDERED — "Twelfth Generation Descendant of
  William Pynchon" — and a true/false cannot say which generation. A second hand-kept
  `pynchon_generation` would answer it and then rot: insert a corrected generation mid-line and every
  number below it is silently wrong, with nothing to catch it.

**An ordered line derived from the parent graph answers both at once.** `scripts/derive-pynchon-line.mjs`
walks the edges already in canonical and writes `src/lib/data/pynchonLine.ts`. Membership, generation and
therefore every title fall out of one source; insert a generation and everything below renumbers itself;
and because it is derived rather than listed it cannot drift from the genealogy it describes. Re-run it
after any canonical change that touches the line.

It lives in the FRONTEND, not canonical: a background and a title are display concerns, and the
genealogical facts they are computed from (the parent edges) are already in canonical. No schema change,
no regenerate, no per-person edits, one file to delete if the feature is ever dropped.

### 32.2 Two sets, and they are not the same people

- **RAINBOW** — the direct line to Thomas plus the mother at each step. 21 people.
- **TITLE** — the line, plus an explicit `TITLE_ONLY` list of people named individually.

The distinction is Sam's: *"all of the pynchon tree can get these titles but only rainbows in direct line
to thomas."* Note the trap that phrase hides — walking ALL descendants of the founder returns **955
people**, the entire American Pynchon tree. "The Pynchon tree" meant the line being curated, not every
descendant. The generation is still derived for anyone added to `TITLE_ONLY`; only membership is a
decision.

The rule that settles the spouses is **ancestors of THOMAS, plus Jackson** — which is why Ann Andrew is in
(she is an ancestor) and Melanie Jackson is out (Jackson's mother, but not Thomas's ancestor). Stated that
way it decides cases nobody has looked at yet.

### 32.3 The titles are the Hooker line's own words

`generation.ts`'s `buildDescendantLabel` was already line-agnostic — it takes the founder's name and
derives "Founder of the American <Line> Line", then Son → Grandson → Great-Grandson → Fifth Generation
Descendant. So the Pynchon line does not get a second convention that could drift from the first; it gets
the same function. The only shim is a scale offset (our walk counts the founder as 0; that function counts
a son as 2, per the off-by-one its own comment records), and it is commented where it happens.

The Pynchon label renders purple→magenta through `background-clip: text`, so a card carrying two descents
separates them without being read. Hooker stays house ink blue.

### 32.4 The prism, and what a chip is not

A photographed spectrum, not CSS. Five CSS attempts preceded it and the failures are recorded in §31.6 and
in the component; the short version is that a repeating gradient is banding by construction, a linear MASK
has a straight edge by definition, and blurring an already-smooth gradient only spreads the pigment until
the card renders white.

**A chip is not a small card.** `cover` at 220×75 crops the source to a horizontal slice of one hue — a
stripe, the one thing this effect must never be. Chips get their own frame (`200% auto`, off-centre) and
their own veil. The veil ended up NEAR the card's (0.48 vs 0.45) rather than well above it, which was the
correction: the crop already mutes the band at chip scale, so protecting the type a second time just
washed it out.

The fade is a **white veil layer, never `opacity`** — a veil tints the image without touching anything the
element draws, and has no edge to give away. It is the only dial in both components.

---

## 33. THE STAGE'S THREE REGISTERS — SCREEN-SIZE ADJUSTMENT (AS BUILT, August 8)

_(Phase 2.75's foundation. Supersedes §13.3's proposed mechanism — the world model there is right and
the mechanism is wrong; see 33.1. Read with §12 (layout tiers) and §13 (viewport lock).)_

**If you are here to change how the app behaves at a screen size, everything you need is
`src/lib/state/stage.svelte.ts` and this section. One module reads the window; nothing else may.**

### 33.1 A LENGTH, NOT A TRANSFORM — the finding the whole phase rests on

§13.3 proposed `transform: scale(...)` on the stage group, calling it "semantically free in the world
model: a smaller window = the camera sits slightly higher above the table." **The world model is right
and the mechanism is wrong**, and it is wrong in a way that would have cost a week to discover from the
inside. `scripts/spike-scale.mjs` put `scale(0.8)` on `.page-container` and measured three things:

| what | asked for | got |
|---|---|---|
| in-stage `position: fixed` pin at a captured viewport rect | (139, 1027) | (253, 822) |
| `translate(100px)` applied in-stage | 100px | **80 visual px** |
| body-portalled handoff ghost | correct position | correct position, content at 1:1 |

A transformed ancestor becomes the containing block for its `fixed` descendants, so every `out:flyOut`
leaver lands wrong — the code already knew this, in the `.grandparent-tier` comment that chose `left`
over `translateX` for exactly this reason. And the second row is the fatal one: **a transform re-bases
the coordinate space `flight.ts` lives in.** Every delta it derives from a measured rect and applies as
a translate is wrong by 1/s. That is not a handful of call sites; it is 2,465 lines of constants tuned
by eye over a month.

**A real length has none of this.** If the card is genuinely 832px wide rather than visually 832px
wide, every rect the motion engine measures is true, every delta it computes is true, every translate
it applies is true. Only the ~10 constants that *assert* a size from memory go stale, and those are
named values at module scope.

The hybrid forces the same conclusion independently: type can only step separately from the frame if
the frame is a real length. Under a transform you would counter-scale every text node by 1/s — fragile,
and visibly soft at non-integer scales.

### 33.2 THREE REGISTERS, and the rule for deciding which a number belongs to

Two dials were designed; a third was forced by the chips within hours. This is the taxonomy to reach
for when adding anything new:

| register | var | scales with | what belongs to it |
|---|---|---|---|
| **frame** | `--stage-u` | continuous, ≤ 1 | card width/height, chip boxes, photo boxes, padding, gaps, the notch, the blade, header padding |
| **reading type** | `--type-k` | discrete, **≥ u** | narrative bodies, NB headers, RightColumn rows, the bio blurb, descent lines |
| **label type** | `--chip-k` | **= u** | every chip's name, dates and union line |

**`k ≥ u` is the hybrid, and its bill comes due as content.** Text that does not shrink as fast as its
frame means a card at compact density holds *proportionally more* text than the same card at 1440. A
fixed frame with growing relative content overflows itself — which is why the content budget
(`childCap` / `nbCap`) is not an optimisation but a structural requirement of this choice.

**A chip is not running text.** The third register exists because holding a chip's type up on `k` while
its box shrinks on `u` grows the text relative to its container at every step down. A chip is a label
on a 47px object — *recognised*, not read. Reading text steps; labels scale. At u = 1 all three are
identical and nothing moves.

**The same split applies to any height that is a stack of type.** `HEADER_H` was scaling wholly on `u`
while its contents scaled on `k`; §28.1's documented ~2px overrun (2.4% of 82) grew to 13px of 57 —
**23%** — turning a deliberate hairline into a clipped blurb. Split into `28px padding × u + 54px text
× k` (which sums to exactly 82, so nothing moves at full size) it holds 2–4% at every rung. The blade's
`ROW_H` took the same treatment for the same reason.

### 33.3 WHAT MUST NOT SCALE — and this is the part most likely to be got wrong later

- **Angles.** The CC blade's `SLANT_TAN` is a ratio of two lengths, so it is already correct at every
  size. Multiplying it would *rotate* the blade's edge as the window narrowed. Scale the lengths, leave
  the angle, and the silhouette stays similar to itself.
- **Radii, hairlines, border widths.** `CORNER_R` stays 8px at every size. 8px reads as "gently rounded"
  on a 925px card and on a 660px one alike; 6.6px reads as very slightly less rounded and nobody can
  tell you which card they are looking at. Keeping it fixed also keeps the blade's mitre against the
  card arithmetically exact — two independently-rounded numbers is how a seam opens at one size and not
  another.
- **Velocity ceilings** (`flight.ts`, px/ms). A ceiling is a claim about *apparent speed*. A smaller
  stage already covers proportionally less distance in the same time, so scaling the ceiling too would
  slow the motion twice.

### 33.4 THE LADDER IS DECLARED, THE WIDTH IS CLAMPED

`u` is looked up in a table, **not** solved by measuring the stage and dividing — with a real-length
unit the stage's height is itself a function of `u`, so a measure-and-apply loop would oscillate and
relayout on every frame of a window drag. A declared ladder is deterministic and is *checked* rather
than trusted (`scripts/probe-fit.mjs`).

The one thing not left to the ladder's correctness is **width**, because Sam's rule there is absolute:
*"there's never a horizonal scrollbar allowed."* A rung tuned slightly generous for some viewport
nobody tested would break an inviolable rule, so a clamp caps `u` at what actually fits. **The ladder
states the intent; the clamp enforces the law.** Width is safe to solve this way where height is not —
the stage's width at u = 1 is a known constant, so there is no feedback loop.

**The clamp counts the sibling column TWICE.** The card is centred and the column hangs off its right,
so the column consumes width from the right margin only and the centring demands the same back on the
left. Budgeting it once read green on the card while the column hung 6px off an iPad mini's edge.

> **The lever if full size should hold at narrower widths than it does.** That doubling is the single
> biggest constraint on the top rung. Centring the card in *the viewport minus its chrome* rather than
> in the viewport buys back ~150px, at the cost of a slightly off-centre card. It is a design call, not
> an arithmetic one, and it has not been made.

### 33.5 THE VERTICAL RULE, as corrected

§13's "no scrollbars anywhere in zoom 1" was too strong. The live rule (Sam, Aug 8):

- **Horizontal — never**, under any circumstances, in any state.
- **Vertical — never, EXCEPT while the grandchild tier is open.** Hovering a child chip for 1.2s reveals
  that child's own children, and a twelve-child family puts three rows on the stage. That is a
  deliberate, transient, user-summoned overflow and it is allowed to scroll.

So **the fit target is the RESTING stage**, and `overflow: clip` can never simply be armed as §13.2
wrote it — clipping the resting stage is right; clipping an open grandchild tier would amputate the row
that earned the exception. Whatever arms it must be state-aware.

### 33.6 A COMMENT IS NOT A MECHANISM — three times in one session

§28.1 coined the phrase about `CARD_TOP_H`. Phase 2.75 was the first time the numbers actually moved,
and it found three more places where a comment stood in for a mechanism. **Every one of them rendered
correctly at u = 1 and broke the moment the card resized:**

| site | the comment | what happened |
|---|---|---|
| `DeckRiffle` | `const CARD_W = 925; // matches FeaturedCard's w-[925px]` | phantoms dealt at 925 into a 758px world |
| CC blade | `width: 925px; /* the card's width */` | blade overhung the card's bottom-right corner |
| spouse carousel | `CHIP_W = 160; // must match FeaturedCard CHIP_W_COMPACT` | strip stepped 168px while its chips were 156px wide; the 496px mask was wider than the 484px it clipped |

All three now derive from the owner and go through the same dial. **The rule: if a constant's comment
says it matches another file, that is a bug waiting for the day the other file changes.**

### 33.7 SMALLER DOCTRINES EARNED HERE (durable)

- **Tailwind arbitrary values must be literal strings in source.** A `box(w, h)` helper that builds
  `w-[calc(${w}px*var(--stage-u,1))]` reads better and emits *no CSS at all* — the scanner never sees
  the class name, so the element renders with no width. Every arbitrary value must survive a grep for
  its own text. `svelte-check` cannot catch this; only rendering can.
- **Anything `flight.ts` may clone must carry geometry in a CLASS, not an inline style.** It assigns
  `style.cssText` — a *replacement*, not a merge — at four sites. `growUnionRow` clones the dates row
  and wipes its inline style; with the size in a class that costs nothing, with it inline the clone
  inherits 16px. This shipped and Sam saw the union year land oversized and snap down.
- **Clamp anything whose length is GENERATED rather than authored.** The descent line
  ("Eighth Generation Descendant of Thomas Hooker", 46 characters) was the one unclamped line in a
  header where everything else already fits itself. No fixed size can be right for every generation.
- **Per-side mask overshoot, derived from the shadow's actual reach.** A blur of B extends ~B/2 past the
  shadow's rect, and the rect is the box offset down by the y-offset — so `0 3.2px 9.6px` reaches 4.8px
  sideways, 1.6px above, 8px below. A single uniform value is simultaneously too small on three sides
  and load-bearing on the fourth.

### 33.8 THE THRESHOLDS, for when this is revisited

Everything below is **one table in `stage.svelte.ts`**; changing behaviour at a size means editing that
table, not hunting through components.

| rung | ≥ width × height | tier | u | k | children cap | NB cap | sibling column |
|---|---|---|---|---|---|---|---|
| desktop | 1240 × 800 | A | 1.00 | 1.00 | — | — | yes |
| tablet landscape | 1100 × 720 | A | 0.92 | 0.96 | 8 | 5 | yes |
| small landscape | 900 × 640 | A | 0.82 | 0.90 | 6 | 4 | **no** |
| tablet portrait | 720 × 900 | B | 0.70 | 0.87 | 6 | 3 | no |
| phone | — | C | 0.62 | 0.82 | 4 | 2 | no |

Independent of the ladder, keyed on **viewport width** because each answers to measure rather than to a
rung (the clamp means a rung does not predict width — at 1100px the rung is `normal` but u lands at
0.82):

- **NB cap** — `≤ 700px → 2`, `≤ 800px → 3`, else the rung's own cap. Takes the `min` of the two.
- **Spouse-chip union fold** — `≤ 850px`. Below it "m. 1621" moves onto the end of "1586–1647"; above
  it the chip keeps three lines, which reads better. Scoped rather than universal because
  `growUnionRow` reads the separate `[data-chip-union]` row off the destination chip to grow it on the
  traveller mid-flight (§18.4) — below the threshold the flight skips a gesture that no longer has an
  element, which is honest degradation on a 47px chip.

**Guidance for moving these.** `k` is where legibility is bought and should not chase `u` down — at
k = 0.85 the narrative body sets at 11px, which is the floor for running text in this project. `u` may
go lower. Both flanks of the carousel mask are `CHIP_GAP - 1` and must stay below `CHIP_GAP`, or the
neighbouring chip is revealed. Tier C's `u` is nominal and the width clamp beats it: at a 393px phone
the clamp lands on ~0.40, i.e. a 367px card setting 5px body text — **that number is not a tuning
failure, it is the proof that a phone cannot be reached by scaling a 925px card**, which is why Tier C
recomposes (§12, Phase 9.5) instead.

### 33.9 BUILT AND REVERTED — so neither is re-attempted

- **`transform: scale()` on the stage.** Spiked, measured, rejected — 33.1. `scripts/spike-scale.mjs` is
  kept until 2.75 closes so the numbers are re-runnable rather than remembered.
- **Chip geometry and type as inline styles.** Correct-looking reasoning (a travelling ghost should
  carry its size literally), wrong in practice — `cssText` wipes it. Classes, always.
- **A `box(w, h)` / `ct(px)` class-builder helper.** Emits nothing Tailwind can see. Literals, always.
- **The union fold at `u < 0.88`.** Fired above 1150px, which is far too eager — the fold is a
  concession and should be spent as late as possible. Re-keyed to a viewport width of 850.

---

## 34. HOW A ROW OF CHILDREN BREAKS (AS BUILT, August 9)

_(New doctrine. There was no prior convention — the children row was a plain `flex-wrap` and its break
points were an accident of arithmetic. The specification lives in `src/lib/state/childRows.ts`.)_

### 34.1 Two rules generate everything

1. **FOUR PER ROW, NEVER FIVE.** Sam: "let's not do 5 kids on top at all… we are moving totally away
   from 5 child chips in a row." It also returns the left margin the timeline wants.
2. **NEVER STRAND A SINGLE CHILD** on a row of their own.

Fill rows of four; if the last row would hold exactly one, pull one down from the row above so the tail
reads 3+2. That is the whole algorithm, and it reproduces every count Sam specified:

| n | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|
| | 4 | 3,2 | 4,2 | 4,3 | 4,4 | 4,3,2 | 4,4,2 | 4,4,3 | 4,4,4 |

It extends unaided: 13 → 4,4,3,2 · 17 → 4,4,4,3,2. **Ten is the one departure** — Sam said "five and
five" and then banned fives in the same message; 4,4,2 is what the ban implies and keeps ten consistent
with six. If ten is meant to be a named exception it belongs in that file as one.

### 34.2 Descending, not balanced — the taper is the point

A balanced split is the obvious algorithm and the wrong one. Sam: "there's a way in which off-balance
is nice… four on top row, two on bottom row by default is attractive, not just going to three on top
three on bottom as a rectangle is boring." So six is **4,2** and never 3,3. A full top row is also what
makes the set read as an ordered sequence — birth order, left to right, top to bottom — rather than as
a block. The 3,2 tail is the single place the taper is deliberately broken, because rule 2 outranks it.

### 34.3 It is a GRID, and that was forced rather than chosen

The natural mechanism is a zero-height `flex-basis: 100%` sibling to end a flex line. **Svelte rejects
it outright** — "an element that uses the `animate:` directive must be the only child of a keyed
`{#each}` block" — and the chips need `animate:flip` to glide when the roster changes. So no extra
elements were available, in or out of the list.

A grid needs none: each chip is *placed*, and placing one at column 1 starts a row.

**EIGHT half-chip tracks, not four**, and that is what makes ragged rows centre. A chip spans 2, so a
row of `sz` spans `2·sz` with a leading offset of `4 − sz` — always an integer. With four tracks a row
of three could only sit flush-left or a whole chip off-centre; with eight it lands exactly centred,
which is what makes the tapers look deliberate instead of ragged.

A track is (198 − 12) / 2 = 93, so two tracks plus the gap between them lands exactly on the 198px
chip. Both numbers ride `--stage-u`.

**The chips stay DIRECT CHILDREN of `.children-slot`** — 17 selectors across `flight.ts`,
`probe-tier.mjs` and the page address them as `.children-slot > .flight`, and any wrapper would
silently unmatch every one.

### 34.4 What this fixed, and the trap on the way

The old 72rem flex-wrap was wide enough for five 198px chips, so five sat in one row until the window
narrowed enough to bump one down — and then bumped it back up as the frame unit shrank the chips faster
than the container. Sam: "it's stubborn… eventually Cornelius on the right will wrap to the bottom row
on his own but size it down more and he jumps back up." Counts are now **placed, not discovered**, and
hold identically from 1440 down to 744.

**The grid rendered nothing at first.** There are TWO `.children-slot` blocks in that stylesheet, ~160
lines apart and of equal specificity; the rule went into the earlier one and the later one kept winning.
That is §34.1's lesson in the roadmap arriving on schedule — *verify the edit is the one taking effect
before interpreting the render.* The winning block now says so in a comment.

### 34.5 Child chips are their own size tier

90% of a parent chip — **198 × 67.5**, with type at **0.945** (the same 0.9, then 5% back for
readability). The two factors are different numbers on purpose: a first pass took the type to the
parent's full 13px and Sam called it too big on sight.

**The aspect ratio is preserved exactly** (220/75 = 198/67.5 = 2.933) and that is load-bearing rather
than tidy: `flight.ts` decides same-tier vs different-tier by comparing the x and y scale factors, so a
uniform 0.9 keeps that difference at zero and a demote into a child seat still takes the cheap path.
It also means the counter-scaled parent face lands pixel-identical to a real child chip. Picking, say,
200 × 68 would have quietly changed which flight runs.

Every chip name is clamped, and a chip uses `shrinkToFit`'s **`ellipsis`** option rather than its
default release-to-wrap: a second line inside a fixed-height box pushes the dates out through
`overflow: hidden`, so the name would fit and the years would vanish.

---

## 35. THE LEFT TIMELINE — AS BUILT (August 9)

_(Implements §3.6, and supersedes it on three points. §3.6 seated anchors at BIRTH year; Sam wants
their PROMINENT years, which is new data. §3.6 asked for a hatch on estimated years; the dissolving
end replaces it — see 35.4. §3.6 said "the table's y-axis rendered as an instrument", which reads as
though the rail and the Field share a mapping. They do not — see 35.1.)_

### 35.1 It is NOT the Field's axis, and conflating them is the trap

Both draw time. They are different mappings of the same quantity:

| | scale | anchored to |
|---|---|---|
| **Field** | 10.5 px/year | the featured person — the paper scrolls and their year docks at a fixed spot |
| **Rail** | ~1.9 px/year | nothing — 440 years compressed into the viewport, absolute |

Field answers *how far did we just travel*; the rail answers *where in 440 years are we*. Nothing in
either should ever be derived from the other's constant.

### 35.2 Fixed chrome that yields to the stage

The rail is mounted beside `Field` and `ShuffleNotables`, **outside `.page-container`**, and paints at
`z-index: 0` — behind the stage. It does not scale with `--stage-u`: a ruler at the window's edge is
the one thing that should keep its size when the stage shrinks.

**THE STAGE GETS NO ROOM FOR IT.** An early build reserved the rail's width and pushed the card 48px
right; Sam: *"there is to be no movement or re-sizing of the core UX elements and army rows to
accommodate the timeline… the core boxes and rows are front and center and we'll adjust the timeline to
work around that."* `TIMELINE_RAIL_BASE` is 0 and kept as a named constant with that rule beside it. The
only concession available is nudging the CHILDREN row inward — a change to that row, not to the stage.

### 35.3 Bars move on the CARD's clock, and are keyed by LANE

The bars transition on the duration read from the camera store, so the rail and the stage arrive
together — §30's two-clock desync is the named failure of this layer.

**Keyed on the LANE, never on the person.** Keyed on the person's id, a navigation destroyed the
rectangle and built a new one at the destination — and a new element has nothing to transition *from*,
so it never animated once. The lane is the durable identity: "the bloodline bar" persists and the person
flows through it. Same reasoning as the flight's keyed chip lists.

### 35.4 Uncertainty is per-END, and it replaced the hatch

Each end is answered separately and the guessed one dissolves:

| known | top | bottom |
|---|---|---|
| birth + death | hard | hard |
| birth only | hard | **dissolves** |
| death only | **dissolves** | hard |
| neither | **dissolves** | **dissolves** — placed from a relative's year |

The mask carries the border with it, so a guessed end cannot draw a hard line. It sits on a
**pseudo-element** so the paper dissolves while the NAME stays crisp: an uncertain date is a reason to
soften a bar and never a reason to make the person harder to read.

**THE HATCH IS REMOVED, and must not return as it was.** It marked `t.e` — a birth-year proxy meaning
"the table inferred this position". Once ends could dissolve it became a second, differently-derived
answer to a question the bar already answered, and the two disagreed: `julia-cole` (death known) was
striped while `mary-bryan` (birth known) was not, despite identical doubt. Worse, on two `pv` brothers
the stripes were the *only* difference between them, encoding "one of these has a birth year on file" —
a distinction the viewer cannot read and one the privacy flag exists to stop mattering. If uncertainty
ever needs a second channel, derive it from the same `by`/`dy` the mask uses, **never from `t.e`**.

### 35.5 The estimated lifespan is measured from this tree

14,323 people carry both dates, so the tree answers its own question — mean years lived by birth
century and sex:

| | male | female |
|---|---|---|
| 1600s | 58.8 | 61.0 |
| 1700s | 61.4 | 61.2 |
| 1800s | 59.5 | 62.0 |
| 1900s | 69.2 | 75.1 |

Sam's suggested 60 was within a year of the tree's own answer for every century before 1850, which is
where most of these bars sit. A guessed end starts dissolving at 75% of the estimate — his "say it's 60
years, around 45 years start fading out".

**The one place the data must NOT be trusted** is the recent end. A cohort that has not finished dying
can only report the lifespans of those who died early; the tree says 49.2 for 1950s births, which is
survivorship bias and not a fact about anyone. From 1950 the figures are stated modern ones, and the
comment saying so is there to stop someone "correcting" them back.

### 35.6 Born before the scale — fade INSIDE the window

Seven people are, back to 1550. They used to be clamped to `START_YEAR`, drawing a hard edge at 1586 —
so the rail claimed Richard Garbrand and Rev. Thomas Hooker shared a birth year.

The range is unchanged (Sam: "the timeline range is fine"). The bar keeps its true position and fades
out instead. **Two attempts, and the difference is the lesson:** the first let it run past the top and
dissolve on the way, which still met the browser chrome ~30% opaque and ended in a flat cut ("it looks
terrible"). The fade is now stated in **viewport** terms and completes inside the window — invisible
above y=14, solid by y=58. A percentage cannot do this: a fraction of a bar that begins off-screen
spends its fade where nobody can see it.

### 35.7 LINE ANCHORS — an egg's route home, and why it is baked

An easter egg appears beside the people who connect them to the line: Richard Garbrand with Susanna
(his daughter, who married in) AND Rev. Thomas Hooker (the man she married). **A payload is one
neighbourhood deep**, so Richard can see Susanna and never Thomas. Across 554 eggs: 16% already see an
`hd` person, 57% see the bridge but not the anchor, 27% have no bridge at all.

Fetching that hop in the client would land the third bar on a second clock — §30 again. So it is baked
in `regenerate-data.js` (`lineAnchorsFor`), the same shape as the kin-distance LCA bake and the derived
`sp` flag. **Purely additive**: 18,129 payloads keep their six keys, 492 gain one, canonical untouched.

**Lanes are POSITIONS; colour is CLASS.** Tying colour to lane index paints Thomas Hooker I mint when he
should be blue. Overlap deepens with each step away from the line (7 / 10 / 13 px) so the set reads as a
stack receding from the bloodline. Four bars is the ceiling, capped at RENDER not in the bake — the data
stays complete and how much is worth drawing is a display decision. 13 people have a longer route.

Two findings from the walk, both of which will be re-broken by anyone tidying it:

- **SPOUSES ARE EXPANDED FIRST.** Susanna married Rev. Thomas *and* bore him Joanna — both `hd`, both
  one hop away. Children-first returned the daughter, and Richard's rail read "Joanna, Susanna,
  Richard". `sp` means MARRIED INTO the line, so the person they married is the anchor.
- **A PAIR COLLAPSES ONLY WHEN THE CHAIN HOLDS WITHOUT THEM.** A married pair shares one position and
  the featured one takes it — but firing that on any leading spouse severed 132 of 492 chains. Alice
  Hathaway Lee proved it: her route runs through Theodore to his SECOND wife, so dropping him left two
  of one man's wives side by side with the husband who links them missing. The test is whether the focus
  has an edge of their OWN to the next link.

Harriet Beecher Stowe, expected not to work at all, reaches the line through her sister Isabella.

### 35.8 The privacy question, still open

`pv` (living, non-notable) people now get a fuzzy bar positioned from a RELATIVE's public year — their
own dates are never read. The geometry is a pure function of other people's public data, so nothing
flows out of the private field. But 24 of them anchor on a spouse born the same year, so the bar lands
on their real birth year by coincidence. **Sam has not ruled on this.** Reverting to no-bar is one line.

### 35.9 Still to design

The rail is a scaffold: a coloured rectangle and tick marks. Sam has seen it and said so. The
derivation and the motion are the parts worth keeping. **Anchors are not built** — and per Sam they sit
at PROMINENT years, not birth years, which is a new canonical field plus thumbnail crops (Stream A).
Era marks are a starter set meant to be edited.

---

## 36. THE LEFT TIMELINE AS AN INSTRUMENT — the whole thing, for someone arriving cold (AS BUILT, August 10)

_(Extends §35, which remains true. §35 documented the scaffold — derivation, mapping, uncertainty,
line anchors. This documents the instrument it became: ground, portraits, navigation, motion, and the
guardrails that were paid for. **§35.9 "Anchors are not built" is the one part of §35 now outdated** —
sixteen are built and 36.5 replaces that paragraph. Everything else in §35 still stands.)_

### 36.0 The model, in one paragraph

`TimelineRail.svelte` is a **fixed ruler at the window's left edge, 122px wide, 1583→today, absolute**.
It is not a component of the stage and never moves the stage. It draws four things, in this order:
a **ground** (a gold gradient with paper grain, fading right), a **scale** (two tiers of tick, years on
the coarse tier), **anchor portraits** (curated figures, placed at their prominent YEARS, sized in
years so they resize with the window), and **lifespan bars** (the featured person plus, when the
featured person is *not* on the Hooker line, whoever connects them to it). The bars and the portraits
are both **navigation**: clicking either changes the featured card. Everything about it that looks like
a decision — a colour, an overlap, a duration — has been argued at least once and usually twice, so
read the constant's comment before changing the constant.

### 36.1 Where things live

| file | what it owns |
|---|---|
| `src/lib/components/TimelineRail.svelte` | ~2,050 lines. Everything above. Self-contained. |
| `regenerate-data.js` → `compact()` | `bm/bd/dm/dd` (real dates for ages), `lv` (presumed living), `cf` (chip first name) |
| `regenerate-data.js` → `lineAnchorsFor()` | the baked route home for easter eggs (§35.7) |
| `src/lib/utils/dates.ts` → `ageAtDeath()` | the ONE implementation of age precision, shared with the card |
| `src/lib/state/flightLock.ts` | `subscribeFlightLock` — added for the rail, see 36.9 |
| `src/lib/state/navigate.ts` → `warmPersonLinks` | the delegation the rail's links ride, see 36.8 |

### 36.2 The stacking order, which is load-bearing

```
z 20   a hovered portrait          (must clear a 4-bar chain, which reaches z 5)
z 15   a hovered bar               (its tooltip is a child and inherits the lift)
z 2+   bars, at 2 + lane
z 1    portraits at rest           — bars pass IN FRONT of a resting portrait, by design
z 0    the ground (::before)
z 0    .rail itself                — behind the stage, which is .page-container at z 1
z 3    .rail while a CC flight runs (RAIL_OVER_FLIGHT, transient — see 36.9)
```

Two of these are traps. **A hovered portrait at z 5 tied with a four-bar chain** and lost the tie to
DOM order, so the Commodore's own bar painted over his face. **Lane depth must arrive as a CSS custom
property** (`--bar-z`), not as an inline `z-index`, or no stylesheet `:hover` rule can ever beat it —
`.bar:hover { z-index: 15 }` silently did nothing for a whole session.

### 36.3 The ground — colour, curve, grain

**Colour** is `hsl(53, 56%, 74%) → hsl(53, 68%, 79%)`, a linear ramp. The hue is the whole story: it
began at 62, which is yellow-*green*, and Sam's verdict was "a little like a pee stain I can't unsee".
Blending toward parchment barely moved it (62 → 60) because blending mostly lightens; the fix was to
move the hue itself to 53, which is Parchment's own 51 plus a little gold. **Raise L, keep S** — an
earlier attempt lightened by thinning alpha and lost 18–31 points of saturation over warm paper.

**The fade** is `(1 − smoothstep(t^1.5))^2.2` across **134px**, emitted as **36 stops ~3.7px apart**.
Every stop is a kink and a kink reads as a line, which is why there are 36 of them and why they are
generated rather than hand-edited. The exponents were chosen by measuring candidates, not by eye: this
curve holds the left plateau (0.908 at a quarter across) while dropping the tail tenfold at 85%, so the
right edge is not locatable. The cost is a steeper middle — peak slope 0.0175/px, against the 0.021
that produced a visible band Sam objected to. **If the middle ever reads as a band, widen the span
rather than flatten the tail.**

The ground is **134px inside a 122px rail** — the `::before` runs 12px past the right edge, because a
134px gradient inside a 122px box is cut off at 122, and a cut is exactly the hard line the fade exists
to avoid.

**The grain is Parchment's, and getting it there took four shapes.** Worth reading before touching it:

1. Grey tile + `mix-blend-mode: overlay` → measured a **−23-level grey haze**. `.rail` is a stacking
   context, so overlay blends against the rail's *own* gradient and nothing behind it — and that
   gradient is semi-transparent across most of its width. Blending against a partly-absent backdrop
   composites the source straight in.
2. A tighter mask on the same thing → no help. The mask was never the cause.
3. A cream alpha-speckle → cannot haze, but measured invisible (σ 0.50 → 0.66): cream and gold differ
   by nine levels of red, so there was nothing to modulate.
4. **What works:** the gold gradient and the grain are BOTH background layers *of the pseudo-element*,
   both fully opaque, composited with `background-blend-mode: overlay, normal` — a self-contained
   operation with a real backdrop — and the fade applied afterwards as a **mask** over the result. This
   is why the colour stops carry no alpha of their own.

The tile is Parchment's, unchanged in every parameter that matters (220px stitched, `fractalNoise`,
`baseFrequency 0.8`, `numOctaves 3`). Two numbers differ and they **must move together**: amplitude
`1.125` with intercept `−0.0625`, because `overlay` is only neutral when the tile averages 0.5
(1.125 × 0.5 − 0.0625 = 0.5). Change one alone and the rail lightens or darkens instead of just getting
grainier. Parchment's own amplitude is 0.33 and produces the same grain because Parchment *adds* its
noise; overlay on a light base has slope 2(1 − base) ≈ 0.22, so 0.33 arrives as a seventh of the grain.
Parity would be 1.5 (σ 7.8 against Parchment's ~7); 1.125 is that less 25% — right for a 122px strip.
**Change the ground's lightness much and the amplitude needs recomputing**, since the compression
depends on the base it lands on.

### 36.4 The scale

`START_YEAR = 1583` (three years ahead of Thomas Hooker so his corner is not on the edge), `PAD_Y = 0`
(edge to edge — Sam wanted 2026 truly at the bottom of the screen). Two tick tiers only: `.decade`
every 10 years, `.half` every 50, and **only the coarse tier carries a year**. A third tier at 25 years
was built and removed: at ~1.9px/year a 25-year mark sits 47px from its neighbours, so a third length
did not read as a third rank — it read as an irregularity in the decade rhythm. Two tiers keep the
scale countable: ten stubs between each pair of numbered rules, every time.

Year labels are 11.25px / weight **600**, centuries 11.81px. The century rule must not restate
`font-weight` — it did, at 500, and being later in source order it quietly undid the 600 on every
century label.

### 36.5 The anchor portraits — replaces §35.9

Sixteen curated figures, hand-written in the `ANCHORS` array in the component. Still not data; §3.6's
"curation is DATA, owned by Sam" remains the eventual destination.

Each carries `{slug, name, from, years, src, t, headshotBlurb, lifespan}`. **`from` is the first year of
the person's peak, and `years` is how many** — so a portrait is a SPAN OF TIME, not a badge: it sits
where those years sit and resizes with the window. `t` is the table seat, needed so the CC flight has a
destination. Sam's rule for placement: **eight or nine years on the peak, overlapping neighbours by no
more than one year.**

Three placement facts that will otherwise be re-derived from scratch:

- **The founding era is arithmetically tight.** Tallmadge holds 1775–1783, and four more 8-year windows
  at a 7-year minimum pitch need 1784–1811 while all four peaks want to be inside 1784–1807. Twenty-four
  years cannot hold four windows without two-year overlaps, so exactly one man must stand off his best
  years. **Ingersoll is the one who moves** (to his 1811–1818 second term) because he is the only one of
  the four with a genuine second peak rather than a quiet old age.
- **A portrait's size is compensated on short screens.** `1070 / vh`, capped at 1.25 — continuous, not a
  step, so portraits do not snap size mid-drag while resizing. It lives *inside* `anchorD` so that
  `anchorOrigin` measures the same circle that gets drawn; scaled at the call site, a portrait near an
  edge would choose its growth corner from a size it no longer was. Below ~856px the 14px floor takes
  over before the boost does.
- **`transform-origin` is chosen per anchor** from how much room each side actually has, never
  hard-coded to one corner — at 3.3× a dot 8px off the edge cannot grow about its centre.

**Hover has three suppressions, and each exists for a different reason.** All three are the same
`.no-hover` class, which outranks `.anchor:hover` on specificity:

| when | why |
|---|---|
| just clicked (until `pointerleave`) | CSS `:hover` cannot end while the pointer sits still, so a clicked portrait stayed at 3.3× over the card that had just arrived |
| a flight is running | rapid clicking reset transitions; and per Sam it must expand *by itself* the instant the flight lands, which is free — the class comes off and a pointer that never moved is still hovering |
| — | keyboard focus is **deliberately not** suppressed: a focus ring with no label is worse than a label that outstays a click, and a keyboard user has no "move the mouse away" to perform |

**THE THING THAT DECIDES HOVER MUST NEVER BE THE THING THAT MOVES** (added Aug 10, and the single most
re-breakable rule in this section). The button used to be both: it hit-tested AND carried the scale. That
is a feedback loop, and it surfaced on exactly one portrait — Anderson Cooper, who sits against the left
and bottom edges, so `anchorOrigin` gives him `left bottom`, and with that origin the scaled circle's
left and bottom edges land where the resting ones were. A cursor on either edge sits on the boundary of
the grown element: it scales up, the boundary arrives under the cursor, hover drops, it shrinks, hover
returns. Every other portrait grows about its CENTRE, which walks its edges away from the cursor and
hides the bug rather than avoiding it.

The paint therefore lives in `.anchor-vis` (`pointer-events: none`) and the button only hit-tests.

**AND THE HOVERABLE REGION IS A UNION, which is the half that is easy to miss.** The first fix left only
the resting circle live, and that made every expanded photo unhoverable and unclickable — move onto the
63px portrait you just summoned and hover ended, because the pointer had left the 19px target underneath
it. The region is now this button's circle (always) UNION `.anchor-hit`, an invisible twin of the
expanded circle that is live only while already hovered. So it can only ever GROW on hover and never
shrink under the pointer, which is the property the loop needed and did not have.

Why a union rather than simply swapping in the big circle: **with a corner transform-origin the expanded
circle does not contain the resting one.** Measured on Anderson — his resting circle's left edge sits
2.01 radii from the expanded centre against a radius of 1.65, so it falls outside. Swapping one region
for the other puts the flicker back at exactly the edge it started at.

**The depth drop is delayed 160ms** (`z-index 0s linear 160ms`). `z-index` cannot tween, so it snapped
20 → 1 on the first frame of un-hover while the transform still had 160ms to run, and the portrait spent
its whole shrink underneath the bars. Rising stays immediate — the lift must lead the growth.

### 36.6 The bars — who gets one, and where they sit

**WHO.** This is doctrine and it was reversed once inside a day, so it is stated flatly: the supporting
bars are **a route home, not a family summary**.

| the featured person | bars |
|---|---|
| on the line (`hd`) | **one — themselves, and nobody else** |
| married in (`sp`) | the bloodline spouse, then them |
| an easter egg | the baked `lineAnchors` chain, then them — four is the ceiling |
| an egg with no route (27%) | them, plus their own spouse |

The one-bar rule was relaxed on Aug 10 so a bloodline card would have somewhere to click, and Sam
reversed it on sight: *"if I click Thomas Hooker's headshot I only want the Thomas vertical bar… I
don't want to imply the grandfather of a Hooker equates with a pure Hooker."* **A bloodline card is
therefore a dead end for rail navigation, and that is accepted, not a defect.**

**WHERE.** Width and pitch are separate constants and must stay separate:

```
LABEL_W  36     the year gutter
lane 0   x = LABEL_W + 7 = 43
LANE_W   24.7   what lane positions are measured against — FROZEN
BAR_W    23.47  what a bar is actually drawn at
OVERLAP  [0, 7, 5, 7, 15]   how much lane i overlaps lane i−1
```

`laneX` advances by `LANE_W − OVERLAP[i]`. While width and pitch were one constant, narrowing a bar
dragged every lane left — the opposite of "narrow the bars but keep the left edges". **Overlap deepens
with distance from the line** so the set reads as a stack receding from the bloodline, *except* lane 3,
which is pulled back to 7 because at 13 the deepest bar buried the third bar's name. Lane 3's right
edge lands at 125.6, past the rail's 122 — legal because `.rail` sets no overflow and the ground now
runs to 134.

The **name** is `cf ?? fn ?? sn ?? n` plus a derived suffix. The suffix is derived because no compact
carries one, and **the Jr/Sr/roman-numeral allow-list is not optional**: the raw subtraction returns
something for 2,607 people and most of it is married surnames. Only 238 people in the corpus have a
`chip_first_name`, so most bars show the fallback.

### 36.7 Ages, and what "alive" means

**An age is not a year subtraction.** `dy − by` says Edith Gwynne was 46; she was 45, because her
November birthday had not come round when she died in January. `ageAtDeath()` in `src/lib/utils/dates.ts`
owns the precision rules and is shared with the card, so the two can never disagree again. The rail
reaches it because `compact()` now emits `bm/bd/dm/dd`. **Emitted as month/day rather than as a baked
age deliberately** — porting the precision rules into `regenerate-data.js` would create the second copy
that file's own `dy_young` comment already warns about.

**`lv` (presumed living) is emitted separately from `pv`**, and the distinction matters: `pv` is
`presumedLiving && !notable`, so a living *notable* was indistinguishable in the payload from someone
whose death was never recorded. A living person's bar **runs to today** and dissolves at the bottom.
Anderson Cooper only ever looked right by accident — born 1967, his estimate overshot the present and
was clipped back — while anyone born before ~1950 got a bar ending in their own past.

For a living person who has outlived the estimate, **the name stays centred on the estimate**, not on
the full bar. It costs one number because the label has its own absolutely-positioned box; expressed as
a **height**, not padding, because the label is `vertical-rl` *and* `rotate(180deg)`, so physical
padding lands on the opposite visual end from the one you asked for.

### 36.8 Navigation from the rail — the delegation trick

**The rail contains no navigation code.** `warmPersonLinks` is a delegation action: it catches a click,
walks to the nearest `<a href="/person/…">`, and reads the entire flight off that anchor's data
attributes. A chip is not special; **an anchor wearing the right attributes is.** So a bar simply *is*
that anchor and inherits the spouse swap, the directional dive, the flight lock, the roster hide, the
arc decision and the deck — in their real implementations rather than a second copy that would drift.

| bar | attributes | flight |
|---|---|---|
| the focus | no href | nothing — you are already there |
| a spouse of the focus | `data-relation="spouse"` | the corner swap |
| anyone else | `data-cc`, `data-relation-class="direct"`, `data-gen-delta` | a flat vertical dive (`isArcMove` requires `collateral`, so `direct` never arcs) |

Three things this cost, all of which will bite again:

- **`captureRects` had to become document-scoped.** It queried the delegation root, and the rail
  contains no flight boxes, so a rail click captured an empty rect list and every leaver failed to pin.
  `ccFlyTo` had always done it this way; the two paths now agree.
- **A spouse bar forwards its click to the real spouse chip** rather than flying itself. The flight
  grows from wherever it was launched, so a bar-launched swap bloomed out of the timeline. Sam liked the
  effect and rejected the premise: *"the timeline and the Featured Card aren't meant to blend."* The bar
  dispatches the chip's click, which gives the genuine article — notch origin, clicked-chip id captured,
  real demote behind it.
- **That forward must be `onclickcapture`.** **Svelte 5 delegates `onclick` to the application root**,
  so an ordinary handler on the bar runs at the very end of the bubble — long after `.rail`'s own
  `addEventListener` has read the bar's rect and launched. Measured: both flights fired, the rail's
  first, and the `preventDefault` arrived too late to stop anything.

**Direction comes from birth order**, and `regenerate-data.js` says in so many words that gen_delta is
"NOT a birth-year gap". That is right *there* — a CC can join any two people in the corpus. It does not
hold here: every bar is the focus, their spouse, or a link in `lineAnchors`, so the set is a lineage,
and within a lineage birth order is generation order. The alternative measured worse: `effectiveGen`
deliberately leaves an egg with no child-in-law ungenerationed, so the Commodore's true delta against
Alice is **null → lateral**, the one thing ruled out; and Alice and her husband both return generation
9, a 0 delta, lateral again.

### 36.9 Motion — three clocks and what owns each

| motion | clock |
|---|---|
| a bar gliding to new years | `--move-ms`, read from the camera store — the CARD's clock, so rail and stage arrive together (§30) |
| a bar arriving or leaving | 95ms fade. "Nothing drawing attention" — context arriving, not an event |
| a bar tooltip | the same 95ms, shared via `--tip-ms` |
| **any CC flight** | **1200ms**, ease-in-out, its own clock — see below |

**A CC FLIGHT IS THE ONE PLACE THE BAR AND THE CARD DISAGREE ABOUT DURATION.** Both wait on the same
`focusPerson`, so they *start* together — the whole gap is duration. Measured on the longest portrait
travel, the bar finished at 655ms against the card's 1500ms. The easing changes with the clock and has
to: easeOutCubic spends ~70% of the distance in the first third, which stretched to a second reads as
screaming away and then crawling.

_(Corrected Aug 10, later the same day. This was first written as "a portrait-click flight", because the
1200ms was built for the timeline's own portraits. It is a property of the CC FLIGHT, not of what
launched it — a blade CC publishes a ~410ms duration while the card keeps settling past 1300ms, the same
~900ms gap, so Sam saw the same screaming bar on an ordinary same-line CC. Portrait clicks publish
`kind: 'cc'` too, so ONE condition covers both and the flag that used to distinguish them is gone.)_

**1200 does not lead every CC, and that is a known open trade.** Card settle time varies far more than
the bar's does: measured, Thomas Hooker → Jason Newton settles at 925ms while the bar lands at 1239ms
(the bar is ~300ms LATE), where the Burr reciprocal settles at 1646ms against the bar's 915ms (a
comfortable lead). A single constant cannot lead both. Scaling the bar off the camera's own duration is
the fix if the lateness ever matters; Sam has seen it and left it at 1200.

**A newly-added lane travels in from where the outgoing bar stood** (`barArrive`, a transform — `top`
already carries the CSS transition the reused lanes ride, and two clocks on one property is how a bar
fights itself). Before this, a new lane was mounted at its destination and merely faded, so three of the
Commodore's four bars appeared before Alice had finished travelling.

**`RAIL_OVER_FLIGHT`** lifts the rail to z 3 while a CC flight runs, so the deck riffles behind it. It is
transient because no static number can satisfy all three orderings: the flying hero must be above
`.page-container`, so "rail above hero" would also mean "rail above the resting stage". While lifted it
does cover any resting stage that overlaps it — nothing at 1440, but the sibling column at iPad-mini
landscape.

**THE LIFT ENDS WHEN THE FLIGHT LOCK RELEASES, not on a timer** (corrected Aug 10; it was
`duration + 400`, and that number was a guess). The guess held for outward hops and failed on the one
case that mattered: a RECIPROCAL CC ping-pongs the lateral direction, so the outgoing card leaves right
and the incoming one enters from the LEFT, straight across the rail — and that flight outlives the
camera's nominal duration. Measured on Burr → Tapping Reeve → Burr, the card reached left −1013, sixty-two
frames sat inside the rail's column, and the lift had already expired for twenty-six of them: the card
passed UNDER the rail on the way out and OVER it on the way back. The lock already knows when a flight
has landed, so the rail asks it; the timer survives only as a backstop for a flight that never locks
(reduced motion) or never lands.

### 36.10 The guardrails, and the things that get re-broken

- **Bars are keyed by LANE, and person-keying has now been rejected twice** — first because it blinked,
  then (with `barArrive` making newcomers travel, so blinking was solved) because it was still worse.
  Sam took his own request back within the hour: *"I always liked how the Hooker line person vertical
  bar was always on screen."* The rail is not a list of people, it is a **standing instrument**; a lane
  is a position that stays occupied, and continuity of the object is what makes the instrument feel
  fixed while its contents change.
- **`TIMELINE_RAIL_BASE` is 0 and stays 0.** The stage gets no room for the rail (§35.2).
- **Nothing on the rail is selectable, and the cursor is `default`** — it is an instrument, not text.
  Both properties inherit, so one declaration on `.rail` covers everything. Two exceptions: `.anchor`
  and a linked `.bar` restate `cursor: pointer`. The rule exists because `.bar-label` is `vertical-rl`
  and the text I-beam **rotates with the writing mode**, producing a sideways caret.
- **`svelte-check` does not compile the CSS.** A comment placed inside a `transition:` value type-checks
  clean and fails the real build with "Expected a valid CSS identifier" — every person page 500'd while
  the checker said 0 errors. **After any CSS edit, run the compiler directly and check SSR**, not just
  `svelte-check`.
- **`elementFromPoint` cannot see the rail.** It is `pointer-events: none`, so any probe built on hit
  testing silently reports nothing and reads as a pass. Measure the rail geometrically.

### 36.11 How to measure it

Everything above was settled by measurement, and the measurements are cheap to redo:

- **Colour and grain:** screenshot with `.tick, .tick-year, .anchor, .rail .bar` hidden, then take the
  per-column mean and stdev down a vertical strip. A pure horizontal gradient is constant down a
  column, so **any stdev is the grain** — that is the whole test. Toggle `.rail::before { display:none }`
  for the differential; the haze in 36.3 was invisible by eye and obvious at −23 levels.
- **Fade continuity:** scan means left to right in steps and look at the deltas. A hard line is a
  spike; the current ground's largest 4px delta is +6.5 and sits mid-curve where it belongs.
- **Flight timing:** sample `requestAnimationFrame` into an array, recording the bar's `top` and the
  card's rect, then read off first-change and last-change. This is how the 850ms gap was found.
- **Which element is which mid-flight:** stamp `dataset` on every bar before the click, then read it
  back after — that is how "new lanes are born at their destination" was proven rather than guessed.
