# HANDOFF — THE GRANDPARENT TIER (hover-reveal), August 8 2026

A live project with working parts, one unreproduced bug, and one deferred decision. Read this before
touching the tier, the flight, or anything that measures either. Durable doctrine lives in
`ENRICHED_DESIGN_FABLE_*.md` §30; the session record in `ENRICHED_CODING_ROADMAP_FABLE_*.md` §32; this
file is the working state and what to do next.

---

## 0. THERE ARE NOW TWO TIERS

This file is written about the ANCESTOR tier (hover a parent → grandparents open above). A DESCENDANT tier
now exists too — hover a child → grandchildren open below, click one → it promotes — and it shares this
file's instrument, its traps and most of its dead ends. Its own doctrine is design §31, its record is
roadmap §33.

The one thing to carry across before touching either: **an ancestor tier moves the stage and a descendant
tier does not.** `pendingCollapse()` keys on `.grandparent-tier` deliberately, and generalising it to "any
tier" hands every grandchild promotion a 145px correction for a collapse that never comes.

## 1. WHAT IT IS

Hold a parent chip for 900ms and THAT parent's parents open in a tier above it. A parent with no parents
in the tree shakes its head instead of leaving the hover unanswered. The tier is not decoration: it takes
full part in a navigation, and three different gestures now run through it.

| gesture | what happens |
|---|---|
| **hover, then dismiss** | the row retracts as one object, chips riding it — it does not fly |
| **click a GRANDPARENT** | two-tier march; the hovered parent crosses a generation into the children row; the other grandparent crosses to the spouse notch; the old focus demotes into an implied grandchild seat |
| **click the PARENT while the tier is open** | an ordinary one-tier promotion; the grandparents above morph down into the new parents row |

**Sam's verdict, August 8:** *"super smooth, all my concerns are put to rest."*

**Provenance:**

| commit | what |
|---|---|
| `f8f79d3c` | the tier: hover intent, the push, the shake, region-based dismissal |
| `2fa6e69a` | the tier leaves without flying (no duplicate card) + `scripts/probe-tier.mjs` |
| `e23c2ca0` | the tier takes part in a navigation: the march, the implied seat, the generation crossing, the traveller's clock, and the stage that stops moving (design §30) |

**The OPEN behaviour, verified and unchanged by any of the above** — it is worth restating because every
navigation fix in this file left it alone deliberately: opens at 900ms · weighted monotonic push (0 frames
above baseline, 0 backward steps) · tier pitch exactly 145px on both gaps · children retreat and return ·
dismissal by region with a 300ms grace · head-shake on a childless parent · one visible copy of a clicked
grandparent throughout.

---

## 2. THE ONE RULE THAT EXPLAINS THIS WHOLE SUBSYSTEM

**The stage must not move while anything is flying.** An in-flow element is painted at
`layout(t) + transform(t)`; if those ride different curves the composite is the ideal path plus
`ΔL · (e − c)`, and a stage carries four curves at once. So the tier's collapse is INSTANTANEOUS, and
every FLIP is told about it arithmetically (`pendingCollapse()`) instead of the layout being made to
settle first. Full derivation, and the six things tried and reverted on the way, in design §30 — read it
before proposing any change to how the tier closes.

Three consequences that are easy to undo by accident:

- A `duration: 0` outro does **not** remove a block whose children have outros. The block leaves layout by
  a class (`.tier-collapsed`), not by its transition.
- That class may **not** be armed on `clickcapture`. §6's dead end permits a flag there only because a
  flag *changes no geometry*; the moment it hid the tier, the clicked chip's origin was read off a hidden
  element and the card flew from a 63×39 box at (17,175).
- `captureTierOpen` asks whether the tier **occupies layout**, not whether it exists — a collapsed block
  is still in the DOM while its chips outro.

---

## 2b. ARCHITECTURE FACTS A FRESH SESSION NEEDS

Still true, and none of them derivable from the code in less than an hour:

- **The page is normal document flow** (`.page-container`, flex column): parents-slot → connector →
  featured-slot → connector → children. Inserting a tier block at the top pushes everything below it down
  automatically. The push is layout, not a per-row transform.
- **The tier is not a number.** The opening block's own rendered height IS the distance everything moves,
  so "the same gap as parents→card" is true by construction and stays true if row density ever changes.
- **`.parents-slot` reserves `min-height: 100px` and bottom-aligns 75px chips**, leaving 25px of dead
  space above them — invisible at the top of the page, a visible gap the moment a tier sits above it.
  Collapsing it is also what makes the push exactly one tier (170 − 25 = 145).
