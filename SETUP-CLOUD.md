# Turning on the database, login and short links

Do this once. It takes about 15 minutes and costs nothing. Until it's done the
app still works, but every trip lives only in one browser and share links stay
enormous.

Everything in the app code is already written for this — you are only creating
the project and pasting two values into Vercel.

---

## Step 1 — Create the Supabase project

1. Go to <https://supabase.com> and sign up (GitHub login is fine, no card needed).
2. **New project**. Name it `travellor`.
3. Set a **database password** — you will not need it again, but save it somewhere.
4. Pick the region closest to you: **Southeast Asia (Singapore)**.
5. Click **Create new project** and wait ~2 minutes for it to finish provisioning.

## Step 2 — Create the tables

1. In the left sidebar open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy **the whole file**, paste it in.
3. Click **Run**. You should see "Success. No rows returned."

This creates the three tables (`trips`, `trip_members`, `trip_invites`), turns on
row-level security so people only see trips they were invited to, and enables the
realtime feed that makes edits appear on everyone's phone.

## Step 3 — Turn OFF email confirmation ⚠️

**This step is not optional.** Your friends sign in with an ID like `danny`, which
the app maps to an internal address `danny@travellor.app`. No mail is ever sent
there, so if Supabase insists on confirming the address, nobody can ever log in.

1. Sidebar → **Authentication** → **Sign In / Providers** → **Email**.
2. Turn **Confirm email** **OFF**.
3. Leave **Enable email provider** ON.
4. Save.

If you miss this, the app will tell you: creating an account shows
*"Account created, but the cloud still requires email confirmation."*

## Step 4 — Copy your two keys

1. Sidebar → **Project Settings** → **API Keys** (or **Data API**).
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting `eyJ...` or `sb_publishable_...`

Use the **anon / public** key. Never the `service_role` key — that one bypasses
all security and must never go into a website.

## Step 5 — Paste them into Vercel

1. Go to <https://vercel.com> → your **travellor** project → **Settings** →
   **Environment Variables**.
2. Add these two, ticking **Production**, **Preview** and **Development** for each:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from step 4 |
   | `VITE_SUPABASE_ANON_KEY` | your anon/public key from step 4 |

3. Go to the **Deployments** tab → newest deployment → **⋯** → **Redeploy**.

Environment variables are baked in at build time, so **a redeploy is required** —
just saving the variables changes nothing.

### Same two values for local development

Copy `.env.example` to `.env` and fill in the same two values. `.env` is
gitignored, so your keys never reach GitHub.

## Step 6 — Check it worked

Open <https://travellor.vercel.app> and look at the top-right of the navbar.

- **A "Sign In" button appeared** → it worked.
- **No Sign In button** → the variables didn't reach the build. Recheck the exact
  spelling `VITE_SUPABASE_URL` (case-sensitive) and that you redeployed.

---

## Handing out accounts to your friends

There is no email and no password reset. You pick an ID and a password for each
person and tell them directly (WhatsApp, in person, whatever).

| Friend | ID | Password |
|---|---|---|
| You | `danny` | *pick one* |
| Friend 2 | `weiming` | *pick one* |
| Friend 3 | `sarah` | *pick one* |

Rules for IDs: 3–20 characters, lowercase letters, numbers, `.` `_` `-`.
Passwords must be at least 6 characters.

**First time each person logs in**, they tap **Sign In** → the **"First Time"**
tab → type the ID and password you gave them → **Create Account & Sign In**.
Every time after that they use the **"Sign In"** tab.

### Lock the door once everyone is in

Anyone who finds your site can create an account until you stop them. They still
cannot see any of your trips without an invite code — row-level security blocks
that at the database — but once all your friends have registered you should close
signups anyway:

Supabase → **Authentication** → **Sign In / Providers** → **Email** →
turn **Allow new users to sign up** **OFF**.

If someone forgets their password, you can reset it in Supabase →
**Authentication** → **Users** → click the user → **Reset password**.

---

## Sharing a trip — the short link

Once you are signed in:

1. Open the trip → **Share Trip**.
2. Choose the permission level: **Admin**, **Member** or **Viewer**.
3. Click **Create Invite Link**.
4. You get something like `https://travellor.vercel.app/j/AB3F7K` — about 35
   characters, fits in a QR code, survives WhatsApp.
5. Send that link, or read the 6-character code out loud.

Your friend opens it, signs in with their ID, and lands straight in the trip with
the role you chose. From then on every edit syncs live to everyone.

**Permissions**, unchanged from the rest of the app:

- **Admin** — everything: trip settings, deleting, reordering, invites
- **Member** — add and edit activities, tick the checklist, log expenses
- **Viewer** — read-only

### The other kind of link

The **Snapshot Share** box further down the dialog is the old style: it packs the
whole trip into the URL. It works with no login and no internet, which is why it
is still there — but it is thousands of characters long, will not fit a QR code,
and it sends a **frozen copy**, so your friend's later edits never come back to
you. Use the invite link unless you specifically need the offline copy.

---

## Keeping the free project awake

Free Supabase projects pause after 7 days with no traffic. The repo already has
`.github/workflows/supabase-keepalive.yml`, which pings the database every 3 days.
To switch it on, add the same two values as **repository secrets** on GitHub:

GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**, named `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Until you do, the workflow just exits quietly.
