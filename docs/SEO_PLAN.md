# SEO PLAN — getting hookerverse.com found, without giving the tree away

**Opened October 24, 2026. Last updated October 26, 2026, 13:00 PDT — THE BUILD (§9 steps 0–8) IS COMPLETE AND LIVE
(still hidden from search), the launch probe `scripts/probe-seo.mjs` is 42/42, and what is left is waiting or
launch-day work (§0.2–§0.3). §0 is the handoff; §13 is the dated record of the discussion behind every decision;
roadmap §64–§65 (ENRICHED_CODING_ROADMAP_FABLE_102626.md) is the engineering record of Oct 26.**
A living document in the house convention: decisions Sam has made are marked ✅ and dated; open choices stay in
§11 until he closes them; every measured number carries its date and is re-run before it is trusted.

**This supersedes `DEPLOYMENT_STRATEGY.md` §7 (the SEO surface).** That section was written on August 13,
before people moved to the root (`/thomas-hooker-1586`), before sign-in, and before the site was deployed.
Its reasoning still holds and is not repeated here; where the two disagree, this document wins.
DEPLOYMENT_STRATEGY remains the owner of the firewall (§9), the cost model (§11) and the launch-day
checklist (§15), and this plan points into them rather than copying them.

---

## §0. STATUS AND NEXT STEPS — the handoff (October 26, 2026)

**Read this section first in a new session.** Everything below §0 is the reasoning; this is where the work stands.
Live deploy at the end of the session: commit **3fe7a436**, pushed to GitHub, deployed to hookerverse.com and
hooker-test.vercel.app (one build, two addresses). The site is still hidden from search (`X-Robots-Tag: noindex,
nofollow` on every response + `Disallow: /` in `static/robots.txt`) — nothing below is public to Google until §12.

### 0.1 Done (Oct 24–26), each verified on the live site

