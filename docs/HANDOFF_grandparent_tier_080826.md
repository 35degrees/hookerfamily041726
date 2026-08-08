# HANDOFF — THE GRANDPARENT TIER (hover-reveal), August 8 2026

A live project with working parts and named open bugs. Read this before touching the tier, the flight,
or anything that measures either. Design doctrine lives in `ENRICHED_DESIGN_FABLE_*.md` §29 and the
session record in `ENRICHED_CODING_ROADMAP_FABLE_*.md`; this file is the working state and the plan.

---

## 1. WHAT IT IS

Hold a parent chip for 900ms and THAT parent's parents open in a tier above it. No promotion, no
navigation: the featured card stays what it was and sits one tier lower while the row is open. A parent
with no parents in the tree shakes its head instead of leaving the hover unanswered.

**Shipped and verified:**

| commit | what |
|---|---|
| `f8f79d3c` | the tier: hover intent, the push, the shake, region-based dismissal |
| `2fa6e69a` | the tier leaves without flying (no duplicate card) + `scripts/probe-tier.mjs` |

**Verified working:** open at 900ms · weighted monotonic push (0 frames above baseline, 0 backward
steps) · tier pitch exactly 145px on both gaps · children retreat and return · dismissal by region with
a 300ms grace · head-shake on a childless parent · one visible copy of a clicked grandparent throughout.

---

## 2. THE INSTRUMENT — READ THIS BEFORE MEASURING ANYTHING

`scripts/probe-tier.mjs`. Build on it; do not improvise a fresh throwaway probe. An entire session was
lost to measurements that were confidently wrong, and **every one was a selector problem, not a logic
problem.** During a flight ONE PERSON legitimately occupies three or four DOM nodes at once, in
different stacking contexts, at different scales.

The four traps, all of which produced plausible wrong answers:

1. **`querySelector('.featured-flight')` returns the ARRIVING card mid-flight**, not the departing one.
   A reported "departure direction" was really an arrival's. *Always key on the person.*
2. **A detached node's `getBoundingClientRect()` is all zeros**, so `0 − startLeft` reads as real
   travel. Fourteen identical samples passed as a measurement. *Treat zero-size as unreal, not as 0,0.*
3. **`getComputedStyle(el).opacity` is 1 while an ANCESTOR holds it at 0.** `markPending` sets opacity
   on the `.flight` wrapper, so a correctly-hidden chip measured as fully visible — three separate
   times. *Resolve effective opacity by walking ancestors.*
4. **The spouse hand-off traveller is a CLONE portalled to `<body>`** carrying neither `.flight` nor
   `data-flight-id`, so it is invisible to every obvious query. *Query `.handoff-ghost` explicitly.*

The probe does all four. It answered the duplicate-card question definitively in one run after several
turns of guessing had not.

---

## 3. ARCHITECTURE FACTS A FRESH SESSION NEEDS

- **The page is normal document flow** (`.page-container`, flex column): parents-slot → connector →
  featured-slot → connector → children. Inserting a tier block at the top pushes everything below it
  down automatically. The push is layout, not a per-row transform.
- **The tier is not a number.** The opening block's own rendered height IS the distance everything moves,
  so "the same gap as parents→card" is true by construction.
- **`.parents-slot` reserves `min-height: 100px` and bottom-aligns 75px chips**, leaving 25px of dead
  space above them. Invisible at the top of the page; a visible gap the moment a tier sits above it.
  Collapsing it is also what makes the push exactly one tier (170 − 25 = 145).
- **Every flight captures its geometry at CLICK time** in `navigate.ts`: origin rect, kind, clicked id,
  pivot, pan direction, all rects. Pan direction comes from the anchor's `data-relation`.
- **The army marches `panDir === 'down' ? -rowTravel() : rowTravel()`** in two places: `flyOut`
  (leavers) and `morphIn` (arrivals). `rowTravel()` is MEASURED per navigation, never hardcoded.
- **`transition:` is bidirectional and evaluated ONCE, at intro.** A flag read inside it can never see a
  value set later. Split into `in:`/`out:` when the outro must decide something at removal time.
- **The demote resolves its seat via `querySelector([data-flight-id=pivot])`.** If that box does not
  exist, the tick returns early and the card FREEZES at full size until Svelte removes it.

---

## 4. OPEN BUGS

### 4.1 The spouse hand-off traveller strands mid-card — THE ONE THAT MATTERS

Click a parent chip while the tier is open, on a person with spouses. The traveller (the other parent,
crossing to the notch) reaches the notch seat well before the card does and PARKS there, in front of a
card that is still growing. Reads as a spouse chip floating in the middle of the featured card, then
"jumping" into place — the jump is the card arriving underneath her; she never moved.

*Measured:* the real notch chip is innocent — held at opacity 0 (`pending=true`) until the card is full
size at ~687ms, **0 frames** visible while growing. It is the ghost.

*Cause:* `scheduleHandoff` gives her `max(HANDOFF_MS, rowClockMs()) × HANDOFF_TEMPO` ≈ 420–566ms, which
is right for a spouse swap (the card barely travels) and far too quick for a promotion (~700ms+). The
tier makes it worse because the stage ALSO rises as the tier closes.

