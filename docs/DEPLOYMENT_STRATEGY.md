# HOOKER GENEALOGY — DEPLOYMENT STRATEGY

**A living document. The filename carries no date; every section carries its own.
When a section is revised, stamp the revision and keep the prior reasoning if it
still explains why a decision was made.**

**Companions:** `ENRICHED_CODING_ROADMAP_FABLE_*.md` (sequencing and risk),
`ENRICHED_DESIGN_FABLE_*.md` (decisions and rationale). This document owns
everything that only becomes true when the site stops being localhost.

---

## §0. HOW TO READ THIS — and the one standing rule

*(Opened August 13, 2026.)*

The roadmap and design pair are records of things that were **built and seen**.
This document is different in kind: as of its opening, almost nothing in it has
been observed. The site has never been built for production, never previewed,
never deployed anywhere but `localhost:5173`.

**Standing rule: nothing here is verified until it has been observed on a real
deployment.** Every claim in §2 through §11 is reasoning from source code and
vendor documentation. Reasoning has been wrong in this project before —
repeatedly, and always in the same way: an instrument reported something
plausible and false, and only Sam's eyes on the rendered result caught it. The
deployment equivalent of "Sam's eyes on rendered pixels" is **a real HTTP
response from a real Vercel URL**. Until a section has one, it is a hypothesis.

The corollary, and it is the whole reason this document exists three months
early: the discipline that made the UX work — *prove red first, then trust
green* — cannot be applied to deployment retroactively. There is no way to
prove a production 404 red after Google has indexed it.

**House convention:** this document is STRATEGY and SEQUENCE. Where it records
a decision Sam has approved, the decision is marked ✅ and dated. Where it
records a fork, the fork stays open in §16 until he closes it. Nothing here
authorizes work; it describes what work will be needed and in what order.

**Section order:** §1–§15 and §18 are content; §16 (the open-decisions register)
and §17 (the session log) are apparatus and stay last regardless of number. §18
was added on August 29, 2026 rather than inserted mid-document, because a dozen
cross-references point at `§16-A` … `§16-M` and renumbering them to gain tidier
ordering would trade a real risk for a cosmetic gain.

**Revision convention, restated because this document has now been revised
once:** numbers in §2 are a dated audit, not a standing fact. The corpus grew
**17% in the sixteen days** between the August 13 audit and the August 29 one,
and one section (§5.3) had become actively wrong in that time because a feature
shipped. Re-run the measurements before trusting them; every measured figure
below carries the date it was taken.

---

## §1. THE THREE DOORS

*(Recorded August 13, 2026.)*

The project's documents have treated "go to Vercel" as one event. It is three,
and collapsing them is the main avoidable risk in the whole plan.

| Door | What it is | Reversibility |
|---|---|---|
| **1. Deploy on Vercel** | Build and serve from Vercel on a `*.vercel.app` URL, `noindex`, robots `Disallow: /` | Fully reversible; repeatable daily |
| **2. Point the domain** | DNS for the real domain resolves to the deployment | Reversible in minutes |
| **3. Let the crawlers in** | robots.txt allows, sitemap submitted, `noindex` removed | **ONE-WAY** |

Only door 3 is a commitment. The launch gate stated in the roadmap (§5:
enriched spine, SEO surface live 2–3 months, credibility apparatus, stub state,
motion system) is entirely a gate on **door 3**. It is not a gate on doors 1 or 2.

**Recommendation (open, §16-A):** walk through door 1 now — well before content
is ready — and stay there for months. The reasons compound:

- Every unknown in §3–§11 becomes a Tuesday afternoon instead of a launch-day
  fire. There are a lot of unknowns, and they are the kind that only appear in
  production.
- A `*.vercel.app` deployment with robots blocked is invisible to Google and
  almost invisible to scrapers, so §9's threat model barely applies yet — which
  makes it the right time to *build* §9's defences and watch them do nothing.
- The build pipeline migration (§4) is the highest-risk single change in this
  document. Doing it under no time pressure, months from launch, is worth a lot.
- It produces the traffic **baseline** (§13) that every later judgement needs.

**What door 1 does NOT require:** a chosen domain, finished content, the SEO
build-out, or frozen slugs. It requires only that the site build and serve.

### 1.1 The ordering rule that is easy to get backwards

**The firewall goes up before robots.txt comes down.** (Detail in §9.) Today
nothing knows the site exists. The moment it appears in a sitemap it is on
every scraper's target list within days. Door 3 is the event that creates the
threat, so the defences must predate it — not follow the first bad week.

---

## §2. CURRENT STATE, MEASURED

*(Audit performed August 13, 2026, against the live `svelte.config.js`,
`src/routes/person/[slug]/+page.ts`, `src/routes/person/[slug]/+page.svelte`,
and `regenerate-data.js`. This section is the baseline the rest of the document
diffs against. A future reader should re-run the audit before trusting it.)*