| what | where it lives | commit |
|---|---|---|
| Page titles `"<chip name> (<years>) - The Descendants of Rev. Thomas Hooker"`; private-date people get no years; Thomas's own: "Rev. Thomas Hooker (1586–1647)". Shared titles on the 8,479 gated pages: 2,168 → 8 | `src/routes/[slug]/+page.svelte` `pageTitle`; `src/lib/site.ts` `SITE_TITLE` | e903ff14 |
| Canonical tag on every person page (`https://hookerverse.com/<current slug>`, also on hooker-test, also after an old-slug redirect) and on `/` | `src/lib/site.ts` `SITE_ORIGIN`; `[slug]/+page.svelte` `canonicalUrl`; `src/routes/+page.svelte` | d1b82464 |
| **Privacy, Sources, Contact have real addresses** (§5.8): `/privacy`, `/sources` open over Rev. Thomas's card, `/contact` over Sam's; server-rendered with title, description, canonical (`/contact` noindex); in the app the address bar follows the pop-up; footer items + Sam's NB 3 "here" are real `<a href>`s | `src/lib/surfaces.ts` (the one definition), `[slug]/+page.ts` (loads the host), `[slug]/+page.svelte` (`openSurface`, `syncSurfaceAddress`, `forced` props), `SiteFooter.svelte`, `NarrativeBlocks.svelte` | 4754af78 |
| **Safari fix** for the above: a CC-style flight (Sources author link, search pick, CC link) started from a pop-up's address abandoned its arrival — old card gone, new one never in (Sam's Ketchum screenshot). The early-exit "has the reader moved?" check now reads `readerAddress()` (a pop-up's address = the card under it); pop-up addresses REPLACE the history entry instead of pushing one and stepping Back on close | `src/lib/state/navigate.ts` `readerAddress`, `focusAfterEarlyExit` | 3fe7a436 |
| Side doors closed: `/dev/*`, `/table`, `/institution/*` answer 404 in production (still work in `npm run dev`) | `src/routes/dev/+layout.ts`, `table/+page.ts`, `institution/[slug]/+page.ts` | acbce375 |
| Unread data files no longer published: `cemeteries.json`, `institutions.json`, `table-index.json`, `stats.json` are written locally only (`WLocal`, skipped when `VERCEL=1`) | `regenerate-data.js` | acbce375 |
| **Living people's private dates stripped from everything downloadable** — 653 people; before: 497 birth years in `search-index.json`, 261 full birthdays in payloads/HTML, every seat `t.y` = true birth year. Rows sort on `bo` (per-row birth-order rank); search sorts private rows as dated-youngest by generation; card wear treats private as recent; rail direction uses the seat estimate | `regenerate-data.js` (`datesPrivate`, `privateDateless`, `stampBirthOrder`, `chipDateParts`), `table-coords.mjs` (`isPrivate`), `roster.ts` `birthKey`, `siblingLayout.ts`, `search.svelte.ts` `PRIVATE_SORT_YEAR`, `FeaturedCard.svelte`, `TimelineRail.svelte` | cbf7206e |
| hooker-test.vercel.app = Sam's testing host, `noindex` forever (host-scoped header, survives launch) | `vercel.json` | 127da498 |
| Vercel Web Analytics on hookerverse.com only; never counts Sam (signed in as his account, matched by SHA-256 of the email; or any browser he has signed in on, `localStorage hv-owner`); first pageview waits for the session | `src/lib/state/analytics.svelte.ts`, `+layout.svelte` | 127da498 |
| Privacy text now says visits are counted anonymously without cookies; Sources author names lightly underlined | `PrivacyModal.svelte`, `SourcesModal.svelte` | e903ff14 |
| Phone: footer row on the floor of short cards, 44px under the last chip on tall ones; shuffle button reads "Notables"; intro arrow ≥64px tap target; bookmarks open on one tap on touch | `[slug]/+page.svelte` `.phone-footer`, `SiteFooter.svelte`, `ShuffleNotables.svelte`, `TopRightChrome.svelte`, `IntroGL/IntroOverlay.svelte`, `BookmarksModal.svelte` | f11a3e7a, 127da498, d1b82464 |
| **Step 0 (Oct 26 afternoon).** **Firewall, LOG ONLY**, published via `vercel firewall` (CLI 63): `LOG data rate` (`/data/`, 120/min per IP), `LOG page rate` (page HTML only — regex excludes `/data`, `/_app`, `/_vercel`, `/api`, `/intro`, `/textures`, `/icons` and any path with a file extension; 60/min), `LOG geo deny-list` (CN RU VN SG KP IR), `LOG geo challenge-list` (outside US CA GB IE FR DE NL BE LU CH AT LI MC IT ES PT DK NO SE FI IS AU NZ). **Read the log ~Nov 2**, then tune and move to challenge/deny. **Search Console** Domain property verified (the existing TXT record). **Bing** imported from Search Console. **Vercel spend budget $50 on-demand, pause ON** (team-wide, on top of the $20 included credit) | Vercel dashboard / CLI; DNS unchanged | — |
| **Step 2 — head tags (Oct 26).** Meta description = the card's blurb + the first sentence of NB 1, ~155 chars (else "Son/Daughter of …; born in …, in YYYY"; none for a private person with nothing to say). Open Graph + Twitter tags, `og:locale en_US`. Preview image = the portrait PADDED on the card's cream at 1200×630 via `/cld/` (Sam: "padded photos are better because often they are not standard size and even have differing alignments"); everyone else and the pop-up addresses get `static/og-default.jpg`, the intro at rest (Sam: "C site photo is perfect"; how to re-shoot is in seo.ts). JSON-LD `ProfilePage` → `mainEntity` `Person` (@id `url#person`, `isPartOf` `https://hookerverse.com/#website` — step 6 must define that node): dates at the card's precision incl. the 1-January placeholder rule, places, parents/spouses/children as links, portrait, `sameAs` notable_url. `pv` people: no dates, no places. Alt text was already on chips and the featured portrait; the rail headshots and modal photos stay `alt=""` on purpose | `src/lib/seo.ts`, `[slug]/+page.svelte`, `static/og-default.jpg` | 78f7c314, 875a98fa |
| **Step 3 — the richness gate (Oct 26).** `isIndexable()` in `regenerate-data.js` (≥1 narrative block with words) stamps `ix` on **8,479 of 29,025** payloads; the page writes `noindex, follow` without it, failing closed. **The sitemap (step 5) must call `isIndexable()`.** Verified live: Thomas/privacy/sources indexable; Albert Bristol, Molly Powell, /contact noindex; switches correctly on warm navigation and Back | `regenerate-data.js`, `buildFeatured.ts`, `featured.svelte.ts`, `[slug]/+page.svelte` | 875a98fa |
| **Photos through Vercel's edge cache** (Cloudinary was at 22.78/25 credits, 59% bandwidth): person photos and the rail headshots load from `/cld/…`, rewritten to Cloudinary and edge-cached; `f_webp` replaces `f_auto`; notables pre-built with `scripts/warm-photos.mjs`. First view 0.55 s → cached 0.09 s. Full record: roadmap §64 | `src/lib/photo.ts`, `vercel.json`, `vite.config.ts`, `TimelineRail.svelte`, `paths.ts`, `scripts/warm-photos.mjs` | 01abe083, 0565cfd3 |

### 0.2 Next, in order (§9 is the full build list; this is what remains of it)

**Step 0 — ✅ DONE Oct 26** (details in §0.1). Search Console verified, Bing imported, firewall logging, spend capped.
DNS lives at **Sam's Vercel account** (bought at Whois.com; `vercel dns ls|add hookerverse.com`). **Never delete the
TXT record `google-site-verification=p-_q…`** — Search Console and Google sign-in both rest on it.
What step 0 left open:
- **Safe Browsing review — ✅ CLEARED Oct 26, 21:18 PDT** (Search Console email "Review successful for
  hookerverse.com", message type WNC-608000: *"no longer contains links to harmful sites or downloads. The warnings
  visible to users are being removed"*). Google named no URL and nothing was changed to get it. The record below is
  kept for history. Search Console showed **"Deceptive pages"** → Security issues showed **"Deceptive pages"**, no sample URLs; no
  warning in Chrome, Safari or Firefox. Domain registered Oct 19, no web-archive history, so not inherited. Nothing
  deceptive found (the server HTML has no login form; sign-in is OAuth buttons to Google/Microsoft; the only form is
  contact). Likely trigger: a week-old domain + Google/Microsoft sign-in + deliberately hidden from search. Review
  requested Oct 26 as a false positive; Google answers by email to samhooker@gmail.com. **Launch waits on it
  clearing.** If Google names a URL, look at exactly that.
- **Firewall log read ~Nov 2**: `vercel firewall overview` / `vercel firewall traffic`, then tune the two rate limits
  and move rules log → challenge → deny (deny only for the deny list). The `/cld/` photo path is excluded from the
  page rule by its file extension.
- **Search Console Indexing** shows 2 "Blocked by robots.txt" and 1 "Indexed, though blocked by robots.txt" (a bare
  URL Google learned but never fetched). Both are the deliberate `Disallow: /`; do not "Validate fix". They resolve
  at launch (§6.3).

**Steps 2 and 3 — ✅ DONE Oct 26** (head tags, the richness gate, the default preview image; details and commits
in §0.1). As built, two choices differ from the plan text that stood here: the preview portrait is PADDED on the
card's cream (`w_1200,h_630,c_pad,b_rgb:f4ecdd,q_auto,f_jpg`), not face-cropped — a face crop cut faces off
newspaper portraits; and the site image is a screenshot of the live intro at rest, not a layer bake. **If Strict
Transformations is ever turned on, that pad transform must be on the allowed list or every preview breaks.**

**Step 5 — ✅ DONE Oct 26.** `regenerate-data.js` writes `static/sitemap.xml` (gitignored, served at `/sitemap.xml`)
from the SAME `isIndexable()` as the gate: **8,482 URLs** = 8,479 storied pages + `/`, `/privacy`, `/sources`; current
slugs only; no `<lastmod>` (nothing trustworthy to date it by); 557 KB. Verified: valid XML, every person URL has a
payload carrying `ix`, none points at `/data/` or another host. **The launch robots.txt is drafted at
`docs/robots-launch.txt`** (never deployed — `docs/` is outside the upload) and checked with Python's robots parser:
search engines, AI-search crawlers and user-triggered fetchers may read pages, portraits (`/cld/`, for Google Images)
and the sitemap but not `/data/` or `/api/`; the AI-training crawlers get `Disallow: /`. **`static/robots.txt` stays
closed until launch day (§12), when the draft replaces it** — closed to everyone but the link-preview bots
(Twitterbot, Slackbot, LinkedInBot, Discordbot, facebookexternalhit; never `/data/` or `/api/`), let in Oct 26 ~13:30 PDT
so links Sam shares unfurl on X, Slack, LinkedIn, Discord and Facebook as they already did in iMessage; the noindex
header still stands on every response, so nothing is indexed. `probe-seo` checks both halves (43/43). Submit the sitemap in Search Console and Bing
then, not before.

**Step 6 — ✅ DONE Oct 26.** `/` keeps its title and canonical and gains a description ("The descendants of Rev.
Thomas Hooker, who founded Hartford, Connecticut, in 1636: four centuries of American history told through one
family." — Sam may reword), link-preview tags with `og-default.jpg`, and the `WebSite` JSON-LD node
(`@id https://hookerverse.com/#website`, the one every ProfilePage's `isPartOf` names) with `author` = Samuel Talcott
Hooker → `/samuel-hooker`. **The intro's Enter is now an `<a href="/thomas-hooker-1586">` present in the server
HTML from the first byte** (`IntroGL.svelte`): inert — `pointer-events: none`, `tabindex -1`, `aria-hidden` — until
the arrow shows; only its SVG drawing still waits for `arrowShown`, so nothing extra paints during the intro. A plain
click / Enter key runs the intro's exit as before; a modified click opens Thomas in a new tab. Verified: `/` sends
exactly 1 link; same 56×56 box at 692,582; the intro at rest is pixel-identical (arrow region 0/255 difference); click
and Enter both land on Thomas; a click on the arrow's spot before it appears does nothing. `IntroOverlay` (the
no-WebGL fallback) is unchanged — the server always renders the GL branch.
**Known, not changed:** `/` replaces itself with Thomas's page (or a signed-in reader's home card) as the intro
starts, so a crawler that RUNS the page ends on Thomas, whose canonical is Thomas — Google may fold `/` into
Thomas's result. The server HTML is right either way. Revisit only if Search Console shows the home page missing.

**Step 7 — ✅ DONE Oct 26.** `[slug]/+page.ts` sets `Cache-Control: public, s-maxage=3600,
stale-while-revalidate=86400` once the payload is in hand (person pages and the /privacy, /sources, /contact
addresses; never a 404 or a 301). Measured live on hooker-test, Dexter Ferry: first fetch MISS 2.0 s (cold start
after deploy), then HIT 0.21 s / 0.19 s; a session cookie gets the same HIT (pages are identical for every reader).
`scripts/probe-static-contract.mjs` 5/5 before and after — its allow-list gained `/api/contact`, which had kept
check 4 red since Oct 9. Each deploy starts a fresh cache; data only changes with a deploy. In-site navigation is
unaffected (it fetches `/data/` JSON, not page HTML).

**Step 8 — ✅ DONE Oct 26.** In `analytics.svelte.ts`, behind the same three fences (hookerverse.com only, never Sam
signed in, never a device Sam has signed in on): `trackEvent('Contact sent', { reason })` from ContactModal on a
successful send, and `trackPageview('/privacy' | '/sources' | '/contact')` from `syncSurfaceAddress` when a pop-up
opens in-site (a replaced history entry is invisible to the script; a direct visit is still counted by the script's
own first view, never twice). `rememberArrival()` keeps the tab's first page and the referrer's HOSTNAME in
sessionStorage (every host, try/catch); the form sends them and `/api/contact` adds one line to the email —
"Arrived: from www.google.com, landing on /william-bristol-1779". Verified locally with `/api/contact` intercepted (no
email sent): arrival remembered across in-site clicks, both fields in the payload, Privacy opens at `/privacy` and
closes back to the card, no page errors. **Not verifiable by Code:** the two analytics calls themselves — the script
ignores headless browsers and fences out Sam; they will show in Vercel → Analytics (Events tab, and the /contact
etc. pages) once outside readers use them. **Sam's end-to-end check:** send one real test message from hooker-test
(sign out first, or use a private window) and look for the "Arrived:" line.
**Open, Sam's call:** the Privacy text says visits are counted anonymously; it does not yet say the contact form
includes the landing page and referring site. One sentence if wanted.

**The verification probe — ✅ BUILT Oct 26: `node scripts/probe-seo.mjs`** (default base hooker-test; `--base
https://hookerverse.com --launched` on launch day). Googlebot desktop AND smartphone; a storied page, a stub, a private
person, an old slug (one 301), a severed person (404, uncached), `/`, `/privacy`, `/contact`; the sitemap (incl. 15 random
URLs fetched — gate and sitemap agree); robots.txt; the host header. Proven red first (three deliberate breaks, each
caught), then **42/42** on localhost and hooker-test.
**Then** write the verification probe (§9 last paragraph: Googlebot desktop AND smartphone; rich page, stub,
renamed slug, hidden person, `/`, `/privacy`; red first), run Google's Rich Results Test and PageSpeed on three
pages, wait out the firewall's log week, and launch (§12).

### 0.3 Open items outside the build (from the Oct 24–26 session)

- **WHAT LAUNCH WAITS ON (Oct 26, 13:00 PDT; updated 23:30):** ~~(1) Google's answer on the Safe Browsing review~~
  ✅ cleared Oct 26 21:18 PDT (§0.2 step 0); (2) the firewall log read ~Nov 2 and the rules moved toward
  challenge/deny; (3) Sam's go. Then
  §12: narrow vercel.json's site-wide X-Robots-Tag to every host but hookerverse.com (plus a `/data/(.*)` noindex rule
  on every host), copy `docs/robots-launch.txt` over `static/robots.txt`, deploy, run `node scripts/probe-seo.mjs
  --base https://hookerverse.com --launched` (it must pass), submit `https://hookerverse.com/sitemap.xml` in Search
  Console and Bing, request indexing for a handful of the richest cards.
- **HIDDEN PEOPLE — ✅ DECIDED Oct 26, 12:55 PDT (Sam: "Leave the narrative blocks as they are").** The 1,402
  `classification.hidden` people (1,278 talcott_2026, 122 true, 2 leete_branch_2026 — all the hidden Talcotts and
  Pumpellys; Col. Matthew Talcott and Delphine Pumpelly Read are visible on purpose) have no page (404), no sitemap
  entry, no search-index row, no chip, no JSON-LD mention and no cross-connection — measured across all 29,025 payloads.
  Accepted: 56 narrative-block sentences on 46 visible, indexable cards name someone matching one of 27 hidden people
  (some only namesakes); once indexed, a search for such a name could surface the visible card, never an entry of
  their own. List: `_review/hidden-names-in-visible-stories.tsv` (untracked). Roadmap §65.5.

- **Vercel deployment retention** (Sam, dashboard → Project Settings → Deployment Retention, ~30 days): stored
  deployments were 55 GB on Oct 25 and grow ~0.5 GB per deploy (the 29k payloads). Cheap, but forever.
- **Cloudinary** (cloud `dc5clrqtw`, free plan): ✅ **lever pulled Oct 26** — the split was bandwidth 59% /
  transformations 22% / storage 20% (22.78 of 25 credits), so photos now go through Vercel's edge cache (§0.1,
  roadmap §64). Sam's aim: never need the ~$90/month tier unless the site takes off. **Open (Oct 26, 10:22 PDT):**
  the `--all` warm-up for the 3,267 non-notable portraits, run once Cloudinary's Plan Details shows ~21/25 or lower —
  likely Nov 2–4 (roadmap §64.5 has the trigger and why it waits); until then a non-notable portrait's first view is
  ~0.55 s. If **Strict Transformations** is ever
  turned on, the allowed list must carry `w_600,c_limit,q_auto,f_webp` (not f_auto), the RightColumn media thumbnail
  transforms, and the og transform once built. Tests stub `res.cloudinary.com` AND `/cld/` (memory
  stub-cloudinary-in-tests).
