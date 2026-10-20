# THE KENNEDY PROJECT — ROADMAP AND HANDOFF

**Written October 13, 2026, at the end of a Hooker Genealogy session, for the first Claude Code session in the new
Kennedy repo.** Read this whole file before doing anything. Copy it into the new repo as
`docs/KENNEDY_PROJECT_ROADMAP.md`.

The source project is on the same machine: **`/Users/sth22/Genealogy project/041726`** (the Hooker Genealogy, a
SvelteKit app live as a test at https://hooker-test.vercel.app). You may READ it for reference. **Never edit
anything in it from the Kennedy session.**

---

## 1. WHY THIS PROJECT EXISTS

Sam has built the Hooker Genealogy over eight months: a family tree of ~28,600 people where each person is a
featured "baseball card" and moving between relatives is a choreographed flight. In **Chrome it is what he wants**
("chrome is perfection"). Two things are not, and he decided they need rebuilding from the ground up rather than
patching (the Hooker record of that is its roadmap §60, `docs/ENRICHED_CODING_ROADMAP_FABLE_102026.md`):

1. **Safari.** Transitions feel quivery, weak and slower; ghost drop shadows linger where chips have left; the
   card's distressed edge flickers in flight; the parent-chip promotion jumps. None of this happens in Chrome.
   Hooker's motion was designed and tuned in Chrome and patched for Safari afterwards. "Patches on patches."
2. **Screen sizes.** Below the large desktop view, layout "gets lazy and confusing… a squished weak version of the
   showcase large view". Sam wants a few target sizes chosen, each composed deliberately.

Rather than redo Hooker, Sam is starting a **smaller second project, the Kennedy dynasty**, built clean, with
Hooker's working parts brought over and the two problem areas built from scratch. It is also meant to be a
showcase in its own right that draws attention to the larger project. If the new layouts and motion prove out,
they are ported back to Hooker later, as a separate, deliberate job.

---

## 2. HOW SAM WORKS — read before your first reply

- **Read, then wait for his list.** An opening like "let's work on X, read the docs" is an agenda, not a go.
  Summarise briefly in plain words and ask what is first. No installs, config edits or builds until he names the
  task.
- **Step by step, with his control.** Show what you will run before deploys, external services or anything
  hard to undo. Ask one plain question at a time; no doc section numbers or jargon in questions to him.
- **Nothing is committed or deployed without his say-so.** Commit by path, never `git add -A` (his folders hold
  screenshots and recordings).
- **The no-delete law (carried from Hooker): ambiguity resolves to PRESERVE.** Nothing is deleted without an
  explicit instruction naming the target. "Improve this" means refine in place.
- **No speculative fixes.** When something misbehaves, measure and explain before changing code. If the same
  setting has been turned twice without a fix, stop and re-map the problem. A failed attempt is reverted, not
  built upon.
- **Sam judges on rendered pixels, in both Chrome and Safari.** A green probe is evidence, not a verdict.
- **Write for him, don't transcribe him.** His messages are fast notes; compose proper prose and labels.
- **Facts:** in Hooker, no web lookups for genealogical facts. Missing values were flagged and asked about. Ask Sam
  whether that rule carries over before using any web source for Kennedy data.

---

## 3. THE PLAN — six steps, each finished and signed off before the next

### Step 1 — An empty, family-neutral skeleton
- New SvelteKit project with Hooker's stack: **SvelteKit 3.0.0, Svelte 5.57, Vite 8, Tailwind 4,
  TypeScript, `@sveltejs/adapter-vercel` 7** (Node 22 functions). Runes mode on.
- Its own `CLAUDE.md`, starting from section 2 above plus the deploy lessons in section 6.
- **One config file for everything family-specific:** the hub person, the family name, how generations are
  counted and titled, which special lines or tags exist. Nothing in components may hard-code a person or a family.
  Hooker hard-codes Thomas Hooker (`H00001`), "Nth Generation Descendant of Thomas Hooker", a severed Talcott line,
  a Pynchon line and a "founder zone", and none of that may come across.
- Done when: the app runs, has one route, and contains no Hooker names anywhere (grep for it).

### Step 2 — The data, bring over and adapt
- A small Kennedy `canonical.json` to start: **30–50 people** (the core dynasty), in Hooker's record shape so the
  tools work. The Hooker schema is `docs/hooker_json_schema_v25.md` there; take the person-record parts and drop
  the Hooker-only ones.
- Adapt Hooker's generator (`regenerate-data.js`, 2,586 lines) into a lean version. It writes **one
  self-contained file per person** (`static/data/person/<slug>.json`), holding the person, their family
  "neighbourhood" (parents, spouses, children, siblings, grandparents and grandchildren as small chip records),
  a `context` of relatives' records for graph walks, and resolved media. Drop: Talcott severance, Pynchon line,
  orbit/founder zones, paths-to-Thomas, the table coordinates, unless a step needs them.
- **Privacy from day one** (many Kennedys are living): Hooker treats anyone with no death year and born within 100
  years of the build year as presumed living, and hides their dates (`pv` flag) unless they are notable; the year is
  also kept out of their URL. Bring over `src/lib/data/clientStrip.js`: an **allow-list** of the fields the client
  reads. Everything else stays in canonical and never ships.
- Simplified data tools from Hooker (`process_tasks.py`, `validate.py`, `batch.py`, `card.py`) as needed. `card.py`
  prints what a card will actually show, and is the habit worth keeping.
- Done when: the generator writes valid person files, and a `card.py`-style printout of a few people looks right.

### Step 3 — One card, at rest, at each target size (THE SIZING REBUILD)
- **Choose the target sizes with Sam first.** A starting proposal, as Chrome page sizes (window minus toolbars):
  - large desktop, 1920×1080 and up
  - 13–14" laptop, ~1440×800–860; no MacBook at default scaling gives Chrome more than ~1000px of height
  - iPad landscape ~1180×820, and iPad portrait ~820×1180
  - phone ~393×760
- **Compose each one deliberately**: what the card shows, how chips and relatives are arranged, what is reached by
  a tap instead. Not the desktop layout shrunk. Hooker's lesson, in Sam's words: reductions should make room for
  *more* content, never leave white space, and never shrink type to make things fit.
- Hooker's card components are **reference only**, not to be copied: `FeaturedCard.svelte` (1,616 lines),
  `PersonBox.svelte` (the chip), `RightColumn.svelte`, `NarrativeBlocks.svelte`. Read them for what a card contains
  and Sam's typographic decisions, then build fresh.
- Pure logic CAN come across: date and age formatting (`src/lib/utils/dates.ts`), building card data from a
  person file (`src/lib/data/buildFeatured.ts`), URL helpers (`src/lib/paths.ts`, people live at `/<slug>`), the
  redirect map for renamed people (`src/lib/data/redirects.ts`), and photo sizing (`src/lib/photo.ts`: Cloudinary
  resizing, one derivative per person so a photo never loads twice).
- Done when: Sam signs off each target size in Chrome AND Safari.

### Step 4 — Navigation with no animation
- Click a relative and the card simply swaps. No motion. The URL updates, Back/Forward work, and a cold load of any
  `/<slug>` works. Prefetch on hover and cache the person files (see section 6).
- Done when: everything works in every browser before anything moves.

### Step 5 — Motion, WebKit-first, one transition at a time (THE SAFARI REBUILD)
- Start with the **parent-chip → featured promotion** (the worst one in Hooker's Safari), judged by Sam in both
  browsers before the next one: then children, spouses, siblings, cross-links.
- Design to Safari's rules from the first line (section 4). Whatever is smooth in Safari is almost always smooth
  in Chrome; the reverse is not true.
- Hooker's motion code is reference for *feel only*, never to be copied: `src/lib/transitions/flight.ts` (3,696
  lines) and the person page (`src/routes/[slug]/+page.svelte`, 3,172 lines). Its tempo and physics ideas (an
  honest velocity ceiling, the whole board moving as one, the departing card leaving before the new one lands, a
  small overshoot on landing) are what Sam liked. The implementation is what failed in Safari.

### Step 6 — Extras, chosen deliberately
- Candidates from Hooker, each brought over only if Kennedy needs it: search, the left timeline rail,
  connect-two-people, a random-notable shuffle, an intro, the footer, the contact form (AWS SES), sign-in and
  bookmarks (Better Auth + Neon). **Suggest skipping sign-in at first**: no database means a much simpler deploy.

---

## 4. WEBKIT-FIRST MOTION — what Hooker learned the hard way

- **Animate only `transform` and `opacity`**, on as few layers as possible at once. Safari's compositor struggles
  when filters, `backdrop-filter`, `clip-path`, masks or box-shadows change or move during an animation. Hooker's
  flights do all four, and that is where its quiver, flicker and ghost shadows come from.
- **Never scale a small raster up.** Hooker's timeline headshots blurred on every hover in Safari because a
  `transform: scale(3.5)` stretched the 20px picture Safari had already painted. The fix that worked: grow the
  element's real width and height, so it is painted at its true size every frame. Show images at their final size
  and move or fade them.
- **Shadows that do not animate.** Draw them on layers that stay still, or pre-render them. Hooker's "shadow twins"
  (separate shadow-casting copies, roadmap §58.2) were a patch in this direction.
- **In Safari a `delay` is not a free hold.** Write holds into the keyframes. Safari also paints a newly created
  element 45–75ms after its animation clock starts, so a growth can skip its start; Hooker's fix was holding the
  first pose briefly (`holdUntilPainted`, §58.3).
- **Measure real Safari, never headless WebKit.** Playwright's WebKit renders in software and never shows these
  bugs. Hooker's kit in `scripts/safari/` drives Sam's real Safari through AppleScript and films the screen; its
  README explains it. Never drive the Safari tab Sam is using, and give it back afterwards.
- **Test three builds**: the dev server, a local production build (`npm run build && npx vite preview --port
  4173`) and the deployed site. In Hooker the headshot blur appeared ONLY on the deployed site.
- Hooker's record of what was tried and reverted in Safari, so it is not re-tried: its roadmap §58 and §60.1.

---

## 5. THE KENNEDY MODEL — decisions to make with Sam

- **Joe Kennedy Sr. as the hub**: the card the site opens on. But titles are about **the Kennedys as a whole**,
  not "descendant of Joe".
- **Generations counted from arrival in America.** By the usual convention the immigrant, Patrick Kennedy (came
  from Ireland in 1849), is the 1st generation, his son P.J. the 2nd, so **Joe Sr. is 3rd and John F. Kennedy 4th**.
  Sam floated "2nd generation American Kennedy" for Joe; agree the counting rule with him before building titles.
  Whatever the rule, compute it from the tree in ONE place, as Hooker computes its labels in
  `src/lib/utils/generation.ts`. Never store titles as text.
- **Married-in people are central** (Fitzgerald, Bouvier, Shriver, Lawford, Smith, Skakel and more). Hooker shades
  bloodline versus married-in cards; that distinction may want softening here.
- **Scope**: start with the core dynasty and grow.
- **Photos**: public-domain sources (the JFK Library, Wikimedia Commons), rights noted.
- **Cross-links to Hooker**: if any Kennedy connects to someone in the Hooker tree, that is a natural link between
  the two sites.

---

## 6. LESSONS FROM HOOKER'S FIRST DEPLOY (Oct 9) — set these up from the start

- **Deploy** with `vercel deploy --prod` from the project folder (Vercel CLI 47.2.2 or later is required; 63
  works), or link GitHub when Sam wants automatic deploys. Build on Vercel: `node regenerate-data.js canonical.json
  && npm run build` in `vercel.json`, which must also declare `"framework": "sveltekit"`.
- **`.vercelignore` as an ALLOW-list** (`/*`, then `!` only what the build needs), so working files, `.env` and
  recordings are never uploaded. Generated `static/data/` is rebuilt on Vercel, never uploaded.
- **Test site: `X-Robots-Tag: noindex, nofollow`** on every response in `vercel.json`, plus `Disallow: /` in
  robots.txt. No analytics or SEO until Sam says.
- **Person files: `Cache-Control: public, max-age=300, stale-while-revalidate=86400`.** With Vercel's default
  `max-age=0` a preloaded file was re-fetched at click: 687 ms frozen became 88 ms with the header.
- **The production CSS minifier keeps only the LAST of a prefixed pair.** Write `-webkit-backdrop-filter` BEFORE
  `backdrop-filter`, or Chrome loses the blur in production only. Check the BUILT CSS, not the source.
- **`.env` values with quotes keep their quotes when pasted into Vercel.** Strip quotes in code or paste without.
- **SvelteKit 3 only exposes environment variables declared in `src/env.ts`**, and validates required ones at
  build time, so Vercel needs them set before the first build.
- **Vercel storage billing** (from Oct 23, 2026): every kept deployment is billed at $0.10/GB-month. Keep
  deployments small and few; retention is capped at 30 days.

---

## 7. FIRST SESSION, CONCRETELY

1. Read this file. Summarise it to Sam in a few plain lines, and ask what he wants first.
2. When he says go: set up step 1 (skeleton, CLAUDE.md, config file) and show him the result.
3. Ask him the two up-front decisions before step 2: how generations are counted, and the first 30–50 people.
4. Do not start step 3 until he has picked the target screen sizes.