*(**Re-audited August 29, 2026.** The August 13 findings are preserved below
unaltered — every one of the six still holds structurally. What changed is the
NUMBERS, and one finding (§2.3's reading of `search-index.json`) that became
false when search shipped on August 27. The corrections are stamped inline and
the fresh measurements are consolidated in **§2.7**. The instruction in the
paragraph above turned out to be the load-bearing one: sixteen days was enough
to invalidate a section.)*

Six findings. Several contradict what the design and roadmap documents assert,
which is expected — those documents describe intent, and the deployment surface
is the one area where intent has never been tested against reality.

### 2.1 Nothing is prerendered. Not one page.

`svelte.config.js` is untouched scaffold: `adapter-auto`, no `kit.prerender`
block, no adapter chosen. `+page.ts` sets no `prerender` export. There is no
`+layout.ts` prerender setting in evidence.

`+page.svelte` contains **no `<svelte:head>` at all** — no `<title>`, no meta
description, no canonical link, no JSON-LD, no Open Graph. Every one of the
~16,855 person pages would currently ship the stock title from `app.html`.
*(August 29: **19,728 pages.** The count moves throughout this document; §2.7
is the current one. Nothing else in this finding changed — the head is still
empty, and it is still the largest single gap in the document.)*

This is the single largest gap between the documents' picture and the code. The
roadmap's §6.1 reasons about "the corpus lives on the CDN as thousands of small
static files" and design §8 describes a richness gate operating on prerendered
HTML. What exists is a client-fetch architecture with SSR as the default
fallback. Under `adapter-vercel` as configured today, **every deep-link arrival
becomes a serverless function invocation** — precisely the cost shape the
project ruled out in its first architecture session.

The mitigating fact: `+page.ts` already fetches a self-contained static payload
and hands it to a shared builder. That is exactly the shape prerendering wants.
This is a configuration and head-tags problem, not a rewrite.

### 2.2 The 301 layer breaks the moment the route is prerendered

Roadmap §17.4 (August 3) wired `redirects.json` as real 301s via
`src/lib/data/redirects.ts` and a **miss branch inside `+page.ts`**. It was
verified by curl in dev: retired slug → 301 → 200, chains collapsed to one hop,
live-but-in-map → 200 with no redirect, unknown → 404.

That logic only runs **if the request reaches a load function**. Prerender the
route and `/person/thomas-hooker-iii-1553` has no file on the CDN; Vercel
returns its own 404; `+page.ts` never executes; all 673 redirects are dead in
production. The dev verification does not transfer.

Compounding it: the map holds **3 keys that are also live slugs**
(`john-newton-1726`, `mary-hooker-1796`, `harriet-newton-1866` — retired slugs
later re-issued to a different person by the collision rule). The payload-FIRST
ordering exists to protect them. Any production redirect mechanism that
consults the map *before* checking for a live page will 301 three live pages
away from themselves.

### 2.3 `static/data/` ships everything in it, referenced or not

`regenerate-data.js` writes into `static/data/`, which SvelteKit copies to the
deployment root verbatim. Present today:

| File | Size | Note |
|---|---|---|
| `people.json` | ~22 MB | Written on every full run. **Unconfirmed whether anything still reads it** since the per-person payload architecture landed |
| `search-index.json` | ~2.5 MB | Phase 4 search modal is unbuilt; presumably unread today |
| `table-index.json` | ~3.4 MB | Gitignored (roadmap §16.3); consumed by `/table` |
| `redirects.json` | 673 entries | Fetched only on a miss |
| `person/*.json` | ~16,855 files | The load unit |
| `stats.json`, `cemeteries.json`, `institutions.json` | small | |

Anything in that directory is a publicly fetchable URL on a public deployment.
See §5 and §9.1.

**REVISED AUGUST 29, 2026 — the table above is superseded by §2.7, and one row
of it was wrong in a way worth recording rather than silently fixing.**

`search-index.json` was described as *"presumably unread today."* **Search
shipped on August 27** (roadmap §46, design §45) and the file is now load-bearing
— `src/lib/state/search.svelte.ts:117` fetches it, and `src/lib/search/kin.ts`
rides the same rows to answer connect-to-anyone. It is also **6.2 MB, not
2.5 MB**.

The general lesson is the one §0 already states and this is its first
confirmation: **a deployment audit decays against a moving codebase.** The
finding was not careless when written; it was true on August 13 and false
fourteen days later, and nothing in the document would have flagged it. Any
"presumably unread" verdict is a claim with a shelf life. §5's inventory
procedure is therefore not a one-time cleanup — it runs before door 2 and again
before door 3, as it already says, and the reason is this row.

The other rows moved in size but not in kind. `people.json`'s open question is
now **closed** — see §2.7 and §5.2.

### 2.4 Privacy stopped being a schema note and became a launch gate

Two mechanics in `regenerate-data.js` that are invisible on localhost:

**`stripFromClient` currently strips only `research_notes`.** The candidates
`research_tags`, `research_sources`, `paths_to_thomas`,
`paths_to_john_talcott`, and `naming_inspiration` sit commented out awaiting
Sam's approval. On a public CDN each of those is world-readable. Note also that
the strip applies to the client `people.json` build path — **whether the same
strip governs the per-person payloads needs confirming**, and it is the payload
that actually ships to every visitor.

**The living-person rule is derived at emit time from `BUILD_YEAR`.** No death
year AND born within `MAX_LIFESPAN` (100) ⇒ presumed living ⇒ dates suppressed
and the birth year kept out of the slug. `is_living` in canonical can override.
~190 people today. The design reasoning is sound and deliberately chosen over a
stored boolean.

The deployment consequence is not obvious from the code and is worth stating
plainly: **the presumed-living set is recomputed on every build.** A person can
graduate out of date-privacy on a deploy nobody thought of as a data change,
and their slug changes with it (the birth year returns), which mints a
redirect. There is a live coupling between "I redeployed" and "a living
person's privacy status and URL changed." That is fine — it is the rule working
— but it must be *known*, because after door 3 it means a person's birth year
can appear in a public URL without anyone editing that record.

### 2.5 Production 404s and 301s have never been observed

Roadmap §16.3 remains open: `npm run build && npm run preview` has not been
run. The ENOENT-500-instead-of-404 fix documented in `+page.ts`'s own comments
exists *because dev and prod disagree on the miss path*. So the entire miss
path — which after the Talcott severance covers 1,264 hidden people plus every
retired slug — is currently reasoned about rather than seen.

### 2.6 `table-index.json` is gitignored, which forces the pipeline onto Vercel

3.4 MB was taken off every push by gitignoring it (§16.3). Correct decision,
with a consequence: the deployment cannot be built from the repo alone. Either
`regenerate-data.js` runs on Vercel (which requires `canonical.json`, ~41 MB, to
be reachable from the build container) or the file is committed again. This
makes the prebuild-hook migration a **hard requirement**, not the optional
cleanup DESIGN.md called it. See §4.

### 2.7 THE CORPUS, MEASURED — August 29, 2026

*(Supersedes the size figures in §2.3. Measured directly against the working
tree, not estimated. This is the table to re-run, not to trust.)*

**The build output — `static/data/`, 533 MB across 19,738 files:**

| | raw | note |
|---|---|---|
| `person/*.json` | **452 MB / 19,728 files** | the load unit. mean **23 KB**, median 18 KB, p90 41 KB, max 328 KB |
| `people.json` | **31 MB** | **zero readers — see §5.2.** Was ~22 MB on Aug 13 |
| `search-index.json` | **6.2 MB** | **read** by search and connect-to-anyone. Was ~2.5 MB |
| `cemeteries.json` | 508 KB | |
| `institutions.json`, `notables.json`, `redirects.json`, `stats.json` | <1 MB total | `redirects.json` now 40 KB |

**Three facts that change how the numbers above should be read:**

**1. The payloads are already minified.** Zero newlines in any of them. There is
no whitespace saving available in `static/data/` — that lever has already been
pulled and is not a deployment optimisation waiting to be taken.

**2. GZIP is the number that matters, and it is 4–5× smaller.** Vercel
compresses automatically. `thomas-hooker-1586.json` is 177 KB raw and **38 KB on
the wire**; `search-index.json` is 6.2 MB raw and **1.4 MB gzipped** (which is
the ~1 MB figure `SearchTrigger.svelte` already cites in its warm-on-hover
comment). **So 533 MB is a DEPLOYMENT-SIZE question (§4.2), not a bandwidth
one** — §11.2's transfer model reads the compressed figure and is unaffected by
the raw total. Conflating the two would make the deployment look far more
expensive than it is.

**3. Two payloads approach §4.3's flag.** `sarah-edwards-1710` (328 KB) and
`jonathan-edwards-1703` (323 KB) are ~70 KB gzipped, just under the ~80 KB
on-the-wire threshold §4.3 item 5 sets. They are the richest cards in the
corpus and they will get richer. Worth a standing check rather than a one-time
one.

**The build input — `canonical.json`, 55.5 MB** (was ~41 MB on Aug 13; §16-C's
premise has moved). Measured three ways, because Sam raised minification as a
deployment step on August 29:

| | size | delta |
|---|---|---|
| as committed (pretty-printed) | **55.5 MB** | — |
| minified only | **39.8 MB** | **−15.7 MB (28%)** |
| minified, `research_notes` stripped | 34.1 MB | −5.7 MB more |
| minified, all six §6.1 strip candidates | 33.0 MB | −1.1 MB more |

**Three conclusions, and the first one retires the idea that prompted the
measurement:**

- **The weight is whitespace, not notes.** The intuition was that ~14 MB of
  `research_notes` were the problem. Notes are **5.7 MB**; pretty-printing is
  **15.7 MB**. And the other five strip candidates are worth 1.1 MB between them
  — so §6.1's field-by-field decision should be made on **privacy grounds
  alone**, exactly as §6 frames it. There is no size argument on that side of
  the ledger, and treating it as one would be optimising the wrong axis.

- **`research_notes` is already stripped from everything a user downloads.**
  `regenerate-data.js:88` sets `stripFromClient: ['research_notes']` and it is
  live. Stripping notes therefore buys **zero on the CDN**. It shrinks only
  `canonical.json`, which is a BUILD INPUT that never ships. §6 (privacy, what
  reaches the public) and §16-C (build reachability) are different problems and
  must not be merged: a change that helps one may do nothing for the other.

- **Do NOT minify `canonical.json` in the repo, and this is close to a law.** A
  40 MB single line destroys git diffs, and this project's entire data-safety
  model runs on readable ones — `validate.py --baseline`, the silent-loss
  detector, and the per-batch revert points CLAUDE.md makes mandatory. Every
  batch would render as *"the whole file changed,"* which is precisely the state
  in which a silent deletion becomes invisible. **Blinding the net to save 28%
  of a build input is not a trade this project can take.** If a smaller build
  input is ever genuinely needed, it is a build-time transform emitting a
  working copy — canonical stays pretty, tracked, diffable and complete.

  Related, and it is the ONE LAW in a new place: *"delete all notes fields"*
  applied to `canonical.json` itself would be a destructive edit to the source
  of truth. Notes are to be **mined into user-facing fields**, not dropped. Any
  stripping happens downstream of canonical, never inside it.

**Whether any of this is needed at all is still open.** §16-C asks whether
canonical is committed or fetched at build time; it is committed, Vercel clones
it without complaint at 55.5 MB, and the only real exposure is build-container
heap — which **§4.3 item 3 already schedules a measurement for.** Measure
first. The answer may be that there is no problem here to solve, and a
28%-smaller build input bought at the cost of diffability would then be a pure
loss.

---

## §3. THE RENDERING FORK — the document's central decision

*(Recorded August 13, 2026. OPEN — §16-B.)*

Everything downstream depends on this. Three viable shapes.

### 3.1 Option A — Prerender everything (~16,855 static pages)

Every person page is an HTML file on the CDN. Zero function invocations for
anonymous browsing. This is what the design documents assumed already existed.

- **Cost:** effectively bandwidth only. Best case in §11.
- **SEO:** ideal — real HTML, instantly crawlable, no TTFB variance.
- **Bots:** best profile. Every bot request is answered by a static file, and
  there is no compute surface to attack (§9).
- **Costs it imposes:** the redirect problem (§8) must be solved without a
  runtime miss branch; full build wall time on every deploy (§4); ~33,000+
  output files between HTML and payloads.

### 3.2 Option B — SSR on demand

Leave the route dynamic. `+page.ts` runs per request, the redirect logic works
as written and verified, no prerender wall time.

- **Cost:** a function invocation per page view — including every bot page view.
  This is the shape explicitly rejected in the project's first architecture
  session and nothing has changed to make it wiser.
- **Bots:** worst profile. §9's numbers become a bill.
- **Only merit:** it is what the code does today, so it is the zero-work option
  for door 1 if the goal is purely to prove the build.

### 3.3 Option C — Prerender the corpus, dynamic fallback for misses

Prerender all live slugs; a catch-all or `prerender: 'auto'` fallback handles
requests for slugs that do not exist, where the 301 logic lives.

- **Cost:** near-zero for real traffic; compute only on misses.
- **The trap, and it is a real one:** the miss path is the *only* route that
  costs compute, and probing nonexistent URLs is precisely what scrapers and
  vulnerability scanners do all day. This shape builds a function whose
  visitors are overwhelmingly bots. It is the shape of a surprise bill.
- **Viable if and only if** the fallback carries a rate limit and a WAF rule
  from the first deployment (§9), not added after a bad week.

### 3.4 Reading

**Option A is the target; the only real question is how §8 gets solved without
a runtime miss branch.** If §8 resolves to prerendered redirect stubs, A is
clean and C is unnecessary. If the redirect volume makes stubs impractical, C
becomes the answer and §9 becomes mandatory rather than advisable.

Sequencing suggestion: door 1 can be walked through on Option B — the site as
it stands, deployed, to prove the build and establish the baseline. Then move
to A. Two deployments, each proving one thing. Do not attempt the pipeline
migration and the rendering change in the same commit.

### 3.5 AUTH DOES NOT REOPEN THE FORK — the arithmetic that settles it

*(Added August 29, 2026, when Sam moved auth to the next piece of work — roadmap
§49. Full treatment in §18; this subsection exists only to answer the question
§3 would otherwise raise.)*

Auth introduces this app's first server, so the natural fear is that it drags the
rendering fork back toward Option B and breaks §11.0's rule that **cost must
scale with how much Sam has written, not with how many machines read it.**

It does not, and one number settles it. Auth adds exactly two dynamic surfaces:
the root route `/` (which must branch on the session — §18.2) and
`/api/auth/*`. Everything under `/person/` stays static.

> **A full-corpus crawl is 19,728 static requests and exactly ONE hit on `/`.**
> The dynamic share of a crawl is one part in twenty thousand.

`/api/auth/*` is not on the crawl path at all — it is reached by someone signing
in. So the compute surface auth creates is not a function of traffic volume,
which is what §11.0 actually disqualifies. **Option A remains the target**, and
auth gives it a cleaner one-line statement than it had before: *everything is
static except one router.*

**The condition attached, and it is not optional:** `/api/auth/*` IS a compute
endpoint on a public host, and probing login endpoints is a thing bots do
continuously. It needs a rate limit from the first deployment, under §9.4's
staged discipline. See §18.5.

---

## §4. THE BUILD ON VERCEL

*(Recorded August 13, 2026.)*

### 4.1 The pipeline migration

Required by §2.6. Shape:

1. `canonical.json` reachable from the build container. Committed (~41 MB, on
   every clone) or fetched from object storage at build time. **Open, §16-C.**
   *(August 29: now **55.5 MB**, and §2.7 argues that minifying it in the repo
   is a bad trade regardless of how §16-C resolves — the git-diffability the
   data-safety model depends on costs more than the 28%.)*
2. `regenerate-data.js` (and `table-coords.mjs`) run as a `prebuild` step.
3. Generated outputs gitignored consistently. Roadmap §16.3 notes CLAUDE.md's
   claim that `static/data/` is ignored is inexact — the `.gitignore` lists
   members individually. That inconsistency will bite during this migration and
   should be fixed as part of it.
4. Verify the build container has what the pipeline needs. `regenerate-data.js`
   is Node, but `process_tasks.py` and `validate.py` are Python — confirm
   nothing in the build path shells out to Python.

**Risk:** this is the highest-risk single change in this document, because it
changes what "the site" even is. First-build failures here are ordinary:
working-directory assumptions, `__dirname` resolution, missing input, memory.
Do it early (§1), alone, on a preview deployment.

### 4.2 The hard ceilings

From Vercel's documentation (https://vercel.com/docs/limits and
https://vercel.com/docs/builds), verified August 13, 2026:

- **Build step: 45 minutes maximum.** Exceeding it fails the deployment.
- **Build cache: 1 GB, retained one month.**
- **100 deployments per day.**
- **Output files: no stated upper limit.** The widely-cited 16,000-file ceiling
  is a limit on files *uploaded* when creating a deployment (12,500 source /
  16,000 build output), not on files a build produces. Vercel's current limits
  page states there is no upper bound on build output files, with the caveat
  that many thousands (100,000+) means longer builds.

> **✅ RE-CONFIRMED August 29, 2026** against `vercel.com/docs/limits`
> (`last_updated: 2026-08-25`), quoted exactly: *"Although there is no upper
> limit for output files created during a build, you can expect longer build
> times as a result of having many thousands of output files (100,000 or more,
> for example). If the build time exceeds 45 minutes then the build will fail."*
> The CLI source-file cap now reads **15,000** (was 12,500), and the 45-minute
> build ceiling and 1 GB Pro CLI upload size are unchanged.
>
> So the August 13 reading holds: **19,738 output files is not a Vercel
> problem** — the binding constraint is the 45-minute build, which is what
> §4.3's measurements exist to find. The 533 MB total (§2.7) is the figure with
> no published ceiling attached to it and therefore the one to watch on the
> first real deploy.

**Consequence — a real architectural constraint, easy to miss:** use
**Git-based deploys** so Vercel builds server-side. Avoid
`vercel deploy --prebuilt`, which uploads the ~33,000 artifacts through the
API and runs straight into the upload limit. If CLI deploys are ever needed,
Vercel's own documentation directs you to `--archive=tgz`, which compresses the
deployment into one or more files specifically to avoid the files limit and
upload rate limits.

### 4.3 Measurements that must happen before the first real deploy

None of these exist yet. All are cheap and local.

1. `time node regenerate-data.js` — full run, cold.
2. `time npm run build` end to end, once prerender is enabled, at full scale.
3. Peak Node heap during both. (`/usr/bin/time -v` on Linux; `--max-old-space-size`
   is the lever if it comes up short.)
4. Output file count and total deployment size.
5. Compressed-size histogram across all payloads (carried from roadmap §6.6
   item 3 — flag anything over ~80 KB on the wire).

If (1)+(2) approach 25 minutes there is a deploy-cadence problem. If they
approach 45 there is an architecture decision, and the richness gate's
escape hatch (prerender the indexable set only) is the pre-thought answer.

---

## §5. WHAT SHIPS THAT SHOULDN'T

*(Recorded August 13, 2026.)*

The audit procedure has to run against the **deployed output tree**, not the
source tree. They are not the same thing and the difference is the point.

Standing checklist, to be run before door 2 and again before door 3:

1. Enumerate every file in the build output. For each, name what reads it. Any
   file with no reader is dead weight *and* a public dump.
2. **`people.json` (~22 MB).** Confirm nothing reads it. If nothing does,
   remove it from `static/` — it is 22 MB on every deployment and a
   single-request copy of the corpus (§9.1). If something does read it, that is
   a separate and more urgent problem.

   > **✅ RESOLVED August 29, 2026 — nothing reads it. §16-I closes.**
   > Every reference to `people.json` in `src/` was grepped: there are **none**.
   > The only mentions in the codebase are inside `regenerate-data.js`, which
   > *writes* it — and that file's own comments already say so twice, at lines
   > 2295 (*"never loaded"*) and 2380. It is now **31 MB**, not 22.
   >
   > So this is 31 MB shipped to every deployment for no reader, and — per
   > §9.1's FIRST threat — a complete, clean, machine-readable copy of the
   > corpus available in a single `curl`. It is the cheapest item on the whole
   > §11.8 list to close. **Action: stop writing it into `static/`.** Whether
   > `regenerate-data.js` should stop emitting it entirely, or emit it outside
   > the served tree for pipeline use, is a small implementation call — but
   > nothing should be *served* that nothing reads.
   >
   > Worth noting how this was missed for months: the code knew. Two comments
   > stated the file was never loaded, and the fact still had to be rediscovered
   > by grep because a comment is not an inventory. That is roadmap §33.6 — *a
   > comment is not a mechanism* — in a deployment costume.

3. **`search-index.json` (~2.5 MB).** Phase 4 is unbuilt. Same test. When
   search does land, 2.5 MB is a poor download for a modal; that is a Phase 4
   design problem, but the file's presence on the CDN before then is a
   deployment problem.

   > **✅ RESOLVED August 29, 2026 — it IS read, and the concern was prescient.**
   > Search shipped August 27. `search.svelte.ts:117` fetches it and `kin.ts`
   > reads the same rows. It is now **6.2 MB raw / 1.4 MB gzipped**, and the
   > "poor download for a modal" worry landed exactly where predicted: the
   > mitigation that shipped is `SearchTrigger.svelte` warming the index on
   > **hover and focus** rather than on click, so the fetch happens while the
   > pointer is still travelling. `load()` is idempotent, so it costs one fetch
   > per session.
   >
   > **This does NOT retire the §9.1 concern; it sharpens it.** A 1.4 MB
   > gzipped file containing a searchable row for every visible person is the
   > single most efficient corpus-theft target on the deployment now that
   > `people.json` is going. It is genuinely needed by a shipped feature, so it
   > cannot simply be removed — which makes it the primary object the `/data/`
   > rate limit and referrer conditions in §9.1 exist to protect.
4. **`seating-anomalies.tsv`** is written to repo root, not `static/` — confirm
   it stays out of the build output. Same for any `_review/*.tsv`.
5. Debug flags and probe hooks. DESIGN.md notes debug artifacts are "stripped
   in production via env variable" — confirm that mechanism exists and works,
   since it has never run.
6. `ARC_ENABLED`, `DECK_GHOSTS`, `SHOW_TALCOTT_DESCENT` and any other flag whose
   localhost value is not its production value.
7. `/table` — decide whether it is public, `noindex`, or gated. It is currently
   a scaffold.

---

## §6. PRIVACY AND LIVING PERSONS

*(Recorded August 13, 2026. Gate on door 3, arguably on door 2.)*

The mechanics are in §2.4. What this section owns is the decision set.

1. **Close out `stripFromClient`.** The five commented candidates need a yes or
   no each. `research_sources` in particular is ambiguous — design §9 wants
   sources *rendered* as the credibility apparatus, so stripping it may fight a
   planned feature. Decide per field, not as a block. **Open, §16-D.**
2. **Confirm which strip governs the per-person payloads.** The payload is what
   every visitor fetches; the `people.json` strip may or may not cover it.
3. **Audit the deployed payloads, not the source.** Pick the ~190 presumed-living
   records plus a random sample and grep the built output for the stripped keys,
   for birth years on living slugs, and for anything in `research_notes`. This
   is a script, and it belongs in the probe arsenal alongside the UX probes.
4. **Living-person card policy** is flagged in the schema notes as an
   undocumented gap. It stops being a documentation gap at door 3.
5. **Notable carve-out** (`is_notable` overrides date privacy) is deliberate and
   correct, but it means notability approval is now also a privacy decision.
   Worth stating in the approval checklist so it is not discovered later.

---

## §7. THE SEO SURFACE

*(Recorded August 13, 2026. This is roadmap Phase 2.5, reframed.)*

Phase 2.5 has sat in the UX roadmap since July 3 competing with card transitions
and losing every time. **It is not UX work.** It is deployment work, it is
mostly build-script and head-tag work, and it belongs here where it is sequenced
against the doors rather than against the motion system.

### 7.1 The work, unchanged from design §8

1. Head tags on `/person/[slug]` — `<title>`, meta description, canonical link.
   None exist (§2.1). This is the largest single item and the one that makes
   everything else possible.
2. Richness-gate predicate (Sam's to set; the standing suggestion is
   `notable || nb_count >= 1`) → `noindex` on gated-out pages, exclusion from
   sitemap.
3. `sitemap.xml` emitted by `regenerate-data.js` from the gated set.
4. JSON-LD `Person` on indexable pages; `sameAs` → the notable URL.
5. Relative and CC links confirmed as real `<a href>` anchors in the prerendered
   HTML — this is also the precondition for `handleHttpError` as a dead-link
   report, and for the prerenderer finding the pages at all (§7.3).
6. OG images for notables (build-time), later and cheap.

### 7.2 The robots.txt conflict — a drafting subtlety, get it right the first time

robots.txt now has two jobs that pull opposite ways:

- **The richness gate cannot be implemented as `Disallow`.** Google must be
  *allowed* to crawl a page in order to see its `noindex` meta tag. Disallowing
  the stub set would leave those URLs eligible to appear as bare, description-less
  results. Gate with `noindex`, and let Google crawl.
- **Crawlers you do not want get `Disallow` freely** (§9), because you are not
  trying to communicate anything to them except "go away."

So the file is not one policy. It is a permissive policy for search engines and
a restrictive one for everything else, in the same document.

### 7.3 Prerender reachability

SvelteKit's prerenderer crawls from entry points via real anchors. If
person-to-person links are JavaScript click handlers only, the crawler finds a
handful of pages and silently ships a near-empty site. Two defences, and use
both: real anchors in the cold path (item 5 above), and an explicit `entries()`
generator on `/person/[slug]`. `handleUnseenRoutes` and
`handleEntryGeneratorMismatch` turn a silent shortfall into a build error, and
`handleHttpError` becomes the dead-link report the roadmap has wanted since §2.5.

### 7.4 Verification

Fetch the built HTML for one rich person, one stub, one renamed slug, and one
severed person. Assert head tags, robots meta, JSON-LD, the 301, and the 404
with a script. Then read one with your own eyes.

---

## §8. REDIRECTS AND 404s — slug churn is permanent

*(Recorded August 13, 2026. Revised understanding from Sam, same day.)*

### 8.1 The reframe

Earlier documents treated slug churn as a pre-launch data cleanup. **It is not.**
Sam's account (August 13): months of blind data entry without UX feedback left
gaps that are only now surfacing as cards get reviewed, so `/person/mary-jones`
becomes `/person/mary-jones-1830` routinely — and many dateless slugs will ship
and change *after* launch, because for a large fraction of the corpus the
detailed data does not exist and may never.

The evidence supports this. `redirects.json` was 510 entries in late July and
673 by August 3 — **163 in five days, from ordinary name corrections and
birth-year fills.** Plus the living-person coupling in §2.4, which mints
redirects on builds nobody thought of as data changes.

**Consequence: the redirect layer is not a migration tool. It is permanent
load-bearing infrastructure that grows for the life of the site.** Every design
choice below must assume a map in the low thousands within a year or two, not a
frozen 673.

### 8.2 The three mechanisms

Given §2.2 (the wired 301s die under prerender), and §3:

**(a) Generated `vercel.json` redirects.** Zero compute, CDN-level, fastest.
Two problems: Vercel enforces a routes-per-deployment limit, and at the observed
churn rate the map will approach it — **measure the current limit against the
current map before choosing this** (§16-E). It must also encode the
payload-FIRST rule or it 301s three live pages away from themselves (§2.2).

> **✅ MEASURED August 29, 2026 — the limit is 2,048, and it disqualifies (a).**
>
> From Vercel's own limits page (`vercel.com/docs/limits`, `last_updated:
> 2026-08-25): **"Routes created per Deployment — 2048"**, the same on Hobby and
> Pro, Custom only on Enterprise. The page is explicit that this is the right
> meter: *"If you are using a `vercel.json` configuration file, each rewrite,
> redirect, or header is counted as a Route."*
>
> The map is **673** today, and it was 510 five days earlier. Framework routing
> consumes some of the same budget, so the usable headroom is under 1,375.
>
> **But the arithmetic is not the argument — the shape is.** §8.1 established
> that the redirect layer is permanent infrastructure that **grows for the life
> of the site**. Option (a) puts an unbounded, monotonically increasing thing
> inside a fixed budget. There is no churn rate at which that ends well; there
> is only a date. And the failure mode is the worst available: deployments begin
> failing at the build step, at whatever unrelated moment the counter crosses,
> with the cause several years upstream of the symptom.
>
> **This closes §16-E toward (b), prerendered redirect stubs** — which §8.2
> already named the current preference, and which scales naturally with churn
> because file count is explicitly *not* a Vercel constraint (§4.2, re-confirmed
> below). The remaining verification on (b) is unchanged and still required:
> confirm SvelteKit emits a real 301 rather than a client-side meta refresh.

