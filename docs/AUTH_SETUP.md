# AUTH SETUP — the credential steps, written to be done without help

*(Opened August 29, 2026, mid-slice-1. Roadmap §50 is the build spec; this is only the
part that happens in other people's dashboards and therefore cannot be done by code.
Re-read the whole file when setting up PRODUCTION credentials — §3 differs from §2 in
exactly one line, and it is the line that fails silently.)*

**Google's console renames things.** What follows names both the current labels and the
older ones, because this file will be read again months from now.

---

## §1. STATE, as of August 29, 2026

| | |
|---|---|
| Google Cloud project | **Hooker Genealogy** — id `hooker-genealogy`, number `228397122662` ✅ created |
| Neon — legacy `hdo0427` | ✅ deleted |
| Neon — new project for this site | ✅ **created** — `ep-lively-smoke-arxkr9ty-pooler`, us-west-2, Postgres 18, pooled |
| Google OAuth client | ✅ **created** — "Hooker Genealogy — localhost", test user added |
| `.env` | ✅ all five values set |
| migration | ✅ run — `user` / `session` / `account` / `verification` + `heroPersonId`, 10 indexes |
| code | slice 1 complete and committed |

### ✅ SLICE 1 CLOSED — August 29, 2026, verified on a real Google round-trip

Not "the endpoint returned 200" — an actual human clicking Google's consent screen,
and the row it produced:

| | |
|---|---|
| `user` | Sam Hooker · samhooker@gmail.com · `emailVerified: true` · image stored · `heroPersonId: null` |
| `account` | `providerId: google`, issuer `accounts.google.com`, tokens stored, profile+email+openid |
| `session` | expires 2026-09-28 — the 30 days configured in `auth.ts`, so config reached the database |

`heroPersonId: null` is correct; nothing writes it until slice 4.

**Two observations that are correct rather than broken**, recorded because they will
look like faults to whoever reads this next: signing in produces **no visible change**
(there is no UI until slice 2), and the callback lands on **"Welcome to SvelteKit"**
(the stock `+page.svelte`, which §50.3 replaces with the intro-vs-hero branch).

**One thing to know when re-testing by hand:** `/api/auth/sign-in/social` is **POST
only**, so pasting it in the address bar 404s. The POST also sets an HttpOnly
`better-auth.state` cookie AND stores that state in `verification`; the callback checks
both. So a URL generated with `curl` cannot be completed in a browser — the state lives
in the wrong client, and Google returns a state mismatch. **The browser must make the
POST itself.** From the console on any page of the app:

```js
const r = await fetch('/api/auth/sign-in/social', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'google', callbackURL: '/' })
});
location.href = (await r.json()).url;
```

Once slice 2 ships the Sign In control, this snippet is only a fallback for debugging.

---

## §2. GOOGLE OAUTH CLIENT — localhost

### 2.1 The consent screen must exist before a client can

Google will refuse to create a client until the project has a consent screen. In the
current console this is **Google Auth Platform → Get started**; it used to be
**APIs & Services → OAuth consent screen**.

1. **App name:** anything you'd be happy for a stranger to see — it appears on the
   Google sign-in dialog. "Hooker Genealogy" is fine.
2. **User support email:** your own.
3. **Audience: External.** (Internal is for Google Workspace organisations only and will
   not be offered on a personal account.)
4. **Contact email:** your own again.
5. Agree, and finish.

**Do NOT submit for verification.** Verification is for apps serving strangers at scale;
it takes weeks and is not needed for anything below.

### 2.2 ADD YOURSELF AS A TEST USER — the step that is always missed

A new External app is in **Testing** mode, and in Testing mode **only listed test users
can sign in.** Everyone else gets *"Access blocked: … has not completed the Google
verification process"*, which reads exactly like a broken integration and is not one.

**Google Auth Platform → Audience → Test users → Add users → `samhooker@gmail.com`.**

Testing mode allows up to 100 test users, which is more than this site needs for a long
time. Going to **Published** is a decision for later, and it is a door-3-shaped decision
(DEPLOYMENT §1) — reversible, but it changes who can sign in.

### 2.3 Create the client

**Google Auth Platform → Clients → Create client** (formerly *APIs & Services →
Credentials → Create Credentials → OAuth client ID*).

- **Application type: Web application.**
- **Name:** anything; it is internal only. "Hooker Genealogy — localhost" is useful,
  because a second client for production is coming and they must be told apart.
- **Authorised JavaScript origins:** leave empty. Better Auth's flow is a server-side
  redirect and does not need one.
- **Authorised redirect URIs → Add URI**, exactly this, and nothing else:

```
http://localhost:5173/api/auth/callback/google
```

