# CODING_HANDOFF — frontend (Stream B) itinerary & session record

The card-transition phase is **CLOSED**; Phase 3a (camera store / travel vector) and the
spouse-regime unification shipped (see **Session record** below for the doctrines). What
follows is the standing model, the lessons, the ghost taxonomy, and the probe gate. Next
up is **Phase 3b — the field** (midnight ground + parallax mote layers on the camera store).

---

## The demotion model (as shipped)

A parent/child navigation morphs the featured card as one solid object. The card the
user clicked **grows** into the slot (`growFrom`, the hero); the previous focus
**demotes** down/up into its new relative box (`shrinkTo`). The demotion is now:

- **Solid object, no terminal fade.** `flightKind === 'relative'` → opacity 1 the
  whole way (the old "suction" was the terminal fade collapsing under scale, not the
  easing). Spouse demotion is untouched — it keeps its covered-under-hero cross-fade.
- **Flip early, land as a chip.** A `.demote-chipface` overlay renders a *real*
  `PersonBox` of the demoting person (identical to the box it becomes). It crossfades
  **in** over the first ~110ms; the card's own face (`.card-top` + `.footer`)
  crossfades **out** front-loaded (~70ms) so the two names — at different positions —
  are never both readable (no double name). One flip, front-loaded, motion-masked.
- **Undistorted face (counter-scale).** The shell's morph is non-uniform (Sx ≠ Sy),
  which would stretch the face. `shrinkTo`'s tick counter-scales the face every frame
  — `scale(afx, afy)` with `afx·Sx = afy·Sy = U` — so the shell×face composite is a
  **uniform** scale U. The face renders at its true 220:75 aspect at every frame,
  spans the shell's width, stays vertically centered (honest whitespace in the tall
  early shell), and lands at natural box size.
- **Atomic swap.** The pivot box is revealed by the outro-**end** callback
  (`onOutgoingEnd`) — the frame the card is removed — so the box never appears on top
  of the still-docked card (a visible double, for a child pivot whose box paints
  above) nor a frame after it (a bare destination). The `introend` safety-net excludes
  the pivot for relative+motion so it can't pre-empt the swap with a fade.
- **Rides above the rows.** A relative demote is a visible-by-design solid object, so
  it flies OVER the resting parent/child rows: `.featured-slot { z-index: 1 }` +
  `.parents-slot`/`.children-slot { position: relative; z-index: 0 }` confine each row
  under the lifted slot. (z-index on the flying *card* alone can't do it — an incoming
  row box mid-fade is an `opacity` stacking context the browser resolves against the
  card by DOM order, not z; proven up to z:99.) The demote still rides UNDER the hero
  via its own z:1 < hero z:2 within the slot.
- **Finishes first.** `shrinkTo` duration = the hero's distance-scaled duration ×
  `DEMOTE_LEAD` (0.85), derived from the *clicked* rect (not the destination box —
  sidesteps mount-order), so the demote always finishes ~15% before the hero lands
  and never competes for attention with the landing.
- **Velocity-ceiling physics.** `relativeGrowMs` (shared by promote + demote) is a
  velocity cap, not a duration clamp: `clamp(distance / RELATIVE_V_CEIL, 410, 1000)`.
  Near flights keep the ~410ms floor; far flights EXTEND so average on-screen speed
  never exceeds the ceiling — a distant relative travels with weight, not a missile.
  **`RELATIVE_V_CEIL = 1.6` is the single tuning knob** (crossover ~656px; 738px ≈
  461ms, 1000px 625ms, 1300px 813ms). Raise → lighter/faster; lower → heavier/slower.

---

## The reverted-settle lesson (do not re-attempt in isolation)

A rubber-band landing **settle** and a **directional weight** (downward navs ×1.12)
were built and **reverted** on Sam's verdict. Two takeaways, logged so the next
session doesn't repeat them:

1. The settle was an **origin-anchored SCALE puff** (grow ~1.4% past the final rect,
   settle back). Wrong physics: it made the card puff past its own frame from the
   top-left origin, and it read as a regression at honest speeds. The correct settle
   is an **overshoot along the TRUE TRAVEL VECTOR** — the card carries a few px *past*
   its destination in its direction of travel, then springs back — never a scale puff.
