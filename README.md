# Table Sense — deployment guide

This is a password-gated, installable web app (PWA) with real cross-device sync.
Unlike the previous version, the sync here runs on a real backend (a small
serverless API + a Supabase Postgres database), not a feature borrowed from the
chat platform — so it should actually work reliably across devices.

You do not need to write any code to deploy this. It takes about 10 minutes.

## What you need

- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account (you can sign up using your GitHub account directly)
- A free [Supabase](https://supabase.com) account

## Step 1 — Get this code onto GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository
   (any name, e.g. `table-sense`). Keep it **private** if you'd rather the source
   wasn't public — it doesn't need to be public for Vercel to deploy it.
2. Download this project folder, then upload it into that new repo. The easiest way
   if you're not familiar with git: on the new repo's GitHub page, use
   **Add file → Upload files** and drag in everything from this folder
   (keeping the `api/` and `public/` folders intact).

## Step 2 — Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in.
2. Choose **Import Git Repository**, and pick the repo you just created.
3. Leave the build settings on their defaults (no framework preset needed — this
   project has no build step) and click **Deploy**.
4. The first deploy will go live, but the app won't work yet — you still need to
   add the password and the database in the next two steps.

## Step 3 — Add the password and session secret

1. In your new Vercel project, go to **Settings → Environment Variables**.
2. Add:
   - `APP_PASSWORD` — whatever password you want to share with whoever uses this.
   - `SESSION_SECRET` — a random string used to sign login sessions. Generate one
     with `openssl rand -hex 32` in a terminal, or just mash the keyboard for 40+
     random characters. This is *not* the password people type in — it's a secret
     the server uses internally, never shown to users.
3. Apply both to all environments (Production, Preview, Development).

## Step 4 — Create the Supabase project and table

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a
   new project (pick any name/region, free tier is fine). Save the database
   password it asks you to set — you won't need it for this app, but keep it
   somewhere safe regardless.
2. Once the project is ready, open the **SQL Editor** (left sidebar) and run:

   ```sql
   create table shared_state (
     id text primary key,
     value text not null,
     updated_at timestamptz not null default now()
   );

   alter table shared_state enable row level security;
   -- No policies are added on purpose. With RLS on and zero policies, the public
   -- (anon) key can't read or write this table at all — only requests using the
   -- service_role/secret key (which this app's backend uses, and which bypasses
   -- RLS) can touch it. That's what keeps this table private to your deployment.
   ```

3. Go to **Settings → API**. You need two values from here:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role key** (under "Project API keys" — or, on newer projects, a
     **secret key** starting `sb_secret_...` under "API Keys") → this is
     `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY` if using the new
     format — either works, just set one).

   ⚠️ This key has full access to your database and bypasses all security rules.
   Never put it in client-side code or share it — it only belongs in Vercel's
   environment variables, where this app uses it strictly server-side.

4. Back in your Vercel project's **Settings → Environment Variables**, add
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)
   with the values you just copied. Apply to all environments.

## Step 5 — Redeploy

Environment variable changes don't apply to a deployment retroactively — go to
the **Deployments** tab and redeploy the latest one (or just push any small
change to GitHub, which redeploys automatically).

## Step 6 — Use it

1. Visit your Vercel URL (something like `table-sense.vercel.app`, or a custom
   domain if you add one).
2. Enter the password you set in Step 3.
3. You're in. Open the same URL on your other device and log in there too —
   both are now talking to the same backend, so cards entered on one show up
   on the other within about a second.

## Installing it as an app (PWA)

- **On a phone (iOS Safari or Android Chrome):** open the site, then use
  "Share → Add to Home Screen" (iOS) or the browser's install prompt / menu →
  "Install app" (Android). It'll appear as its own icon and open full-screen,
  no browser bar.
- **On a computer (Chrome, Edge):** look for an install icon in the address bar,
  or the browser menu → "Install Table Sense…".

## Checking sync is actually working

Tap the small text under the "Table Sense" title (it says "tap for sync info").
This opens a live diagnostics panel showing every push and pull attempt, with
real error messages if something's wrong — check this on both devices if sync
ever seems stuck.

## Updating the app later

Any changes get deployed by pushing to the GitHub repo — Vercel rebuilds and
redeploys automatically within a minute or two.

## Honest limitations

- **The password is a single shared secret, not real accounts.** Good for
  keeping casual visitors out; not meant to withstand a determined attacker
  targeting you specifically, and everyone who has the password can see and
  edit the same shared table state.
- **The Supabase table is a single shared row.** There's no separation between
  different "tables" or sessions — if multiple people use this deployment at
  once for different games, they'll see each other's data. Fine for one
  person/group's own private deployment (which is exactly what this guide
  sets up), not built for multi-tenant use.