- **Every flight captures its geometry at CLICK time** in `navigate.ts`: origin rect, kind, clicked id,
  pivot, pan direction, all rects — plus, now, tier span and whether the tier occupies layout. Pan
  direction comes from the anchor's `data-relation`.
- **`transition:` is bidirectional and evaluated ONCE, at intro.** A flag read inside it can never see a
  value set later. Split into `in:`/`out:` when the outro must decide something at removal time. (And an
  `out:` on a child of a conditional block needs `|global` to run at all — see §2.)

Two facts from the previous edition are now SUPERSEDED rather than deleted, because a fresh session will
otherwise re-derive them from the code and be misled:

- *"The army marches `panDir === 'down' ? -rowTravel() : rowTravel()` in flyOut and morphIn"* — still the
  shape, but the two now read DIFFERENT quantities: `flyOut` uses `rowTravel()` (a pinned leaver is stated
  in viewport coordinates) and `morphIn` uses `marchTravel()` (an in-flow arriver is stated in layout
  coordinates, where the collapse already carries it one pitch). Identical numbers with the tier shut.
- *"The demote resolves its seat via `querySelector([data-flight-id=pivot])`, and if that box does not
  exist the tick returns early and the card FREEZES"* — the freeze is fixed; a promotion out of the tier
  falls through to the IMPLIED grandchild seat instead.

## 3. THE INSTRUMENT — READ THIS BEFORE MEASURING ANYTHING

`scripts/probe-tier.mjs`. Build on it; do not improvise a fresh throwaway probe. During a flight ONE
PERSON legitimately occupies three or four DOM nodes at once, in different stacking contexts, at different
scales, and **every one of the failures below was a selector or a subject problem, not a logic problem.**

```
node scripts/probe-tier.mjs [startSlug] [parentMatch] [--control] [--tierparent] [--film]
```

`--control` = ordinary parent promotion, no tier. `--tierparent` = tier open, PARENT clicked. `--film` =
a filmstrip to `scripts/probe-out/tier-film/` (gitignored). **Every claim about the tier is only
meaningful beside a control reading taken the same way, on the same page, by the same instrument.**

The traps, all of which produced plausible wrong answers:

1. `querySelector('.featured-flight')` returns the ARRIVING card mid-flight. *Key on the person.*
2. A detached node's rect is all zeros, so `0 − startLeft` reads as real travel. *Zero-size is unreal.*
3. `getComputedStyle(el).opacity` is 1 while an ANCESTOR holds it at 0. *Resolve effective opacity.*
4. The hand-off traveller is a CLONE portalled to `<body>` with neither `.flight` nor `data-flight-id`.
5. **Keying on a NAME collides.** "Rev. Aaron Burr" matches inside "Aaron Burr Jr.", and the probe
   reported the ARRIVING card as a frozen demote. Subjects are pinned as node references.
6. **The pitch is not measurable off `.parents-slot`** — the slot's 25px dead lead is collapsed by
   `.tier-above`, so it reads 170 with no tier and 145 with one. Measure from the CHIP.
7. **`page.screenshot()` is a request, not an instant.** Frames asked for at 180ms showed a landed card.
   `--film` uses a CDP screencast; every filename is an OBSERVED paint offset.
8. **A subject that cannot show the defect is worse than no subject.** Three passes were lost proving the
   hero was clean on a grandfather with no parents in the tree — so nothing arrived into the parents row,
   and the arriving chips were the only things that dipped. **Choose the subject from what the code says
   will move.** `aaron-burr-1808` has arriving rows; `aaron-burr-jr-1756` does not.

---

## 4. WHAT IS VERIFIED, AND THE NUMBERS THAT SAY SO

Re-run these three; they should all hold.

| check | tier | tierparent | control |
|---|---|---|---|
| visible copies of one person | 1 | 1 | 1 |
| hero born on its own chip | ✓ (367,105) | ✓ (485,250) | ✓ (485,105) |
| dip check, every flight box | ✓ direct | ✓ direct | ✓ direct |
| stage movement | 1 step | 1 step | 0 steps |
| traveller lands on the notch's RESTING rect | 0px | 0–2px | 0px |
| generation crosser lands on his seat | 0px | n/a | n/a |
| march | 1.00 tiers | 1.00 tiers | 1.00 tiers |
| hero's sag below its seat | 3px @ ~450ms (the settle) | 0px | 2px @ ~440ms (the settle) |

Plus: hover dismissal closes with 0px lateral chip drift; `probe-ghosts` GREEN on all three directions;
`svelte-check` clean but the two pre-existing `@fontsource` errors; SSR 200.

---

## 5. THE OPEN BUG — INTERMITTENT, UNREPRODUCED