**(b) Prerendered redirect stubs.** Each retired slug prerenders as a page whose
only job is to redirect. Zero compute, scales naturally with churn, no route
limit. Costs build time and file count — 673 today, and file count is not a
Vercel constraint (§4.2). **Current preference.** Verify that SvelteKit emits
a real 301 rather than a client-side meta refresh, because the difference
matters to Google.

**(c) Dynamic fallback.** Keeps the verified `+page.ts` logic exactly as written,
including the chain-following and cycle guard. But see §3.3 — this is the route
bots hammer, and it is the only one that costs money.

### 8.3 404s, and the 1,264

The severance hid 1,264 people. No payload, so no page, so a 404 — and 2 of the
673 redirects point *into* the hole (roadmap §17.4). Both are correct data
aimed at a page that does not exist yet, and both resolve on re-sew.

Three things follow. First, the production 404 has never been seen (§2.5) and
must be, before door 2. Second, re-sewing the Talcott line **creates 1,264 URLs**
— a large positive delta to the sitemap, which is fine, but it should happen
either well before door 3 or as a deliberate post-launch event, not accidentally.
Third, the 404 page itself is now a real design surface: after door 3 it will be
one of the more-visited pages on the site.

---

## §9. TRAFFIC POSTURE — bots, scrapers, and the corpus

