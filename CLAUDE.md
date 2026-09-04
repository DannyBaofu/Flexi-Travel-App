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

Four workflows are packaged in `.claude/skills/` — prefer them over improvising:
`checkup` (is the whole app healthy: local, live, Supabase, keep-alive, drift),
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

The 44px comes from `min-h-11` on `btnBase` and `select` in `ui.tsx`, plus
`w-11 h-11` on `iconBtn`. It is a floor, not a height: padding still decides
how big a control looks. Anything written with its own class string — the
category chips, the day strip, the traveller chips in `ExpenseForm` and
`KittyCard` — carries `min-h-11` itself, because it does not go through
`btnBase`. A row of chips at `py-1.5` measures 28px, and the earlier claim that
a small box was fine "inside a 44px row" was wrong: a row catches no taps, only
the control does. A new tappable thing with a hand-written class needs the
floor written in.

**No sample text in inputs.** Placeholders that read `e.g. Bangkok` were removed
on purpose — the label says what the field is, and a fake example is one more
thing to read past.

**Permissions follow one rule:** planning the trip belongs to everyone on it;
*owning* the trip belongs to the organiser. Travellers add, edit, reorder,
duplicate and delete activities, log and delete expenses, and run the shared
pot — everything with an undo behind it. `admin` keeps only the structural
things: trip settings, the roster and its permissions, sharing, and deleting the
trip.

**The roster offers two permissions, not three.** `viewer` is no longer a seat
anyone can be given — for a group of friends all planning together, read-only
was a permission nobody asked for. It survives as a *state*, never a grant: the
fail-closed default for a trip whose role cannot be established, and what
`pushTrip` drops to when the server refuses a write (somebody removed from the
trip, say). The read-only banner stays with it, because that is the case it
explains. Deleting the state as well as the seat would force an unknown role to
resolve to `member`, which is the fail-open default all of this was fixed to
get rid of — so `TripRole` keeps all three, and only `roleOptions` in
`TripSettingsModal` shrank.

So inside the tab components the test is `canEdit = role !== 'viewer'`, **not**
`role === 'admin'` — `ItineraryView`, `BudgetTracker`, `ExpenseForm` and
`KittyCard` all take that shape, and `KittyCard`/`ExpenseForm` name the prop
`canEdit` for the same reason. Reaching for `isAdmin` in one of those is the
mistake to catch in review. Every component still takes a `role` prop, and new
UI needs a deliberate answer for all three.

**An unknown role is a viewer, never an admin.** `role` in `App` is
`activeTrip?.myRole ?? 'viewer'`, and that `??` is load-bearing. It used to be
`|| 'admin'`, on the reasoning that a trip with no role must be one this
browser made — which also meant *anyone* who opened the app and tapped "create
a trip" got the organiser's bar, and that any trip arriving by a path that
forgot to set a role arrived with full rights. So every path now states one:
`createNewTrip` says `admin`, `fetchMyTrips` copies the
enforced role off the membership row, a share link says what it grants, the
realtime handler falls back to `viewer`, and `getTrips` backfills `admin` onto
trips saved before any of that. Add a path that produces a `Trip` and you owe
it a role; leave it off and the trip is read-only, which is the failure worth
having.

The same reasoning guards the sign-in upload: only `myRole === 'admin'` trips
are pushed to the cloud. A guest opening an invite is signed in anonymously a
moment later, and treating "no role" as ours uploaded their unrelated local
trips into the organiser's project under a throwaway account.

**The top bar is two different bars.** An organiser gets Trip Settings, Print
and Share; a traveller gets the language switch, their own trips, creating a
trip, and the way out. There is no "you are a member" banner — announcing a
permission that no longer differs from anyone else's was just noise. The
read-only banner stays, because that one explains why controls are missing.

**The app has three doors, and `EntryGate` is two of them.** Before you are on
a trip you get one of two screens, and which one is the whole point:

- A **stranger** gets a code field and nothing else. No trip name, no roster —
  `invite_roster` is what reveals those and it needs the code. The only other
  exit is a text link to the organiser's sign-in.
- An **organiser** gets the create-trip button, with the code field beside it as
  the secondary action.

The test is `isOrganiser = !isCloudEnabled || (!!user && !user.is_anonymous)`.
Both halves matter. Without the keys the app can only make local trips, so
hiding the button would leave nothing behind it. And an *anonymous* account must
never count: that is a guest who opened an invite link, and this screen leading
with "create your first trip" is exactly how a friend sent the bare domain ended
up admin of an empty trip — their own trip, nothing leaked, but indistinguishable
from being handed the keys to the real one. Adding a state to this screen means
answering "what does a stranger see?" first.

