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
  `probe-settle.mjs` guards spouse + relative. The DEMOTION micro-settle was deliberately SKIPPED — a
  demote overshoot risks the atomic-swap frame; not worth it. **The motion layer is CLOSED here.**

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

## Phase 3b — the field (NEXT)

Midnight-blue page ground behind the stage; 2–3 world-seeded mote layers ("fairy lights")
subscribing to the camera store and counter-drifting by depth on **the same clock as the
flight** (the §17 one-clock doctrine — desync is THE failure mode). Cards/chips at depth 0
(never parallax). First world movement: click a child chip, the field drifts up past the
cards.