*(Recorded August 13, 2026. Prompted by Nick Gray, "99% of My Website Traffic Is
Bots," patronview.com, August 7, 2026 —
https://patronview.com/news/99-percent-of-my-website-traffic-is-bots/ — a
year-long field report from a 1.5-million-page scraped-data site. Roughly half
its lessons transfer here; the half that does transfers harder than it did for
him. This section separates them.)*

### 9.1 The threat model, in the right order

The article's emphasis is cost, then analytics, then everything else. **For this
project that order is close to inverted.**

**FIRST — corpus theft, and the corpus is one fetch away.** Genealogy data is
among the most aggressively scraped categories on the web; aggregators
strip-mine public trees as a business model. And this site makes it trivial.
`static/data/person/*.json` is a clean, minified, machine-readable record per
person — no HTML parsing required. Worse, `search-index.json` (2.5 MB) and
`people.json` (22 MB) hand over the **entire corpus in a single request**.
Nobody needs a botnet; they need one `curl`.

The consequence is not abstract. The entire discovery strategy is "someone
searches a person's name and finds this page." A content farm with higher domain
authority republishing these curated blurbs and narrative blocks would outrank
the original for its own subjects' names, using Sam's work. That is not a
bandwidth problem — it is an existential threat to the thesis of door 3.

The defence is cheap because the access patterns are distinguishable. A real
visitor fetches `/data/person/x.json` *after* loading a page, one at a time,
with a referrer. A scraper walks the directory. Rate limits and referrer
conditions scoped to `/data/` cost real users nothing.

**SECOND — analytics pollution.** The article's author names this as the cost
that hurt most, and he has revenue as a fallback signal. This project does not.
The site exists to demonstrate to a hiring manager, a CHS archivist, or a
prospective client that this thing is real and works. Whether real humans
arrive, which people they open, and whether they stay **is the entire feedback
loop** — and it is also the input the roadmap wants for prioritizing enrichment
("let observed traffic and GSC queries steer the Tier-1/Tier-2 worklist"). If
that signal is noise, the instrument is lost, not just the number.

**THIRD — Cloudinary quota, and it is a hard ceiling.** *(Revised August 13,
2026: Sam is on Cloudinary's FREE tier — 25 credits/month — not a metered paid
plan. The failure mode is therefore an outage, not an overage. Full numbers in
§11.5; the short version is that at raw 300 KB originals, roughly sixteen
full-corpus crawls exhaust a month, and the remedy costs $89–99/month.)*
Portraits are on a metered third party. Crawlers
that follow `<img src>` spend credits. The article's author has no equivalent
exposure and will not warn about it. Worth a quota alarm and a rule.

**FOURTH — Vercel cost.** Genuinely last, for the reasons in §9.2 and the
numbers in §11.2 — but last *only under Option A*. Under Option B it moves to
first and the project's budget frame (§11.0) fails. The ordering of this list is
therefore a consequence of the rendering fork, not independent of it.

### 9.2 Why the article's headline numbers do not predict this site's

Three structural differences, all favourable:

- **His costs are compute; ours are bandwidth.** PatronView runs on Cloudflare
  Workers with a D1 query per request — every bot hit executes code. A
  prerendered Hooker site answers bots with static files. It gets better:
  Vercel's documentation states that **requests and bandwidth denied,
  challenged, or rate-limited by WAF custom or managed rules are not billed**,
  and that automatic DDoS mitigation runs on every plan with mitigated traffic
  also unbilled. A blocked bot on Vercel is free in a way a blocked bot on
  Workers is not.
- **Scale differs by roughly 90×.** He has 1.5 million pages; this site has
  ~16,855. Amazon's crawler taking 117,000 pages a day is ~8% of his corpus
  daily; the same appetite here is on the order of 1,300 requests a day. Crawl
  volume broadly tracks page count. His 3.6-million-request day is a function of
  having 3.6 million things worth taking.
- **Bots do not run JavaScript, and the payload architecture depends on it.** A
  crawler reading `/person/aaron-burr-1756` gets HTML and stops. It never
  triggers the neighborhood preload. The expensive path is invisible to them —
  *unless* it is reached directly, which is §9.1's first threat.

**This is the section most likely to be wrong.** All of it is reasoning. §13's
baseline exists to replace it with numbers.

### 9.3 What Vercel provides, and the one thing that does not port

From Vercel's documentation (https://vercel.com/docs/vercel-firewall/vercel-waf,
https://vercel.com/docs/bot-management), verified August 13, 2026:

- **Custom WAF rules** support `deny`, `challenge`, `log`, `bypass`,
  `rate_limit`, and `redirect`, matching on host, path, query, method,
  `ip_address`, header, cookie, `user_agent`, `geo_continent`, `geo_country`,
  `geo_city`, and `ja4_digest`. The country block, continent challenge,
  empty-user-agent rule, SEO-crawler user-agent blocks, and rate limit all port.
- **Bot Protection managed ruleset**, available on all plans, serves a
  JavaScript challenge to clients violating browser-like behaviour (catching
  requests falsely claiming to be a browser) and **automatically excludes
  verified bots such as Googlebot**. That is the article's "skip verified bots"
  ordering trick, handled.
- **AI Bots managed ruleset** logs or blocks AI bots; a Vercel firewall template
  based on the `ai.robots.txt` project blocks training crawlers.
- **Attack Mode** (`vercel firewall attack-mode enable --duration 1h`) is the
  article's "panic button," already a CLI command.

**The gap: ASN matching does not exist.** The article calls "challenge every
datacenter ASN" his most durable rule, and it is the one that does not port.
Options: IP/CIDR conditions built from published cloud ranges (maintenance
burden; account-level IP blocking is capped at /16 for IPv4), `ja4_digest`, or
Cloudflare proxying in front of Vercel — which keeps the Vercel/SvelteKit
workflow untouched and buys the entire Cloudflare toolkit, at the cost of a
second CDN layer with its own cache-configuration footguns. **Open, §16-F.**

### 9.4 Rule discipline — the house version of prove-red-first

Vercel's own guidance is worth adopting verbatim as doctrine: **user-agent
substring rules over-match constantly.** Matching `bot`, `crawler`, `python`,
`curl`, or `headless` will catch uptime monitors, link previewers, SEO auditors,
partner integrations, and your own CI. Prefer verified-bot signals for
known-good crawlers, and pair any user-agent condition with a second condition
(path, geo, or rate).

The staged rollout, non-negotiable: **`log` → observe → `challenge` → `deny`.**
Never straight to deny. This is the same discipline as the probe arsenal, and it
has the same justification — an instrument that has never been proven against a
real case is not evidence.

**Watch solve rates.** The article's metric is the right one: a ~0.2% challenge
solve rate means the rule is catching bots, so keep it; a 30% solve rate means
it is taxing humans, so fix it.

### 9.5 The AI-crawler decision — genuinely different here

The article's author blocks Claude-SearchBot and Amzn-SearchBot on a
crawls-per-referral ratio (35,000:1 and ∞ respectively). His calculus is clean
because his metric is referral traffic to a business. **This project's is not,
and his answer should not simply be adopted.**

Three categories, and the article partly blurs the last two:

| Category | Examples | Reading |
|---|---|---|
| **Training crawlers** | GPTBot, ClaudeBot, CCBot, Bytespider | Take the corpus, return nothing, no attribution. **Block.** robots.txt handles the compliant ones; the managed ruleset handles the rest |
| **Search crawlers** | Claude-SearchBot, OAI-SearchBot, PerplexityBot | **The hard call — see below** |
| **User-triggered fetchers** | Claude-User, ChatGPT-User | A human asked for this page. **Never block.** This is a referral wearing a robot costume, and blocking it is blocking a visitor |

On the middle row, both cases are real:

- *Allow:* design §9's stated goal is to be a **citable reference** for CHS,
  NEHGS, and academic historians. When someone asks an assistant about Thomas
  Hooker's descendants, being the cited source is a modern form of exactly that
  positioning — and it is a channel a portfolio benefits from in a way a
  subscription business does not.
- *Block:* the corpus is the asset, painstakingly compiled over years. Absorption
  without a visitor gives nothing back, and a showcase is ultimately judged by
  humans who arrive and click around.

This is a values call about what the site is *for*, not a technical one. **Open,
§16-G.** What is not open: instrument first, decide on this site's own numbers
rather than someone else's, and keep the third row unblocked whichever way the
second goes.

### 9.6 Geography

The article blocks China, Vietnam, and Singapore at the edge, on the reasoning
that his audience is 95.9% US and 1.3% Canada. This site's audience —
American-history-specific, English-language, US clients and institutions — points
the same way, and Sam's stated position is that China and Vietnam are not where
clients are.

Two cautions before writing a hard block:

- **The portfolio goal cuts against it.** Remote employers and collaborators can
  be anywhere, and the site's job is to be found by them.
- **The subject matter is not purely American.** Thomas Hooker's origins are
  English (Marefield, Leicestershire), there are documented descendants abroad,
  and genealogical correspondents are international by nature.

**Prefer `challenge` over `deny` for continents; reserve `deny` for specific
countries with a demonstrated problem.** The article's own numbers argue for
this: an invisible managed challenge costs a real visitor one interstitial and
lets you *measure* the solve rate, where a block tells you nothing and silently
loses whoever was behind it. Start with challenge, watch the solve rate, harden
only where the data says to. **Open, §16-H.**

### 9.7 The build-order rule

Restating §1.1 because this is where it lives: **the firewall goes up before
robots.txt comes down.** The site is currently invisible. Door 3 is the event
that creates the threat. Defences that arrive after the first bad week are
defences applied to a corpus that has already been copied.

---

## §10. CACHE AND INVALIDATION

*(Recorded August 13, 2026.)*

Slugs are stable; content changes on every regenerate. The failure mode is
**skew**: a returning visitor holding new HTML against a stale payload, or the
reverse. It is invisible in dev because dev has no CDN.

Decide, do not default:

1. Content-hash the payload filenames, or set a deliberate short max-age with
   `must-revalidate`. Roadmap §6.6 item 4 flagged this and it is still open.
2. Confirm Vercel's default static caching behaviour matches the update rhythm —
   a full redeploy invalidates, but the *browser's* copy is the one that skews.
3. `redirects.json` is fetched on a miss and is the file most likely to be stale
   at exactly the wrong moment (a visitor arriving on a slug that was retired in
   the deploy they are being served by). Short max-age.
4. `table-index.json` and the aggregates: confirm lazy/idle loading, never
   blocking first card render (roadmap §6.6 item 6).

---

## §11. COST MODEL

*(Recorded August 13, 2026. Rewritten the same day from a placeholder once Sam
set the budget frame explicitly. Rates verified August 13, 2026 against
https://vercel.com/docs/plans/pro-plan and Vercel's published pricing; re-verify
before door 2, since Vercel has restructured its meters twice since 2024.)*

### 11.0 THE BUDGET, AS A CONSTRAINT ON EVERY OTHER SECTION

**Sam's stated frame (August 13, 2026): $20/month is the target. $50 is
sustainable if it is buying real views. $200 is project failure.**

