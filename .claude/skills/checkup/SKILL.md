---
name: checkup
description: Run TravelSync locally and verify the whole app is healthy — tests, build, lint, the live Vercel deploy, the Supabase database, the keep-alive job, and the conventions that rot quietly. Use whenever the user asks to check the app, run it, see if everything still works, or make sure it is fine before a trip; and after a gap of days or weeks when nobody has touched it. Prefer this over running commands ad hoc, because the failures that matter here are silent ones — a paused database, a deploy that never picked up its environment variables, a string left behind by a deleted feature.
---

# Checking TravelSync is actually fine

Four layers, cheapest first. Stop at the first hard failure — a broken build
makes everything below it meaningless.

1. **Local** — does it compile, test and lint
2. **Live** — is the deployed site running *this* commit
3. **Cloud** — is Supabase awake and configured
4. **Drift** — have the conventions quietly rotted

The failures worth catching here are the quiet ones. Nothing in this app
announces that the database paused, or that a deploy shipped without its keys,
or that a string still advertises a feature that was deleted.

## 1. Local

```bash
npm test && npm run build && npm run lint
```

Chained so the first failure stops the line.

**Baselines** — anything beyond these is new and worth reading:

- **75 tests, 10 files.** A *lower* count is as suspicious as a failure; it
  usually means a test file stopped being picked up, not that work vanished.
- **6 lint warnings, all known**: `react(set-state-in-effect)` in
  `ActivityModal`, `ShareModal`, `TripSettingsModal`, `UndoToast` and
  `LocationInput`, plus `react(only-export-components)` in `i18n.tsx`. The
  first four sync form state to a prop when a dialog opens; `LocationInput`
  is a debounced fetch, which is the external-system case the rule exists for.
  Do not chase these.
- **Bundle around 520kB** for the main chunk, plus small per-dialog chunks.

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

Invite codes depend on one function, and it fails silently if the schema was
only half applied:

```bash
curl -s -m 25 "$URL/rest/v1/rpc/join_trip" -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"p_code":"ZZZZZZ"}'
```

`{"code":"P0001",...,"message":"INVALID_INVITE"}` is **correct** — the function
exists and rejected a fake code. "Function not found" means re-run
`supabase/schema.sql`.

Two auth toggles have to stay as they are or nobody can log in:

```bash
curl -s -m 25 "$URL/auth/v1/settings" -H "apikey: $KEY" | python -c "
import json,sys; s=json.load(sys.stdin)
print('email provider  :', s.get('external',{}).get('email'), '(must be True)')
print('confirm email   :', s.get('mailer_autoconfirm'), '(True means OFF, which is required)')
print('signups open    :', not s.get('disable_signup'), '(close once everyone has registered)')
"
```

Sign-in is ID + password mapped onto `<id>@travellor.app`, an address that can
never receive mail. If **Confirm email** is ever switched back on, accounts get
created and then nobody can log in — the app reports it, but it is a confusing
way to find out.

## 5. Is the keep-alive still running

Free Supabase projects pause after 7 days with no requests, and
`.github/workflows/supabase-keepalive.yml` pings every 3 days. It needs no
configuration — it falls back to the public URL and anon key.

**GitHub disables scheduled workflows on a repository with no activity for 60
days.** So the thing preventing the pause can quietly stop, and the database
goes down a week later. After any long gap, open the repo's **Actions** tab:

- Is the workflow enabled, and did it run in the last few days?
- If not, **Run workflow** manually and push something to wake the schedule.

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
existed. Scan every `t('...')` against the dictionary, allow-listing the keys
reached through variables (`mode_*`, `shareAs*`, `viewer*`, `docTitle`, and the
`tab*`/`tab*Short` pairs the TabBar renders from its array):

```bash
python - <<'EOF'
import io, os, re
DYNAMIC = {'mode_bts','mode_mrt','mode_boat','mode_taxi','mode_walk','mode_bus','mode_train',
 'mode_airportRail','shareAsAdmin','shareAsAdminDesc','shareAsMember','shareAsMemberDesc',
 'viewerReadOnly','viewerDesc','docTitle','tabItinerary','tabBudget','tabPhrases',
 'tabItineraryShort','tabBudgetShort','tabPhrasesShort'}
used = set(DYNAMIC)
for root,_,files in os.walk('src'):
    for f in files:
        if f.endswith(('.ts','.tsx')) and f != 'i18n.tsx':
            used |= set(re.findall(r"t\(\s*'([A-Za-z0-9_]+)'", io.open(os.path.join(root,f),encoding='utf-8').read()))
s = io.open('src/utils/i18n.tsx',encoding='utf-8').read()
declared = re.findall(r"^\s{2}([A-Za-z0-9_]+):\s*\{\s*zh:", s, flags=re.M)
print('unused  :', [k for k in declared if k not in used] or 'none')
print('missing :', sorted(k for k in used if k not in declared) or 'none')
EOF
```

Both lists should read `none`. This check earns its place: it caught six keys
orphaned by replacing the delete confirmation with an undo, within minutes of
those commits landing.

## What "good" looks like

Report it plainly, and never infer a layer you did not actually check:

- 75 tests pass, build clean, 6 known lint warnings
- Live bundle hash matches a local build of this commit
- Three tables answer `[]` with 200; `join_trip` says `INVALID_INVITE`
- Email provider on, confirm email off
- Keep-alive ran within the last few days
- No raw shades, no orphaned strings

## Two invariants worth re-reading before touching money or sync

**The pot and the splitter are two halves of one sum.** `computeKitty` returns
`coveredIds`, and `BudgetTracker` skips exactly those expenses when building
balances. Counting them in both places overstates every debt in the list.
Twelve tests guard the drawdown rules — change them in `kitty.ts`, not in a
component.

**Writes are compare-and-set.** `upsertTripCloud` sends the `updated_at` this
browser last saw and retries through `mergeRemoteTrip` if the row moved. A
remote update merges *only* when there is unsent local work; when local is
clean the remote copy replaces ours outright, which is what makes other
people's deletions stick. Merging always resurrects deleted rows forever;
merging never is what silently ate edits.
