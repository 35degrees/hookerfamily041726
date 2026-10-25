# SEO PLAN — getting hookerverse.com found, without giving the tree away

**Opened October 24, 2026.** A living document in the house convention: decisions Sam has made are marked
✅ and dated; open choices stay in §11 until he closes them; every measured number carries its date and is
re-run before it is trusted.

**This supersedes `DEPLOYMENT_STRATEGY.md` §7 (the SEO surface).** That section was written on August 13,
before people moved to the root (`/thomas-hooker-1586`), before sign-in, and before the site was deployed.
Its reasoning still holds and is not repeated here; where the two disagree, this document wins.
DEPLOYMENT_STRATEGY remains the owner of the firewall (§9), the cost model (§11) and the launch-day
checklist (§15), and this plan points into them rather than copying them.

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
impressed by the experience, and **gets in touch** — the "Get in Touch" form (roadmap §60.2, opened from the
footer's About / Contact and from Sam's own card). So the contact path is part of SEO: a visitor who arrives
from Google on any card must be able to find it. (Open item: `SiteFooter` is not rendered on a phone yet —
roadmap §63.2 — so a phone visitor's only route to the form is Sam's card. Worth a phone seat before launch.)

Realistic expectations, stated once so they are not rediscovered as disappointment: ranking is decided mostly
by *authority* (other respected sites linking here), which a new domain does not have. The famous names —
Thomas Hooker, Jonathan Edwards, Aaron Burr — are held by Wikipedia, Britannica and state historical sites,
and will be for a long time. The early wins are **the hard-to-find notables and the specific phrases only this
site has** — "Noadiah Hart Harwinton deacon", "William Bristol New Haven judge daughter Mississippi". Authority
for the big names comes later, from links (§10).

---

## §2. WHERE THINGS STAND — measured October 24, 2026, against the live site

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
  ones a visitor has to click open;
- every cross-connection sentence (Thomas 11/11, Edwards 10/10);
- **18–22 real `<a href>` links** to relatives, so a crawler can walk the tree.

Many JavaScript sites fail exactly here — content that only exists after scripts run, links that are click
handlers. This one does not, and it is the thing that would be expensive to change.

**What is missing or weak:**

| | today | consequence |
|---|---|---|
| `<title>` | ✅ `"<chip name> - The Descendants of Rev. Thomas Hooker"` (shipped Oct 24) | but **2,168 of the 8,479 share their title** with another page (13 "Thomas Hooker", 21 "Mary Hooker") — §5.1 |
| meta description | none | Google writes its own snippet, often from the relatives list |
| canonical link | none | nothing tells Google which host is the real one — §4 |
| link-preview tags (`og:`) | none | a shared link unfurls as a bare URL |
| structured data (JSON-LD) | none | Google can't tell this is a person with dates, parents and a spouse |
| sitemap | **none** | **and the home page has zero links** (it is the intro), so Google has no way in — §6 |
| image alt text | Thomas 6/36, Edwards 12/42, Noadiah 0/30 | invisible to Google Images, where historical portraits are found |
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
people with a photo; a site image for the rest. This is what makes a link shared by email or text unfurl as a
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

---

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

`regenerate-data.js` writes `sitemap.xml` from the gated set — current slugs only, with `lastmod` from the
record's `last_updated` where present. 8,479 URLs fits one file (the limit is 50,000). Submitted in Google
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

### 8.1 What is exposed today (measured on hookerverse.com, Oct 24)

| | live | contents |
|---|---|---|
| `canonical.json` | **404 — not served** ✅ | the master file, research notes, sources: never leaves the build |
| `/data/person/<slug>.json` | 200, ~25 KB each | one person's card — already stripped to the fields the card shows (`clientStrip.js`, Oct 9) |
| **`/data/search-index.json`** | **200, 9.7 MB** | **every person in one file**: names, years, blurbs, places, careers, schools, tags, and every cross-connection sentence |
| `/data/redirects.json` | 200, 150 KB | old slug → new slug |

### 8.2 The honest limit

A website cannot be a perfect walled garden: whatever a visitor's browser displays, a determined person can
save. The person files exist because the browser needs them to draw the card. The aim is therefore **to make
bulk harvesting slow, visible and expensive**, while a reader never notices.

### 8.3 The measures, cheapest first

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

All of it happens while the site is still `noindex`, so nothing here is public until §12.

1. **One indexable site** (§4): canonical tags (hooker-test's own `noindex` rule is already in `vercel.json`).
2. **Head tags** (§5.1–5.6): title with years, description, `og:`, alt text, JSON-LD — in
   `src/routes/[slug]/+page.svelte`, computed from data the payload already carries. A field missing from the
   payload is added in `regenerate-data.js`, never fetched at runtime.
3. **The gate** (§6.1): the `noindex, follow` tag on non-gated pages, decided in one shared predicate that the
   sitemap reads too, so the two can never disagree.
4. **Sitemap** (§6.2) and **robots.txt** (§6.3), the latter drafted but not yet live.
5. **Home page** (§5.7): invisible tags and the one real link.
6. **Edge cache** (§7 option A), verified with `x-vercel-cache: HIT` on a second fetch.
7. **The firewall** (§8.3): the `/data/` rate limit and the country rules, all in `log` mode first, a week
   before anything is opened.

**Verification, proven red first as the house rule requires** — a probe that fetches as Googlebot, for one rich
page, one stub, one renamed slug, one hidden person and `/`, and asserts: title, description, canonical, robots
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

### 10a. Readers — Vercel Web Analytics (✅ Sam, Oct 25)

Cookieless and first-party: the script and its beacons come from hookerverse.com's own `/_vercel/insights/`, so
there is no consent banner and no Google tag. Built in `src/lib/state/analytics.svelte.ts`, which counts **outside
readers only**: it loads on hookerverse.com alone (never hooker-test, localhost or a deploy address); it sends
nothing while Sam's account is signed in (matched by the SHA-256 of the email, so the address never ships); and
once Sam has signed in on a device, that browser is flagged (`localStorage hv-owner`) and stays uncounted after
sign-out. The first pageview waits for the session to resolve. Every person-to-person tap is a pageview (shallow
routing is a `pushState`, which the script tracks). Headless browsers are ignored by the script itself. Enabled
per project in the Vercel dashboard (Analytics tab); until then the script 404s harmlessly.

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
| **11.6** | **Launch date** — when robots.txt opens | After §9 is complete and verified, the firewall has run in `log` mode for a week, and DEPLOYMENT §15's checklist is ticked |

---

## §12. LAUNCH DAY — the one-way part

What is irreversible is small: **once a URL is public it is linkable forever**, so redirects are permanent
(§3), and Google's first impression of the site takes months to revise if it is poor (which the gate exists to
prevent). Everything else — tags, gate, sitemap, robots rules — can be changed the next day.

In order:

1. DEPLOYMENT §15 checklist ticked (firewall live and observed, spend limit $50, Cloudinary transforms, privacy).
2. Lift `X-Robots-Tag` **for hookerverse.com only**; publish the two-policy robots.txt.
3. Verify the site in Search Console; submit the sitemap; inspect three URLs (one rich, one stub, `/`).
4. Fetch-as-Googlebot probe green against production.

**Rolling back**, if something is badly wrong: put the `noindex` header back and redeploy. Google drops pages
from results as it re-crawls them (days to weeks); Search Console's removal tool hides a URL within a day.
Nothing about launch locks the project in.