This is not a footnote. It is a first-class design constraint with the same
standing as "null beats weak" or the no-delete law, and it settles at least one
open decision on its own. Any option in this document that makes the bill a
function of *traffic volume* rather than *content volume* is disqualified,
because traffic volume is 99% bots and is not under Sam's control.

Restated as a rule: **the cost of this site should scale with how much Sam has
written, not with how many machines read it.**

### 11.1 The Vercel meters that matter here

Pro is $20 per developer seat per month and includes a $20 monthly usage credit.
Sitting *in front of* that credit are two free allowances that do not consume it:

| Meter | Included on Pro | Overage |
|---|---|---|
| Fast Data Transfer | **1 TB/month** | $0.15–0.35 per GB by region |
| Edge Requests | **10,000,000/month** | $2.00–3.20 per million by region |
| Active CPU | **none — billed from the first byte** | against the $20 credit, then on-demand |
| Provisioned Memory | **none — billed from the first byte** | against the $20 credit, then on-demand |

Two facts do most of the work in the analysis below:

- **An Edge Request is any asset load, not any page load.** HTML, JSON, JS, CSS
  each count. But **Cloudinary images do not** — they are served from
  Cloudinary's CDN and never touch Vercel's meters. That is a meaningful
  accidental advantage of the existing architecture.
- **Compute has no free tier on Pro.** This is the entire argument of §3
  expressed as a rate sheet. Static delivery draws on two generous free
  allowances; every function invocation draws on the $20 credit from the first
  millisecond.

And from §9.2: requests and bandwidth denied, challenged, or rate-limited by WAF
rules are **not billed**. Blocking is free.

### 11.2 Option A (prerender all) — the numbers

Assume ~16,855 pages, HTML at ~40 KB and payloads at ~25–35 KB over the wire
(the roadmap's measured figure for Pierpont, one of the richest cards; median is
smaller).

*(**Re-checked August 29, 2026: the model holds.** The corpus is now 19,728
pages (+17%), and the payload assumption is confirmed by direct measurement —
mean 23 KB raw, and §2.7 finds gzip runs 4–5× smaller still, so the 25–35 KB
"over the wire" figure is if anything conservative. 17% more pages does not move
a ceiling of ~590 full-corpus crawls per month in any decision-relevant way. The
one figure to carry forward is §2.7's: **533 MB of build output is a deployment-
size question, not a transfer one** — do not read the raw total into this
model.)*

**Human traffic.** A session that opens one card and navigates twenty times
costs roughly 1 HTML + 20 payload fetches + ~10 shared JS/CSS assets on first
load ≈ **31 edge requests** and ~700 KB of transfer. Against the included
allowances that is roughly **320,000 such sessions per month** before edge
requests bind, and transfer binds even later. Human traffic will not be the
constraint at any plausible scale for this project. If it ever is, that is the
best problem the project could have.

**Bot traffic — the variable, and the honest one.** A crawler walking the entire
corpus costs **~16,855 edge requests and ~0.7 GB** per full pass. So:

- Roughly **590 complete corpus crawls per month** fit inside the included edge
  requests. About 1,500 fit inside the transfer allowance.
- For scale: the crawler in the source article was taking 117,000 requests a day
  from one site. Sustained at that rate against this corpus — which it could not
  be, since the corpus is only 16,855 pages — one crawler would use about a third
  of the monthly allowance.
- Anything blocked or challenged by the WAF is not billed at all (§9.2).

**Reading: under Option A, reaching $200 is not a realistic failure mode.** It
would take on the order of six hundred full-corpus crawls a month, with the
firewall off, before the first overage dollar. The realistic Option A bill is
**$20, flat**, and the $50 ceiling is comfortable headroom rather than a
forecast.

### 11.2b THE ONE DYNAMIC ROUTE, COSTED

*(Added August 29, 2026 with §18. §3.5 argues that auth does not reopen the
rendering fork; this is the same claim in money.)*

Auth makes `/` a function (§18.2). Published rate for Active CPU on Pro is
**$0.128 per hour** — *sourced from third-party pricing commentary, not yet
verified against Vercel's own rate sheet; treat as an order of magnitude and
re-check before door 2.* What `/` does is read a signed cookie and return a
redirect: single-digit milliseconds, no database, no rendering.

| `/` invocations per month | active CPU | cost |
|---|---|---|
| 10,000 | ~50 sec | **under $0.01** |
| 100,000 | ~8 min | ~$0.02 |
| 1,000,000 | ~1.4 hr | ~$0.18 |

Even at fifty milliseconds per invocation and a million hits, this is under two
dollars. **The reason it stays this small is structural, not lucky:** `/` is hit
once per visitor and once per crawl, while the corpus is 19,728 pages. Every
argument in §11 survives auth intact.

**What would break it** is the thing §18.2 exists to forbid: letting a second
route read the session. A person page doing so moves the left column of that
table from 10,000 to millions and puts compute on the corpus, which is Option B
arriving through a side door. The tripwire is checklist item 15.

### 11.3 Option B (SSR) — why the $200 scenario lives here

Every page view becomes a function invocation, and compute has no included tier.
Bot page views are page views. The bill becomes a function of traffic volume —
exactly the shape §11.0 disqualifies — and the project loses the ability to
predict its own cost, because the input is other people's crawlers.

This is not a close call. **§11.0 closes §16-B against Option B on its own**,
independent of the SEO argument. B remains acceptable *only* as a throwaway
first deployment at door 1 to prove the build, on a noindexed URL nothing knows
exists, and only briefly.

### 11.4 Option C (fallback) — bounded, but only with the firewall

Real traffic costs Option A prices. The miss path costs compute, and per §3.3
its visitors are overwhelmingly bots probing dead URLs. Bounded and acceptable
**if and only if** a rate limit and a WAF rule sit in front of the fallback from
the first deployment. Without them it is Option B wearing a disguise.

### 11.5 Cloudinary — a hard ceiling, not an overage

*(Corrected August 13, 2026. Earlier drafts of §9.1 assumed a metered paid plan.
Sam is on the free tier, which is a different shape of risk.)*

The free plan is **25 credits per month**, where one credit = 1 GB storage OR
1 GB bandwidth OR 1,000 transformations, all drawn from a single pool. Bandwidth
is normally the deciding meter. Usage ages out of a **rolling 30-day window**, so
one bad week shadows a month.

Running the corpus through it — roughly 30% of entries carry a photo, call it
~5,000 images at ~300 KB:

| | Raw 300 KB originals | With `w_520,c_fill,q_auto,f_auto` (~40 KB) |
|---|---|---|
| Storage | ~1.5 credits, standing | unchanged |
| Image loads per month within budget | ~83,000 | **~600,000** |
| Cost of one full-corpus crawl following `<img src>` | ~1.5 GB | **~0.2 GB** |
| Full crawls before exhaustion | **~16** | **~125** |

Sixteen crawls is not a comfortable margin. A single aggressive image-following
crawler can spend a month's budget in days.

**The failure mode is not a bill — it is an outage.** Free, Plus, and Advanced
are not pay-as-you-go: warnings arrive around 90%, then repeated upgrade
prompts, and only sustained overage disables the account. So there is no
surprise invoice. But **the next tier up is $89–99/month**, with no gentle step
in between. The realistic bad outcome is *portraits stop loading on the
portfolio site* and the only remedy costs four to five times the entire Vercel
budget.

**Therefore roadmap §6.5b (the Cloudinary transform injection) is promoted from
optimization to cost control, and belongs before door 1.** It is a guarded
one-line change to the `photoUrl` derivation, it cuts the heaviest asset of
every card load by 80–90%, and it converts a plausible outage into roughly 7×
headroom. Generating ~5,000 derivatives costs about 5 credits once; they are
CDN-cached thereafter.

### 11.6 The $200 that is already configured

**Vercel Pro ships Spend Management with a $200 default budget.** Sam's stated
failure number is sitting in the console as the factory setting.

**First action inside the Vercel dashboard, before the first deploy: set the
spend limit to $50.** Notifications fire automatically at 75% of the monthly
credit; the hard limit is the backstop. This is the single cheapest piece of
insurance in this document.

### 11.7 Alarms and add-ons

To set at door 1, before there is anything to alarm about:

1. **Vercel spend limit → $50** (§11.6), plus the automatic 75% credit
   notification.
2. **Cloudinary usage watch, weekly**, during the noindexed months. There is no
   spend cap to set — the ceiling is the plan — so the alarm is a habit.
3. **Firewall Observability, weekly** (§13.3). Cheap, and it is the instrument
   that tells you whether §9's reasoning was right.
4. **Watch for paid add-ons enabled by accident.** Speed Insights is $10 per
   project per month (10,000 events included, then $0.65 per additional 10,000).
   Given §9.1's second threat — analytics being the project's only feedback loop
   — some analytics spend may be worth it, but it should be a decision, not a
   toggle flipped while exploring the dashboard. **Open, §16-M.**

### 11.8 What would actually cause a $200 month

Written out so it can be recognised early. Every one has a named defence:

| Cause | Defence |
|---|---|
| Shipping Option B or an unguarded Option C | §3, §11.3, §11.4 |
| Firewall not up before robots.txt comes down | §1.1, §9.7 |
| Raw 300 KB portraits surviving to launch | §11.5 |
| `people.json` (22 MB) still in `static/` and discovered by a scraper | §5.2 |
| Spend limit left at the $200 default | §11.6 |

Four of the five are one-time actions completed before door 1. That is the
argument for §1's recommendation restated as money.

---

## §12. DOMAIN AND DNS

*(Recorded August 13, 2026. Parking lot — domain not yet chosen.)*

Not urgent (door 2 is reversible and door 1 does not need it), but two decisions
here are inputs to §7 and should not be discovered late:

1. **Canonical host.** `www` vs apex, redirect the other, decided once and never
   revisited. Every canonical link tag and every sitemap entry embeds this
   choice. DESIGN.md already flags "solve upfront."
   *(**Escalated August 29, 2026.** This is no longer only an SEO decision. It
   now also binds Better Auth's `allowedHosts`, the Google OAuth redirect URI,
   and the Vercel edge redirect — and §18.4 records that getting these to
   disagree is precisely what cost weeks on the previous project. The redirect
   belongs at Vercel's edge, never in `hooks.server.ts`. **It does not block
   building auth**, because Google permits `http://localhost` redirect URIs in
   development.)*
2. **The domain itself.** `hookerfamily.com` was the early placeholder. Worth
   weighing against the framing decision already made — "American history through
   the Hooker line," not "my family tree." A name that reads as a scholarly
   resource rather than a surname site serves both the CHS/NEHGS audience and the
   portfolio goal.
3. If Cloudflare-in-front (§16-F) is chosen, DNS lives at Cloudflare and this
   decision couples to that one.

---

## §13. VERIFICATION

*(Recorded August 13, 2026.)*

### 13.1 The preview gate

`npm run build && npm run preview`, locally, before anything is pushed. This has
never been run (§2.5) and it is the cheapest single action in this entire
document. It closes roadmap §16.3 and covers the 301 path.

### 13.2 Deploy probes

The Playwright arsenal proved its worth on motion; the same discipline applies
here, and the same rule governs it — **prove red first.** Each of these should be
demonstrated failing against a deliberately broken case before it is trusted:

- **Head-tag probe:** title, description, canonical, robots meta, JSON-LD present
  and correct on one rich person, one stub, one severed person.
- **Cold-path probe:** load a deep person page with no prior navigation, JS
  disabled, and assert the content is in the HTML. This is the path Google sees
  and the path seven months of development never exercised, because development
  always arrives warm.
- **Miss-path probe:** retired slug → single 301 → 200; chain → single 301;
  live-but-in-map → 200, no redirect; unknown → 404; severed person → 404.
  Against production, not dev.
