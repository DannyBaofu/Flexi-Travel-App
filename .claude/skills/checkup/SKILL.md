---
name: checkup
description: Run TravelSync locally and verify the whole app is healthy — tests, build, lint, the live Vercel deploy, the Supabase database, the keep-alive job, and the conventions that rot quietly. Use whenever the user asks to check the app, run it, see if everything still works, or make sure it is fine before a trip; and after a gap of days or weeks when nobody has touched it. Prefer this over running commands ad hoc, because the failures that matter here are silent ones — a paused database, a deploy that never picked up its environment variables, a string left behind by a deleted feature.
---

# Checking TravelSync is actually fine

Four layers, cheapest first, plus one more before a trip. Stop at the first
hard failure — a broken build makes everything below it meaningless.

1. **Local** — does it compile, test and lint
2. **Live** — is the deployed site running *this* commit
3. **Cloud** — is Supabase awake and configured
4. **Drift** — have the conventions quietly rotted
5. **Abroad** — does it still work on a phone with bad or no signal (section 7)

The failures worth catching here are the quiet ones. Nothing in this app
announces that the database paused, or that a deploy shipped without its keys,
or that a string still advertises a feature that was deleted.

## 1. Local

```bash
npm test && npm run build && npm run lint
```

Chained so the first failure stops the line.

**Baselines** — anything beyond these is new and worth reading:

- **294 tests, 28 files** (November 2026). The number only grows as features
  land, so a *higher* count is normal — update this line when you notice. A
  *lower* count is as suspicious as a failure; it usually means a test file
  stopped being picked up, not that work vanished.
- **6 lint warnings, all known**: `react(set-state-in-effect)` in
  `ActivityModal`, `ShareModal`, `TripSettingsModal`, `UndoToast` and
  `LocationInput`, plus `react(only-export-components)` in `i18n.tsx`. The
  first four sync form state to a prop when a dialog opens; `LocationInput`
  is a debounced fetch, which is the external-system case the rule exists for.
  Do not chase these.
- **Bundle around 550kB** for the main chunk with the Supabase keys set, plus
  a lazy `DayMap` chunk (~150kB, Leaflet) and small per-dialog chunks. Vite's
  "larger than 500 kB" warning is expected and not part of shipping.

**The bundle size trap.** It roughly doubles once `VITE_SUPABASE_*` are set,
because without keys `isCloudEnabled` folds to `false` at build time and the
bundler tree-shakes all of `@supabase/supabase-js` away. Compare like for like
before chasing a jump: `mv .env .env.bak`, build, then move it back.

## 2. Run it locally

```bash
npm run dev
```

`.env` holds the Supabase keys, so the dev server has full cloud behaviour —
sign-in, invite links, realtime. `.env` is gitignored.

For a production-identical check use `npm run build && npx vite preview`.
Neither serves `/api`, but nothing lives there any more.

To look at it properly, use the **mobile-check** skill — 375px is the design
width, not an afterthought.

## 3. Is the live site running this commit

This is the check that has actually caught things, and it is objective: compare
the deployed bundle filename against a local build of the same commit.

```bash
npm run build 2>&1 | grep -E 'index-.*\.js'
curl -s https://travellor.vercel.app/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

**Same hash means the same source built the same way.** A different hash means
the live site is not this commit. An *identical* hash when you expected a change
means the build never saw your change — which is how the environment-variable
failure showed up: same hash as a keyless build, because Vite had nothing to
inline.

If curl fails with a TLS error from this machine, that is local; check through
the browser instead. The Playwright tools can fetch and grep the bundle:

```js
const r = await fetch('/?cb=' + Date.now(), { cache: 'no-store' });
const asset = (await r.text()).match(/index-[A-Za-z0-9_-]+\.js/)[0];
const js = await fetch('/assets/' + asset, { cache: 'no-store' }).then(x => x.text());
({ asset, hasKeys: /https:\/\/[a-z0-9-]+\.supabase\.co/.test(js) })
```

`x-vercel-cache: MISS` with `age: 0` proves you are reading the origin and not
a cached edge response.

### Two deploy traps

**"Use existing Build Cache"** is ticked by default in Vercel's Redeploy
dialog. With it on, a redeploy can reuse the previous output and new
environment variables never get baked in. Untick it.

**A masked value pasted back in.** Once a Vercel variable is marked Sensitive
the dashboard shows dots, and copying that text copies the dots. The stored
anon key was once `eyJhbGci` followed by 200 `•` characters — exactly 208
long, so nothing looked wrong. Keep these as plain text, and if a key ever
misbehaves, check the deployed bundle for bullet characters before anything
else.

## 4. Is Supabase awake and configured

```bash
URL='https://epuluwfbcigkqhwkzaht.supabase.co'
KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdWx1d2ZiY2lna3Fod2t6YWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjY5ODksImV4cCI6MjEwMzg0Mjk4OX0.Dqx4c3R8_gANdmjy7rU_dMoEVXPeAl2ucC10CX0uldY'