2. Direction-dependent motion (both the settle overshoot and the directional weight)
   depends on the arrival vector being a first-class value. That's exactly what
   **Phase 3a** (camera / flyover corridor) formalizes. **One physics, defined once,
   shared by cards and camera** — build the settle then, on the captured vector, not
   before.

---

## Ghost taxonomy (with dispositions)

| # | Name | What | Disposition |
|---|------|------|-------------|
| A | Leading-click demotion exposure | On a leading/middle spouse-chip click the growing hero lands left of the demoting card, briefly exposing the demote's right edge (covered-under-hero geometry). | **ACCEPTED** (Sam can live with it). Candidate: clip morph to slot bounds. |
| B | Viewport-edge fling | `.spouse-strip { will-change: transform }` created a containing block for `position:fixed` flyOut chips → viewport-coord pins flung 800–1800px to the edge. | **FIXED** (removed will-change). |
| B-residual | Off-window leaver paints off-card | Off-window carousel chips painted past the card edge on exit once the mask adopted the incoming clip. | **FIXED** (`chipExit` exits off-window chips at opacity 0). |
| — | Off-window floater | `chipExit` `duration:0` stranded off-window chips (animate:flip `position:absolute`) as floaters on ≤3-spouse destinations. | **FIXED** (`chipExit` `duration:60` + `visibility:hidden`). |
| — | Interrupted-outro orphan | A `position:fixed` flyOut chip stranded until the next nav. | **FIXED** (per-frame sweep + prod janitor belt — L1 Option A). |
| C | Cover-and-re-emerge | A revealed **sibling** of the pivot in the same row is up at opacity 1 while the demoting card crosses its region: name shows → solid card (z:1) passes over → re-emerges. | **ACCEPTED** as honest occlusion (solid object passing a stationary one; NOT a z-seam — pivot is correctly held). Surgical option: corridor-hold (bundle with 3a). |
| — | Double name | The demoting card's own `<h1>` header + the chip-face name both readable during the flip. | **FIXED** (card-face crossfades out, front-loaded 70ms; Check-G 9b). |
| D | Sibling retraction paints over landed card | The sibling-flight retraction (spouse-swap gesture) rode at z:1; the sped-up arrival cleared the hero's z:2 at `introend` while the retraction was still flying → z:1 > z:0, it painted over the landed card. | **FIXED** (retraction z:-1). |
| E | Sibling retraction shows through reformed notch cutout | z:-1 hid the retraction wherever the incoming card was opaque, but the card is CLIPPED at its notch cutout (top-right); the retraction ENDED at that corner, so when the cutout reformed at landing the endpoint (chip-face) showed through for ~2 frames. | **FIXED** (end the retraction below the notch line — `SIB_SEAT_TOP_INSET`, in the opaque body; probe-sibling-notch). |
| F | Resting-notch flash during fetch latency | On ANY warm nav, the old focus's notch chip is visible at op1 for ~50ms through the OLD card's own (resting) notch cutout, during the fetch before `f` swaps. Project-wide (parent/child too); most visible on a sibling nav because the retraction draws the eye to the notch. | **LOGGED, unfixed.** Pre-existing. Needs the outgoing notch hidden at nav-START (before `f` updates), not at unmount. |

**DOCTRINE — the notch cutout means the featured card is NOT a solid rectangle.** "Behind the card" is not a reliable hiding place: the top-right is clipped away, so a z-below element shows THROUGH it. Any z-based occlusion must account for the cutout AND for the fact that `.flat` (no cutout, during flight) and the resting card (cutout present) occlude DIFFERENTLY. This single fact caused three separate bugs — D (z:1 over the landed card), E (z:-1 through the reformed cutout), and F (op1 through the resting cutout). When hiding something at the top-right, put it in the OPAQUE body, not merely below the card.

---

## The probe arsenal — the standing gate

Run all three after every change to the flight system; dev server up on `:5173`.

