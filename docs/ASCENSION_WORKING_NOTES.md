# THE ASCENSION — working notes (live, Aug 25)

**Purpose: stop re-breaking things Sam has already approved.** This is a scratch ledger for an
in-flight subproject, not doctrine. When the Ascension ships it folds into design §38 and this file
goes away. Roadmap §40 is the spec; this is the running state.

---

## THE STANDING RULE

**This is an ADDITION and a subproject. It must not change any existing transition.** Sam, after a
regression leaked into the spouse promotion: *"assume the project is perfect as is, so be careful about
the impact your changes have."* Anything touching shared code gets called out explicitly.

---

## APPROVED — do not re-open without being asked

| | |
|---|---|
| **Entry from the FOREGROUND** | the orbit card arrives out of the near side and settles to the seat. "Almost there", "a big step forward". THE HALF THAT WORKS. |
| **Entry and exit are OPPOSITES** | not one rule applied twice. A single shared rule is a CAROUSEL, which Sam has never asked for and rejected on sight. |
| **The dark ground + cream rail** | reads correctly, no complaints. |
| **The derived orbit set** | 94 people, 55 components. Not questioned. |
| **The X / way out** | works now, and matters most on a card like Martha with no CCs of her own. |
| **Timing judged against a real CC** | ~660ms, not the rail's 1200. |

## REJECTED — with the reason, so they are not re-attempted

| attempt | why it failed |
|---|---|
| **Exit by enlarging + fading** | "Vomit-inducing." The card stalls at its largest and dissolves in the reader's face. |
| **Alpha on the near card** | Both cards are CONCENTRIC, so the smaller always sits inside the larger. Any translucency makes the front card a WINDOW onto the back one — "giving birth from its belly". There is no subtle amount. |
| **Hard cull at the plane** | A jarring flash at the cut. |
| **Exit out the top of the screen** | "Ridiculously goofy", 0% chance. A shallower angle is not available: clearing the top edge needs ~1.4 card-heights of rise, which IS the steep angle. |
| **One-way conveyor (both directions identical)** | A carousel. Turned the approved entry into the rejected exit. |
| **Reveal starting AT the plane (1.56)** | The card covers the viewport there, so it has no edges — what resolves is the whole view brightening, not an object. THIS WAS THE "WEIRD BEAT". |

## THE GEOMETRY THAT KEEPS BITING

Only three mechanisms can remove a card from view, and each has a known cost:

1. **alpha** → the window problem (concentric cards)
2. **magnification past the plane** → the reader is made to watch it inflate
3. **translation out of frame** → needs ~1.4 card-heights, i.e. a steep angle

The exit has to pick one, or find a fourth idea. **Currently unsolved — this is the open problem.**

## CURRENT DIALS

    ASCEND_TOTAL_MS   660     whole gesture
    ASCEND_ENTRY_SCALE 1.8    orbit card's start, entering (near side, invisible above REVEAL)
    ASCEND_EXIT_SCALE 0.46    tree card's parked depth while the zone is open
    ASCEND_PASS       1.9     orbit card's end, leaving
    ASCEND_REVEAL     1.42    first scale a card may be SEEN — it still has edges here
    ASCEND_SOLID      1.18    fully opaque by here
    revealAt(scale)           ONE function, both directions

## BUGS FOUND (mine unless noted), so the shapes are recognisable

- **Absent attribute read as a meaningful `false`** — `data-orbit` is on CC links only, so every family
  chip computed as "leaving the zone" and got the depth flight. Leaked into the spouse promotion.
- **`onIncomingLand` cleared `transform` but not `opacity`** — the landed card stayed invisible. Pre-existing
  latent defect; the parked arc branch has it too.
- **`buildFeatured` is an explicit map, not a spread** — a new payload key reaches the app only if named there.
- **The origin guard** — `growFrom` returns `duration: 0` with no click-captured rect, but a head-on flight
  has no origin by definition. This is what made the X change the URL with no transition.
- **Outro `t` runs 1 → 0** — a travel term written as `t` plays the exit in reverse.
- **NB `openKey` set in an `$effect`** — the first block is created a frame late, so `transition:slide` runs
  on EVERY card arrival in the app. Pre-existing; only visible under a slow, centred flight.

## STILL UNBUILT

- the orbiting sprites (Field's 3 seeded depth layers + `DOCK_X`/`DOCK_Y` are ready)
- a deliberate beat between recede and arrive
- **the exit**