for t in trips trip_members trip_invites; do
  printf '%-14s ' "$t"
  curl -s -m 25 -w ' [%{http_code}]\n' "$URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
done
```

**`[] [200]` for all three is healthy.** The empty array is row-level security
working — an anonymous caller sees no rows rather than an error. Rows coming
back would mean RLS is off, which is a real problem.

A timeout or connection error usually means the **project has paused**. Restore
it from the Supabase dashboard; data is intact, it just stops answering.

Joining a trip runs through two functions, `invite_roster` (which names are
behind a code) and `claim_seat` (take one). Both fail silently if the schema
was only half applied. And `join_trip` must stay **gone** — it was dropped on
purpose because it let a code holder join with no seat at all (see
`schema.sql`):

```bash
for fn in join_trip invite_roster claim_seat; do
  printf '%-14s ' "$fn"
  body='{"p_code":"ZZZZZZ"}'
  [ "$fn" = claim_seat ] && body='{"p_trip_id":"x","p_traveler_id":"y","p_code":"ZZZZZZ"}'
  curl -s -m 25 -w ' [%{http_code}]\n' "$URL/rest/v1/rpc/$fn" -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' -d "$body"
done
```

Healthy is exactly:

- `join_trip` → `PGRST202` "Could not find the function" `[404]`. If this ever
  answers, the old door is back — re-run `supabase/schema.sql`.
- `invite_roster` → `[] [200]`: it exists and a fake code reveals nothing.
- `claim_seat` → `"message":"NOT_SIGNED_IN"` `[400]`: it exists and refuses a
  caller with no account.

"Function not found" on either of the last two means re-run the schema.

Three auth settings have to stay as they are or nobody can get in:

```bash
curl -s -m 25 "$URL/auth/v1/settings" -H "apikey: $KEY" | python -c "
import json,sys; s=json.load(sys.stdin)
print('email provider  :', s.get('external',{}).get('email'), '(must be True)')
print('anonymous users :', s.get('external',{}).get('anonymous_users'), '(must be True)')
print('confirm email   :', s.get('mailer_autoconfirm'), '(True means OFF, which is required)')
print('signups open    :', not s.get('disable_signup'), '(must be True while a trip is running)')
"
```

Sign-in is ID + password mapped onto `<id>@travellor.app`, an address that can
never receive mail. If **Confirm email** is ever switched back on, accounts get
created and then nobody can log in — the app reports it, but it is a confusing
way to find out.

**Keep sign-ups open.** It is tempting to close them "once everyone has
registered", but Supabase's anonymous sign-in refuses with `signup_disabled`
when sign-ups are off — and every guest who opens an invite *is* an anonymous
sign-up. So is a friend whose phone lost its site data mid-trip and has to
rejoin. The ID + password fallback cannot help either, because that is a
sign-up too. Closed sign-ups lock out every new or returning guest, silently,
at exactly the moment they need the app.

## 5. Is the keep-alive still running

Free Supabase projects pause after 7 days with no requests, and
`.github/workflows/supabase-keepalive.yml` pings every 3 days. It needs no
configuration — it falls back to the public URL and anon key.

**GitHub disables scheduled workflows on a repository with no activity for 60
days.** So the thing preventing the pause can quietly stop, and the database
goes down a week later. The repo is public, so GitHub's API answers without
`gh` (which this machine does not have):

```bash
API='https://api.github.com/repos/DannyBaofu/Flexi-Travel-App/actions/workflows/supabase-keepalive.yml'
curl -s -m 25 "$API" | python -c "import json,sys; print('state:', json.load(sys.stdin).get('state'))"
curl -s -m 25 "$API/runs?per_page=3" | python -c "
import json,sys
for r in json.load(sys.stdin).get('workflow_runs',[]): print(r['created_at'], r['event'], r['conclusion'])"
```

Healthy is `state: active` and a `success` within the last three or four days.
If not, open the repo's **Actions** tab, **Run workflow** manually, and push
something to wake the schedule. `git log -1 --format=%cd` tells you how close
the 60-day clock is.

## 6. Has anything drifted

These are the conventions this app is built on. Each one rots invisibly.

**Raw Tailwind shades.** Everything goes through semantic tokens; a literal
shade is a bug, not a shortcut.

```bash
grep -rnE '\b(bg|text|border|ring|from|to|divide|placeholder|shadow|fill)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]' src/ --include=*.tsx --include=*.ts
```

Expect **no matches**. Print-only greys in `PrintItineraryView` use an explicit
hex on purpose — toner cannot resolve the on-screen hairline.

**Untranslated strings.** No user-visible text is written into a component.

```bash
grep -rnE '(placeholder|title)="[A-Za-z]{4,}' src/components/ --include=*.tsx
```

Expect **no matches**. Sample placeholders were removed deliberately — a
label already says what a field is. Anything a person reads comes from `t()`.

**Dead or missing dictionary keys.** Deleting a feature leaves its strings
behind, and one such orphan shipped live promising a packing list that no longer
existed. Two questions, asked of non-test source only:

- **missing**: a literal `t('key')` whose key is not in the dictionary.
- **unused**: a dictionary key never written in quotes anywhere. Counting any
  quoted mention as a use covers keys reached through a variable (the TabBar's
  array, `shareAs*`, `viewer*`) without an allow-list that rots; keys built
  from a template such as ``t(`mode_${m}`)`` are covered by their prefix.

```bash
python - <<'EOF'
import io, os, re
src = []
for root,_,files in os.walk('src'):
    for f in files:
        if f.endswith(('.ts','.tsx')) and f != 'i18n.tsx' and '.test.' not in f:
            src.append(io.open(os.path.join(root,f),encoding='utf-8').read())