Sam: *"it makes the whole app feel broken."* Highest priority.

### 4.2 Settle wobble — probably NOT tier-specific, do not "fix" blindly

The card's top runs `247.2 → 251.9 → 253.1 → 252.1 → 250`: ~3px past the seat and back, one reversal.
**An ordinary parent promotion with no tier shows the same shape (2 reversals).** This is the house
`easeOutBack` settle behaving normally. Tuning it would change every promotion in the app. Confirm
against a control before touching it. (The control run is one repetition short of solid.)

### 4.3 Grandparent promotion is only a ONE-tier march

A grandparent is two generations up, but the army marches one pitch and the demoting card has no seat
(the old focus becomes a GRANDCHILD, and grandchildren are not drawn at this zoom).

Both halves were built and verified before the revert, and should be re-applied:
- `captureTierSpan(n)` + `marchTravel() = rowTravel() * tierSpan`, read from `data-tier-span="2"` on
  the tier chips via `anchor.closest('[data-tier-span]')`. Reset in `captureFlightKind`.
- An IMPLIED SEAT for the demote when no real box exists: a 220×75 footprint `marchTravel()` below the
  card, faded out on the row's own `ROW_SOLID`/`ROW_GONE` band so it is gone before it arrives.
  *Measured working:* travelled 148px down, 575 → 72 tall, opacity 0 on arrival.

This is doctrine, not invention — `rowTravel()`'s own comment already says a row leaving downward "is
moving into the GRANDCHILDREN seat below … they fade out before they arrive, so the seat is implied and
never asserted. Destination, not escape."

---

## 5. THE ROADMAP — STRUCTURAL, NOT PATCHES

**The single organising idea: stop running two animations against each other.**

Every remaining symptom is one cause — *the tier's close is a second animation moving the stage while
the flight measures against it.* Do not settle the stage first (see §6). Instead:

**Step 1 — re-apply the two-tier march (§4.3).** Both pieces were verified; they are additive and touch
nothing else. Land them first so the rest has a correct foundation.

**Step 2 — make the tier's close PART OF THE ARMY'S MARCH.** A parent click with the tier open is a
TWO-TIER navigation: one tier for the tier closing, one for the promotion. `captureTierSpan` already
expresses exactly that. The missing piece is having the close ride the flight's clock instead of its own
420ms. Then the stage moves once, on one clock, and nothing is measuring against a moving target.

**Step 3 — the hand-off follows from step 2.** Once the stage is not rising independently, the traveller
lands with the card. If she still arrives early, give her the hero's own duration (same inputs
`growFrom` uses) rather than the row clock.

**Verify each step with `probe-tier.mjs` before moving on.** Add a case to it rather than writing a new
script.

---

## 6. DEAD ENDS — DO NOT RETRY

- **Closing the tier on `pointerdown`.** Wrong in principle: the tier's whole purpose is to move the
  stage 145px, so removing it between pointerdown and click moves THE VERY CHIP BEING CLICKED out from
  under the pointer. Grandparent chips stopped navigating at all; parent chips missed their risen seat.
  Both measured. (Arming a flag on `onclickcapture` is fine — that changes no geometry.)
- **Setting an "instant close" flag inside the navigation effect.** Too late: Svelte has already created
  the outro. The chip still flew to y=−14. Arm it on the click, in the capture phase.
- **Reading a flag inside a bidirectional `transition:`.** Structurally impossible; see §3.
- **`easeOutBack` on the tier push.** Sam: *"horrible … like a jerking motion both up and down."* A back
  curve reverses direction twice, and over 145px those reversals are a large fraction of the travel. The
  house uses it happily on ~900px flights where the carry is a rounding error. Use a monotonic weighted
  bezier here, and do not reach for `settleBackFor` at this scale.
- **Snapping the `.parents-slot` min-height collapse.** Produced a 25px upward hiccup for five frames
  before the descent. The collapse and the push are two halves of one movement and must share a clock.
- **A CC/deck teleport for grandparent clicks.** Sam: *"too silly … it ruins the illusion and
  consistency"* — he would rather drop the feature than break the baseball-card illusion.

---

## 7. TUNING VALUES (all in `+page.svelte` unless noted)

`HOVER_INTENT_MS 900` · `DISMISS_GRACE_MS 300` · `TIER_MS 420` (shared with CSS via `--tier-ms`) ·
`TIER_CURVE cubicBezier(0.32, 0, 0.22, 1)` · `KEEP_ALIVE_PAD 24` · shake `520ms`, amplitudes
−7/+6/−5/+3.5/−2/+1 with slight rotation (uneven on purpose — a fixed ±N reads as a machine buzzing).

Dismissal is a REGION, not an edge: the pointer must still be over the grandparent block or the parent
chip that opened it. An earlier edge-based rule was unusable because opening the tier drops the stage
under a motionless pointer, so the cursor ends up inside the grandparent row without the user moving.
