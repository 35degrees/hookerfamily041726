# THE KENNEDY SITE — A COPY OF HOOKERVERSE WITH NEW CONTENT (handoff, written November 3, 2026)

**For the first Claude Code session in the new Kennedy project.** Read this whole file before replying to Sam.
It replaces `docs/KENNEDY_PROJECT_ROADMAP.md` (October 13), which planned a *ground-up rebuild* of the code. That
plan is over. Sam, November 3: "there's nothing to do codewise, its purely using same transitions and framework,
applying to new content."

The source project is on this machine: **`/Users/sth22/Genealogy project/041726`** (Hookerverse, live at
https://hookerverse.com). Read it freely. **Never edit, commit, push or deploy anything in it from the Kennedy
session**, and never point a Kennedy deploy at its Vercel project (`hooker-test`).

---

## 1. What the Kennedy site is

The Hookerverse app (SvelteKit 3, Svelte 5 runes, Vite, Tailwind 4, TypeScript, Vercel adapter), unchanged in how
it looks and moves — the cards, the chip flights, the deck and cross-connection transitions, the timeline rail,
search, the connect ladders, the intro — showing the Kennedy family instead of the Hooker descendants.

Sam's scope decisions (October 13–14, from the earlier Kennedy sessions):
- **JFK is the landing card** (the hub, where Hooker has Thomas Hooker).
- **About 75 people**: both of JFK's parents' lines traced back as far as possible, ideally to Ireland, plus
  cousins, nieces and nephews.
- **Jackie's parents (John Vernou Bouvier III, Janet Lee) and her sister Lee Radziwill are in the tree.**
- **No sign-in and no database** (Hooker's Better Auth + Neon is not carried over).
- A British royals site may follow later; keep family-specific things in one place so it can reuse the work.

## 2. Before anything: the old Kennedy folder

Sam plans to delete `/Users/sth22/Documents/codingDocs/2026/kennedy` and start fresh. Its Safari motion work was
already ported into Hooker on October 17 (Hooker commit `4c66c7e6`), so nothing in Hooker depends on it. What
exists ONLY there: 31 Kennedy/Bouvier/Rutherfurd/Onassis person files, Sam's phone-layout notes and open
questions (`docs/SCREEN_SIZES_ROADMAP.md`), `docs/MOTION_WEBKIT.md`, and a Vercel project named `kennedyclan`.
Recommend zipping the folder somewhere (or onto the X9 Pro drive) before deleting — it costs nothing and keeps the
31 people and the notes. Sam decides.

## 3. How to start the copy

- Copy the Hooker folder to the new project folder **without**: `node_modules/`, `.vercel/`, `.env`,
  `static/data/` (479 MB, generated), `canonical.json` (68 MB, the Hooker tree), `_review/`, `test-results/`,
  `scripts/probe-out/`, and the Hooker-only docs (keep `docs/hooker_json_schema_v25.md`, `docs/WORKFLOW.md`,
  `docs/pipeline-gotchas.md` as references, renamed or noted as Hooker's).
- `git init` fresh — do not carry Hooker's history (5,700+ commits carrying a 68 MB file). A new GitHub repo if
  Sam wants one. **There is no need to link the Hookerverse GitHub repo**; the local folder is the reference.
- `npm install`, then `npx svelte-check --tsconfig ./tsconfig.json` (Hooker carries two standing
  `@fontsource` import errors; they are known).

## 4. Services — every one separate from Hooker's

- **Vercel**: a new project (or the old `kennedyclan`), never `hooker-test`. Keep it out of search until Sam says
  otherwise: Hooker sends `X-Robots-Tag: noindex` on every response (vercel.json) and `static/robots.txt` disallows
  all crawlers except link previewers — copy that posture.
- **Cloudinary — CRITICAL.** Hooker's photos live in Cloudinary cloud `dc5clrqtw` on a FREE plan that was at
  23.81 of 25 credits on Nov 3. **Kennedy photos must not go into that account** — a new free Cloudinary account
  (its cloud name replaces `dc5clrqtw` in `src/lib/photo.ts`, `vercel.json`'s `/cld/` rewrite, and
  `vite.config.ts`'s proxy), or another host Sam chooses.
- **Analytics** (`src/lib/state/analytics.svelte.ts`): loads only on `HOST = 'hookerverse.com'` and never counts
  Sam (SHA-256 of his email). Change HOST to Kennedy's domain; enable Web Analytics in the new Vercel project's
  dashboard (Hooker's was not switched on for weeks and recorded nothing).
- **Contact form** (`src/routes/api/contact/+server.ts`, AWS SES, env `CONTACT_TO`/`CONTACT_FROM`/SES keys): either
  leave it out or give it its own env vars. Ask Sam.
- **Sign-in / bookmarks**: off (§1). Remove or hide AuthTrigger/BookmarksTrigger and anything that calls
  `/api/auth`.

## 5. Where Hooker is hard-coded (measured Nov 3 in `src/`, `regenerate-data.js`, `vercel.json`)

| What | Where | Kennedy |
|---|---|---|
| Hub person `H00001` / `thomas-hooker-1586` | ~12 + 8 files: paths.ts, surfaces.ts, navigate.ts, thomasVertical.ts, ascension, SearchModal, FeaturedCard, TimelineRail, IntroGL, `routes/+page.svelte`, `routes/[slug]` | JFK's id/slug |
| "Nth Generation Descendant of Thomas Hooker" | `src/lib/utils/generation.ts` (relationship labels are computed at render) | Kennedy wording — ask Sam |
| "Path to Thomas" ladder (`pathsToThomas`) | FeaturedCard buttons, ConnectModal, regenerate-data.js | path to JFK, or drop — ask Sam |
| Talcott line, severed Talcotts, `classification.hidden` | ~18 files | not needed |
| Pynchon line | ~9 files | not needed |
| Hartford founder zone / Ascension | ~26 files | not needed (or a Kennedy equivalent later) |
| Orbit / easter eggs | ~27 files | probably not needed |
| Intro (painting, "The Descendants of Rev. Thomas Hooker", 1586–) | IntroGL, IntroOverlay, `static/intro/` | a Kennedy intro — ask Sam |
| Site origin / titles / SEO text (`hookerverse.com`, `SITE_ORIGIN`, descriptions, JSON-LD) | ~12 files, `src/lib/seo.ts` | Kennedy's domain and words |
| Cloudinary cloud `dc5clrqtw` | photo.ts, vercel.json, vite.config.ts | the new account (§4) |
| Sam's owner hash, contact | analytics.svelte.ts, api/contact | keep Sam's hash; contact per §4 |

The Oct 13 plan's best idea still applies: **put everything family-specific in one config file** (hub person,
family name, generation wording, which special lines exist) so the components hold no names. Do that only if Sam
agrees — the alternative is a straight rename, which is faster and fine for one site. Ask him.

## 6. The data

- Same record shape as Hooker: `docs/hooker_json_schema_v25.md` (read §v25-0 first), the same tools:
  `regenerate-data.js` (builds `static/data/` from `canonical.json`), `process_tasks.py`, `validate.py`,
  `batch.py`, `card.py` (prints what a card actually shows — verify with it, never by reading canonical).
- The validators and generator carry Hooker assumptions (H/HD/I/X id prefixes and their meaning, Talcott and
  Pynchon rules, founder/orbit flags, `generation_from_thomas`). Loosen them as the Kennedy data needs; do not
  build Kennedy data to satisfy Hooker-only rules.
- **Living people**: many Kennedys are living. Hooker's rule carries over: no death year and born within 100 years
  ⇒ presumed living ⇒ dates hidden and no year in the URL, unless notable (most Kennedys are). A bare "Deceased"
  with no year needs `is_living: false`.
- **Facts**: in Hooker, Claude never looks facts up on the web — Sam supplies them. Ask Sam whether that carries
  over before using any web source.

## 7. How Sam works (the essentials; Hooker's `CLAUDE.md` has the full text)

- **Read, then wait for his list.** An opener is an agenda, not a go. Summarise in plain words and ask what is first.
- **Never delete without an explicit, named instruction.** Ambiguity resolves to PRESERVE.
- **Nothing is committed, pushed or deployed without his say-so** ("deploy" means push + `vercel deploy --prod`).
  Commit by path, never `git add -A`.
- **He judges on rendered pixels** in Chrome and Safari; a green test is evidence, not a verdict. Show him a local
  preview before shipping a layout change.
- **Narrative blocks and cross-connection labels follow Hooker's rules**: NB body ≤ 240 characters, header ≤ 8
  words, lead with the person's own deed, one scene per block, no intensifiers; a CC label is the predicate of one
  English sentence that starts with a lowercase verb after the linked name.
- **Write for him; don't transcribe him.** His messages are fast notes. Plain words to him; no jargon or section
  numbers in questions.

## 8. First session, concretely

1. Read this file, Hooker's `CLAUDE.md`, `docs/hooker_json_schema_v25.md` §v25-0, and the newest
   `docs/ENRICHED_DESIGN_FABLE_*.md` / `docs/ENRICHED_CODING_ROADMAP_FABLE_*.md` (skim — they explain why the
   motion is built as it is, and what not to "fix").
2. Tell Sam, in a few plain sentences, what you understood and what you'd do first (the copy, §3).
3. Ask the open questions one at a time as they come up: config file or rename; the generation wording; the
   ladder; the intro; contact form; the old Kennedy folder.