> **GOOGLE MATCHES THIS STRING EXACTLY.** No trailing slash. `http`, not `https` —
> localhost is the documented exception and the only reason slice 1 needs no domain.
> Port `5173`, which is Vite's default. **If Vite ever starts on 5174 because 5173 was
> busy, sign-in will fail here too** — the port is part of the string. `auth.ts` already
> allows 5174/5175 at *its* layer, but Google will not, so either free up 5173 or add the
> other ports as additional redirect URIs.
>
> A mismatch produces `Error 400: redirect_uri_mismatch`, and Google's error page does
> show the URI it received — read it against the line above character by character.

### 2.4 Paste into `.env`

Create finishes with a dialog showing the **Client ID** and **Client secret**. Put them in
`.env` in the repo root — **not** in `.env.example`, and never in chat or a commit:

```
GOOGLE_CLIENT_ID=228397122662-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

`.env` is gitignored (`.gitignore:61`). The secret can be regenerated from that same
Clients page if it is ever exposed — if in doubt, regenerate; it costs nothing.

---

## §3. NEON — the new project

1. **Create project.** Any name; `hooker-genealogy` matches the Google one and keeps the
   two dashboards legible against each other.
2. Region: nearest you. It can't be changed later without recreating.
3. On the connection-string screen, take the one marked **Pooled connection**. The host
   contains **`-pooler`**:

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/DB?sslmode=require
```

4. Into `.env` as `DATABASE_URL`.

> **THE POOLED ONE IS NOT A PREFERENCE.** A serverless function that opens a *direct*
> connection per cold invocation exhausts the connection limit under real traffic and
> keeps the compute awake, which defeats the scale-to-zero economics Neon was chosen for
> (DEPLOYMENT §18.7). It works identically on localhost either way, so **this mistake is
> invisible until production** — which is the exact class of bug DEPLOYMENT §1 exists to
> find early.

Free tier is 100 CU-hours per project per month against a workload that will use a
fraction of it; nothing here should ever bill.

---

## §4. THEN — hand back

With both pasted into `.env`, the remaining step is one command and it is Code's to run:

```bash
npx @better-auth/cli migrate
```

That creates `user`, `session`, `account`, `verification` and the `heroPersonId` column
(roadmap §50.2). Verify with `GET /api/auth/ok` → `{"ok":true}` and slice 1 closes.

**Nothing needs redoing if this sits for a week.** The credentials do not expire and the
code is committed.

---

## §6. MICROSOFT OAUTH (Azure Entra ID) — the second button

*(Added August 29, 2026. §18.1 originally ruled Google-only, with the trigger for a second provider
being "a real person who is blocked, not a hypothesis." Sam overturned it the same day on a better
argument: **this is a family genealogy, the users are relatives skewing older, and outlook.com /
hotmail.com are common in exactly that group.** For them a second button is coverage, not parity.)*

**THE CODE IS ALREADY SHIPPED AND IS INERT UNTIL THIS IS DONE.** `auth.ts` registers the provider
only if both credentials are present, and the button renders only if `PUBLIC_AUTH_MICROSOFT=1`.
Verified 082926 with the vars blank: `sign-in/social` for microsoft returns `PROVIDER_NOT_FOUND`,
and the button is absent from the markup. Nothing is broken while this sits undone.

### 6.1 Register the app

**portal.azure.com → Microsoft Entra ID → App registrations → New registration.**

1. **Name:** `Hooker Genealogy` (user-facing — it appears on the Microsoft consent screen, same as
   the Google one).
2. **Supported account types — THIS IS THE ONE TO GET RIGHT:**

   > **"Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant) and
   > personal Microsoft accounts (e.g. Skype, Xbox)"**

   This is the option that pairs with `tenantId: 'common'` in `auth.ts`. Any narrower choice
   **silently excludes personal outlook.com and hotmail.com accounts** — which are the entire reason
   this provider exists. It fails as "that account can't be used here" for the exact relatives you
   added it for, and it is not obvious from the error that the registration is the cause.

3. **Redirect URI:** platform **Web**, value exactly:

```
http://localhost:5173/api/auth/callback/microsoft
```

   Note `/microsoft`, not `/google`. Azure permits `http` for localhost, same loopback exception
   Google makes.

4. **Register.**

### 6.2 The client ID

**Overview** → copy **Application (client) ID** → `.env` as `MICROSOFT_CLIENT_ID`.

(Not "Directory (tenant) ID", which sits directly beneath it and is a different value. We do not
need a tenant id at all — `auth.ts` uses the literal `'common'`.)

### 6.3 The secret — and its expiry date

**Certificates & secrets → Client secrets → New client secret.**

- **Description:** anything; `hooker-genealogy localhost` is useful when a second one for production
  joins it.
- **Expires: choose the LONGEST offered (24 months).** See the warning below.
- **Add**, then copy the **Value** column.

> **COPY THE VALUE, NOT THE SECRET ID.** They sit side by side, they look equally like credentials,
> and the **Value is displayed once only** — navigate away and it cannot be retrieved, only replaced.
> Everyone takes the wrong one at least once.