- **Vercel usage**: $0.30 of the month on Oct 25 (inside Pro's $20 credit) — not a concern until bots arrive; the
  firewall + edge cache are the protection.
- **iPad brightness** (Sam's 2025 iPad Pro, matte drawing film): discussed, nothing built. Sam to try Settings →
  Accessibility → Display & Text Size → Reduce White Point / Increase Contrast. Site-side options if wanted: darken
  the faint greys and light blues site-wide (BIRTH/DEATH labels, IDs, "(Age 19)", footer); optionally deepen the
  cream ground on tablets; respond to `prefers-contrast: more`.
- **Unconfirmed on Sam's devices**: one-tap bookmarks on iPhone/iPad (fixed Oct 24 by scoping the × hover reveal to
  `(hover: hover)`); the Safari CC fix (reproduced and fixed in WebKit; if a card ever fails to arrive again, ask what
  was clicked just before).
- **Behaviour change Sam may revisit**: Back while a pop-up is open now closes it AND steps to the previous card
  (3fe7a436). If he wants Back to only close it, do it without `history.back()` (that async traversal was the hazard).
- **Analytics hygiene**: Sam signs in once per device on hookerverse.com so each browser is flagged and never
  counted; he tests on hooker-test.vercel.app, which never loads the counter.
- `canonical.json` is 67.8 MB (GitHub warns over 50 MB) — known; memory canonical-size-options.
- The ENRICHED design doc was NOT updated Oct 24–26 (Sam did not ask); the frontend changes above are recorded here
  and in their code comments. The roadmap gained **§64** on Oct 26 (the photo edge cache, at Sam's request) and is
  now `ENRICHED_CODING_ROADMAP_FABLE_102626.md`.


---

## §1. WHAT WE ARE TRYING TO DO

Sam, October 24: *"I am not familysearch.com, this is not a comprehensive formal database, this is more of an
art project if anything, its about the UX and connections between people."*

So the goal is **not** to rank for every name in the tree. It is:

- **Be the best result for the people the tree actually tells a story about.** If someone searches William
  Bristol, the New Haven judge, the page with his narrative blocks should be the one they find. If they search
  Albert G. Bristol, who has dates and nothing else, losing that search to FamilySearch or Geneanet is fine —
  *"I have nothing to offer that person."*
- **Let exploration do the rest.** A reader who lands on a rich page and clicks a chip will reach Albert
  anyway. The stubs are reached through the tree, not through Google.
- **Never become a free data source.** The corpus is the value (§8).

**What a "conversion" is here.** Sam, Oct 24: *"the only thing I'm 'selling' is the UX itself but in a way that
they have to reach out to me."* Success is not traffic for its own sake; it is a reader who explores, is
impressed by the experience, and **gets in touch** — the contact form (roadmap §60.2). The path is bespoke on
purpose: the footer's About / Contact flies to **Sam's own card**, and the form opens from "Click here" in its
NB 3 (§5.8). So the contact path is part of SEO: a visitor who arrives
from Google on any card must be able to find it. (The phone footer shipped Oct 24–25: all four items in one row
under the family, on the floor of a short card — so the form is one tap from every page on every device.) **The
number to watch is messages received** (§10b), not visitors.

Realistic expectations, stated once so they are not rediscovered as disappointment: ranking is decided mostly
by *authority* (other respected sites linking here), which a new domain does not have. The famous names —
Thomas Hooker, Jonathan Edwards, Aaron Burr — are held by Wikipedia, Britannica and state historical sites,
and will be for a long time. The early wins are **the hard-to-find notables and the specific phrases only this
site has** — "Noadiah Hart Harwinton deacon", "William Bristol New Haven judge daughter Mississippi". Authority
for the big names comes later, from links (§10).

---

## §2. WHERE THINGS STAND — measured October 24, 2026, against the live site (✅ rows updated Oct 26)

| | |
|---|---|
| Live host | **hookerverse.com** (www redirects to it at Vercel's edge). Also served at **hooker-test.vercel.app** — see §4 |
| Hidden from search | `X-Robots-Tag: noindex, nofollow` on every response (`vercel.json`) **and** `Disallow: /` in `static/robots.txt` |
| Person pages | **29,025** (visible; the 1,264 Talcott-severed people have no page) |
| With ≥1 narrative block | **8,479** — every notable (1,273) is among them |
| With ≥3 blocks | 3,428 |
| Of the 8,479: blurb / photo | 4,545 / 3,571 |
| Of the 8,479: living, private dates | **172** — indexed like the rest (✅ §11.1) |
| Redirect map | 3,538 entries (`static/data/redirects.json`, built from `former_ids`) |

### What Google receives when it fetches a person page (curl as Googlebot, three rich cards)

**The part that is right, and is the hard part:** the page is server-rendered, so the HTML already contains

- the person's name as the page's one `<h1>`;
- **every narrative block — header AND body** (Thomas 7/7, Jonathan Edwards 7/7, Noadiah Hart 2/2), even the
  ones a visitor has to click open; **— CORRECTED Oct 26: this was FALSE when written.** The Oct 24 check searched
  the raw HTML, which includes SvelteKit's hydration data (a `<script>` of JSON); the page text itself held only the
  OPEN block's body, and a 7-block card lost its 7th block entirely (the server renders at an assumed 1440×900,
  where `stage.nbCap` is 6). Measured Oct 26 with scripts stripped: Dexter Ferry 1 of 7 bodies, 6 of 7 headers.
  **Fixed Oct 26** (`NarrativeBlocks.svelte`): a closed block keeps its body as `hidden` text, and blocks beyond the
  cap stay in the page `hidden` — now 7/7 in the server HTML and the rendered page, with zero visible pixels changed;
- every cross-connection sentence (Thomas 11/11, Edwards 10/10);
- **18–22 real `<a href>` links** to relatives, so a crawler can walk the tree.

Many JavaScript sites fail exactly here — content that only exists after scripts run, links that are click
handlers. This one does not, and it is the thing that would be expensive to change.

**Google indexes the phone version** (mobile-first indexing: its crawler fetches as a smartphone). Checked Oct 25:
the server sends the smartphone Googlebot the identical HTML (same bytes, same 22 links, same `<h1>`) — the
phone layout is decided in the browser, so nothing a phone collapses is missing from what Google reads.

**What is missing or weak:**

| | today | consequence |
|---|---|---|
| `<title>` | ✅ `"<chip name> (<years>) - The Descendants of Rev. Thomas Hooker"` (Oct 24; years Oct 26) | shared titles 2,168 → 8 — §5.1 |
| meta description | none | Google writes its own snippet, often from the relatives list |
| canonical link | ✅ every person page, `/`, and the pop-up addresses (Oct 26) | §4, §5.3 |
| link-preview tags (`og:`) | none | a shared link unfurls as a bare URL |
| structured data (JSON-LD) | none | Google can't tell this is a person with dates, parents and a spouse |
| sitemap | **none** | **and the home page has zero links** (it is the intro), so Google has no way in — §6 |
| image alt text | Thomas 6/36, Edwards 12/42, Noadiah 0/30 | invisible to Google Images, where historical portraits are found |
| Privacy / Sources | ✅ real addresses `/privacy`, `/sources` (Oct 26) | §5.8 |
| About / Contact | ✅ real links: About → `/samuel-hooker`, Contact → `/contact` (Oct 26) | §5.8 |
| side doors | ✅ `/dev/*`, `/table`, `/institution/*` 404 in production (Oct 26) | §6.4 |
| speed | 386–554 ms per page, `max-age=0`, `x-vercel-cache: MISS` | every page is built per request by a server function — §7 |
| page weight | 117–236 KB of HTML, 22 script modules | acceptable; to be checked with PageSpeed at launch |

---

## §3. URLS AND REDIRECTS — ✅ start from today's URLs (Sam, Oct 24)

**How Google treats a changed URL.** A permanent (301) redirect is the designed way to move a page: Google
transfers the old address's standing to the new one, typically within days to weeks, and does **not** penalise
the site. What costs standing is an indexed address that starts returning "not found", or a chain of
redirects (A → B → C). Changing the URL *pattern* for every page at once is the one move to avoid, and that
was done before anything was public (`/person/x` → `/x`, October 2).

**Slugs will keep changing** — a birth year found moves `albert-bristol` to `albert-bristol-1808` — and that is
fine for as long as every change leaves a single-hop 301 behind it. The machinery exists and is verified on the
live site: `former_ids` → `redirects.json` → `src/lib/data/redirects.ts`, payload-first, chains collapsed to
one hop (curled Oct 24: `/albert-bristol` → 301 → `/albert-bristol-1808`).

**✅ The launch baseline.** Nothing outside has ever seen a pre-launch URL (the site has been `noindex` since
its first deploy), so **today's URLs are the starting point**, and the 3,538 existing redirects matter to no
one outside. They also cost nothing: the map is read only when a request misses. They stay as they are. The
one place they could cost something is §7: if pages are pre-built, each redirect becomes a tiny file, and at
that point the pre-launch ones can stop being *emitted* (their `former_ids` stay in canonical — no data is
removed).

**Rules for the life of the site:**

1. Every slug change appends the old slug to the person's top-level `former_ids` (already the Stream A habit;
   `batch.py` shows the new slug).
2. Never 404 an address that was ever indexed — a removed person redirects to a relative or the line, never to
   nothing. (Deleting a person after launch becomes a decision with a URL attached.)
3. The sitemap lists only current URLs; the canonical tag always names the current URL.
4. One hop, always. The resolver already guarantees it.

---

## §4. ONE SITE — ✅ hookerverse.com only (Sam, Oct 24)

Sam: *"I only want one site up."* Today the same deployment answers at **hookerverse.com** and at
**hooker-test.vercel.app**, plus a long unique address for every deploy (`hooker-test-xxxx-….vercel.app`).
Two indexable copies would split every page's standing in half.

**The plan — not deleting the Vercel project**, because hookerverse.com is a domain *on* that project:

1. **`hooker-test.vercel.app` stays up, as Sam's testing host — and is `noindex` forever** (✅ Sam, Oct 25,
   replacing the Oct 24 plan to 301 it to hookerverse.com). Every deploy updates both hosts at once — they are two
   addresses for one build — so Sam does his bug-hunting clicking on hooker-test and hookerverse.com's analytics
   count outside readers only (§10a). The host-scoped `X-Robots-Tag: noindex, nofollow` rule for it is already in
   `vercel.json` (Oct 25), separate from today's site-wide one, so lifting the site-wide header at launch leaves
   it in place. Not a secret: anyone with the address can open it; Google just never lists it. Its `robots.txt`
   must NOT disallow crawling — a crawler has to fetch a page to read its `noindex`.
