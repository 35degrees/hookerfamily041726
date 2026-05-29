# Hooker Family Descendants — Design Decisions

Last updated: April 23, 2026
Maintained by: Samuel Talcott Hooker

Running record of architectural and UX decisions made during design sessions. Update as decisions evolve or get more specific.

---

## PROJECT IDENTITY

**Purpose:** Scholarly visualization of Rev. Thomas Hooker's documented descendants. Continues Edward Hooker's 1909 genealogy into a digital exhibit format.

**Primary audience:** Connecticut Historical Society, academic historians (Yale, UConn, Trinity, Wesleyan), NEHGS members, professional genealogists, Farmington museum network, descendants who care about history. NOT mass-market.

**Framing:** American history told through one family line, not "my family's tree." Rigorous, scholarly, beautiful.

**Scope at launch:** Gen 0-2 polished, not rough. Subset of full scope, production quality. Launch when ready, not by calendar.

**Platforms:**
- Primary: Desktop browsers
- Secondary: iPad (11" Pro fully supported)
- Accommodated: tablets 10" and smaller
- NOT designed for: phones (separate layout pass eventually if needed)

---

## DATA ARCHITECTURE

**Canonical source:** The JSON is the single source of truth. Version 11 schema.

**ID prefix system:**
- `H00001-H09999` — Edward Hooker 1909 book entries (number matches EH entry number)
- `HD0001+` — Discovered Hooker descendants not in EH
- `I00001+` — Direct spouses of H/HD people
- `X00001+` — Extended: parents of I entries, spouses of HD people, orbit figures
- `T00001+` — Talcott family line
- `U00001+` — User-contributed entries (future)

**Jalapeño Rule:** X-prefix entries only for NOTABLE parents of spouses (is_easter_egg: true) or orbit figures with documented multiple connections. Never random in-laws.

**Documentation tiers:**
- Primary sources (Sibley, Jacobus, Barbour, probate records, Yale archives, NEHGS) — strongest
- Institutional secondary (FamilySearch document images, FindAGrave photos) — moderate-strong
- Community platforms (WikiTree, user trees) — moderate-weak
- Edward Hooker 1909 foundation — encoded implicitly via H-prefix

**Source honesty:** "About the Sources" page explains methodology. Individual cards show specific citations with tier indicators. Transparent about documentation distribution — rigorous where possible, community-sourced where necessary, honest throughout.

**Fake data flag:** When testing with generated data (Faker.js eventually), every synthetic entry gets `is_test_data: true`. Build pipeline strips these in production via env variable.

**Geographic field conventions:** The `state` field is a geographic abstraction meaning "first-order administrative division within a country," regardless of local terminology. US states (Connecticut), English counties (Leicestershire), Canadian provinces (Ontario), German states (Bavaria) all live in `state`. The `county` field is reserved for US-style sub-state divisions and stays null for international entries. Display logic renders location as comma-separated city/state/country without labels, which reads correctly in any scholarly convention.

---

## URL STRUCTURE

**Committed slug format:** `first-last-birthyear` (e.g., `/person/thomas-hooker-1586`)

**Routes:**
- `/` — Landing, defaults to Thomas Hooker featured tree
- `/person/[slug]` — Individual person featured card + tree (prerendered)
- `/institution/[slug]` — Institution detail pages (prerendered) — launch scope: yale, harvard only
- `/tree/filter/[category]` — Filtered gallery views (dynamic)
- `/connect/[slugA]/to/[slugB]` — Relationship connection modal/view (dynamic, noindex)
- `/about` — Project about page
- `/about/thomas-hooker` — Scrollytelling essay (future)
- `/support` — Donation page

**Categories deferred from launch:** cemeteries, landmarks, statues, documents, artworks have data but no routes yet. URL patterns reserved when ready.

**SEO discipline:**
- Netlify test phase: `robots.txt` Disallow all, noindex meta tag, no Google indexing
- Vercel production launch: flip to allow crawling with sitemap
- URLs committed to Google = permanent. No experimentation allowed post-launch.

---

## FEATURED CARD LAYOUT

**Card structure (top-to-bottom):**

1. **Header zone** — name, birth/death dates with location, spouse block(s) in top-right corner
2. **Divider line**
3. **Content zone** — three columns:
   - Left: portrait (Puritan stick-figure placeholder when no photo)
   - Center: narrative blocks with expand/collapse (plus/minus toggles on hooks)
   - Right: entity list (institutions, statues, burial, art, landmarks, documents) — conditional headers, only rendered if non-empty
4. **Cross-connections** — always visible, short labels with blue-linked names
5. **Action zone (bottom-right)** — exploration actions

**Spouse blocks:**
- Top-right of header
- Horizontal alignment
- Up to 3 visible as equal-width chips (third narrower if needed)
- 4+ spouses: horizontal fade-scroll with 3 visible at a time
- Conditional — zero spouses renders nothing

**Sibling button:**
- External to card, top-right edge
- Shows count: "Siblings (3)"
- Click expands siblings vertically downward
- Reverts to collapsed on navigation to new person
- **Ordering: notable siblings first (user interest), then remaining in birth order, died-young at bottom.** Different from children ordering — siblings are summoned deliberately; prioritize curiosity value.

**Parents row:**
- Above card, two boxes side by side
- Same box size as each other (not male-bigger-than-female)
- Both clickable to navigate

**Children row:**
- Below card, horizontal row of compact boxes
- Each box: portrait placeholder + name + dates
- Wraps or horizontal-scroll with fade edges when many children
- For large-fan-out people, count summary with expand on demand
- **Ordering: strict birth order, including died-young children in their chronological position.** Infant deaths are historical reality; do not hide them at the end of the list. Sorting happens at pipeline time, not runtime.

**Ghost hints:**
- Above parents (grandparents): subtle outline indicating "more above"
- Below children (grandchildren): subtle outline indicating "more below"
- Clickable to advance zoom level
- Not rendered as real data at level 1

---

## PLACEHOLDER IMAGES (NEVER BLANK)

**Principle:** No person box ever renders without a visual. Every entry has either a real photo or a period-appropriate silhouette placeholder.

**Placeholder sets by era + gender:**
- Puritan era (~1580-1720): 10 men + 10 women silhouettes
- Colonial (~1720-1775): 10 + 10
- Revolutionary (~1775-1815): 10 + 10
- Early Republic (~1815-1860): 10 + 10
- Civil War era (~1860-1890): 10 + 10
- Late 19th / Industrial (~1890-1920): 10 + 10
- 20th century (~1920+): 10 + 10
- Unknown gender: 2-3 neutral silhouettes per era

**Launch scope:** Puritan + Revolutionary + generic modern. Other eras added as data needs them.

**Selection algorithm:** Deterministic based on person ID. Take numeric portion of ID, modulo by set size. Same person always gets same placeholder. Never changes between visits.

**Fallback override:** Real photos (from `name.photo_url`) always shown when available. Placeholder is the fallback.

**File location:** `static/placeholders/{era}-{gender}-{00-09}.svg`

**Style:** Hand-drawn, silhouette-style. Period-appropriate clothing shapes (buckled hat for Puritans, tri-corner for Revolutionary, etc.). Variations within each set come from subtle differences in pose/clothing details. Simple enough to draw 10 of each without exhaustion; varied enough to feel like individuals.

**Optional scholarly touch:** Placeholder could have hover text or drawer label like "Portrait unknown. Placeholder representing a 17th-century New England woman." Honest about the placeholder nature.

---

## COLOR & VISUAL SYSTEM

**Two-dimensional outline coding:**
- **Gold outline** — Hooker descendants (H, HD, and blended Talcott-Hooker)
- **Blue outline** — Notable people
- **Both** — Notable Hooker descendants (layered or combined effect)
- **Neither** — Ordinary non-notable non-descendants

**Gold outline treatment:**
- SVG border-image for hand-drawn Paper Mario feel
- Multiple variants (4-5) randomly selected per box for handmade variation
- Sam will draw these; we'll import as SVG

**Male/female distinction:**
- NOT pink/blue
- Sophisticated hues (terracotta, sage, rose, whatever final palette lands on)
- Secondary non-color indicator (corner ornament variation) for accessibility
- Third state: "unknown" as neutral warm gray
- TBD: exact palette

**Paper Mario light/dim treatment:**
- Active/featured person: full brightness and saturation
- Non-active boxes (spouse chip, siblings, navigation chips): ~15-20% dimmer
- Hover restores to full brightness (visual contract: "I'm dim because I'm not the subject, but I respond to your attention")
- CSS: `filter: brightness(0.85)` or `opacity: 0.75`, transitions on role change

**Hover effects:**
- Clickable boxes (all except featured): lift 1.02x scale + shadow growth
- Duration: 120-180ms (short, tactile, not modern-product-card smooth)
- Slight rotation on some boxes, not all, for handmade feel
- Featured card: very subtle movement, doesn't invite clicking

**Shadows:**
- Layered stacked shadows (not blurry single shadows) for paper-stack feel
- Gold connecting lines between related boxes

---

## NOTABLE TREATMENT

**Visibility indicator:** Blue outline on the card.

**Category pills:** Hanging off the left side of the portrait area, small text labels. Subdued blue color.

**Tag display rules:**
- Display tags: achievements and civic roles worth honoring (Vice President, Abolitionist, Scientist, Author)
- Filter-only tags: morally complex or non-honorific (slaveholder, personal tragedies) — searchable but never displayed
- Schema to support `display_as_pill: true/false` flag on tags

**Data-driven rendering:**
- More narrative blocks → cards show all of them
- Wikipedia link field → external link button appears
- Rich source data → sources drawer has more entries
- Notable people naturally have richer cards because their DATA is richer, not because of special UI treatment

---

## SINGLE-SUBJECT FOCUS MODEL

**Core principle:** At any moment, exactly ONE person is featured. Everyone else has a role relative to them.

**The featured card is ALWAYS an individual, never a couple.** When Thomas is featured, his parents appear above, HIS children appear below (across all his marriages), HIS spouses appear as chips in the corner. When Susanna is featured, HER parents appear above, HER children appear below, HER spouses as chips. The couple is emergent (visible through spouse chips), never the primary subject.

**Data-in-data-out rule:**
- Person has an entry in the JSON → appears as a box in the tree when contextually relevant
- Person doesn't have an entry → appears in prose notes within the featured card when contextually relevant (e.g., "Roger also had three children with Susan: Tom (b. 1630), Joan (b. 1635), and Mark (b. 1634)")
- No special logic; UI reads data and renders accordingly

**All spouses visible:** Every spouse who has an entry appears as a chip on the featured person's card. Multiple marriages show multiple chips (horizontal, thinner as count grows).

**Children filtering:** The featured person's children row shows all children from all marriages WHO HAVE ENTRIES. Children without entries are prose-noted inside the card, not rendered as boxes.

**Siblings filtering:** The featured person's siblings shown in the siblings button are those with entries. Siblings without entries aren't expected or documented for non-Hooker in-law cases.

**Sandbox-RPG boundary metaphor:** The tree is a sandbox with soft explorable boundaries. Most clicks lead somewhere. Occasionally a user hits a "river" — a bio note mentions a person who doesn't have an entry, and navigation stops there. This is acceptable and honest; the project documents what it documents, and its scope is visible.

**Six roles for any person box:**
- **Featured** — current subject, biggest presence
- **Spouse** — chip(s) in header corner
- **Parent** — top row, equal-weight with co-parent
- **Child** — bottom row, compact
- **Sibling** — collapsible right-side stack
- **Grandparent/grandchild** — appears at zoom level 2

**Relation is relative:** Same person can be "parent" from child's view and "spouse" from spouse's view.

**Click to re-focus:** Click any non-featured box → that person becomes featured → everyone else's role updates → URL changes → view transition animates.

**Outside-the-Hooker-tree indicator:** When user navigates to a non-Hooker person (spouse's non-Hooker parents, etc.), subtle UI indicator shows "Outside the Hooker tree — [Back to last Hooker person]" or equivalent. Provides orientation when users wander into orbit regions.

---

## SPATIAL NAVIGATION

**Zoom levels (discrete, 3 stages — refined from earlier 4-level model):**
- **Level 1 (default)** — 3 generations shown: parents, featured + spouse chips, children. Siblings available behind button. This is where hover-reveal exploration lives.
- **Level 2** — Wider tree, more generations visible but with compact name-only boxes. Static — shows everything at once. No hover-reveal needed.
- **Level 3 (god view)** — Topology-only. Just boxes showing family shape, maybe no text. Pan and click-to-focus only.

**Why 3 not 4:** Original 4-level model produced overwhelming density at what was level 2 (Samuel Hooker with 11 children × multiple grandchildren each = 40+ boxes). Refined model uses level 1 for focused exploration with reveal-on-demand, level 2 for structural overview, level 3 for topology.

**Each zoom has a different interaction model, not just different density:**
- Level 1: Interactive exploration. Hover/tap neighbors to peek at their relations.
- Level 2: Static structural view. Click any box → that person becomes featured at level 1.
- Level 3: Shape-only. Click to focus, pan to explore.

**Hover-reveal exploration (Level 1 only):**

Default view shows just parents + featured + children. Hovering a child reveals THAT child's children (replacing current children row). Hovering a parent reveals THAT parent's parents (grandparents of featured).

- Sticky hover groups — hovering a child then moving mouse into their revealed children keeps the group visible. Only leaving the whole family group triggers collapse.
- ~300-400ms hover delay before reveal triggers — prevents accidental reveals from mouse sweeps.
- Non-existent data (parent not in dataset) — subtle "wobble" animation on hover to signal "no data here, can't explore further."
- Click to commit (navigate) — always the primary interaction. Clicking any box makes that person featured regardless of hover state.

**Touch device interaction model:**

No hover on finger touch. Solution: click/tap always navigates (no double-tap required). Desktop users get hover-reveal as an additional power-user feature; tablet users navigate linearly through pages. Both get the complete exploration experience, just via different mechanics.

**Why not double-tap:** Double-tap is not an iPadOS convention. Users won't discover it without onboarding. Reliability concerns. Accessibility concerns. The peek feature is a desktop enhancement, not a cross-platform requirement.

**Controls (zoom):**
- Pinch gesture (iPad, trackpad): snaps between levels at thresholds
- Ctrl+scroll wheel (desktop): same snap behavior
- Plain scroll wheel: NEVER hijacked (preserves reading)
- Explicit +/- buttons: bottom-right of viewport

**Pan behavior (Paradigm B: always-featured):**
- Panning moves camera without changing focus
- Featured person stays featured even when off-screen
- "Return to center" button appears when user pans far from featured
- Persistent "Currently viewing: [Name]" indicator so user always knows focus

**Flyover transitions (the Apple Freeform feel, bounded to the tree):**
- Navigate to new featured person = camera flies to them
- Duration scales with distance (~200ms per generation of separation)
- Direction based on spatial relationship (descendants = down, ancestors = up, cousins = lateral)
- Easing: accelerate out, decelerate in
- Blur/motion during flight — not pixel-accurate intermediate frames
- Implementation via View Transitions API, not infinite canvas
- For unrelated navigations: "teleport mode" — quick crossfade scale instead

---

## SEARCH & FILTER

**Search modal (triggered from app chrome top-right):**
- Text input for name search
- Facet filters:
  - Hooker descendants only (checkbox)
  - Notable only (checkbox)
  - Birth year range (slider)
  - Tag filters (Yale, Civil War, mayor, etc.)
- Live results as user types
- Click result → navigate to person's featured card with flyover

**Filter gallery view:**
- Dedicated route `/tree/filter/[category]`
- Grid of compact person squares
- Same visual language (gold borders, notable blues) as tree
- Option C preferred: grouped by subfilter (e.g., Yale grads grouped by century)
- Horizontal-fade-scroll within groups for dense categories

**Tag taxonomy serves filtering:**
- Military by war, by battle
- Professions
- Cause of death
- Institutional affiliation
- Political office type
- Geographic (migration patterns)
- Era

---

## RELATIONSHIP CONNECTIONS

**"Connect to Thomas"** — constrained path calculation:
- Every Hooker descendant has precomputed `paths_to_thomas`
- Card stack modal shows chain from current person up to Thomas
- Thin horizontal summary rows: name · years · location
- Click row: expands to mini-card (preview)
- "Go to person" button in mini-card: navigates to full featured page
- Multi-path people: path tabs at top, switch between paths with directional swap animation
- Static portions stay, divergent portions slide in/out (list diffing via View Transitions)

**"Connect to anyone" (Hooker descendants only):**
- Search modal limited to H/HD targets
- LCA (lowest common ancestor) algorithm
- Card stack shows: current → LCA → target
- Single chain shown (no branching UI except for rare multi-path cases)
- URL pattern: `/connect/[slugA]/to/[slugB]` — shareable, noindex

**Paper Mario overlay for connection modal:**
- Tree behind fades/desaturates (`filter: brightness(0.5) saturate(0.7)`)
- Card stack appears as brighter "paper plane" layer above
- 200ms transitions

**Relationship calculator:**
- Formula based on generations-to-LCA for each person
- Output: "Sam is Ezekiel's great-great-uncle" (or cousin-twice-removed for distant)
- Svileo toast displays sentence
- Reverse button: flips sentence AND reorders card stack

---

## SOURCES

**Inline by default:** Sources render at bottom of featured card when they exist, styled as quiet citations. Card with 0 sources shows no sources section.

**Drawer for rich cases:** Cards with 3+ sources, research notes, or extensive cross-references get "View all sources →" link that opens a side-drawer (not 3D flip).

**Not a back-of-card flip.** Drawer is simpler, more scholar-friendly, faster to implement, easier to deep-link.

**Citation export:** "Cite this entry" button generates scholarly citation format. Low effort, high credibility signal.

---

## APP CHROME (TOP-RIGHT UTILITY ZONE)

**Persistent across all pages:**
- Search icon (opens search/filter modal)
- Shuffle caret-menu (Random person / Random notable / Random Hooker descendant / Random Talcott descendant)
- Settings caret-menu (light/dark mode, Talcott tree toggle, zoom preference)
- Login button (unauthenticated) OR avatar dropdown (authenticated)

**Minimal by design.** 4 visible elements. Menus handle depth. Logged-in state adds avatar options.

**Talcott tree toggle:**
- Default: ON (Hooker + Talcott visible)
- User can toggle OFF for Hooker-only view
- Hooker tree NEVER optional — always visible

---

## FEATURED CARD ACTION ZONE (BOTTOM-RIGHT)

**Group 1 — Exploration (public):**
- Connect caret-menu (to Thomas, to Hooker descendant via search, to anyone)
- Sources drawer toggle
- Share (copy URL / share image)

**Group 2 — Contribution (authenticated only):**
- Bookmark
- Add relative (opens modal: parent/spouse/child/sibling)
- Submit correction
- Add to my tree

**Authenticated-only buttons appear visually distinct from public buttons.**

---

## USER CONTRIBUTIONS (FUTURE)

**Authentication:** better-auth, not yet installed. Approximately 1 month out.

**Database:** Neon Postgres via Drizzle ORM. Schema planned but not implemented.

**Rules:**
- U-prefix IDs for all user-contributed entries
- Must attach to existing entry (canonical or their own earlier submissions) — no free-floating entries
- Private by default; user can share or submit for inclusion
- Moderation workflow for promotion to canonical (Sam reviews manually)

**Data merge:** Canonical data from static files + user data from database merge at render time. Both flow into the same component tree.

---

## ACCESSIBILITY TIERS

**Tier 1 (day one, essentially free):**
- Semantic HTML
- alt text on all images
- Focus-visible outlines
- Color contrast WCAG AA
- Interactive elements as `<button>` or `<a>`, not `<div>` with click handlers
- Sensible tab order

**Tier 2 (deferred, possibly never):**
- Full keyboard navigation of spatial tree
- Screen reader narration of relationships
- ARIA live regions for focus changes

**Tier 3 (possible future fallback):**
- Linear list view as accessible alternative to tree
- Same data, paginated and sortable
- Also helps SEO

---

## LAYOUT & CSS STRATEGY

**Technology stack:**
- SvelteKit (minimal template, TypeScript)
- Tailwind 4 (primary styling, @theme tokens for custom values)
- Scoped CSS in Svelte components (elaborate animations/shadows)
- Container queries (primary responsive mechanism) — see dedicated section below
- CSS Subgrid for sibling alignment
- Fontsource for typography (fonts TBD)
- View Transitions API for cross-route animations

**Every Layout patterns to reference (NOT install):**
- `Sidebar` for featured + spouse corner arrangement
- `Switcher` for children rows, sibling rows
- `Stack` for vertical spacing between heterogeneous content
- Use container queries to drive thresholds instead of viewport

**CSS custom properties:**
- Single `--zoom-level` custom property driven by one JS listener
- All zoom-responsive styling derives from this

---

## CONTAINER QUERIES — RESPONSIVE STRATEGY

**Commitment:** Container queries are the project's primary responsive mechanism, not media queries. Components own their responsive behavior.

**Why container queries over media queries:**

Media queries respond to viewport width. The viewport doesn't know whether a card is at full width, in a sidebar, or constrained by other UI. Container queries respond to the size of a parent element you designate as a container, so a component adapts based on the space it actually has.

For this project, components live in multiple contexts:
- FeaturedCard is rendered full-width on person pages, but might appear smaller in search modals or connection previews
- PersonBox appears as parent (wider), spouse (medium), child (narrow), or sibling (narrow) — different sizes in different contexts
- Children rows have 2 children on some pages, 15 on others, with wildly different space-per-child

Container queries make each component responsive to its OWN dimensions, not the viewport's. Same component, different contexts, correct behavior everywhere.

**Content-first breakpoints (not pixel magic numbers):**

Wherever possible, use content-driven units instead of arbitrary pixels:
- `ch` (character width) for text columns — breakpoints based on readability
- Minimum line lengths ~45-75 characters for comfortable reading
- Breakpoint at ~30ch means "narrower than this, text becomes fragment-like"
- Avoid breakpoints at magic numbers like `768px` unless tied to known device categories

**Where container queries matter most in this project:**

1. **FeaturedCard internal layout.** At full width (56rem), three columns (portrait/narrative/entities). Below some threshold, stack to two columns. Below another, stack to one column. Card owns its layout regardless of placement.

2. **Children row.** Full width → horizontal layout with fade-scroll for overflow. Narrower → smaller boxes. Narrower still → vertical stack with labels only.

3. **PersonBox internal layout.** Wide enough for silhouette + text side-by-side → use that. Narrow → stack vertically. Driven by the box's own width.

4. **Entity list column.** Full width → one entity per line. Narrow → grouped with smaller typography. Container decides.

5. **Search modal results.** Different widths in sidebar vs full-screen modal → results adapt without coupling to viewport.

**Implementation pattern in Tailwind 4:**

Parent gets `@container/name` class. Children use `@md/name:` prefixes to respond to container breakpoints. For example, FeaturedCard content zone gets `@container/content` and columns get class rules like `@md/content:grid-cols-[25%_55%_20%]` that trigger when the content container is wide enough.

**What this means for development:**

Every new component I build uses container queries from day one. Existing components (FeaturedCard, PersonBox) get container awareness retrofitted as we touch them naturally — no big refactor needed. By the time we're testing iPad and narrower viewports, most of the work will already be container-driven.

**Name-only container queries (new in 2026):**

`@container` no longer requires a size condition. Container queries can now be triggered by container NAME alone, opening up two distinct use cases worth understanding separately.

**Use case 1 (NOT relevant for our project): CSS scoping.**

The article author Chris Coyier proposes name-only containers as a scoping mechanism — avoiding class name collisions like `.name` in FeaturedCard vs. `.name` in PersonBox. **We don't need this.** Svelte already provides scoped styles automatically: classes inside a `.svelte` file's `<style>` block are auto-scoped to that component. Free, requires no setup, works everywhere.

**Use case 2 (potentially relevant): Context-aware styling.**

When the SAME component renders differently based on WHERE it's rendered. Example: `<PersonBox />` rendered inside `<FeaturedCard>` (as a spouse chip) might want different styling than the same component rendered in a tree position.

Implementation:
```css
/* In FeaturedCard.svelte */
.featured-card { container-name: featured-card; }

/* In PersonBox.svelte */
@container featured-card {
  .person-box {
    /* Special styling when inside FeaturedCard */
  }
}
```

This is genuinely novel — Svelte's scoped styles can't query parent context. But for now we're solving context variation with the `relation` prop on PersonBox (`relation="spouse"`, `relation="parent"`, etc.) and the parent component decides which relation to pass. Container queries become more attractive when contexts multiply: search modal, connection modal, link previews, hover tooltips. We don't have those yet.

**Decision:** Park name-only container queries as a tool for when context complexity grows. For current build, the `relation` prop pattern is sufficient and clearer. Browser support is also still rolling out (Safari 26.4+, Chrome 149+, Firefox 148+ as of April 2026) — by the time we need this, support will be solid.

`@scope` provides similar scoping with broader support (baseline 2025) but addresses a different need than what we have. Not adopting either now.

---

## IMAGE LOADING STRATEGY

**Decision: Use `sizes="auto"` for lazy-loaded portraits, hand-written `sizes` only for above-fold images.**

The web's responsive image story improved significantly in 2025-2026. Mat Marquis (one of the original responsive images people) wrote about it in April 2026: with `loading="lazy" sizes="auto"`, browsers can determine appropriate image sizing without manual `sizes` attributes describing every breakpoint.

**For this project:**

- **Featured card portraits** (above-the-fold, displayed when page loads) — NOT lazy-loaded. Hand-write `sizes` (relatively easy — always at 25% of card width). This image needs to load immediately for LCP.

- **PersonBox silhouettes** (parents, children, spouses, siblings — many small images, often below-the-fold) — Use `loading="lazy" sizes="auto"`. Browser handles size selection. No manual `sizes` strings.

- **Future galleries, document images, etc.** — `loading="lazy" sizes="auto"` by default.

**Cloudinary integration:**

Cloudinary handles the multi-source generation (creates 300px, 600px, 1200px versions automatically from a single upload). We provide these URLs in `srcset` and let `sizes="auto"` pick the right one. Minimal code, optimal performance.

**Important:** This decision applies when we get to image implementation. The placeholder gray boxes in the current featured card have no images yet — when we add real portraits, this is the strategy.

---

## MOTION LANGUAGE

**Core principle:** Small, mutual, soft nudges. No whooshing. Bubble-like closeness.

**The metaphor:** Elements behave like people around a crowded dinner table. When new people arrive, everyone makes small shifts to make room. Not formal "I'm stepping aside" gestures — mutual, coordinated adjustments where everyone shares the space.

**Characteristics of this motion language:**

- **Small distances.** Elements move 4-12 pixels, not 50-100. Barely perceptible, always felt.
- **Multiple elements moving simultaneously with slight variation.** Featured shifts left 6px, parents shift left 8px, spouse shifts right 4px. Different magnitudes create "group rearranging" rather than lockstep.
- **Soft easing with very slight overshoot.** `cubic-bezier(0.34, 1.56, 0.64, 1)` or similar. Elements almost bounce back to final position, mimicking physical spring behavior.
- **Short duration with settle.** 200-300ms for main movement, 100-200ms of settle.
- **No accompanying fades or scaling.** Pure position changes. New elements emerge via translate-in, not fade-in.
- **Coordinated, not cascaded.** Everyone moves at once. Cascaded animations (child 1 moves, then child 2, then child 3) feel like a ripple — we want family synchrony instead.

**Paper Mario alive-paper feeling:**

Beyond interaction animations, components should have subtle idle animation. Paper elements in Paper Mario wobble slightly, breathe, react to nearby movements — the illusion of physical paper responding to air currents.

- Very low amplitude (1-2px movements, 0.5deg rotations)
- Long durations (3-4 second cycles)
- Subliminal — viewers don't consciously see motion, but app never feels static
- Applied sparingly: featured card has the strongest breathing; compact boxes are mostly still until interacted with

**Interaction examples (future implementation):**

- Hover a sibling button → siblings slide in from behind, featured/parents/children make small mutual shifts left to make room
- Hover a child (desktop peek) → grandchildren appear below with soft translate-in, parents/featured shift up a tiny amount
- Hover off → everything returns to default positions with soft ease, not snap
- Click a box → soft paper-flutter before flyover transition carries it to featured position

**Motion CSS utilities (to be defined):**

When we implement animations, we'll define reusable CSS custom properties:
- `--motion-duration-nudge: 250ms`
- `--motion-duration-settle: 150ms`
- `--motion-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`
- `--motion-shift-small: 4px`
- `--motion-shift-medium: 8px`

Every component uses these tokens. The consistency is what creates the "motion language" — the app's distinctive personality through coordinated micro-interactions.

**No tutorials, no training needed:**

The motion language should feel intuitive enough that users don't need explanation. Hover, something responds; click, you navigate. Bubble movements convey relationships without words. If any interaction requires a tooltip or training popup, the design has failed at that interaction.

**Animation library evaluation (decision: Svelte built-ins, no external dependencies for now):**

Researched options and the reasoning behind the choice:

- **Svelte built-in transitions** (fly, fade, slide, scale, spring) — chosen as primary tool. Free, well-documented, precise control over per-element timing and easing. Composes naturally with `animate:flip` for layout-shift choreography (different timing per element, different stagger, different easing). This is what we'll use for sibling reveal, hover-peek, and most state changes.

- **`animate:flip` directive** — Svelte's built-in for animating layout changes when items reorder. Different from AutoAnimate in that it gives per-element control rather than container-wide uniform animation. Important for the dinner-table mutual-shift effect where featured/parents/children should each move with slight variation, not lockstep.

- **Native View Transitions API** (via SvelteKit) — for cross-route flyovers. Not a library; built into browsers. Right tool for "navigate from Samuel to Emma Willard with directional motion blur." Already part of plan.

- **Plain CSS keyframes** — for Paper Mario alive-paper idle animation and brass-plate ambient feel on featured cards. No library needed; pure CSS handles low-amplitude long-duration breathing animations.

**Considered but not adopted:**

- **AutoAnimate** (`@formkit/auto-animate`) — zero-config drop-in animation utility. Strength: animates layout changes for free with one directive on a parent element. Weakness: applies one animation style uniformly to all children — gives less control over choreography than Svelte's `animate:flip` directive. Useful as a fallback or rapid prototyping tool, not foundational. Documented for future reference if we hit a case where Svelte built-ins are tedious.

- **GSAP, Anime.js, Motion One** — too heavyweight for the small mutual-nudge motion language. Better suited for orchestrated sequence animations (illustrated stories, scroll-driven sequences) than for subtle UI motion. Not adopting.

- **Component collections (Svelte Animations, Motion Core)** — useful as inspiration, not as dependencies. Their generic animation styles would dilute the project's bespoke aesthetic. Browse for ideas; implement custom.

- **Rive, Lottie** — for content animations (illustrated graphics that move), not UI motion. May be relevant later if About page or landing page wants animated illustrations. Not for component-level motion.

**Why this matters as a recorded decision:**

The fewer dependencies, the more control we maintain over the project's distinctive feel. Every external animation library brings its own motion philosophy that may conflict with the bubble/family/Paper Mario language. Owning the motion code means owning the aesthetic completely. We trade some development convenience for distinctive identity — a worthwhile tradeoff for a scholarly exhibit project.

**Material hierarchy across components:**

A future visual-treatment direction worth preserving: featured cards have the "brass plate with heft" feeling (substantial, weighty, primary), while compact PersonBoxes have the "Paper Mario light paper" feeling (light, slightly playful, secondary). Both share the underlying handmade aesthetic but differ in their material psychology.

- Featured card: subtle 3D depth via layered box-shadow + top-edge highlight, faint reflective gradient, soft drop shadow suggesting mass, slightly more friction in interaction (pressed feel on click)
- Compact PersonBox: light paper feel with breathing animation, easier hover lift, subtle paper-shake on click
- The contrast itself becomes meaningful: featured = serious anchor, compact = playful exploration

This is a future visual-treatment direction. Implementation via CSS only (no library required) — box shadows, gradients, transition timing functions create the material psychology.

---

## HOSTING & DEPLOYMENT

**Testing phase: Netlify free tier**
- robots.txt blocks all crawlers
- noindex meta tag in root layout
- No Google indexing during this phase
- URL structure proven but not committed

**Production phase: Vercel Pro**
- Full static prerendering for all person pages
- Dynamic routes for connection/filter pages
- robots.txt allows crawling + sitemap
- Real domain (hookerfamily.com probably)
- www redirects to non-www (solve upfront)

**Build pipeline (eventually automated):**
- Canonical JSON → slug generation → path computation → neighborhood files → search index
- Currently: committed outputs for convenience
- Production: pre-build hook runs pipeline on every deploy
- Outputs in .gitignore for production

---

## OUT OF SCOPE FOR LAUNCH

- Cemetery, landmark, statue, document, artwork detail pages
- Photo galleries
- Comments/annotations on people
- Full-text search within biographies
- Timeline/historical context indicators
- Previous/next chronological navigation
- Print/PDF export
- User-contributed entries (authenticated features)
- Bookmarking (authenticated features)
- Apple Freeform-style infinite canvas with multi-page scenes
- Mobile phone dedicated layout
- Tier 2 accessibility (keyboard tree nav)

---

## DECIDED ASIDES

- **Framing copy** emphasizes "American history through the Hooker line," not "my family tree"
- **Continuing Edward's work** — this is the narrative frame, 1909 to present
- **"Support this project"** wording, not "Donate"
- **About page** includes Sam's photo and short bio (200-300 words)
- **Naming:** Keep "Hooker" in the project name; lean into the specificity

---

## FUTURE TECHNIQUES & INSPIRATIONS (Reference, Not Active Work)

**Scroll-driven animations** (`animation-timeline: view()`):

Native CSS for triggering animations as elements enter/exit viewport. Not relevant for the tree itself (no scroll-based reveals there) but excellent for future content pages:
- About page narrative scrolling Sam's story with animated elements
- "How this site works" walkthrough with scroll-driven reveals
- Scrollytelling biographical features for major figures (Thomas Hooker's life arc, the Charter Oak event, etc.)

**Apple Vision Pro-style scroll teardowns:**

CSS-only technique for elements that "explode" or unfold as users scroll. Apple's Vision Pro page is the reference. Could be used eventually for:
- Landing page hero showing how the project connects multiple lines (Sam's dual descent through Hooker and Talcott visualized as converging streams)
- Major figure features with multiple historical artifacts unfolding
- The double wedding story (Sarah Hooker / Stephen Buckingham + Mary Willet / Thomas Buckingham, August 1703) with the four people elegantly paired as the story unfolds

**View Transitions API enhancements:**

`view-transition-class` and view-transition-types let you target many DOM nodes with one animation rule and direct "forward/backward" motion programmatically. Worth adopting when we implement flyovers between people pages. Better than custom JS choreography.

**CSS shape() and shape-outside:**

Native geometric clipping with responsive units. Could create distinctive visual treatments for specific elements (irregular border shapes for orbit-figure cards, organic curves for the tree's overall framing). Aesthetic enhancement, not core navigation.

**@scope:**

CSS selector scoping that limits styles to a component without naming gymnastics. Could simplify component CSS organization. Low priority — Svelte's scoped styles already provide similar isolation.

These are parked here so they're not lost. None are active work. Each could become relevant when we move past the core tree navigation into content pages, visual polish, and aesthetic refinement.
