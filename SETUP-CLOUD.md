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

**Re-run this same file after pulling changes.** It is written to be safe to run
again — every policy and function is replaced rather than duplicated — and it is
the only way schema changes reach your database. Nothing deploys them for you.

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

## Step 4 — Turn ON anonymous sign-ins

This is what lets your friends join by tapping their name instead of being
handed a password.

1. Sidebar → **Authentication** → **Sign In / Providers**.
2. Find **Anonymous sign-ins** and turn it **ON**.
3. Save.

If you skip this the app still works — it falls back to asking each friend for
an ID and password, and the name-picking step after it is the same — but you are
back to inventing and distributing passwords, which is the thing this replaces.

## Step 5 — Copy your two keys

1. Sidebar → **Project Settings** → **API Keys** (or **Data API**).
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting `eyJ...` or `sb_publishable_...`

Use the **anon / public** key. Never the `service_role` key — that one bypasses
all security and must never go into a website.

## Step 6 — Paste them into Vercel

1. Go to <https://vercel.com> → your **travellor** project → **Settings** →
   **Environment Variables**.
2. Add these two, ticking **Production**, **Preview** and **Development** for each:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from step 5 |
   | `VITE_SUPABASE_ANON_KEY` | your anon/public key from step 5 |

3. Go to the **Deployments** tab → newest deployment → **⋯** → **Redeploy**.

Environment variables are baked in at build time, so **a redeploy is required** —
just saving the variables changes nothing.

### Same two values for local development

Copy `.env.example` to `.env` and fill in the same two values. `.env` is
gitignored, so your keys never reach GitHub.

## Step 7 — Check it worked

Open <https://travellor.vercel.app> and look at the top-right of the navbar.

- **A "Sign In" button appeared** → it worked.
- **No Sign In button** → the variables didn't reach the build. Recheck the exact
  spelling `VITE_SUPABASE_URL` (case-sensitive) and that you redeployed.

---

## Your own account

You need one; your friends do not. Tap **Sign In** → **First Time** → pick any ID
and password and create it. IDs are 3–20 characters, lowercase letters, numbers,
`.` `_` `-`; passwords at least 6 characters. There is no email and no password
reset, so use something you will remember — this account owns your trips.

Your friends never see that screen. They tap their name on the invite and the app
gives them an anonymous account of their own.

### Lock the door once you are registered

Anyone who finds your site can create an ID until you stop them. They still
cannot see any of your trips — row-level security blocks that at the database,
and the roster only lets somebody claim a name you wrote yourself. Still, once
you have your account there is no reason to leave it open:

Supabase → **Authentication** → **Sign In / Providers** → **Email** →
turn **Allow new users to sign up** **OFF**.

Leave **Anonymous sign-ins** ON — that is what your travellers use, and it is a
different switch.

---

## Sharing a trip — the short link

Once you are signed in:

1. Open the trip → **Trip Settings** → **Travellers**. Add everyone by name, and
   set each one's permission. This is the important step: nobody can join as a
   name you have not written down.
2. Open the trip → **Share Trip** → **Create Invite Link**.
3. You get something like `https://travellor.vercel.app/j/AB3F7K` — about 35
   characters, fits in a QR code, survives WhatsApp.
4. Send the **same link to everybody**, or read the 6-character code out loud.

Each friend opens it and is asked *who are you?* They tap their own name and are
in, with the permission you gave that name. Names already claimed show greyed out,
so two people cannot become the same traveller. From then on every edit syncs live
to everyone.

**Permissions**, unchanged from the rest of the app:

- **Admin** — everything: trip settings, deleting, reordering, invites
- **Member** — add and edit activities, tick the checklist, log expenses
- **Viewer** — read-only

Admin is not offered when you add a name, because a seat can never hand out admin
— that is what stops somebody promoting themselves. Promote a person after they
have claimed their name, from the same Travellers list.

### When somebody needs their name back

A traveller's account lives in the browser they claimed it in. If they clear their
data or move to a new phone, they will see their own name greyed out as taken.
Fix it in **Trip Settings** → **Travellers** → **Release** next to their name,
then send them the link again. Releasing also removes that person's access, which
is how you take somebody off a trip.

### The other kind of link

The **Snapshot Share** box further down the dialog is the old style: it packs the
whole trip into the URL. It works with no login and no internet, which is why it
is still there — but it is thousands of characters long, will not fit a QR code,
and it sends a **frozen copy**, so your friend's later edits never come back to
you. Use the invite link unless you specifically need the offline copy.

---

## Keeping the free project awake

Free Supabase projects **pause after 7 consecutive days with no requests**. A
paused project keeps all its data, but it stops answering until you restore it
by hand from the dashboard — which is a bad thing to discover mid-trip.

There is no special "keep alive" endpoint. Any ordinary request resets the
7-day clock, so the repo just makes one tiny read every 3 days:
`.github/workflows/supabase-keepalive.yml`.

**It needs nothing configured.** The workflow falls back to the project URL and
the anon key, which the deployed site already publishes — every `VITE_*`
variable is compiled into the JavaScript each visitor downloads, so that key is
public by design and row-level security is what actually protects the data.

Two things to check once, on GitHub:

1. **Actions tab → enable workflows** if it asks. Scheduled jobs never run
   otherwise.
2. **Actions → Supabase Keep-Alive → Run workflow.** It should go green in a
   few seconds. Do this rather than waiting three days to find out.

### The trap worth knowing

**GitHub disables scheduled workflows on a repository with no activity for 60
days.** So the keep-alive can quietly go dormant, and the database pauses a week
later. If you stop committing for two months, push anything — or open the
Actions tab and re-enable it.

Prefer secrets over the fallback? Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
under **Settings → Secrets and variables → Actions**; they take priority
automatically and you can delete the hard-coded values from the workflow.