2. **Per-deploy addresses keep `noindex` forever.** At launch the `X-Robots-Tag` header is lifted for
   `hookerverse.com` only, never globally.
3. **Every page carries `<link rel="canonical" href="https://hookerverse.com/<slug>">`** — on hooker-test too, so
   anything Google does see there points home.
4. Sign-in: Google and Microsoft OAuth are registered for both origins, and both keep working.

---

## §5. WHAT EACH PAGE TELLS GOOGLE

### 5.1 Title

**✅ BUILT Oct 26 (Sam: "its ok to add years to title").** Measured on the 8,479 gated pages: titles shared by more
than one page went from 2,168 to 8 — living namesakes (no years by design) and two Elizabeth Dwights, both 1831–1870.

`<chip name> (<years>) - The Descendants of Rev. Thomas Hooker` — e.g. **Thomas Hooker (1586–1647) - The
Descendants of Rev. Thomas Hooker**. The years break the 2,168 duplicate titles, and they are what a searcher
types to tell two Mary Hookers apart. Rules: no years for living, private-date people; a single year where only
one is known (`b. 1808`); the person's name stays first, because the first words of a title carry the most
weight and the first ~55 characters are all Google shows.

### 5.2 Description (the grey line under a Google result)

Built from what the card already says, in this order, trimmed to ~155 characters:
**blurb** (4,545 of the 8,479 have one) **→ the first narrative block's first sentence → a factual fallback**
("Son of William Bristol and Sarah Edwards; born New Haven 1808"). Never invented prose; never a source name;
the same no-fourth-wall and no-dollar rules as the card.

### 5.3 Canonical

Every page names `https://hookerverse.com/<current slug>` (§4).

### 5.4 Structured data — schema.org `Person`, as JSON-LD

On every indexable page: `name`, `birthDate` / `deathDate` (at the precision the record has), `birthPlace` /
`deathPlace`, `parent`, `spouse`, `children` (as names + their URLs), `image`, `description`, and `sameAs` →
the notable URL (Wikipedia etc.) when there is one. This is the textbook use of structured data and the main
way a page becomes eligible for Google's richer person results. **Only what the card already shows** — never
research fields (§8).

### 5.5 Link previews (`og:` and `twitter:` tags)