- **`scripts/probe-flight.mjs`** — the frozen-flight guard. Checks:
  - **A** child-click: incoming spouse chips stay hidden until the card lands.
  - **B** spouse-swap: nothing visible flies past the card's right edge (tight 2px).
  - **C** Morgan wife-#4/#5 round-trip (the scenario that caught the original ghost).
  - **D** orphan invariant: 0 persistent pins + 0 janitor firings after settle.
  - **E** false-positive guard: the sweep never touches a live in-flight element.
  - **F** paged-nav floater guard: no off-window chip stranded on the destination.
  - **G** relative-demote atomic swap (both regimes, frame-sampled): step-reveal (not
    fade), box held, no bare frame, solid card, ≤1-frame changeover, chip-face shown
    for the final 60%+, chip-face converges onto the box, **9 no-warp** (aspect within
    2% of true at every frame), **9b no-double-name**, **10 finish-order** (demote gone
    before hero lands).
  - **G-Z** z-order: the demote is never occluded by a resting relative box (pixel-
    overlap via `elementsFromPoint` stack order; single-row navs land in-column so the
    path is noted-not-exercised — a 2+-row-children person would exercise it).
  - Known-accepted, NOT asserted: Artifact A, Artifact C (cover-and-re-emerge).
- **`scripts/probe-carousel-regression.mjs`** — ≤3-spouse rects frozen (captured
  baseline), no scrollbars, no clipped shadows, full-pitch paging.
- **`scripts/probe-stress.mjs [N]`** — N randomized rapid navs; asserts zero persistent
  orphans + janitor firings ≤ cap + no pageerrors.
- Measurement/artifact tools (not gates): **`measure-velocity.mjs`** (per-flight px/ms
  + duration), **`capture-demote-terminal.mjs`** (flip-stage frames vs the real box).

---

## Deferred / bundles with Phase 3a

- **The settle**, spec'd correctly (true-vector translate overshoot; one physics for
  cards and camera) — build once 3a captures the travel vector.
- **Corridor-hold** for Artifact C — hold only the incoming boxes in the demote's
  flight path — bundles with 3a's flyover-corridor work.
- **Artifact A** clip-to-slot-bounds — a separate micro-phase if ever wanted.

---

## Session record — spouse-regime unification + geometry-crossfade demotion

The demotion model above is now **unified across both regimes** (spouse + relative are
one visible-solid-object system, one velocity family) and hardened by several doctrines
earned this session. Phase 3a (camera store / travel vector) shipped; the settle was
built on it. Next is **Phase 3b — the field** (parallax world).

**Doctrines (the load-bearing lessons):**
- **Exposure-time, not code.** A "regression" that appears when motion slows is usually
  *exposure* — slower motion reveals what speed concealed (a giant chip-face was always
  there; the slower spouse tempo made it visible). Diagnose before reverting; the regime
  guards held every time. **Rule: a change spec'd for one regime must be regime-guarded
  in shared code** (`flightKind`/`relative` branches, or a kind-specific constant).
- **Face visibility keys to GEOMETRY, never clocks.** The card's own face and the
  chip-face crossfade on **shell width**, not elapsed time — outgoing fades 2.4×→2.0×
  natural chip scale, chip-face fades in 2.1×→1.7×, OVERLAPPING (no blink; the white card
  body is always up). This kills the billboard name at the root (max legible ~388px): by
  the time a name is legible the face is near chip scale. Band constants tunable (drop the
  whole band 0.2 if a name still reads big). Replaced all time-based face CSS.
- **Honest velocity = MAX-corner travel.** With transform-origin top-left, a card
  shrinking into its top-right notch seat moves its **bottom-left corner (the photo)** ~2×
  its top-left corner — timing off the corner let the photo run 2× the ceiling and STROBE
  (browsers don't motion-blur). Time the demote off `maxCornerTravel` / ceiling, and use
  **LINEAR** easing on the spouse demote (cubicOut's fast start peaks ~3× average — a
  peak-to-average problem no duration fixes). Guarded by **`probe-demote-velocity.mjs`**
  (smoothed per-frame photo-corner velocity ≤ strobe-regime limit).
- **Coupled finish-first — do NOT decouple.** `hero = max(spouseGrowMs, demote+60)`; the
  demote lands 60ms before the hero, so the pivot seat reveals **under cover** (the atomic
  swap owns it). Decoupling (demote lands after) breaks the atomic swap — the hero's
  landing reveals the seat early (fade + double). Speed the promotion by raising the
  **spouse demote's own velocity ceiling** (`SPOUSE_DEMOTE_V_CEIL` = 1.85; relative stays
  1.6) — the demote honestly travels faster, so the coupled hero speeds up without cram.
