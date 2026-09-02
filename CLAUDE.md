# TravelSync

A trip planner for a small group of friends travelling together. Bangkok is the
live trip; the audience is non-technical and mostly on phones.

**Live:** https://travellor.vercel.app · pushes to `main` auto-deploy via Vercel.
**Repo:** `DannyBaofu/Flexi-Travel-App`

Stack: React 19 + TypeScript + Vite 8, Tailwind CSS v4 (no UI library), lucide
icons, vitest. Trips persist to `localStorage`; Supabase is wired for optional
cloud sync but stays dormant until `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
are set.

## Skills

Three workflows are packaged in `.claude/skills/` — prefer them over improvising:
`ship` (test → build → lint → commit → push → verify live), `i18n` (adding
bilingual UI text), `mobile-check` (verifying 375px phone width).

## Conventions that are easy to break

**Chinese is the default language.** English is the toggle. No user-visible
string is written literally in a component — everything goes through `t()` with
a `zh`/`en` pair in `src/utils/i18n.tsx`. This includes `title`, `placeholder`,
`window.confirm` text, and empty states, which are the ones that slip through.

**Never hardcode a currency symbol.** Costs render with `{trip.currency}` (THB)
and `{trip.homeCurrency}` (MYR by default, per-trip configurable). The rate
refreshes live from free mid-market APIs with the stored value as the offline
fallback.

**Never name a raw Tailwind shade.** The theme is *Daylight*: a light, white UI
whose whole palette lives in the `@theme` block of `src/index.css` as semantic
tokens — `paper` `mist` `hairline` `ink` `muted` `faint`, `brand` (indigo,
+`-deep` +`-tint`), `gilt` (confirmed), `clay` (destructive), and `spine-1..4`
for category timelines. Write `bg-paper text-muted border-hairline`, never
`bg-white text-slate-400`. A `bg-emerald-500` or `text-slate-300` anywhere in a
component is a bug, not a shortcut: routing everything through tokens is what
makes a future dark theme a second token block instead of a second rewrite.
Radii are `rounded-control` (10px), `rounded-card` (12px), `rounded-modal`
(16px); there is exactly one shadow, `shadow-lift`. There is no
`tailwind.config.js` — Tailwind v4 is CSS-first and never loaded it.

**Buttons, inputs, cards and the modal shell come from `src/components/ui.tsx`.**
Import `btnPrimary` / `input` / `card` / `Modal` rather than re-typing class
strings. Indigo is scarce on purpose — **one primary button per screen**; a
second one means neither answers "what do I do here".

**Colour never carries meaning alone.** Money owed shows a direction arrow *and*
a sentence, never just a sign or a hue. Anything tappable is at least 44px, and
the three tabs live at the *bottom* on phones (`BottomTabs`) and at the top from
`sm:` up (`TopTabs`).

**No sample text in inputs.** Placeholders that read `e.g. Bangkok` were removed
on purpose — the label says what the field is, and a fake example is one more
thing to read past.

**Permissions follow one rule:** additive or reversible actions belong to
`member`; destructive or structural ones belong to `admin`. So members add and
edit activities, tick checklists, and log expenses; admins own deletes,
reordering, trip settings, the expense splitter internals, and invites. `viewer`
is read-only. Every component takes a `role` prop — new UI needs a deliberate
answer for all three roles.

**No ticket references in code**, comments, or test titles. Commit messages
only. Commits end with the `Co-Authored-By: Claude Fable 5` trailer.

## Things that will confuse you once

Browser checks go through the `playwright` MCP server in `.mcp.json`. Its
`browser_resize` sets the viewport via CDP, so 375px is a genuine 375px in both
headed and headless mode — the old Chrome minimum-window-width problem, and the
iframe workaround that used to be needed for it, are both gone. The browser runs
`--isolated`, so localStorage starts empty and the app shows its empty state
until you seed a trip; see the `mobile-check` skill.

Piping Python through a bash heredoc breaks on the Thai and Chinese strings in
this repo (`unexpected EOF`). Write patch scripts to the scratchpad directory and
run them by path.

`oxlint` reports five known warnings: `react(set-state-in-effect)` in
`ActivityModal`, `ShareModal` and `TripSettingsModal` (each syncs form state to a
prop when the modal opens), the same rule in `LocationInput` (a debounced fetch,
which is exactly the external-system case the rule carves out), plus
`react(only-export-components)` in `i18n.tsx`. They are not part of shipping. Git's `LF will be replaced by CRLF` warnings on
this Windows machine are harmless noise.

The itinerary opens on **today** when the trip is running and on day 1 otherwise
— day index is the day offset from `trip.startDate`, so it needs no new field.

**Days follow the dates.** `reconcileDays` in `tripDays.ts` is the single place
day lists are grown, trimmed, re-dated and renumbered, and both trip creation and
the settings modal go through it. It never deletes a day that still has
activities — losing an afternoon of planning to a mistyped date is far worse than
carrying one spare day.

**A remote update only merges when local is dirty.** `App.tsx` tracks the last
unsent push; if there is one, an incoming realtime update goes through
`mergeRemoteTrip` (union by id, keeping unsent work) instead of replacing the
trip. When local is clean the remote copy replaces ours outright, which is what
makes other people's *deletions* stick. Get that condition backwards and you
either resurrect deleted rows forever or go back to silently eating edits.

**The bundle roughly doubles once the Supabase keys are set**, ~350kB to ~550kB.
That is not a regression: without keys `isCloudEnabled` folds to `false` at build
time and the bundler tree-shakes all of `@supabase/supabase-js` away. Compare
like for like before chasing a size jump.

Sharing is **one short cloud invite** (`/j/AB3F7K`, ~35 chars, requires sign-in,
grants a role), and only an admin ever sees the button. The old snapshot link —
the whole trip LZ-compressed into the URL hash, ~13,000 characters for a 6-day
trip — is no longer generated; `sharing.ts` still *parses* incoming ones so links
already sent keep working, and `PasscodePromptModal` still exists for the PIN
they could carry.

**Location suggestions come from Photon** (`placeSearch.ts`), an OpenStreetMap
geocoder built for type-ahead. Nominatim is the better-known OSM endpoint but its
usage policy forbids autocomplete, so it is the wrong tool. No API key, no
billing. Requests are debounced 450ms and need 3+ characters; the trip
destination is appended to bias results to the right city.

Invites live at a **path**, not a hash, which is why `vite.config.ts` must keep
`base: '/'`. A relative base makes `/j/AB3F7K` request `/j/assets/...`, Vercel's
catch-all rewrite returns index.html for it, and the page renders blank.

**Auth is ID + password, not email.** Friends get a short ID from the organiser
and `cloudSync.ts` maps it onto `<id>@travellor.app` because Supabase needs an
email. No mail is ever sent there, so the project must have **Confirm email
off** — `signUpWithId` detects that case and throws `CONFIRM_EMAIL_ON`. Show
`emailToId(user.email)` in the UI, never the raw email.

## Data model notes

A `Trip` holds `days[] → activities[]`, plus `expenses` and the optional
`kitty`. Packing checklists, taxi cards, Thai addresses and the booked flag were
all removed; `getTrips()` sheds the dead `checklist` / `taxiCards` arrays from
older saved trips so they stop riding along in every cloud push and export.
`myRole` on a Trip is local-only — it describes *this browser's*
permission and is stripped before the trip is stored or shared.

Two other things are deliberately *not* on the Trip, for the same reason: the UI
language (`travelsync-lang`) and which traveller is "me" for the budget tab's
personal balance (`travelsync-me`, a `tripId → travelerId` map). Both describe
the device, not the trip, so they stay in their own `localStorage` keys and need
no storage migration. `travelsync-me` also supplies the **default payer** when
logging an expense, which is what lets that form ask for an amount and nothing
else — its date likewise defaults to *today*, not to `trip.startDate`.

`transportToNext` on an activity describes the hop to the **next** activity that
day, so the last activity of each day has none, and a duplicated activity must
have it cleared.

**The shared pot (`trip.kitty`) and the splitter are two halves of one sum.**
Everyone hands the holder the same amount up front, so money the pot paid for is
money *already settled* — `computeKitty` returns `coveredIds`, and
`BudgetTracker` skips exactly those expenses when building balances. Counting
them in both places would overstate every debt in the list, which is the one bug
to watch for when touching either side. The pot drains **oldest bill first** and
covers a bill only in full: when it cannot afford one, that bill stays an
ordinary split expense and the pot keeps its remainder for a smaller one later.
Contributions are in the **home** currency (what people hand over); spending is
converted at `exchangeRate`. All of this lives in `src/services/kitty.ts` with
tests — change the drawdown rules there, not in the component.

Adding a field that existing saved trips won't have? Add a backfill in
`src/services/storage.ts` — `getTrips()` already migrates older shapes, and
skipping this silently breaks anyone with a saved trip.