Title, description, and the portrait (through the Cloudinary transform, ~1200×630 crop) for the 3,571 indexable
people with a photo; a site image for the rest — **which has to be made**: the intro painting with the gilt title,
baked once at 1200×630 by the existing intro bake (`scripts/intro/`). This is what makes a link shared by email or text unfurl as a
card. Design §8 also proposed *designed* preview images for notables (portrait, name, years, "Descendant of
Thomas Hooker · Generation N") — a later, optional step.

### 5.6 Image alt text

Every portrait gets `alt="<display name>"` (chips included); media rows get their title. Cheap, and it opens
Google Images.

### 5.7 The home page — ✅ the intro stays as it is (Sam, Oct 24)

Sam: *"I intentionally kept the intro light on description… it all speaks for itself."* Nothing visible
changes. `/` gets the invisible tags only — a title, one sentence of description, a preview image, and a
`WebSite` JSON-LD block — **and one real link to Thomas Hooker's page in the HTML** so a crawler that arrives
at `/` can enter the tree (it can sit inside the intro's existing Enter control; what matters is that it is an
`<a href>`). **No hidden text**: text a visitor cannot see but Google can is against Google's rules and is
penalised. The home page will not rank for much on its own; the person pages carry the site.

### 5.8 About, Contact, Sources, Privacy — keep the charm, give each an address (✅ Sam, Oct 25)

**✅ BUILT Oct 26.** `src/lib/surfaces.ts` defines the three pop-ups with addresses; the `[slug]` route loads the host
card for them (Rev. Thomas behind `/privacy` and `/sources` — Sam, Oct 26: "thomas is good" — and Sam's card behind
`/contact`), and the page renders the pop-up open from the request's own data (the modal store is module state,
shared by every request on the server, so it is never set there). In the app the address bar follows the pop-up
by REPLACING the current history entry (open → `/privacy`, close → the card's address), and a modified click
opens a real tab. The footer items and the NB 3 "here" are real `<a href>`s; the contact email reports the card
behind the form, not `/contact`.

**Revised the same day (3fe7a436), after Sam's Safari report — see §13, Oct 26.** The first version PUSHED a history
entry on open and gave it back with `history.back()` on close, and `navigate.ts`'s Safari early-exit compared raw
addresses, so a CC-style flight started at `/sources` (every author link) read the close as a Back and abandoned the
arrival. Now: replace, never push; and every "has the reader moved?" check reads `readerAddress()`, which treats a
pop-up's address as the card under it. Cost, named: Back while a pop-up is open closes it AND steps to the previous
card. Side effect found in the final review: replaced entries are not counted by analytics (§0.2 step 8).

The site is bespoke, and two of these four are deliberately not pages. Sam, Oct 25: *"about is really just my
entry… the contact page is a link in one of my NBs. its cute, cuteness doesn't work with analytics and Google's
process very well."* The rule that reconciles them: **the experience stays exactly as it is; underneath, every
surface gets a real address**, so Google can read it and analytics can count it.

| | what a reader gets (unchanged) | what changes underneath |
|---|---|---|
| **About** | the footer's About / Contact flies to **Sam's own card**, `/samuel-hooker` (HD3386 — blurb "Developer and compiler of this family history", NB 1 "Why build this project?", NB 2 "How are you connected to the founders?") | the footer item becomes `<a href="/samuel-hooker">`, and a click still runs the flight (the person chips already work this way). Sam's card **is** the about page: it is gated in (3 blocks), and the home page's `WebSite` JSON-LD names him as its `author` with that URL — how Google learns the site has a real compiler behind it |
| **Contact** | "Click here" in Sam's NB 3 opens the contact form over his card | the link becomes `<a href="/contact">`; in the app it opens the modal as now and re-addresses the entry to `/contact` (counted as a pageview once §0.2 step 8's `pageview()` call is in — replaced entries are not tracked on their own). A direct load of `/contact` (a link in an email signature, a Find a Grave bio) renders Sam's card with the form open. `/contact` itself is `noindex` — it is a form, not content |
| **Sources** | the footer opens the Sources modal | `/sources` is a real server-rendered page with the same text; in the app, the modal and a shallow URL change |
| **Privacy** | the footer opens the Privacy modal | `/privacy` the same way — and that address goes into Google's and Microsoft's sign-in consent screens |

Each real page gets a title, description and canonical; `/sources` and `/privacy` are in the sitemap.

## §6. WHO GETS INDEXED, AND HOW GOOGLE FINDS THEM

### 6.1 The richness gate — ✅ at least one narrative block (Sam, Oct 24)

**Indexable = the person has ≥1 narrative block.** 8,479 pages today; every notable already qualifies.
✅ **All of them, living people included** (Sam, Oct 24: *"i want those 8,479 all to be crawled"*). The 172
presumed-living people among them keep their private dates exactly as the card does — no years in the title
(§5.1), none in the JSON-LD (§5.4).

Every other page gets `<meta name="robots" content="noindex, follow">`: not indexed, links followed. **Do not
lean on the "follow" half**: Google has said that a page left `noindex` for a long time is eventually treated
as `nofollow` as well. That costs nothing here, because Google does not need the stubs to find anything — the
sitemap (§6.2) lists every indexable page directly, and indexable pages already link to each other (parents,
children, cross-connections). The stubs are found by *readers*, through the tree, which is the model Sam
described. Pages graduate automatically — the build reads the gate, so the day a stub gets its first block it
joins the sitemap with no other step.

**The gate is `noindex`, never `Disallow`.** Google must be *allowed* to fetch a page to see its `noindex`; a
page blocked in robots.txt can still appear in results as a bare, description-less link (DEPLOYMENT §7.2).

### 6.2 The sitemap