### 5.1 What Sam saw

Navigating maternal Vanderbilts: hero **Cornelius Vanderbilt Whitney HD7738**, hover his mother
**Gertrude Vanderbilt Whitney HD7695**, click grandmother **Alice Claypoole Gwynne Vanderbilt HD7688**
(`/person/alice-gwynne-1845`). *"The entire UX and all the elements get jarred around, it's actually like
flashing, the entire UX drops down the screen at one point instantly and comes back up."* Everything lands
correctly in the end. Also seen promoting **Cornelius Vanderbilt III 02328** and
**Gladys Moore Vanderbilt Széchenyi HD7698**.

**It did not reproduce on demand.** Sam re-ran the Alice sequence and it was smooth; the Széchenyi
sequence was smooth first time and jerky on a later attempt with the grandfather chip.

### 5.2 What it is almost certainly NOT

Do not re-derive these — they are measured, on both tier gestures and two subjects:

- the collapse itself (moves in exactly 1 step),
- the hero's origin (born on its chip),
- any single object's curve (dip check ✓ direct on every flight box, including arriving rows),
- the march distance, the traveller, or the generation crosser (all land 0px on their seats).

### 5.3 The two hazards already hardened for it (reasoned, NOT confirmed)

Both were found while hunting it, and **each independently produces a displacement of exactly one tier and
back**, which is the reported shape. Neither was reproduced, so neither can be claimed as the fix.

1. **The stale-tier test.** `captureTierOpen` tested for the tier's EXISTENCE. A collapsed block stays
   mounted for as long as its chips outro (~500ms), so a navigation started inside that window was handed
   a 145px correction for a collapse that was not coming — every FLIP on that flight displaced by a tier
   and snapped back. Now tests occupied height. *This one fits Sam's report best: he was navigating
   repeatedly, and it fires only when the second click lands inside the window — which is exactly why
   Alice worked the second time.*
2. **`pointerenter` un-collapsing a live tier.** `tierCollapsed` was cleared in `onParentEnter`. The
   collapse brings a NEW parents row up under a pointer that has not moved, so a chip slides beneath the
   cursor and fires that handler by itself — the same trap the keep-alive region was rebuilt around.
   Clearing it there restored `display` to a still-mounted block. Both flags are cleared at the REVEAL now.

### 5.4 THE FRAMEWORK — what to do if it recurs

**Step 0 — get the one fact that splits the space.** Ask Sam, or determine from the sequence: *does it
happen on a click that closely follows a previous navigation, or on a first, unhurried click into a tier?*

- **Follows a previous navigation** → hazard 5.3.1 is confirmed as the family, and the fix is already in.
  Look for a SECOND instance of the same shape: any per-navigation capture that is read while a previous
  flight's DOM is still winding down. `tierOpen`, `tierSpan`, `clickedId`, `rectSnapshot`, `rowPitch` all
  have per-navigation lifetimes, and they are cleared on three different schedules — `captureFlightKind`,
  `clearFlightCaptures` (one rAF after the swap), and never. That inconsistency is the thing to audit.
- **First, unhurried click** → neither hazard applies. Go to step 1.

**Step 1 — drive Sam's exact sequence, not a synthetic one.** Add a case to `probe-tier.mjs` that
navigates the real chain (`cornelius-vanderbilt-whitney` → hover mother → click grandmother), rather than
picking a convenient subject. Trap 8 above is why: the Vanderbilt maternal line has easter-egg spouses,
3+-spouse notches and deep rosters that the Burr subjects do not, and the defect may live in one of those.

**Step 2 — measure the FLOOR first, at high resolution.** The reported symptom is a whole-stage
displacement, so `slotTrack`'s step count answers it directly: 1 step = the honest collapse, ≥2 = the
stage moved twice and something is wrong. Do not look at any individual chip until the floor is cleared —
three passes were lost this session doing exactly that.

**Step 3 — if the floor is clean, the displacement is in a shared ANCESTOR, not in the stage.** Candidates
in order: `.featured-slot`'s reserved height (`cardHeight + bladeHeight`) changing late when a blade
reports its height after images settle; the sibling panel's own layout; `.children-slot`'s tier-open
retreat transform not being cleared. Sample the ancestor chain's rects per frame, not the leaves'.

**Step 4 — reproduce before fixing.** Every confident fix this session that was applied without a
reproduction had to be reverted. Two of them measured WORSE than what they replaced.

---

## 5b. A STANDING CAUTION — THE SETTLE WOBBLE IS NOT A BUG