- **Payload-strip probe:** grep built payloads for stripped keys and for birth
  years on presumed-living slugs (§6.3).
- **Deployment-inventory probe:** enumerate output files, flag any with no
  reader (§5).

### 13.3 The traffic baseline — start at door 1

The article's central lesson: **look at server logs, not visitor statistics.** A
JavaScript analytics tool counts only visitors who run JavaScript, and almost no
bot does; his stats showed ~500 visitors a day while his server answered
millions of requests a week.

So from the **first** Vercel deployment — months before door 3, while the site is
noindexed and nothing knows it exists — turn on Firewall Observability and
whatever log surface is available, and watch it. That produces a clean baseline
of what hits an invisible site. Everything §9 claims can then be checked against
it instead of against someone else's numbers.

### 13.4 Sam's eyes

Unchanged and final. A green probe against a deployed URL is still an
instrument, and instruments in this project have been confidently wrong six
times in one session. Load the site on a phone on cellular data and look at it.

---

## §14. ROLLBACK

*(Recorded August 13, 2026.)*

Two mechanisms, different blast radii, do not confuse them:

- **Deployment rollback** (Vercel instant rollback) reverts *code and build
  output* to a prior deployment. Fast, safe, no data implications.
- **Data rollback** is git on `canonical.json`, followed by a rebuild. Slower,
  and it can change slugs — which mints redirects, which is a forward-only
  operation in the sense that the old URLs are now in the map for good.

The asymmetry worth internalizing: **a bad deploy is cheap to undo; a bad data
state that has been indexed is not.** After door 3, a rebuild that changes slugs
is a public event. This is the deployment-side expression of the project's
existing no-delete law.

---

## §15. THE ONE-WAY-DOOR CHECKLIST

*(Recorded August 13, 2026. This is the section to reread on launch day. It is
deliberately short; everything else in this document is upstream of it.)*

Before robots.txt allows and the sitemap is submitted:

1. ☐ Rendering fork closed (§3) and the chosen shape deployed and observed.
2. ☐ Slug format frozen for the *format*, with churn accepted as permanent (§8).
3. ☐ Redirect mechanism live and verified in production — retired, chained,
   live-but-in-map, and unknown all behaving (§8.2).
4. ☐ Production 404 seen with actual eyes, and the 404 page designed (§8.3).
5. ☐ Head tags, richness gate, sitemap, JSON-LD all shipped and probe-verified
   (§7).
6. ☐ robots.txt drafted with the two-policy structure, and the `Disallow`-vs-
   `noindex` trap avoided (§7.2).
7. ☐ Privacy strips closed out and the deployed payloads audited (§6).
8. ☐ Deployment inventory clean — nothing shipping that has no reader (§5).
9. ☐ **Firewall rules live and observed for at least one full cycle** (§9.7).
10. ☐ Traffic baseline collected while invisible, so post-launch has something to
    compare to (§13.3).
11. ☐ Canonical host decided and every canonical tag agreeing with it (§12).
12. ☐ **Vercel spend limit changed from its $200 default to $50** (§11.6).
13. ☐ **Cloudinary transform sizes live on every image slot** — no raw 300 KB
    original serving a 210 px column (§11.5). This is cost control, not polish.
14. ☐ Talcott re-sew scheduled deliberately — before, or well after, never
    incidentally (§8.3).

*(Items 15–18 added August 29, 2026 with §18. They gate door 3 only if auth is
live by then; items 15 and 16 gate **door 2** regardless, because they are true
the moment a real domain and real users exist.)*

15. ☐ **`/person/` is provably still static** — a probe asserting no function
    invocation on a person page. §18.2's contract will be broken by accident,
    and nothing else on this list would notice (§18.9).
16. ☐ **Reader-data privacy closed out** — what is stored, why, and a working
    account deletion (§18.8, §16-O). Door 2.
17. ☐ **Rate limiting live and observed on `/api/auth/*`** before the login is
    reachable from a public domain (§18.5, §9.7).
18. ☐ **Canonical host agreed by all four** — the Vercel edge redirect, Better
    Auth's `allowedHosts`, the Google OAuth redirect URI, and every canonical
    link tag (§18.4, §16-K). Disagreement between any two of them is the
    failure mode that cost weeks last time.

---

## §18. AUTH AND THE SERVER SURFACE

*(Opened August 29, 2026. Roadmap §49 records the decision to build auth next and
what it costs the eventual SvelteKit 3 migration; design will own the modal's
behaviour. **This section owns only what becomes true when auth meets a real
deployment** — the routes that stop being static, the hosts that have to agree,
the provider, and the new category of data.)*

**Standing rule from §0 applies with full force here: none of this has been
observed.** Auth has never run outside a plan.

### 18.1 WHAT IS BEING BUILT, AND THE SCOPE THAT BOUNDS IT

Sam's framing, August 29: *"the benefits of logging in will be solid but
minimal."* Signing in does two things and nothing else:

1. **Bookmark entries.**
2. **Set a default hero card** other than Thomas Hooker, so a returning reader
   lands on their own person.

Decided with it: **Google OAuth only** — no email-and-password, no magic link.
That is not a shortcut, it is the elimination of an entire subsystem. Any
email-based method (password reset, verification, or magic link alike) requires
a transactional email provider, SPF and DKIM records, and deliverability that
has to be monitored when a verification mail lands in spam. **Google-only needs
none of it.** Microsoft OAuth and email/password are to remain *architecturally
open* — both are configuration in Better Auth, and account linking merges by
verified email, so adding one later does not fragment an existing account. The
trigger for adding Microsoft is **a real person who is blocked**, not a
hypothesis.

Stripe is likewise deliberately absent and deliberately unblocked: it is a
first-party plugin, so leaving room for it means building *nothing* now. Any
scaffolding erected today to "prepare" for payments would be a mechanism whose
presence implies behaviour that does not exist.

### 18.2 `/` IS THE ONLY ROUTE THAT MAY BE DYNAMIC — the contract

**This is the load-bearing sentence of the section and the one to defend.**

> **`/` is the only route that may be dynamic. Everything under `/person/` stays
> static CDN payloads, forever.**

The reason `/` cannot stay static is the intro. Sam's design: an unauthenticated
visitor gets a ~3-second title-and-image animation and is then handed to Thomas
Hooker; **a signed-in visitor must never see it** and goes straight to their
hero. Every other surface in the app can hydrate the session lazily, because
nothing renders differently until it arrives. `/` cannot — by the time an async
session check resolves, the intro has already started playing.

So `/` gets a server branch that reads the session **before a pixel is painted**,
and — the part that keeps it cheap — reads it from Better Auth's signed
**cookie cache** rather than the database. That makes the branch a cookie read
with **zero DB round-trips** on the common path.

**`/` REDIRECTS, it does not render.** A signed-in Alice reader gets a redirect
from `/` to her person URL, not a `/` that paints Alice in place. One canonical
URL per person, sane back/forward, and `/` keeps no rendering responsibility at
all — it is a router with an intro attached.

**Why this line is worth defending explicitly:** the pressure will be to let
*one more* route read the session — a bookmark star on the person page is the
obvious candidate. It must not. Bookmarks hydrate client-side into a rune store
from one session call in the layout. **The moment a person page's `load` reads a
session, 19,728 static CDN payloads become dynamic**, §3's Option A is gone, and
§11.0's budget rule is broken — for a star icon. §49.3 of the roadmap states the
same rule from the data side: *any design that starts serving person data
through a server route has quietly swapped the app's delivery model for a login
feature.*

### 18.3 THE SERVER SURFACE IS THREE FILES, AND THAT IS A MIGRATION DECISION

Roadmap §49.2's mitigation, restated here because it is a deployment property:
**the eventual SvelteKit 3 migration cost is roughly linear in how many files
import SvelteKit server primitives**, not in how much auth logic exists. So they
are concentrated:

| file | job |
|---|---|
| `src/lib/server/auth.ts` | the Better Auth instance — adapter, schema, providers, session config |
| `src/routes/api/auth/[...all]/+server.ts` | the handler mount |
| `src/hooks.server.ts` | the Better Auth handle, and nothing else |

**`hooks.server.ts` stays roughly five lines, and this is a scar, not a
preference.** The equivalent file on Sam's previous project had grown four
jobs — Stripe raw-body handling, hand-written CORS patching, a devtools
`.well-known` shim, and an unconditional `getSession` — and it is the single
artefact he named as having cost weeks. Each of those has a named replacement
below or in §18.4.

**One deliberate departure from Better Auth's own documentation.** Its SvelteKit
example calls `auth.api.getSession()` in `handle` on **every request**. For this
app that is waste: person pages never need a session, because bookmarks hydrate
client-side. Session goes onto `event.locals` **lazily** — only `/` and the
bookmark endpoints ask. The documented pattern would put a session resolution in
front of all 19,728 pages to serve two routes.

**An unexpected dividend, worth recording because it reduces a cost the roadmap
already budgeted:** Better Auth's SvelteKit integration imports `getRequestEvent`
from **`$app/server`** — which is precisely where SvelteKit 3 relocates
`RequestEvent` and `Cookies`. The largest item on roadmap §49.2's break list is
one the library already writes in the new form. (Requires SvelteKit ≥ 2.20; the
project is on 2.57.)

### 18.4 THE HOST PROBLEM — solved once, at the edge, before it is a bug

*(This subsection exists because Sam named it as the specific pain to avoid:
routing between the apex and `www` on his previous project *"took weeks and a
snarled hooks.server.ts and lots of Vercel backend work to resolve,"* and OAuth
had to be configured on both paths.)*

**The root cause, diagnosed from the old config: `baseURL` was a single
string.** One string cannot describe two hostnames, so every place that needed
to know *which host am I* was patched by hand — which is what the CORS block in
that `hooks.server.ts` was actually doing.

**Better Auth 1.7 takes an allowlist instead**, resolving the host per request
from `x-forwarded-host` → `host` → the request URL and validating it. The line
that matters most: **`allowedHosts` entries are added to `trustedOrigins`
automatically.** The hand-written CORS headers, the origin sniffing and the
OPTIONS preflight branch are not simplified by this — they are **deleted**. They
existed to work around a missing feature that now exists.

Three rules on top, because a config fix is not an architecture:

- **Redirect apex↔`www` at Vercel's edge, never in app code.** One canonical
  host, the other 308'd in project settings, before a request reaches SvelteKit.
  When that redirect lives in `hooks.server.ts`, cookies get set on one host and
  read on the other, and you are debugging auth to fix a DNS decision.
  `allowedHosts` then exists for **preview deployments**, not for serving two
  production domains.
- **Register OAuth redirect URIs for the canonical host only.** Google takes
  exact-match URIs; two registrations drift apart permanently. Preview
  deployments are the exception, and Better Auth's `oAuthProxy` plugin is the
  intended answer for them.
- **§12's canonical-host decision (§16-K) is now upstream of auth**, not just of
  the canonical tags. It should be made once and never revisited.

**None of this blocks building.** Google permits `http://localhost` redirect URIs
for development and browsers exempt localhost from secure-cookie rules, so the
whole feature can be built and tested at `localhost:5173` with no domain. **The
reason to deploy early is unchanged and is §1's:** `x-forwarded-host` resolution,
connection pooling under cold starts, and adapter behaviour are all
deployment-only bugs that cannot be reproduced locally — and they are precisely
the class that cost weeks last time.

### 18.5 AUTH'S OWN THREAT SURFACE — §9 in a new place

`/api/auth/*` is the first endpoint on this site where a request costs compute
and a wrong answer costs an account. Login endpoints are probed continuously and
indiscriminately.