`regenerate-data.js` writes `sitemap.xml` from the gated set — current slugs only (Sam's card among them), plus
`/`, `/sources`, `/privacy` — with `lastmod` from the record's `last_updated` **only where it is trustworthy** (Google
ignores a sitemap's dates for good once they prove inaccurate; no date beats a wrong one). 8,479 URLs fits one file (the limit is 50,000). Submitted in Google
Search Console at launch and named in robots.txt.

### 6.3 robots.txt — two policies in one file

- **Search engines** (Googlebot, Bingbot, …): allowed everywhere **except `/data/` and `/api/`**. Crawlers
  need the pages, never the data files — the pages are server-rendered, so nothing is lost (§8).
- **AI training crawlers** (GPTBot, ClaudeBot, CCBot, Google-Extended, …): `Disallow: /`.
- **AI search crawlers** (OAI-SearchBot, PerplexityBot, Claude-SearchBot): **allowed** — a cited link in an
  AI answer is a visitor (✅ §11.2).
- **User-triggered fetchers** (ChatGPT-User, Claude-User — a person asked an assistant to read a page): never
  blocked; that is a visitor.

robots.txt is a request, not a lock. Compliant crawlers obey it; scrapers do not, which is what §8 is for.

### 6.4 Side doors — everything on the domain that is not a card (found Oct 25; ✅ CLOSED Oct 26)

**Done Oct 26:** a production build answers 404 on all of them (a `load` that throws when `!dev` —
`src/routes/dev/+layout.ts`, `src/routes/table/+page.ts`, `src/routes/institution/[slug]/+page.ts`); every one
still works under `npm run dev`. Verified on a local production preview before deploying. As found:

Google judges a site partly by *all* of it, and thin or test pages count against it. Today these answer 200 on
hookerverse.com:

- **`/dev/intro-gl`, `/dev/intro-sweep`, `/dev/intro-title`, `/dev/tweened-count`** — development test pages. →
  **404 in production** (they stay for `npm run dev`). No decision needed; they are tools.
- **`/institution/<anything>`** — a placeholder whose whole page is `<h1>Sam</h1>`, for any slug. → **404** until
  institution pages are a real feature (§11.8).
- **`/table`** — the Zoom 2 hand-panned table prototype. Unlinked, but public, and it loads the 6 MB
  `table-index.json` (§8.1). → §11.8.

---

## §7. SPEED AND COST — cache or pre-build

Today every person page is rendered by a server function on every request (DEPLOYMENT §3 "Option B"):
386–554 ms measured, never cached. Two problems once Google arrives: page speed is a ranking signal, and a
crawl of 8,000+ pages becomes 8,000+ function runs (DEPLOYMENT §11.0: cost must scale with what Sam writes,
not with how many machines read it).

| | how | for | against |
|---|---|---|---|
| **A. Edge cache** | `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` on person pages | one header; redirects keep working exactly as now; every deploy refreshes | the first request per page per hour still runs the function |
| **B. Pre-build** (prerender) | every page built as a static file at deploy | fastest; no function at all for readers or bots | build time (measure at 29k pages); redirects must become stub files (§3); the 1,264 hidden must 404 cleanly |

**Recommendation: A first, at launch** — it is one header, it removes the cost and speed problem for any page
fetched twice, and it touches nothing that works. B stays the long-term target from DEPLOYMENT §3 and can follow
once the build time is measured. **The static contract still holds either way**: no person page may read the
session (`scripts/probe-static-contract.mjs`), which is exactly what makes caching safe — every reader gets the
same page.

---

## §8. PROTECTING THE CORPUS — ✅ a walled garden (Sam, Oct 24)

Sam: *"I 100% need to keep my JSON private. that's the gold mine… users only see the data in the UX that I
build, never raw anywhere on the web."*

### 8.1 What was exposed (measured on hookerverse.com Oct 24–25; the last row records what was fixed Oct 25–26)

| | live | contents |
|---|---|---|
| `canonical.json` | **404 — not served** ✅ | the master file, research notes, sources: never leaves the build |
| `/data/person/<slug>.json` | 200, ~25 KB each | one person's card — already stripped to the fields the card shows (`clientStrip.js`, Oct 9) |
| **`/data/search-index.json`** | **200, 9.7 MB** | **every person in one file**: names, years, blurbs, places, careers, schools, tags, and every cross-connection sentence |
| `/data/redirects.json` | 200, 150 KB | old slug → new slug |
| **`/data/cemeteries.json`** | **200, 627 KB — and the app never reads it** (found Oct 25) | every cemetery with GPS, street address, notes and its full roster of Hooker people — a research file the build writes into the public folder |
| **`/data/institutions.json`** | **200, 207 KB — never read by the app** | every school and firm with its `hooker_connected_people` roster |
| **`/data/table-index.json`** | 200, **6 MB** — read only by the `/table` prototype | every person's name, years and descent flags |
| `/data/stats.json` | 200, 66 B — read only by a `/dev` page | corpus counts |
| **living people's private dates** (found Oct 25) | in `search-index.json` (497 birth years), the payloads and so the page HTML (261 full birthdays), and every seat's `t.y` | **✅ STRIPPED Oct 25 (cbf7206e)** — see §0.1. The four files above: **✅ no longer published (Oct 26, acbce375)** |

### 8.2 The honest limit

A website cannot be a perfect walled garden: whatever a visitor's browser displays, a determined person can
save. The person files exist because the browser needs them to draw the card. The aim is therefore **to make
bulk harvesting slow, visible and expensive**, while a reader never notices.

### 8.3 The measures, cheapest first

0. **Stop publishing what the app never reads** (Oct 25; ✅ DONE Oct 26 — `WLocal` in `regenerate-data.js`: a Vercel
   build, `VERCEL=1`, neither writes `cemeteries.json`, `institutions.json`, `table-index.json` nor `stats.json`
   nor leaves a stale copy; Sam's machine still gets all four, for `/table`, `/dev`, `probe-camera.mjs` and
   `batch.py`). They had been written by `regenerate-data.js` into `static/data/` and so served to anyone, though no
   page reachable by a reader fetches them; `table-index.json` went with `/table` (§11.8). Nothing is deleted from
   canonical — the files simply stop being published. The cheapest measure on the list, and the largest exposure
   after `search-index.json`.
0b. **Living people's private dates out of every download** (✅ DONE Oct 25, cbf7206e — §0.1). Found during Sam's Oct 25
   "look for other data leaks" request: the card hid them, the data did not.
1. **`/data/` is closed to crawlers** — `Disallow: /data/` and the `noindex` header stay on it permanently.
   Costs SEO nothing.
2. **Firewall rate limit on `/data/`** (Vercel WAF, DEPLOYMENT §9): a reader fetches a handful of person files a
   minute; a scraper fetches thousands. Staged as DEPLOYMENT §9.4 requires — log, observe, then challenge, then
   deny — and live **before** robots.txt opens (DEPLOYMENT §9.7).
3. **`search-index.json` is the one-download copy of the tree, and the biggest single exposure.** Options, in
   §11.3: rate-limit it hardest and leave it whole; trim what it carries (the cross-connection sentences and
   fact fields are the most valuable part); or split it so no single file is the corpus. Each changes how
   search works, so it is Sam's call.
4. **Referrer check on `/data/`** — a real page load sends the site as referrer; a script usually does not.
   Weak alone (it can be faked), useful as a firewall condition alongside the rate limit.
5. **Geography — ✅ fence it (Sam, Oct 24).** *"my site does not hold much value for a chinese citizen or
   really most countries. its geographically specific to north america and maybe western europe… so we can
   safely prevent the riskiest countries from trolling and spamming with bots."* This settles DEPLOYMENT
   §16-H. Site-wide, not only `/data/`:
   - **Deny**: China, Russia, Vietnam, Singapore, North Korea, Iran — the sources DEPLOYMENT §9.6 and its
     source article name as the bulk of scraping and attack traffic (Singapore as a datacenter hub, not for
     its readers). Sam may add or remove countries; the list is one firewall rule.
   - **Challenge** (an invisible browser check a person passes without noticing): every country outside North
     America, Western Europe, the UK and Ireland, Australia and New Zealand. Descendants and researchers abroad
     still get in; the challenge solve rate (DEPLOYMENT §9.4: ~0.2% = catching bots, ~30% = taxing people)
     says whether the rule is right.
   - **Allow** without a check: the US, Canada, Western Europe, UK, Ireland, Australia, New Zealand.
   - **Search engines are unaffected**: Googlebot and Bingbot crawl from US addresses, and Vercel's bot
     protection exempts verified crawlers.
   - **Staged as always**: `log` for a week to see what each rule would catch, then `challenge`, then `deny`
     for the deny list — never straight to deny (DEPLOYMENT §9.4). VPNs get around any country rule, which is
     why the rate limit (item 2) stays the main defence and geography is the cheap first filter.

**What indexing itself publishes:** an indexed page's visible text — its narrative blocks — becomes searchable on
Google. That is the point of indexing and is only what a visitor already sees. JSON-LD (§5.4) carries only
card-visible facts. Nothing from research notes, sources or canonical is ever placed in a page.

---

## §9. THE BUILD — in order, each step verifiable on its own

All of it happens while the site is still `noindex`, so nothing here is public until §12. **The two items with a
clock on them go first** (reordered Oct 25): the firewall needs a week of `log` data before launch, and the
search-console verifications take a DNS change that can sit for days. Both run in the background while the code
steps are built.

0. **Start the clocks.** ✅ Done Oct 26 (§0.1, §0.2). Firewall log review ~Nov 2.
   - **The firewall** (§8.3): the `/data/` rate limit, a page-request rate limit, and the country rules, in `log` mode.
   - **Google Search Console** — a *Domain* property for hookerverse.com, verified by a DNS TXT record (covers
     www and every path). Verifying does not index anything; it just opens the instrument.
   - **Bing Webmaster Tools** — imported from Search Console in one step. Bing's index also feeds DuckDuckGo and
     Yahoo and is one of the sources behind ChatGPT's search, so it is not a small second engine.
1. ✅ **One indexable site** (§4): canonical tags — Oct 26 (hooker-test's own `noindex` rule is already in `vercel.json`).
   ✅ **Side doors closed** (§6.4) and ✅ **unread data files no longer published** (§8.3 item 0) — Oct 26.
2. **Head tags** (§5.1–5.6): ✅ title with years (Oct 26); still to do: description, `og:` (and the site preview image), alt text,
   JSON-LD — in `src/routes/[slug]/+page.svelte`, computed from data the payload already carries. A field missing
   from the payload is added in `regenerate-data.js`, never fetched at runtime.
3. **The gate** (§6.1): the `noindex, follow` tag on non-gated pages, decided in one shared predicate that the
   sitemap reads too, so the two can never disagree.
4. ✅ **About, Contact, Sources, Privacy addresses** (§5.8) — Oct 26: the two footer links and the NB link become real
   `<a href>`s with the same in-app behaviour; `/sources`, `/privacy`, `/contact` exist as server-rendered pages.
5. **Sitemap** (§6.2) and **robots.txt** (§6.3), the latter drafted but not yet live.
6. **Home page** (§5.7): invisible tags and the one real link.
7. **Edge cache** (§7 option A), verified with `x-vercel-cache: HIT` on a second fetch.
8. **The contact count** (§10b): one custom analytics event when a message is sent, and the visit's referrer and
   landing page added to the email itself.

**Verification, proven red first as the house rule requires** — a probe that fetches as Googlebot (desktop AND
smartphone), for one rich page, one stub, one renamed slug, one hidden person, `/`, `/privacy` and `/contact` (must be noindex), and asserts: title, description, canonical, robots
meta (index vs noindex by the gate), JSON-LD parses, the 301, the 404, no `/data/` URL in any sitemap. Then
Google's own **Rich Results Test** and **PageSpeed Insights** on three pages, by eye.

---

## §10. AFTER LAUNCH — what to watch, and how authority is earned

**Google Search Console** is the instrument; verify hookerverse.com in it before launch. Weekly for the first
months:

- **Pages → Indexed vs Not indexed.** Expect ~8,500 indexed over weeks, not days. "Crawled — currently not
  indexed" on rich pages is the signal to read.
- **Performance → Queries.** Which names and phrases bring readers. This is also the best enrichment worklist
  the project will ever have (roadmap §4: "let observed traffic and GSC queries steer the worklist").
- **Core Web Vitals.** Real-user speed.
- **Vercel Firewall observability** for the `/data/` rules (DEPLOYMENT §13.3).

### 10a. Readers — Vercel Web Analytics (✅ Sam, Oct 25; live Oct 25)

Cookieless and first-party: the script and its beacons come from hookerverse.com's own `/_vercel/insights/`, so
there is no consent banner and no Google tag. Built in `src/lib/state/analytics.svelte.ts`, which counts **outside
readers only**: it loads on hookerverse.com alone (never hooker-test, localhost or a deploy address); it sends
nothing while Sam's account is signed in (matched by the SHA-256 of the email, so the address never ships); and
once Sam has signed in on a device, that browser is flagged (`localStorage hv-owner`) and stays uncounted after
sign-out. The first pageview waits for the session to resolve. Every person-to-person tap is a pageview (shallow
routing is a `pushState`, which the script tracks). Headless browsers are ignored by the script itself.

**What it records, per pageview:** the page; a daily-rotating anonymous visitor hash (so *visitors* as well as
*views*, but no visitor can be followed across days); country; device type, OS and browser; any `utm_` tags on the
link; and, **on the first page of a visit only, the referring site's hostname** — `google.com`, `wikipedia.org`,
`facebook.com`, `findagrave.com`. Hostname only: never the full referring URL.

**What it cannot record:**
- **Search terms.** Google stopped passing them to sites years ago; every analytics tool sees `google.com` and no
  more. The words people typed live only in **Search Console → Performance → Queries** (§10) — totals per query
  and per page, never tied to a visitor. Bing Webmaster Tools gives the same for Bing.
- **One reader's path** through the tree. Only totals per page.
- **Clicks that are not page changes** (opening a narrative block, the deck, search) — unless a custom event is
  added for them. None is planned except the one below.

### 10b. The number that matters — messages received

Sam is not selling traffic; success is a reader who gets in touch (§1). The path is short and every step will be
countable once §0.2 step 8 is built (§5.8's addresses exist since Oct 26): **a card → Sam's card** (a pageview of `/samuel-hooker`) **→ the form**
(a pageview of `/contact`) **→ sent** (a custom event, `Contact sent` — the project is on Vercel's **Pro plan**,
which includes custom events). Sam's own visits are not counted, by the same three fences.

**And the message itself says where the writer came from.** The form already sends the page it was opened on
(`/api/contact`, the `page` field). It will also send the visit's **landing page and referrer** — remembered for
the tab from the first page of the visit — so each email in Sam's inbox reads "arrived from google.com on William
Bristol's card". Not analytics: just context on a message the visitor chose to send.

### 10c. The weekly read

Search Console (what people searched, what is indexed), Vercel Analytics (who came, from where, to which pages),
and the contact count. The three answer different questions and do not need joining.

**Trust signals — ✅ the site-wide apparatus is the plan (Sam, Oct 24).** The footer's Sources modal (the
family genealogies and archives the tree is built from), Privacy, and About / Contact, on HTTPS, are what a
reader or a search engine checks for method. **Per-person citations are not planned**: the `sources` field
exists in canonical but is mostly unused and cannot be retrofitted across 29,000 people — *"no way i can go back
in time and add sources to each entry."* If a person-level sources affordance is ever built (design §9), it
renders only where sources exist.

**Authority — the slow half.** A new domain earns standing through links from sites Google already trusts. The
natural ones for this project: the Connecticut Historical Society, NEHGS and town historical societies, Find a
Grave memorials (a link in a memorial's bio), WikiTree profiles, and Wikipedia external links on the notables
(those links pass no ranking value directly but bring readers, and readers bring links). None of this is code;
it is outreach, and it is what eventually moves the famous names.

---

## §11. OPEN DECISIONS — Sam's

| # | decision | recommendation |
|---|---|---|
| ~~**11.1**~~ | ~~The 172 living people with narrative blocks: indexable or not?~~ | **✅ CLOSED Oct 24 — indexed, all 8,479** (Sam). Private dates stay private in titles and JSON-LD (§6.1) |
| ~~**11.1b**~~ | ~~Geography (DEPLOYMENT §16-H)~~ | **✅ CLOSED Oct 24 — deny the high-abuse countries, challenge outside North America / Western Europe / UK / Australia / NZ, staged log → challenge → deny** (§8.3 item 5) |
| ~~**11.2**~~ | ~~AI search crawlers~~ | **✅ CLOSED Oct 24 — allow the AI search crawlers (OAI-SearchBot, PerplexityBot, Claude-SearchBot); block the training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended); never block user-triggered fetchers.** A cited link in an AI answer is a visitor. Re-check after ~2 months in Search Console / referrer logs; blocking is one robots.txt line. (Google's AI Overviews draw on the ordinary Google index, so they follow from being indexed, whatever robots.txt says about AI bots.) |
| ~~**11.3**~~ | ~~`search-index.json`~~ | **✅ CLOSED Oct 24 — rate-limit it first and measure;** trim or split only if the logs show it being taken |
| ~~**11.4**~~ | ~~Cache or pre-build~~ | **✅ CLOSED Oct 24 — edge cache at launch;** pre-build later, after measuring build time |
| ~~**11.5**~~ | ~~Description fallback~~ | **✅ CLOSED Oct 24 — first sentence of block 1** where there is no blurb |
| ~~**11.7**~~ | ~~About / Sources / Privacy as real pages~~ | **✅ CLOSED Oct 25 — every surface gets an address, the experience is unchanged** (§5.8): About stays Sam's card (now a real link), Contact stays the NB link (now `/contact`), Sources and Privacy become pages that the app still opens as modals |
| ~~**11.8**~~ | ~~`/table` and `/institution/…`~~ | **✅ CLOSED Oct 25 (Sam), built Oct 26 — 404 in production until each is a real feature**, `table-index.json` no longer published. Both stay in the code and in `npm run dev`; nothing is deleted |
| **11.6** | **Launch date** — when robots.txt opens | After §9 is complete and verified, the firewall has run in `log` mode for a week, and DEPLOYMENT §15's checklist is ticked |

---

## §12. LAUNCH DAY — the one-way part

What is irreversible is small: **once a URL is public it is linkable forever**, so redirects are permanent
(§3), and Google's first impression of the site takes months to revise if it is poor (which the gate exists to
prevent). Everything else — tags, gate, sitemap, robots rules — can be changed the next day.

In order:

1. DEPLOYMENT §15 checklist ticked (firewall live and observed, spend limit $50, Cloudinary transforms, privacy).
2. Lift `X-Robots-Tag` **for hookerverse.com only**; publish the two-policy robots.txt. Mechanically, in
   `vercel.json`: the site-wide rule gains `"missing": [{ "type": "host", "value": "hookerverse.com" }]`, so every
   other host — hooker-test and every per-deploy address — keeps `noindex`; hooker-test also keeps its own rule;
   and a `/data/(.*)` rule keeps `noindex` on the data files on every host, permanently (§8.3 item 1).
3. Submit the sitemap in Search Console and Bing (both verified back in §9 step 0); inspect three URLs (one rich,
   one stub, `/`) and request indexing for a handful of the richest pages.
4. Fetch-as-Googlebot probe green against production.

**Rolling back**, if something is badly wrong: put the `noindex` header back and redeploy. Google drops pages
from results as it re-crawls them (days to weeks); Search Console's removal tool hides a URL within a day.
Nothing about launch locks the project in.

---

## §13. SESSION RECORD — the discussion behind the decisions (Oct 24–26, 2026)

In the order it happened, with Sam's words where they set a rule. Times are Pacific. Code-level detail is in §0.1
and the commits; this is the *why*.

### Oct 24 (Sat)

- **Scope set.** Sam: Stream B is "feature complete outside SEO"; SEO is "the most important part of this chat".
  Before SEO: tab titles, favicon, scrollbar, search, small data fixes.
- **Titles.** `"<chip name> - The Descendants of Rev. Thomas Hooker"`; Sam on Thomas's: *"Rev. Thomas Hooker - The
  Descendants of Rev. Thomas Hooker is perfect."* (`SITE_TITLE` in `src/lib/site.ts`.)
- **Favicon** = the H of the embossed HOOKER from the intro, transparent, deeper gold then "a little lighter"
  (`scripts/intro/favicon.py`).
- **Search**: a lone letter ranks names starting with it, notables first; nameless + dateless rows sink; the
  placeholder count shows the corpus minus 5,000 (Sam's request).
- **SEO discussion → §1–§12 written.** Sam's five answers, each now a ✅ in this doc:
  1. URLs — *"can't we just start with the current url"* (§3);
  2. *"i only want one site up"* (§4);
  3. index only the storied pages — *"I am not familysearch.com… this is more of an art project"*; all 8,479 with
     ≥1 block, living included — *"i want those 8,479 all to be crawled"* (§6.1, §11.1);
  4. the intro stays minimal — *"it all speaks for itself"* (§5.7);
  5. the walled garden — *"i 100% need to keep my JSON private. that's the gold mine… users only see the data in
     the UX that I build, never raw anywhere on the web"* (§8).
  Also: geography fenced (*"we can safely prevent the riskiest countries from trolling and spamming with bots"*,
  §8.3 item 5); AI search crawlers allowed, training crawlers blocked, after Sam pasted an AI Overview and a video
  transcript and asked what being open to AI bots buys (§11.2); trust signals = the site-wide Sources / Privacy /
  About, not per-person citations (*"no way i can go back in time and add sources to each entry"*, §10); the
  conversion is contact — *"the only thing I'm 'selling' is the UX itself but in a way that they have to reach out
  to me"* (§1).
- **Phone footer**: all four items in one right-aligned row, a fixed gap under the last chip; Privacy shown to
  everyone (Sam asked whether signed-in-only hurt — yes: the contact form collects email signed out, and a privacy
  statement is expected to be conspicuous).

### Oct 25 (Sun)

- **Mobile**: intro arrow ≥64px tap target on touch; bookmarks needed a double tap on iPhone/iPad — iOS turned the
  first tap into a hover because the × faded in on `:hover`; scoped to `(hover: hover)`.
- **Analytics.** Sam: *"how many people are using the site and importantly are NOT ME"*. Chose **Vercel Web
  Analytics** over Google Analytics (cookieless, first-party, no consent banner, no Google tag; GA4's "exclude my
  visits" is IP-based and fails on phones). Sam: *"maybe I can start exclusively using hooker-test.vercel.app"* →
  hooker-test became his testing host, permanently `noindex`, never loads the counter (this REPLACED §4's Oct 24 plan
  to 301 it away). Sam's login email excluded by hash. Sam asked whether Vercel gets search terms (no tool does since
  Google stopped passing them — Search Console has them) and referrers (yes, hostname only, first page of a visit)
  — §10a.
- **iPad brightness** (Sam's 2025 iPad Pro + matte drawing film: *"the background is so bright it overwhelms the
  content"*): discussed only — veiling glare from the film over a near-white ground; Sam to try Reduce White Point
  first (§0.3).
- **Second review of this plan** (Sam: *"cuteness doesn't work with analytics and Google's process very well"*):
  About is Sam's own card, Contact is a link in his NB 3 — kept, but every surface gets a real address (§5.8,
  §11.7). Same review found the side doors (§6.4) and the unread data files (§8.1).
- **Costs and leaks** (Sam forwarded Cloudinary's *"nearly reached your monthly credits"* email: *"i want to keep my
  costs down"*): Vercel was $0.30 for the month; Cloudinary is the cost (a hub landing preloads ~98 photos);
  stored deployments 55 GB. Leak audit found **living people's hidden dates in the public data** (653 people; Sam's
  own birthday among them). Sam: *"yes that was my first thought Birth order of living but 2 and 3 are important too"*
  → stripped, with replacements for birth order, search ranking and card wear (cbf7206e). Sam: *"I'm San Francisco
  CA for birth that's fine to show"* (HD3386 birthplace added, 67691fbe).

### Oct 26 (Mon)

- **Cleanup shipped** (Sam: *"lets proceed clean up"*): side doors 404, four data files local-only (acbce375).
- **Phone**: the shuffle button reads "Notables" after the icon (Sam's request). **Canonical tags** shipped.
- **Privacy URL.** Sam noticed the address stayed on the card with Privacy open — *"doesn't SEO require that?"* —
  yes; built §5.8. Sam on the direct-visit card: *"thomas is good"* (Rev. Thomas behind /privacy and /sources).
- **Years in titles** — Sam: *"i think its ok to add years to title"* (2,168 shared titles → 8). **Privacy wording**
  now says visits are counted anonymously without cookies (Sam: yes). **Sources** authors lightly underlined.
- **Safari bug.** Sam (screenshot on William Ketchum): *"the previous card exits but the new one never enters…
  doesn't happen every time"*. Reproduced deterministically in WebKit: every Sources author link. Cause and fix in
  §5.8's revision note; shipped 3fe7a436 and verified on the live site (3/3 author links land).
- **DNS**: bought at Whois.com, all DNS moved to Sam's Vercel account; a Google verification TXT record already
  exists (§0.2 step 0).
- **Session end**: Sam restarting the computer; this document is the handoff. Final review (this pass) found the
  replaceState analytics gap (§0.2 step 8) and corrected the stale history-behaviour text in §5.8.

### Oct 26 (Mon, afternoon) — step 0

- **Firewall** staged as drafts and published on Sam's "ok proceed", log only (§0.1). Sam asked that everything be
  surgical: *"the project is in great shape right now and you shouldn't be making wholesale changes just targeted work."*
- **Search Console** was already verified. It also showed the **"Deceptive pages"** flag (§0.2) — no sample URLs, no
  browser warning; review requested as a false positive. Sam had just said he is about to start sharing the link.
- **Bing** imported; **spend budget** $50 with pause on.
- **Cloudinary** at 91% of its free plan. Sam: *"i'm trying to avoid paying cloudinary $90 a month for a year if my
  site isn't a big hit… keeping costs down is important but speed also important."* Photos moved behind Vercel's edge
  cache (roadmap §64). After deploy Sam felt clicks *"maybe slowed down a hair… as a picky person i want things to be
  very snappy"* — measured: first views of the new WebP copies (0.55 s); pre-building the notables fixed it. Sam:
  *"very snappy and photos load fine."*
- **10:22** — the `--all` photo warm-up deferred until Cloudinary has room. Sam: *"lets wait a few days its not urgent."*

### Oct 26 (Mon, 10:30–13:00 PDT) — steps 2–8, the probe, and the hidden people

- **Steps 2–8 built and deployed in order, each verified on hooker-test** (commits and measurements in §0.1–§0.2,
  roadmap §65.1). Sam's frame: *"ensure that your approach follows most modern best practices for SEO while keeping my
  site nimble and searchable"*, and the standing *"everything is surgical."*
- **Descriptions:** Sam asked what a description is — the grey line under a search result — *"i'm fine with that."*
- **Link previews:** two treatments shown as images on Sam's Desktop (`~/Desktop/hookerverse-link-previews/`); a
  face-crop cut Charles Gay Hooker's face off. Sam: *"padded photos are better because often they are not standard size
  and even have differing alignments. C site photo is perfect."*
- **The cards' stories were not in the page Google reads** (§2 corrected; roadmap §65.3). Seen when Sam pasted Dexter
  Ferry's page source; fixed with hidden text inside closed blocks, pixel-identical. Sam pasted the source again after
  the fix: *"checks out."*
- **The home page:** Sam, on the intro: *"if a user is signed in and goes through the intro, the first card that will
  appear is the home card they chose not thomas but more typically it will be thomas."* Enter now carries a real link
  to Thomas for crawlers.
- **The contact email** now says where a visit began. Sam sent a real test from hooker-test, signed out: received,
  with "Arrived: directly, landing on /". Sam: *"add the one sentence to privacy"* — done (`01ac18ac`).
- **The launch probe** built and proven red first; 42/42 (§0.2).
- **Hidden people** — Sam: *"don't forget there are hidden entries that i don't want to be anywhere in SEO … no
  searches for a hidden Talcott will show my site."* Audited (§0.3); the only exposure is names inside visible cards'
  narrative blocks. Sam: *"Leave the narrative blocks as they are."*

### Oct 26 (Mon, evening) — Safe Browsing cleared

- **21:18 PDT** — Google's "Review successful for hookerverse.com" email: the "Deceptive pages" flag is lifted and the
  warnings are being removed. One of the three launch gates is now cleared (§0.3); the firewall log read (~Nov 2) and
  Sam's go remain.
- **Oct 27, ~09:40 PDT** — Search Console → Security issues: **"No issues detected"** (Sam's screenshot). Confirmed.