The card's top runs roughly `247 → 252 → 253 → 252 → 250`: a few px past the seat and back, one reversal.
**An ordinary parent promotion with no tier shows the same shape.** That is the house `easeOutBack` settle
behaving exactly as designed, and tuning it would change every promotion in the app. It is recorded here
because it looks like a defect every single time somebody meets it, and because this session proved the
rule twice over: a shape that looks tier-specific is usually the house behaving normally — confirm against
`--control` before touching anything. The 2–3px reported in §4 IS this, and it is correct.

## 6. DEAD ENDS — DO NOT RETRY

- **Closing the tier on `pointerdown`.** Removes the row between pointerdown and click, moving the very
  chip being clicked. Both click paths broke. *A flag armed on `onclickcapture` is fine ONLY while it
  changes no geometry* — see §2.
- **Setting an "instant close" flag inside the navigation effect.** Too late: Svelte has already created
  the outro, so the duration it reads is the animated one. Measured — the chip still flew to y=−14. Arm it
  on the click, in the capture phase, subject to the geometry rule in §2.
- **Reading a flag inside a bidirectional `transition:`.** Structurally impossible; it is evaluated once,
  at intro. Split into `in:`/`out:` when the outro must decide something at removal time.
- **`easeOutBack` on the tier push.** Sam: *"horrible … like a jerking motion both up and down."* A back
  curve reverses twice, and over ~145px those reversals are a large fraction of the travel.
- **Snapping the `.parents-slot` min-height collapse independently of the push.** Produced a 25px upward
  hiccup for five frames. They are two halves of one movement and share one clock — now, one FRAME.
- **A CC/deck teleport for grandparent clicks.** Sam: *"too silly … it ruins the illusion."*
- **Animating the tier's collapse at all** — on the army's clock, on the hero's clock, or on its own. See
  design §30.3 for all four attempts and their measurements.
- **Trimming the settle amplitude to compensate for a collapse.** Treats the symptom. Deleted once the
  FLIP delta became honest, which is the tell that it was never a design value.
- **Feeding the settle solver a shorter distance.** Backwards, and it measures as backwards: 254 → 256.
- **`$effect.pre` to settle the layout before measurement.** Right instinct, wrong lever: `growFrom` then
  measures during the reflow. Also, `$effect.pre` runs during SETUP, so anything it touches that is
  declared below it is in its temporal dead zone — that does not warn, it kills hydration while SSR still
  returns 200.
- **Moving the tier closer to the top to shrink the push.** A real lever (the error is `ΔL·(e−c)`) but not
  the cause; Sam's own test settled it — the dip survived the move, and the tier read
  *"uncomfortably close to the top of the browser."* `TIER_LIFT` is back to 0.

---

## 7. THE DEFERRED DECISION — `rowClockMs()` NEVER DERIVES

It is memoised at page load, when there is no click and the rect snapshot is empty, and never re-derived
for the navigation that follows. So it returns its **420ms fallback on every flight**, and the whole army
marches on a constant while the hero's clock varies with distance. The demote's stated "finish-first"
relationship with the hero is therefore a coincidence, not the derived relationship the code describes.

Everything in this subsystem that needed a real clock was routed AROUND it rather than through it — the
traveller rides `getHeroSchedule()`, resolved in a deferred frame. That is deliberate: fixing `rowClockMs`
changes the row tempo on EVERY navigation in the app, including the default view Sam has repeatedly said
he values as-is. A DEV log (`[rowclock]`) records the fallback each time so the defect cannot go quiet.

**This is Sam's call to make, not a maintenance task to pick up.** If he takes it, do it as its own pass
with the control measured before and after.

---

## 8. TUNING VALUES (all in `+page.svelte` unless noted)

`HOVER_INTENT_MS 900` · `DISMISS_GRACE_MS 300` · `TIER_MS 420` (the OPEN only — the close is one frame) ·
`TIER_CURVE cubicBezier(0.32, 0, 0.22, 1)` · `TIER_LIFT 0` · `KEEP_ALIVE_PAD 24` · shake `520ms`,
amplitudes −7/+6/−5/+3.5/−2/+1 with slight rotation (uneven on purpose — a fixed ±N reads as a machine
buzzing). In `flight.ts`: `HANDOFF_LEAD 0.96` (the traveller lands just inside the card's own landing;
`HANDOFF_TEMPO` is superseded and read by nothing).

Dismissal is a REGION, not an edge: the pointer must still be over the grandparent block or the parent
chip that opened it. An edge-based rule was unusable because opening the tier drops the stage under a
motionless pointer, so the cursor ends up inside the grandparent row without the user moving — the same
fact that makes `pointerenter` an unsafe place to reset anything (§5.3.2).