- **First-frame flash fix.** Svelte applies a css-transition's keyframes one frame LATE,
  so the incoming hero paints at its DESTINATION for frame 0 before jumping to the origin
  (visible with a photo). `growFrom` sets the t=0 (origin) transform **inline** so frame 0
  is at the chip; `onIncomingLand` clears it so the landed card rests at identity.
- **Settle = whole-path growth-overshoot** on the PROMOTION, BOTH regimes (Layer 3 extended it from
  spouse to relative parent/child): one easeOutBack value drives translate AND scale (no fixed-edge
  lope) along each flight's own vector, clamped to a ~5–6px along-axis carry, endpoints frozen. Active
  only on a warm click whose camera-move kind matches the flight (`getCameraMove()?.kind === flightKind`).
  `probe-settle.mjs` guards spouse + relative. The DEMOTION micro-settle was deliberately SKIPPED at the
  time — a demote overshoot risks the atomic-swap frame. **(Superseded: it was later BUILT, per-seat, on
  frozen endpoints — the atomic-swap risk did not materialize. See the "demotion settle" session record below.)**

**The pinned demotion look** (freezes it against drift, both regimes): `probe-flight.mjs`
Check G adds **9a** (legible chip-face width, opacity>0.5, ≤ ~2.1×220 — RED without the
crossfade) and reframes **7** to *lands-as-a-chip* (face reaches full opacity + is shown
at the last frame, seat-size-agnostic).

**Also this session:** children-row entrance now **mirrors** the parents' fade-and-rise
(measured 150px, 300ms, cubicOut — children settle DOWN from above via `revealPending`);
§16 chip dates degrade (both-ends-unknown suppressed; single-unknown drops the `?` →
"1977–"), scoped to `PersonBox` (featured vitals untouched).