**A locked-out traveller needs the organiser, on purpose.** A friend on a new
phone — or after iOS clears site data, which it does after about a week without
a visit — arrives as a new anonymous account, and their name is held by the old
one. `claim_seat` raises `SEAT_TAKEN`, and the way back is the admin pressing
Release on that seat. So both sides of that exchange are written down:
`seatErrorTaken` tells the traveller to ask the organiser to release it, and
`rosterCloudHint` tells the organiser that Release is what a lockout needs.
Change one and change the other. The alternative — letting anyone with the code
retake an anonymous seat — was considered and rejected: the code would then let
a link-holder become any traveller and edit the money under their name.
Installing the app to the home screen makes the storage loss much less likely,
which is part of why the PWA is worth having.

**A role comes from a seat, and a seat is a name on the roster.** The admin
writes the roster in Trip Settings — a name and a permission each, every name
renameable including their own — and sends one link. Whoever opens it picks
their own name off `SeatPickerModal`, and that claim is what joins them. The
picker deliberately does *not* print what each seat grants: that is between the
traveller and the organiser, and it turned the list into a permissions table
when all it has to ask is which name is yours. `trip_members.traveler_id` binds account to name, with
a partial unique index making "one seat, one holder" a database rule rather than
a hope.

The enforced role lives in `trip_members` and nowhere else. `Traveler.role` in
the trip document is only what the seat *intends* for whoever claims it next,
because the document is member-writable: `claim_seat` clamps it to
member/viewer, so nobody can edit a free seat to `admin` and claim their way up.
Admin is granted only through `set_seat_role`, which checks the caller is one.
Claiming also never changes the role of somebody already on the trip — swapping
which name you are is not a way to change what you may do.

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

Component tests need a DOM, so they carry a `// @vitest-environment jsdom`
docblock; everything else runs in node. Testing Library's automatic cleanup only
registers with vitest globals, which are off — component test files must call
`afterEach(cleanup)` themselves or one test's DOM leaks into the next and
role-permission assertions pass or fail for the wrong reason.

`oxlint` reports six known warnings: `react(set-state-in-effect)` in
`ActivityModal`, `ShareModal` and `TripSettingsModal` (each syncs form state to a
prop when the modal opens), the same rule in `LocationInput` (a debounced fetch,
which is exactly the external-system case the rule carves out) and in
`UndoToast` (a dismissal timer), plus `react(only-export-components)` in
`i18n.tsx`. They are not part of shipping. Git's `LF will be replaced by CRLF` warnings on
this Windows machine are harmless noise.

The itinerary opens on **today** when the trip is running and on day 1 otherwise
— day index is the day offset from `trip.startDate`, so it needs no new field.

**Days follow the dates.** `reconcileDays` in `tripDays.ts` is the single place
day lists are grown, trimmed, re-dated and renumbered, and both trip creation and
the settings modal go through it. It never deletes a day that still has
activities — losing an afternoon of planning to a mistyped date is far worse than
carrying one spare day.

**Writes are compare-and-set.** `upsertTripCloud` sends the `updated_at` this
browser last saw and retries once through `mergeRemoteTrip` if the row moved
underneath it. Without that guard, two people editing different things a minute
apart each push a whole document and the second silently erases the first — with
both of them "in sync" and neither warned. `serverVersions` in `cloudSync.ts` is
what makes it work; anything that writes trips must keep it current.

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

Sharing is **one short cloud invite** (`/j/AB3F7K`, ~35 chars), and only an
admin ever sees the button. The link no longer carries a role — it opens the
door, and the seat claimed behind it decides everything. It is also only useful
until the roster is full: once every name is claimed it grants nothing.

**One live code per trip.** `createInvite` deletes the trip's existing codes
before inserting the new one, and the share sheet calls `fetchInvite` on open
so the organiser is shown the link that is actually out there. Both halves
matter: without the read, re-checking your own link meant pressing the button
that makes a new one; without the delete, no code could ever be revoked, so
every link ever generated stayed a working door. Replacing one now asks first,
because there is no undo for it and the old link may already be in a group
chat. The old code goes before the new one is written on purpose — a failure
part-way leaves the trip with no invite, which is recoverable, rather than
leaving the link you meant to kill alive.

`join_trip` was **dropped** for the same reason (see `schema.sql`). Nothing had
called it since `claim_seat` took over, but it stayed granted to
`authenticated` — and anonymous sign-ins are on, so that is anyone. A code
holder could call it directly and join with no seat at all, walking past both
"one seat, one holder" and the full-roster rule, taking whatever role sat on the
invite row. `claim_seat` is the only door.