- **Better Auth's built-in rate limiting goes on from the first deployment**,
  not after a bad week. This is §9.7's ordering rule — the firewall precedes the
  exposure — applied to a surface §9 did not know would exist.
- **§9.4's staged discipline still governs any WAF rule** placed in front of it:
  `log` → observe → `challenge` → `deny`, never straight to deny.
- **Auth retires one premise elsewhere in the project's documents.** Roadmap
  §38.5 dismissed SvelteKit 3's CSRF and cookie hardening as *"nothing to
  protect yet."* Logins end that. It is live security surface now, not a config
  note.
- **A signed-in user is not a trusted user.** Any bookmark endpoint authorises
  against the session's own user id server-side. The previous project's
  `isAdmin = email === 'samhooker@gmail.com'` was a client-side check on a
  hardcoded string — fine as a UI hint, never as a boundary. If admin ever
  matters here it is a server-owned field the client cannot write.

### 18.6 WHAT IS STORED — and the one rule that survives slug churn

The whole data surface is **one added column and one table**:

| | |
|---|---|
| Better Auth core | `user`, `session`, `account`, `verification` — generated by its CLI |
| added to `user` | `heroPersonId` — an `additionalFields` entry, typed through to the client session |
| new table | `bookmark(user_id, person_id, created_at, last_opened_at)` |

> **BOOKMARKS AND THE HERO STORE THE PERSON ID, NEVER THE SLUG.** The URL is
> derived at render.

This is the single most important durable decision in the section, and §8 is why:
**slug churn is permanent** — 510 → 673 redirects in five days, and it grows for
the life of the site. §4's 896-record slug repair has not run, and Sam intends to
flatten `/person/alice-gwynne-1845` to `/alice-gwynne-1845` eventually. Every one
of those events would orphan slug-keyed bookmarks silently, and a user losing
their saved entries has no way to report a cause. IDs are stable; nothing else
about a person's URL is. It also means **slug churn is not a blocker on
deploying auth**, which is what made door 1 available while the data is still
moving.

**One caution carried from the old project, because it is the same shape.** That
config's `customSession` plugin wrote `lastActivity` to the database on **every
session resolution** — a write per request, which keeps a scale-to-zero database
permanently awake and is a plausible share of its standing monthly bill. If
`last_opened_at` is implemented for a most-recently-viewed list, it fires **only
when a bookmarked person is opened** — never on ordinary navigation.

### 18.7 THE PROVIDER — ✅ NEON, on a FRESH project, free tier

*(**Decided August 29, 2026**, and the decision reversed twice inside one
session — which is why the reasoning is preserved in full rather than replaced.
Neon was the working assumption from July; Sam ruled it out on cost; the ruling
was then found to rest on a bill this project would never generate. The
requirements below were written while the vendor was open, and they are kept
because they are what the choice is JUSTIFIED by — a future reader who wants to
revisit the provider should re-test against these three, not against the brand
name.)*

**THE RULING-OUT WAS BASED ON THE WRONG NUMBER, and this is the useful part.**
Neon was rejected because of a standing ~$10/month charge. That charge is a
**year-old, unrelated project's** usage — 18.62 compute-hours in 29 days, driven
by its automated pulls. Deleting that project and creating a fresh one for this
site are independent actions. **"Cancel Neon" and "use Neon" were never in
conflict**; a legacy project's bill was being read as the platform's price.

