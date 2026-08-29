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
| Neon — new project for this site | ☐ **not yet created** |
| Google OAuth client | ☐ **not yet created** |
| `.env` | written, with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` already filled |
| code | slice 1 complete and committed (`7b5b7c11`) |

**Nothing in the code is waiting on anything except these two credentials.**

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
- Publishing the consent screen (§2.2) becomes necessary once people other than the test
  users need to sign in.