Into `.env` as `MICROSOFT_CLIENT_SECRET`.

### 6.4 Turn the button on

```
PUBLIC_AUTH_MICROSOFT=1
```

Set in the **same step** as the two values above. The server decides whether the PROVIDER exists,
from the credentials themselves; this flag only decides whether the BUTTON does. Setting them
together is what keeps them from drifting.

### 6.5 ⚠ THE CALENDAR REMINDER — the one ongoing cost Google does not have

**Azure client secrets expire. Google's never do.** 24 months is the maximum Azure offers.

When it lapses, Microsoft sign-in breaks with **no deploy, no code change and no warning** — every
Microsoft user is locked out, and the failure arrives on a date nobody is thinking about auth.

**Set a calendar reminder for ~22 months from the day you create the secret.** Write the expiry date
here when you do:

```
Secret created:  2026-08-29        Expires: 2028-08-28        Reminder set: ☑ (Sam, 082926)
```

> **THIS IS NOT HYPOTHETICAL AND THE PROOF WAS ON SCREEN WHEN IT WAS WRITTEN.** Sam's App
> registrations list on 082926 showed the previous project's app — **"My HDO Portfolio", created
> 4/28/2025 — with `Expired` under Certificates & secrets.** Microsoft sign-in on that site had been
> dead for some unknown period: no error surfaced, no email arrived, no deploy was involved. The
> credential simply stopped and the app kept serving. That is the entire argument for the line above.

The mitigation if it does lapse before you get to it: **`PUBLIC_AUTH_MICROSOFT=0`** hides the button
in one env change, so readers see one working door instead of two doors of which one is dead. Then
generate a new secret at leisure. That kill switch is the reason the flag exists as a separate
variable rather than being derived.

### 6.6 Test it

Sign out, open the modal, and the second button should be there beneath Google. The verification
that matters is a **personal** Microsoft account rather than a work one — a work account will
succeed even if §6.1 step 2 was set too narrowly, so testing with one proves nothing about the case
this provider was added for.

> **✅ VERIFIED August 29, 2026 — and the earlier wording of this section was too narrow.**
>
> It said to test with "an outlook.com or hotmail.com address." **A personal Microsoft account can
> use ANY email address as its sign-in name**, including a Gmail one, so requiring a Microsoft-domain
> address was wrong and would have sent someone off to create an account they did not need.
>
> **How to tell what you actually signed in with, definitively:** read the `issuer` on the `account`
> row. Sam's reads
>
> ```
> https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0
> ```
>
> `9188040d-6c67-4c5b-b112-36a304b66dad` is Microsoft's **well-known consumer tenant**, the one every
> personal Microsoft account authenticates through. A work or school account carries that
> organisation's own tenant GUID instead. So the issuer is the proof, not the email domain — and by
> that measure §6.1 step 2 is confirmed correct.
>
> Result: **1 user, 2 accounts** (`google` + `microsoft`), linked on the matching verified email.
>
> **The profile stays with whichever provider created the user.** Sam signed in with Microsoft and
> still saw his Google name and avatar; that is deliberate, not a stale cache. A later linked
> provider does not overwrite the `user` row's name, email or image — a second provider silently
> changing someone's display name would be the wrong default.

**One behaviour to expect and not misread:** signing in with Microsoft on an email that already has
a Google account **links to the same account** — same bookmarks, same hero. Signing in on a
*different* email creates a **separate** account with its own bookmarks. That is `allowDifferentEmails:
false` working as intended, not a bug; see the comment in `auth.ts`.

---

## §5. LATER — production, and the one line that differs

When a domain exists (DEPLOYMENT §16-K, still undecided):

- **A SECOND redirect URI on the CANONICAL host only:**
  `https://<canonical-host>/api/auth/callback/google`
- **Register it for one host, never both.** Apex and `www` both being registered is how
  two registrations drift apart permanently; the other host is 308'd at **Vercel's edge**,
  never in app code (DEPLOYMENT §18.4). This is the specific thing that cost weeks on the
  previous project.
- Add the canonical host to `allowedHosts` in `src/lib/server/auth.ts`.
- Set `BETTER_AUTH_SECRET` (a **fresh** one — `openssl rand -base64 32`), `DATABASE_URL`,
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel's project env vars.
- **And the Microsoft pair plus `PUBLIC_AUTH_MICROSOFT=1`** (§6), with the production redirect URI
  added to the **same Azure app registration** — `https://<canonical-host>/api/auth/callback/microsoft`.
  Azure permits several redirect URIs on one registration, so production and localhost coexist; the
  canonical-host-only rule from §18.4 applies here exactly as it does to Google.
- Publishing the consent screen (§2.2) becomes necessary once people other than the test
  users need to sign in.