**The old snapshot link is gone completely** — the whole trip LZ-compressed
into the URL hash, ~13,000 characters for a 6-day trip, delivering a frozen
copy that never synced back. The generator went when the cloud invite replaced
it; the reader has now gone too, and with it `sharing.ts`,
`PasscodePromptModal`, `hashPin` and the `lz-string` dependency. An old link is
not left to fail silently: `App` still recognises a `#share=` URL and shows
`staleShareLink` ("ask the organiser for a new invite link"), in both the empty
state and the app shell, which is more use than the stale copy would have been.

**The .json export and import are gone too.** They were a power-user escape
hatch in an app for a group of friends, and the two halves only made sense
together — an export nothing can read back is not a backup. The cloud copy every
member syncs to is the real safety net, and the share sheet is now one thing:
the invite.

**Location suggestions come from Photon** (`placeSearch.ts`), an OpenStreetMap
geocoder built for type-ahead. Nominatim is the better-known OSM endpoint but its
usage policy forbids autocomplete, so it is the wrong tool. No API key, no
billing. Requests are debounced 450ms and need 3+ characters; the trip
destination is appended to bias results to the right city.

Invites live at a **path**, not a hash, which is why `vite.config.ts` must keep
`base: '/'`. A relative base makes `/j/AB3F7K` request `/j/assets/...`, Vercel's
catch-all rewrite returns index.html for it, and the page renders blank.

**Guests never type a credential.** Opening an invite takes an anonymous
Supabase account silently, so tapping your name is the whole join. That needs
**Anonymous sign-ins ON** in the project; with it off `signInAnonymously()`
returns false and the flow falls back to the ID + password modal, with the same
seat picker after it. Don't "simplify" that fallback away — it is what keeps the
app working on a project that never flipped the switch.

**ID + password is the organiser's own sign-in**, not something handed to
friends. `cloudSync.ts` maps the ID onto `<id>@travellor.app` because Supabase
needs an email. No mail is ever sent there, so the project must have **Confirm
email off** — `signUpWithId` detects that case and throws `CONFIRM_EMAIL_ON`.
Show `emailToId(user.email)` in the UI, never the raw email.

**RLS policies are subject to RLS.** A sub-select on another table inside a
policy is filtered by *that* table's policies, which is why `member_role` and
`trip_owner` are `security definer` and why an owner check must go through one.
Writing `exists (select 1 from trips ...)` directly into a policy is the bug
that made trip creation silently fail to write its own membership row.

**It is a PWA, and the service worker has one rule worth knowing.** Navigations
are network-first; built assets are cache-first. That split is deliberate:
`/assets/index-<hash>.js` is immutable — change the content and the name
changes — so serving it from cache can never be stale, while a cached
*document* is how a PWA ends up stuck three deploys behind, and this app
deploys on every push. Everything cross-origin is left alone; caching Supabase
responses would mean showing a stale trip while claiming to be in sync, which
is the one failure this app cannot have. `public/sw.js` is plain JS copied
verbatim by Vite, and `main.tsx` registers it **only** under `import.meta.env.PROD`
— in dev it would sit in front of Vite's module server and fight HMR. So
`npm run dev` never exercises it: use `npm run preview` (there is a
`travelsync-preview` entry in `.claude/launch.json`) and stop the server to
test offline for real.

## Data model notes

A `Trip` holds `days[] → activities[]`, plus `expenses` and the optional
`kitty`. Packing checklists, taxi cards, Thai addresses and the booked flag were
all removed; `getTrips()` sheds the dead `checklist` / `taxiCards` / `shareSettings`
fields from older saved trips so they stop riding along in every cloud push.
`shareSettings` was the odd one out: three flags (`isPublic`,
`isPasswordProtected`, `allowGuestEdits`) written onto every new trip and read
by nothing, ever.
`myRole` on a Trip is local-only — it describes *this browser's* permission, so
`tripDocument` strips it (with `myTravelerId`) before any cloud push or share
payload. It does persist to `localStorage`, which is what lets a role survive a
reload offline, and `getTrips` guarantees every stored trip has one.

Two other things are deliberately *not* on the Trip, for the same reason: the UI
language (`travelsync-lang`) and which traveller is "me" for the budget tab's
personal balance (`travelsync-me`, a `tripId → travelerId` map, now in
`services/me.ts` so `App` can write it too). Both describe the device, not the
trip, so they stay in their own `localStorage` keys and need no storage
migration. On a cloud trip `travelsync-me` is a *mirror* of the claimed seat
rather than a free choice — `trip.myTravelerId` wins, or the budget tab would
happily show one person's balance under another's name. `travelsync-me` also supplies the **default payer** when
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