code = '\n'.join(src)
s = io.open('src/utils/i18n.tsx',encoding='utf-8').read()
declared = re.findall(r"^\s{2}([A-Za-z0-9_]+):\s*\{\s*zh:", s, flags=re.M)
called = set(re.findall(r"\bt\(\s*'([A-Za-z0-9_]+)'", code))
prefixes = set(re.findall(r"\bt\(\s*`([A-Za-z0-9_]+)\$\{", code))
unused = [k for k in declared
          if not re.search(r"['\"`]%s['\"`]" % re.escape(k), code)
          and not any(k.startswith(p) for p in prefixes)]
print('unused  :', unused or 'none')
print('missing :', sorted(called - set(declared)) or 'none')
EOF
```

Both lists should read `none`. The `\b` before `t(` is a regex word boundary,
typed as a backslash and a `b`. An earlier copy of this script had it saved as
a literal backspace control character, which matched nothing, and retyping it
without the `\b` reads `split('a')` and `get('b')` as translations. If the
scan ever reports dozens of nonsense keys, or every key as unused, check that
first. This check earns its place: it caught six keys orphaned by replacing
the delete confirmation with an undo, within minutes of those commits landing.

## 7. Will it work abroad

Run this before a trip, or whenever the user asks whether the app is fine to
take overseas. The group uses it on roaming data, hotel Wi-Fi and in the metro,
so "works on my desk" is not the question.

**Every outside service answers, and the CSP lets the browser reach it.**

```bash
grep -rhoE "https://[a-zA-Z0-9.-]+" src/ --include=*.ts --include=*.tsx | sort -u
curl -sI https://travellor.vercel.app/ | grep -i content-security-policy
curl -s -m 20 "https://open.er-api.com/v6/latest/THB" | python -c "import json,sys; d=json.load(sys.stdin); print('er-api     MYR per THB', d['rates']['MYR'])"
curl -s -m 20 "https://api.frankfurter.dev/v1/latest?base=THB&symbols=MYR"; echo
curl -s -m 20 -o /dev/null -w 'photon     %{http_code}\n' "https://photon.komoot.io/api/?q=Wat%20Arun&limit=1"
for p in /sw.js /manifest.webmanifest; do curl -s -m 20 -o /dev/null -w "$p %{http_code}\n" "https://travellor.vercel.app$p"; done
```

Every host the code `fetch`es (Supabase, Photon, both rate APIs) must appear in
`connect-src`. Image hosts (Unsplash covers, OSM tiles) fall under the open
`img-src https:`, and `google.com` is only ever a link, so neither needs one.
The two rate APIs should agree to about the fourth decimal.

**The phone test, through Playwright at 375 × 812 against the live site.**
Seed a *synthetic* trip into localStorage (the browser is `--isolated`, and
nobody is signed in, so nothing reaches the cloud), then with
`browser_run_code_unsafe`:

1. `navigator.serviceWorker.ready`, reload, and confirm
   `navigator.serviceWorker.controller` is set — the page is under the worker.
2. `page.context().setOffline(true)`, reload. The itinerary must render, on
   **today** if the seeded dates span it, with costs still converted. Trips
   load from localStorage before any network call, so this is what a phone in
   airplane mode sees.
3. Back online, click through all four tabs (`行程` `想去` `预算` `泰语`):
   `document.documentElement.scrollWidth` ≤ 375 on each, and no visible
   button, link or input under 44px tall. Chip rows and the day strip scroll
   sideways *inside* themselves on purpose — only page-level width counts.
4. `localStorage.clear()` and close the browser when done.

Offline, six console errors are **expected**: two Google Fonts files, the cover
photo, and the two rate APIs. The app falls back to system fonts and the
stored rate, which is the design. Online there should be **zero** — a
`Refused to connect` line is a CSP gap.

Seed with the real field names or the budget tab lies to you. An expense is
`paidByTravelerId` and `splitWithTravelerIds`; get those wrong and the
settlement reads "X 付给 Unknown", which looks like an app bug and is not.

**What to tell the group before they fly**: open the trip once on Wi-Fi and add
the app to the home screen. iOS clears a site's data after about a week
without a visit, and a friend who loses it arrives as a new anonymous account
whose seat the organiser has to Release.

## What "good" looks like

Report it plainly, and never infer a layer you did not actually check:

- All tests pass (294+), build clean, 6 known lint warnings
- Live bundle hash matches a local build of this commit
- Three tables answer `[]` with 200; `join_trip` is 404, `invite_roster` is
  `[]`, `claim_seat` says `NOT_SIGNED_IN`
- Email provider on, anonymous users on, confirm email off, sign-ups open
- Keep-alive `active` with a success in the last few days
- No raw shades, no orphaned strings
- Before a trip: rate APIs, Photon and the CSP line up; the worker controls
  the page; a saved trip opens offline; four tabs fit 375px

## Two invariants worth re-reading before touching money or sync

**The pot and the splitter are two halves of one sum.** `computeKitty` returns
`coveredIds`, and `BudgetTracker` skips exactly those expenses when building
balances. Counting them in both places overstates every debt in the list.
The tests in `kitty.test.ts` guard the drawdown rules — change them in
`kitty.ts`, not in a component.

**Writes are compare-and-set.** `upsertTripCloud` sends the `updated_at` this
browser last saw and retries through `mergeRemoteTrip` if the row moved. A
remote update merges *only* when there is unsent local work; when local is
clean the remote copy replaces ours outright, which is what makes other
people's deletions stick. Merging always resurrects deleted rows forever;
merging never is what silently ate edits.