The general form is worth keeping, because it is the second time in this
document a decision was nearly made on a stale measurement (the first being
§5.3's "presumably unread"): **a cost observed on one project is not that
vendor's cost for a different workload.**

**THE MEASUREMENTS THAT DECIDED IT** *(taken August 29, 2026, from each
vendor's current pricing page — re-verify before door 2)*:

| | Neon Free | Supabase Free |
|---|---|---|
| idle behaviour | **scale-to-zero after 5 min, auto-resumes on the next connection** | **project PAUSED after 1 week of inactivity, manual restore** |
| compute included | 100 CU-hours per project / month | shared CPU, 500 MB RAM |
| storage | 0.5 GB per project | 500 MB |
| first paid step | **Launch, pay-as-you-go, $0.106/CU-hour, no monthly minimum** | **Pro, $25/month flat** |

**The idle row is the whole decision, and it is decisive for THIS site
specifically.** Sam's stated expectation is *"not a lot of log in use for the
first year"* on a project with a multi-year horizon. That is precisely the
traffic shape that trips Supabase's free-tier pause: a fortnight with nobody
signing in, then a real person tries — and the database is asleep and needs Sam
to click a button in a dashboard before the login works. **A sign-in path whose
availability depends on recent sign-ins is a trap with a delay fuse**, and it
would present as "the login is broken," months after anyone touched it. Neon
suspends and **auto-resumes on connection**, which is the same idle economics
without the failure mode.

The second row is the cost answer. The legacy project burned 18.62 CU-hours in
29 days *with automated pulls running*; an auth database serving rare logins
uses a fraction of that against an allowance of **100**. This site sits inside
the free tier with a wide margin, and if it ever outgrows it, Launch is metered
hourly with no monthly minimum — a ramp, not the $25 step function.

**Against the three requirements, which stand as the test for any future
revisit:**

1. **Reachable from Vercel serverless, with pooled connections.** Satisfied —
   but this is still the one that bites. A serverless function opening a direct
   Postgres connection per cold invocation exhausts the connection limit and
   keeps compute awake. **Use the pooled endpoint**, and verify the exact
   connection form against current vendor documentation at build time rather
   than from memory.
2. **A driver Better Auth's adapter layer accepts.** Satisfied — its built-in
   Kysely dialect takes a `pg`-compatible `Pool` directly and its CLI runs the
   migration. **This retires Drizzle from the stack**; the roadmap's Phase 10
   row ("BetterAuth/Neon/Drizzle") assumed an ORM the current library does not
   require. One fewer dependency, one fewer config file; the only loss is ORM
   ergonomics on a single table.
3. **Scale-to-zero or near-zero idle cost.** Satisfied, and it is the
   requirement Supabase fails on behaviour rather than on price.

**ACTIONS, and they are two separate things — do not let one stand in for the
other:**

- **Delete the legacy Neon project.** This is what stops the ~$10/month, and it
  is the thing Sam actually wanted. It is unrelated to the choice above.
- **Create a fresh Neon project for this site.** New credentials, new
  connection string, no inheritance from the old one.

**One trap retired rather than deleted, because it remains true for anyone
revisiting this:** several platform-branded Postgres products — including
Vercel's own historically — have been Neon-backed underneath. It mattered while
the goal was to move *away* from Neon; it is moot now, but it is why "Vercel
Postgres" is not a distinct third option in the table above. Verify what a
branded product actually runs before treating it as a different vendor.

What the choice must satisfy:

1. **Reachable from Vercel serverless functions**, with **pooled connections.**
   This is the one that bites, and it bites exactly like the host problem did: a
   serverless function opening a direct Postgres connection per cold invocation
   exhausts the connection limit under any real traffic and keeps compute awake.
   Whatever the provider, the pooled endpoint is the one to use — verify the
   exact driver and connection form against current vendor documentation at
   build time rather than from memory.
2. **A driver Better Auth's adapter layer accepts.** Its built-in Kysely dialect
   takes a `pg`-compatible `Pool` directly, and its CLI then runs the migration
   itself. **This retires Drizzle from the stack** — the roadmap's Phase 10 row
   assumed an ORM that the current library does not require. One fewer
   dependency, one fewer config file, one fewer thing to keep in step; the only
   loss is ORM ergonomics on a single table.
3. **Scale-to-zero or near-zero idle cost.** Per §11.0, the bill must scale with
   what Sam has written. The auth dataset is a few hundred rows against a corpus
   of 19,728 people; it should round to nothing, and any provider whose idle
   cost is material fails the budget frame on its own.

**One trap to check before choosing, flagged rather than asserted:** several
platform-branded Postgres offerings — including, historically, Vercel's own —
have been Neon-backed underneath. *"Move away from Neon"* satisfied by a product
that is Neon wearing a different label would be a decision that did not happen.
**Verify the actual underlying provider**, not the brand on the dashboard.

### 18.8 A NEW CATEGORY OF PRIVATE DATA — and §6 does not cover it

§6 governs the privacy of **genealogical subjects** — living persons, suppressed
dates, the `stripFromClient` set. It has nothing to say about auth, because until
now this site held no data about *its readers*.

Logins change that. Google OAuth returns an email address and a name, and the
site will store them alongside a record of **which ancestors a named person
bookmarked** — which is a more personal disclosure than it first sounds, since a
bookmark list on a genealogy site is a partial map of someone's own family.

This is not a launch blocker for door 1 on a noindexed URL with no users. It
becomes real at **door 2**, and the items are small and standard: a plain
statement of what is stored and why, a way to delete an account (Better Auth
supports user deletion), and the decision not to collect anything beyond what the
two features need. **Recorded here so it is a decision rather than a discovery.
Open, §16-O.**

### 18.9 WHAT MUST BE OBSERVED — nothing here is verified

Per §0 and §13.2, each of these should be seen failing before it is trusted:

- **The `/` branch, both ways.** Signed out → intro plays → Thomas. Signed in →
  no intro, straight to the hero. *And the case that will be got wrong: signed
  in with a hero whose slug has since changed* — the ID resolves, the redirect
  must land on the current URL.
- **A person page is still static.** Assert no function invocation on a
  `/person/` request. This is the tripwire for §18.2's contract, and it belongs
  in the probe arsenal — the contract will be broken by accident, not on
  purpose, and nothing else would notice.
- **The host posture.** Apex and `www` both reach the canonical host; sign-in
  completes from a cold start on the canonical host; a preview deployment does
  not break OAuth.
- **Rate limiting actually engages** on `/api/auth/*`.
- **Sign-out clears.** And the cookie-cache caveat is understood: a revoked
  session can remain live on another device until the cache's `maxAge` expires.
  Irrelevant for bookmarks; it would not be for anything sensitive, and nothing
  sensitive should be added without revisiting it.

---

## §16. OPEN DECISIONS REGISTER

*(Opened August 13, 2026. Same function as the roadmap's Hold Register: items
are documented, not abandoned. Nothing here is decided until Sam marks it.)*

| # | Decision | Owner | Blocks |
|---|---|---|---|
| **A** | Walk through door 1 now, on a `*.vercel.app` URL, months before content is ready? | Sam | Everything's schedule |
| **B** | **Rendering fork** — prerender all / SSR / prerender + fallback (§3). **NARROWED August 13:** §11.3 disqualifies SSR on the budget frame alone. Live choice is A or C, and C only with the firewall in front | Sam | §4, §8, §9, §11 |
| **C** | `canonical.json` committed (~41 MB) or fetched at build time? (§4.1) | Sam | §4 |
| **D** | `stripFromClient` — the five commented candidates, per field. Note `research_sources` may fight the planned sources UI (§6.1) | Sam | Door 2 |
| **E** | Redirect mechanism — `vercel.json` rules / prerendered stubs / dynamic fallback (§8.2). Measure the route limit against the current map first. **✅ MEASURED August 29, 2026: the limit is 2,048 routes per deployment (Vercel docs, 2026-08-25), map is 673 and growing permanently — option (a) is disqualified on shape, not arithmetic. Narrowed to (b) prerendered stubs; needs Sam's mark and one verification (that SvelteKit emits a real 301, not a meta refresh)** | Sam | §3, door 3 |
| **F** | Cloudflare proxying in front of Vercel — yes/no. Buys ASN rules and the full toolkit; costs a second CDN layer (§9.3) | Sam | §12, §9 |
| **G** | **AI search crawlers** — allow (citable-reference positioning) or block (corpus protection)? Training crawlers blocked either way; user-triggered fetchers never blocked (§9.5) | Sam | Door 3 |
| **H** | Geography — continent challenge vs country deny, and which countries (§9.6) | Sam | Door 3 |
| ~~**I**~~ | ~~Does anything still read `people.json`?~~ **✅ CLOSED August 29, 2026 — nothing reads it. Zero references in `src/`; 31 MB and a one-`curl` copy of the corpus. Stop writing it into `static/` (§5.2)** | Code | — |
| **J** | `/table` — public, noindex, or gated? (§5.7) | Sam | §7 |
| **K** | Domain, and canonical host (`www` vs apex) (§12). **Escalated August 29:** now also binds the OAuth redirect URIs and Better Auth's `allowedHosts` (§18.4), so it is upstream of auth, not only of the canonical tags | Sam | §7, §18 |
| **L** | Talcott re-sew timing relative to door 3 (§8.3) | Sam | Door 3 |
| **M** | Analytics tooling and its spend. §9.1 makes analytics the project's only feedback loop; Speed Insights is $10/project/month. Decide deliberately rather than by dashboard toggle (§11.7) | Sam | §13.3 |
| ~~**N**~~ | ~~Postgres provider.~~ **✅ CLOSED August 29, 2026 — NEON, on a FRESH project, free tier.** The August 29 ruling-out rested on a legacy project's bill, not on this workload. Decided on idle behaviour: Neon auto-resumes from scale-to-zero, **Supabase Free pauses after a week of inactivity and needs a manual restore** — a fatal shape for a site whose logins are rare. Free tier (100 CU-hours/project) covers this with wide margin; Launch is metered with no minimum if it ever doesn't. **Two separate actions: delete the legacy project; create a fresh one** (§18.7) | Sam | — |
| **O** | **Reader-data privacy** — the statement of what is stored, and account deletion. New category; §6 covers genealogical subjects only and does not reach it (§18.8) | Sam | Door 2 |
| **P** | **Does `canonical.json` need shrinking at all?** §2.7 measures the options and argues against minifying it in the repo (git diffability is what the data-safety model runs on). §4.3 item 3's heap measurement decides whether there is a problem. Do not act before measuring | Code → Sam | §4, §16-C |

---

## §17. SESSION LOG

**August 13, 2026 — document opened.** Audit of `svelte.config.js`, `+page.ts`,
`+page.svelte`, and `regenerate-data.js` produced §2's six findings, the largest
being that nothing is prerendered and the person page carries no `<svelte:head>`
at all. §1's three-doors frame established. §8 revised the same day on Sam's
account that slug churn is permanent rather than a pre-launch cleanup — the
`redirects.json` growth rate (510 → 673 in five days) corroborates it, and it
promotes the redirect layer from migration tool to permanent infrastructure. §9
added from Nick Gray's "99% of My Website Traffic Is Bots" (August 7, 2026),
with its threat ordering inverted for this project: corpus theft first, analytics
pollution second, cost last. Vercel's WAF capabilities verified against current
documentation; ASN matching identified as the one rule from the article that does
not port. Twelve decisions opened in §16, none closed.

**August 13, 2026 — §11 rewritten from placeholder; budget promoted to a
constraint.** Sam set the frame explicitly: $20 target, $50 sustainable if it is
buying views, $200 is project failure. §11.0 records that as a first-class
design constraint on the same footing as the project's content laws, with the
operative rule being that **cost must scale with how much Sam has written, not
with how many machines read it.** Vercel Pro rates verified against current
documentation: 1 TB Fast Data Transfer and 10M Edge Requests included ahead of
the $20 credit, but **no included tier for Active CPU or Provisioned Memory** —
which turns the rendering fork into a budget decision and narrows §16-B against
SSR on cost grounds alone, independent of SEO. Option A modelled at roughly 590
full-corpus crawls per month inside the free allowance, so $200 is not a
realistic failure mode there; the realistic bill is $20 flat.

Two corrections and one discovery. **Correction:** earlier sections assumed a
metered Cloudinary plan; Sam is on the free tier (25 credits/month), so the
failure mode is an outage rather than an overage, with the next tier at
$89–99/month and no step in between — which promotes roadmap §6.5b from
optimization to cost control and moves it before door 1. **Discovery:** Vercel
Pro ships Spend Management with a **$200 default budget** — Sam's stated failure
number, sitting in the console as the factory setting. Lowering it to $50 is now
checklist item 12. §11.8 lists the five things that could actually produce a
$200 month; four are one-time actions completable before door 1. Decision M
opened on analytics spend.

---

**August 29, 2026 — §2 re-audited, §18 opened for auth, two decisions closed and
three opened.** Prompted by Sam moving auth ahead of everything else (roadmap
§49) and by his question about minifying `canonical.json` at deploy time.

**The re-audit, and the finding about the document itself.** Sixteen days moved
the corpus 17% (16,855 → **19,728** people) and made one section actively false:
§5.3 called `search-index.json` *"presumably unread"* on the grounds that the
search modal was unbuilt, and **search shipped August 27**. The file is now
load-bearing and 6.2 MB rather than 2.5. Nothing in the document would have
caught that, which is the first confirmation of §0's standing rule and the
reason §5's inventory is a repeated procedure rather than a cleanup. Recorded in
§2.3 rather than silently corrected.

**Two open decisions closed by measurement.** §16-I: **nothing reads
`people.json`** — zero references in `src/`, and `regenerate-data.js`'s own
comments said so twice while the question sat open for months, which is roadmap
§33.6 (*a comment is not a mechanism*) in a deployment costume. It is 31 MB per
deployment and a single-`curl` copy of the corpus — §9.1's first threat, sitting
there for no reader. §5.3 resolved the other way: `search-index.json` is needed,
which makes it the primary object the `/data/` rate limit exists to protect.

**The minification question, answered and mostly declined.** Measured: the
weight in `canonical.json` is **whitespace (15.7 MB), not `research_notes`
(5.7 MB)** — and notes are already stripped from every client payload, so
stripping them buys nothing on the CDN. Minifying canonical in the repo would
save 28% and **destroy the git diffability the entire data-safety model runs
on** (`validate.py --baseline`, silent-loss detection, per-batch revert points).
Declined as a trade; recorded as §16-P pending §4.3's heap measurement, which
may show there is no problem to solve. The related ONE LAW note: notes are mined
into user-facing fields, never deleted from the source.

**§18 opened — auth as a deployment concern.** Scope is deliberately minimal
(bookmarks, a default hero, **Google OAuth only** — which eliminates the entire
transactional-email subsystem, with Microsoft and email/password left
architecturally open). Its three load-bearing claims: **`/` is the only route
that may ever be dynamic**, defended with the arithmetic that a full-corpus crawl
is 19,728 static requests and exactly one hit on `/`, so §11.0's budget rule and
§3's Option A both survive; the server surface is **three files**, per roadmap
§49.2's migration-cost rule, with `hooks.server.ts` held to five lines because
the previous project's grew four jobs and cost weeks; and the host problem is
solved **at Vercel's edge**, never in app code, with Better Auth 1.7's
`allowedHosts` allowlist replacing the single `baseURL` string that was the root
cause — it adds hosts to `trustedOrigins` automatically, which deletes the CORS
patching rather than simplifying it.

Also recorded in §18: **bookmarks store the person ID, never the slug** (§8's
permanent churn would orphan them silently, and it is why slug churn does not
block deploying auth); Drizzle drops out of the stack because Better Auth's
built-in Kysely dialect takes a `pg` Pool directly; and a caution carried from
the old config, whose `customSession` wrote to the database on every session
resolution — a write per request that keeps a scale-to-zero database awake.

**Three decisions opened.** **N** — the Postgres provider, after Sam ruled out
Neon on August 29; §18.7 states requirements rather than a vendor, and flags
that some platform-branded Postgres has historically been Neon-backed, so a
candidate should be verified rather than taken at its label. **O** — reader-data
privacy, a category §6 does not reach: Google returns an email and a name, and a
bookmark list on a genealogy site is a partial map of someone's own family. **P**
— whether `canonical.json` needs shrinking at all. **K escalated:** the canonical
host now binds four things that must agree, and their disagreement is the
documented failure mode from last time.

Checklist items 15–18 added. **Nothing built; nothing deployed. Every claim in
§18 is reasoning, and §18.9 lists what has to be observed before any of it is
believed.**

---

**August 29, 2026 (later) — §16-N closed on Neon; §16-E closed on a number;
§11.2b added.** Three vendor pages read directly (Neon pricing, Supabase
pricing, and `vercel.com/docs/limits` at `last_updated: 2026-08-25`) after Sam
supplied Vercel's `llms-full.txt` and a third-party pricing article.

**The provider decision reversed twice in one session, and the reversal is the
lesson.** Neon was ruled out that morning on a ~$10/month charge which turned
out to belong to a **year-old unrelated project** (18.62 compute-hours of
automated pulls), not to this workload. *"Cancel Neon"* and *"use Neon"* were
never in conflict — the legacy project is deleted, a fresh one is created. **A
cost observed on one project is not that vendor's cost for a different
workload**, and this is the second time in one day a decision was nearly made on
a stale measurement (§5.3's "presumably unread" being the first).

**What actually decided it was behaviour, not price.** Supabase's free tier
**pauses a project after one week of inactivity and requires a manual restore.**
Sam expects *"not a lot of log in use for the first year"* — which is exactly the
shape that trips it: a fortnight of nobody signing in, then a real person tries,
and sign-in fails until someone clicks a dashboard button months after anyone
touched the code. **A login path whose availability depends on recent logins is a
trap with a delay fuse.** Neon suspends after 5 minutes and auto-resumes on the
next connection — the same idle economics without the failure mode. The free
tier's 100 CU-hours per project covers this site with wide margin, and Launch is
metered hourly with no minimum, so outgrowing free is a ramp rather than
Supabase Pro's $25 step. Drizzle formally leaves the stack; the Kysely dialect
takes a `pg` Pool directly.

**§16-E closed by a number the document had been asking for since August 13.**
Vercel's limits page states **2,048 routes per deployment** (Pro and Hobby
alike), and counts every `vercel.json` redirect against it. The map is 673 and
was 510 five days before that. But the arithmetic is not the argument: §8.1
established the redirect layer as permanent infrastructure that grows for the
life of the site, and option (a) puts an unbounded monotonic thing inside a
fixed budget — there is no churn rate at which that ends well, only a date, and
the failure is a build that starts failing years downstream of its cause.
Narrowed to **(b) prerendered stubs**, pending Sam's mark and one verification.
The same page **re-confirmed §4.2**: no upper limit on build output files, so
19,738 files is not a Vercel problem; the binding ceiling is the 45-minute build,
which §4.3 already schedules measurements for.

**§11.2b costs the one dynamic route** auth introduces, because §3.5's argument
should exist in money as well as in architecture: `/` reads a cookie and returns
a redirect, so even a million invocations a month is under two dollars. The
figure is order-of-magnitude — the $0.128/hour Active CPU rate came from
third-party commentary rather than Vercel's own sheet and is flagged for
re-verification. The section's real content is the failure mode: what breaks the
table is a *second* route reading the session, which is Option B arriving through
a side door, and checklist item 15 is its tripwire.

**A note on the sources.** The pricing article Sam supplied is Schematic's
content marketing and its numbers were treated as leads rather than facts —
every figure used above was re-read from the vendor's own page, which is §11's
own standing instruction and the reason the route limit is now quoted with the
date its documentation was last updated.