**Parked (known-accepted, not asserted):** the **compact-seat sliver** — on a ≥3-spouse
card the seat is a compact chip (aspect 2.46) but the non-compact chip-face (2.93) lands
~54px in the 65px shell → ~5px white edges. No small non-distorting fix (only a compact
chip-face variant, which the leaving card can't reactively select). Annotated in
`probe-flight.mjs` beside Artifact C.

---

## Session record — the demotion settle (per-seat), the glide fix, the child-row de-jello

The **demotion micro-settle** — logged above as deliberately SKIPPED — was built this
session, on the true travel vector, per-seat; plus the root-cause fix for a pre-existing
child-row wobble. The atomic-swap risk that justified skipping did **not** materialize:
the settle's endpoints are frozen (departure + arrival byte-identical), so the swap frame
is untouched. All in `src/lib/transitions/flight.ts` + one CSS line in `+page.svelte`.

**What shipped:**
- **Demotion settle, reciprocal of the promotion.** The demote overshoots a few px PAST
  its seat and returns — the same `easeOutBack` machinery as `growFrom`, aimed inward. On
  `shrinkTo` (the card) and `morphIn` (the spouse), each on its OWN captured `{from,to}`
  vector. Endpoints frozen → duration + unfurl schedule byte-identical (only the middle
  gains the tail). Gate: `demoteSettleActive = relative && getCameraMove()?.kind === flightKind`
  (warm chip-nav only; cold / back-forward → no-settle, bit-identical to pre-settle).
- **PER-SEAT DIALS — independent, now doctrine.** Parent-seat, child-seat, and spouse
  demotions are different situations (travel, scale delta, landing context, glide vs no-
  glide) and MUST NOT share a dial, clock, or amplitude. In `flight.ts`:
  - `DEMOTE_SETTLE_PARENT_FACTOR = 0.6` — card→PARENT seat (dir `up`). Lands exactly on
    `DEMOTE_SETTLE_FLOOR_PX` (2.2 targetPx → ~1.84px measured); the floor dominates so the
    factor is **INERT** (further reduction needs lowering the floor). **FROZEN — reads right.**
  - `DEMOTE_SETTLE_CHILD_FACTOR = 1.6` — card→CHILD seat (dir `down`). Ratio-driven
    (targetPx 3.66 at factor 1, above the floor — a real dial). **Under evaluation** — Sam
    bracketing 1.2 / 1.6 / 2.2 = ~3.3 / 5.0 / 7.4px measured; build sits at +60%.
  - Spouse (`morphIn` → parent slot) ~3.6px. **FROZEN — reads right.**
  - `DEMOTE_SETTLE_CAP_PX` raised 6.5→9 for child-bracket headroom (parent 2.2 + spouse
    3.66 sit far below → unaffected).
- **The easing-flip audit (bit-identical non-settle, by construction).** To layer
  `easeOutBack`, `shrinkTo`'s `easing` flipped to identity so `t` arrives RAW; the base
  curve is reconstructed INSIDE the tick (relative → `cubicOut(t)`, spouse → linear) so
  every non-settle path is **bit-identical** — verified empirically (under identity `u ==`
  raw progress; `cubicOut(u)` reproduces the pre-flip curve). The tick's whole geometry AND
  its geometry-keyed opacity crossfade key off a single `u`, so ONE substitution covers
  every consumer — no property left on raw `t` (probe asserts opacity lies on its width
  contract, teeth-proven by injecting a raw-`t` leak → RED).
- **THE CHILD-ROW WOBBLE WAS THE GLIDE, NOT THE CHILDREN.** Pre-existing (present on
  pristine): the `.featured-slot` height glide ran **540ms** while the children directional
  entrance ran **300ms**. `rect.top = layout(t) + transform(t)` — the entrance finished
  while the row was still sliding underneath, so the sum overshot ~23px (the whole children
  row dipped). **Fix: match the glide to the children's 300ms clock** (same easing) →
  `rect.top` collapses to a single monotone curve → no wobble, children UNTOUCHED. **Two
  rejected detours, both of which deformed the innocent children:** (A) gating the children
  reveal until the glide settled (+216ms lag — slow reveal); (B) stretching the children
  entrance to 540ms (slow crawl). **Doctrine: fix the guilty layout animation, never deform
  its victims.** (Option (b) — sizing the slot at flight-start with no transition — was
  rejected: `cardHeight` updates reactively, so no transition = a 1-frame snap, the exact
  thing the glide exists to prevent.)
- **No settle on the CHILD chip decision — reversed on a contaminated verdict.** The
  child down-case first read as "swooping" at 5.01px — but that was measured under the
  540ms glide, i.e. the seat was still sliding ~240ms after the card docked; the measurement
  absorbed the seat's motion. On the fixed 300ms glide the true settle is far subtler. Lesson:
  never judge (or tune) a landing while its landing surface is still moving.
- **Measurement lesson.** On a long-travel demote (851px child) the card is removed at
  outro-end, sometimes mid-settle — so measuring overshoot against the card's OWN last frame
  UNDER-measures. Use the **resting-seat** rect as the arrival reference (reliable, and
  consistent with the parent's measured/targetPx ratio ~0.8).

**New probes (add to the standing gate):**
- **`scripts/probe-neighbor-stability.mjs`** — the doctrine guard: a chip that did NOT fly
  must not overshoot ("jello screen"). Drives the Burr repro (`aaron-burr-jr-1756` → father
  Burr Sr; H00912 the stationary sibling, H00913 the flying seat, excluded), gates on
  VISIBILITY, asserts the neighbor settles with 0px overshoot. RED (23px) on the wobble,
  GREEN after the glide fix.
- **`scripts/probe-demote-settle.mjs`** — the per-element settle: card + spouse each
  overshoot their own captured vector and return; departure/arrival rects byte-stable;
  unfurl unchanged (relative-to-card timing, jitter-immune); CC departure byte-identical
  (whole-card, no settle — the July-12 flash guard); reduced-motion zero-settle; opacity on
  its width contract. Pair with **`scripts/probe-demote-baseline.mjs`** (records the
  pre-settle reference into `scripts/probe-out/demote-baseline.json`).

---

## Phase 3b — the field (NEXT)

Midnight-blue page ground behind the stage; 2–3 world-seeded mote layers ("fairy lights")
subscribing to the camera store and counter-drifting by depth on **the same clock as the
flight** (the §17 one-clock doctrine — desync is THE failure mode). Cards/chips at depth 0
(never parallax). First world movement: click a child chip, the field drifts up past the
cards.
