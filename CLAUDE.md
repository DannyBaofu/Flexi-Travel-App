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

Five workflows are packaged in `.claude/skills/` — prefer them over improvising:
`checkup` (is the whole app healthy: local, live, Supabase, keep-alive, drift),
`ship` (test → build → lint → commit → push → verify live), `i18n` (adding
bilingual UI text), `mobile-check` (verifying 375px phone width), `ui-design`
(designing or reviewing a screen against the Daylight system below).

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
the four tabs live at the *bottom* on phones (`BottomTabs`) and at the top from
`sm:` up (`TopTabs`). Four two-character labels is what fits 375px, which is why
`tabIdeasShort` is `想去` and not `想去清单`.

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

**The top bar is two different bars.** An organiser gets a ⋯ menu — Trip
Settings, Print and the account row — with Share beside it. A traveller gets
the language switch and the trip name, and nothing else: no menu, because a
single item behind one is a tap spent on nothing. Starting a trip of your own
used to be a bare `+` up here and "create a trip" used to head the ⋯ menu;
both are gone, because that action now sits at the foot of the trip sheet,
beneath the list it would join. **The account row is the organiser's too.**
ID + password is *their* sign-in, never something a friend is handed, and a
guest who opened an invite is signed in anonymously — so the row read
`Sign out · ?` and, tapped, threw away the anonymous account their seat is
bound to, which is the lockout only Release can undo. A viewer gets no menu and
nothing to create. There is no "you are a member" banner — announcing a
permission that no longer differs from anyone else's was just noise. The
read-only banner stays, because that one explains why controls are missing.

**The trip name is a door, and the sheet behind it is ordered by time.**
Tapping it opens `TripSwitcher`: every trip on this browser, live first, then
upcoming soonest-first, then finished most-recent-first, with the finished ones
folded behind a disclosure. The ordering is most of the point — the trip
somebody wants is almost always the first row, so "which trip am I on" is
answered before anybody taps. It replaced a `<select>` that printed the
*destination* rather than the title, truncated it to `Bangk…` at 375px, opened
an iOS wheel picker that reads as a form field rather than as somewhere to go,
and gave no sign whether a trip was running or three years over. A finished
trip carries no chip, because the group heading above it already said so.

The phases and the ordering live in `src/services/tripOrder.ts` with tests,
not in the component, because the same question decides what opens on launch.
`preferredTripId` keeps whatever was last open while it still matters and hands
a *finished* trip over to the live one — which is what stopped a March visit
greeting you with November's itinerary — but only when there is a live or
upcoming trip to hand over to, or "all my trips are over" would drag somebody
off the one they were reading. Both `storage.getActiveTripId` and the cloud
bootstrap in `App` go through it: two places answering "which trip is current"
must not answer it two ways, and the old fallback in each was `trips[0]`, which
is storage order and so no order at all.

The sheet is rendered *outside* `<header>` on purpose. `sticky z-40` up there
makes the header a stacking context, so a z-50 dialog nested inside it still
paints at z-40 — and `BottomTabs` is a z-40 sibling later in the document, so
the sheet would open underneath the tabs.

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
only. Commits end with a `Co-Authored-By:` trailer naming the model that wrote
them — the history has been `Claude Opus 5` for a while now.

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

**`vercel.json` carries a Content-Security-Policy, and it names every host the
app talks to** — Supabase over both `https:` and `wss:`, Photon, both
exchange-rate APIs, and Google Fonts. Add a new API and the browser blocks it
with nothing in the network tab but a console line, so the `fetch` and the
header change together. `img-src` is deliberately left open to all of `https:`
because the cover image is a URL anybody can paste into Trip Settings, and
`style-src` has to keep `'unsafe-inline'` because both React's `style` prop and
Leaflet write inline style attributes. `script-src` is `'self'` with no hash or
nonce, which holds only while the build emits no inline script — it does not
today. JSON takes no comments, which is why all of this is written here.

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

**An `update` policy with no `with check` tests the new row with `using`.**
That is Postgres's documented fallback, and it is how `trips_update` let any
member write `owner_id = auth.uid()`: the row they wrote satisfied the very
clause that let them in. Owning the trip is what `trip_owner()` answers, and
three of the `trip_members` policies plus half of `trips_delete` ask it — so
two calls later a member held admin and could release the organiser's own
seat. The `trips_guard` trigger now refuses any change to `owner_id` or `id`.
A trigger rather than a `with check` because it has `old` to compare against;
saying "unchanged" inside a policy means calling `trip_owner()` back against
the pre-statement snapshot, which is correct and far too subtle to survive the
next edit. Add a column to `trips` that grants anything and it needs the same
guard — the document itself is member-writable by design, and that is only
safe while nothing *in* it decides permissions.

`member_role` and `trip_owner` are also explicitly granted to `anon,
authenticated` and revoked from `public`. Postgres grants `execute` on a new
function to `public` by default, which for a `security definer` function means
anyone holding the anon key can call it directly rather than only through the
policies that need it. Both roles are named rather than just `authenticated`
because a policy's functions run as the querying user: revoking from `anon`
turns an unauthenticated read from an empty result into an error.

**It is a PWA, and the service worker has one rule worth knowing.** Navigations
are network-first; built assets are cache-first. That split is deliberate:
`/assets/index-<hash>.js` is immutable — change the content and the name
changes — so serving it from cache can never be stale, while a cached
*document* is how a PWA ends up stuck three deploys behind, and this app
deploys on every push. Everything cross-origin is left alone; caching Supabase
responses would mean showing a stale trip while claiming to be in sync, which
is the one failure this app cannot have. Pictures are the one exception: an
activity photo or cover, once opened, is kept in its own cache
(`travelsync-photos-v1`, oldest out past 150) so the next look needs no
download and no signal. Map tiles are excluded by host — add a tile provider
and it goes in `TILE_HOSTS`, or panning a map evicts the photos. A picture
from another site is opaque to the worker, which cannot tell a photo from an
error page, so the `<img>`'s `onError` posts `forget-photo` and that copy is
dropped; a new place that draws a pasted picture owes the same message.
A worker runs under the policy served with *its own script*, and its `fetch`
is judged by `connect-src` even when the request is for an image — so
`vercel.json` gives `/sw.js` a second header block whose `connect-src` allows
`https:`, and the page's block is matched by `/((?!sw\.js).*)` so the two
never both apply. Without it every pasted picture fails on the live site and
works in `npm run preview`, which serves no policy at all. The page's own
`connect-src` stays the short list.
`public/sw.js` is plain JS copied
verbatim by Vite, and `main.tsx` registers it **only** under `import.meta.env.PROD`
— in dev it would sit in front of Vite's module server and fight HMR. So
`npm run dev` never exercises it: use `npm run preview` (there is a
`travelsync-preview` entry in `.claude/launch.json`) and stop the server to
test offline for real.

**A part that downloads on first use must not crash the app.** The two maps
and every dialog are `React.lazy`, and that download failed two ways that both
ended on the app-wide "something broke" page. A phone still running an older
build asks for a file name the deploy removed, and the catch-all rewrite
answers it with index.html. A phone with no signal cannot fetch a part it has
never opened. `services/chunkRecovery.ts` answers both. On Vite's
`vite:preloadError` it reloads once — only online, at most once per 30 s, and
never while an edit is unsent, because `unsentTripRef` lives in memory and a
reload would drop it silently. A few seconds after the worker is ready, it
downloads every part listed in `src/lazyChunks.ts` so the worker has them
(~70 kB gzipped, once per deploy). Whatever is left is caught by
`ChunkBoundary` around each map and around the dialogs, which says so in place.
Add a `lazy()` and it goes in `lazyChunks.ts` as well; `lazyChunks.test.ts`
fails until it does.

## Data model notes

**The draft list (`trip.ideas`) is a wishlist, not half an itinerary.** One
`TripIdea` is a line of text, a bucket, who typed it and when — no day, no
time, no cost, no map link, because an idea that has to be filled in is an idea
nobody writes down. Its `category` is an `ActivityCategory` rather than a
taxonomy of its own, so promoting one carries its kind, its icon and its spine
tone straight into the activity with nothing to map.

Nothing links an idea to an activity, deliberately: `加入行程` opens
`ActivityModal` with `prefill` (title + category — *not* `activityToEdit`, so
the dialog still says "add"), and `handleSaveActivity` flips that idea's
`planned` in the same trip write. A real link would mean answering what happens
to the idea when the activity moves day or gets deleted, which is a question a
wishlist should never have to have.

`IdeasView`'s single chip row does two jobs — it filters the list *and* it is
the bucket new text goes into — because one control for "which kind am I
working on" beats a filter row plus a tag picker. That only stays honest
because the input's label states the consequence (`添加到「美食餐饮」`, or
`添加想法` in All, which files under `other`). Change one and change the other.
The rest of the tab is in service of one measurement: type, Enter, focus stays,
type again — and a pasted multi-line block becomes one idea per line, because
that is how a group actually collects them.

A `Trip` holds `days[] → activities[]`, plus `expenses`, `ideas` and the
optional `kitty`. Packing checklists, taxi cards, Thai addresses and the booked flag were
all removed; `getTrips()` sheds the dead `checklist` / `taxiCards` / `shareSettings`
fields from older saved trips so they stop riding along in every cloud push.
`shareSettings` was the odd one out: three flags (`isPublic`,
`isPasswordProtected`, `allowGuestEdits`) written onto every new trip and read
by nothing, ever.
`myRole` on a Trip is local-only — it describes *this browser's* permission, so
`tripDocument` strips it (with `myTravelerId`) before any cloud push or share
payload, and `incomingDocument` strips the pair back off every document
arriving from the server. Both halves are needed: the trips row is
member-writable, so nothing stops a member writing those two keys into the
document by hand, and spreading such a row would let them mislabel who "me" is
in somebody else's budget tab and suppress that person's seat prompt. The
server is the only thing entitled to say what the pair are, so they come off at
the door and each caller puts back what it was actually told. It does persist to `localStorage`, which is what lets a role survive a
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

**A side stop (`activity.side`) is a flag, not a child.** It marks something
one person can do while the group is at the stop above it — a stamp to collect,
a cover to photograph — and `ItineraryView` draws it indented with the
`spine-2` rule and a `顺路` chip, against the `spine-1` rule on main stops.
Nothing links it to the stop it sits under: position in the day is the whole
relationship, so moving, duplicating and deleting need no new rules. The two
rules only appear on a trip that has at least one side stop, which is why the
Bangkok trip looks as it always did. Absent means main, so there is no
backfill. The chip and the indent carry the meaning; the colour is the second
cue, and the print view uses an arrow and an indent because paper has no
second colour.

**Go or skip (`activity.advice`) is one word, and the reason is the notes.**
`go`, `maybe` or `skip`, picked in the activity form and shown as a chip on
the closed card — a tick, a question mark or a cross beside the word, in gilt,
plain or clay — so "is this worth the detour" is answered without opening
anything. It is written by a person: the app works nothing out, because the
things that decide it (is the counter open that day, is there stock, how long
is the group there) are not in the trip. There is deliberately no reason
field. The notes already hold it and already have an English copy, and a
second free-text line would need its own translation and its own
stale-translation rule. Absent means nobody has said and nothing is drawn, so
there is no backfill; `ItineraryView` checks the value against
`ACTIVITY_ADVICE` because the document is member-writable.

**An activity photo (`activity.photoUrl`) is a link, never an upload.** The
trip document is what syncs, and a picture inside it would ride along in every
push. The form takes an `https://` link and the opened card shows it whole
(`object-contain`), because it is there to recognise something by — a manhole
cover, a shop front. `ItineraryView` checks the `https://` prefix itself rather
than trusting the form: the document is member-writable, and the CSP's
`img-src` only lets `https:` through anyway. A picture that fails to load hides
itself.

**The shared pot (`trip.kitty`) and the splitter are two halves of one sum.**
Everyone hands the holder the same amount up front, so money the pot paid for is
money *already settled* — `computeKitty` returns `coveredIds`, and
`BudgetTracker` skips exactly those expenses when building balances. Counting
them in both places would overstate every debt in the list, which is the one bug
to watch for when touching either side. The pot drains **oldest bill first** and
covers a bill only in full: when it cannot afford one, that bill stays an
ordinary split expense and the pot keeps its remainder for a smaller one later.
Everything in the pot is in the trip's **own** currency: `perPersonCash` is the
baht each person actually hands the holder, so what is left is cash in minus
bills out — exact, and checkable against the envelope. No rate touches it; the
`≈ MYR` line under it is a reference. It used to be kept in the home currency
and converted at the market rate, which no money changer pays, so the baht it
showed never matched the cash. A pot saved that way still carries `perPerson`
(ringgit); `resolveKitty` converts it to whole notes at the stored rate and the
next edit writes it back as cash.

**The pot can be a ringgit transfer instead**, chosen in its settings
(`potCurrency: 'home'`): everyone sends the holder ringgit, and the holder pays
the baht bills by card or e-wallet from that account. That pot really is
ringgit, so it is counted in ringgit, and each baht bill comes off at the trip
rate, rounded to the sen. The figure is then an estimate — no card pays the
market rate — so the card puts "≈" on what went through the rate and says the
holder's bank app is the real number. This is *not* the old ringgit pot come
back: cash stays the default, and stays exact. The two amounts live in separate
fields (`perPersonCash`, `perPersonHome`) so switching back and forth never
reads 300 ringgit as 300 baht, and a pot with no `potCurrency` is cash. One
currency per pot, not per person — mixing them would break "everyone hands over
the same amount". All of this lives in `src/services/kitty.ts` with tests —
change the drawdown rules there, not in the component.

**Flights (`trip.flights`) are the organiser's to write and everyone's to
read.** Two journeys, `outbound` and `inbound`, each a list of legs plus one
line of meeting note ("07:00 at the check-in counter"); the form is a section
of Trip Settings and `FlightCard` sits above the day strip on the schedule tab,
collapsed by default mid-trip because on day three the plan for today is what
you opened the app for. Times are the local clock at each airport, exactly as
the ticket prints them, and nothing converts between zones — so the card shows
**no per-leg duration and no total travel time**, because without a timezone
table both would be wrong by the zone difference, and a wrong number is worse
than none. The one sum it does perform is the wait at a connection, where both
clocks belong to the same airport; that and the tidy-on-save live in
`src/services/flights.ts` with tests. The organiser's "add flights" prompt
shows only before the trip starts: once it is running, an empty slot above
today's plan is noise. Members never get an edit control here — the admin-only
test is deliberate, because flights are trip structure, not planning.

**Trains (`trip.trains`) are the flights' twin**, with two deliberate
differences. `TrainCard` never works out the wait at a change of trains: the
likeliest change for this group is Padang Besar, where the KTM ticket is in
Malaysian time and the SRT ticket in Thai time, so a subtraction would be an
hour out — it names the station and stops. And an empty train schedule renders
nothing for anybody, organiser included, because most trips have no train and
a second dashed "add" prompt would be noise on all of them; the 火车 section
sits right under 航班 in Trip Settings. The train number is kept as typed, not
upper-cased, because "Special Express 46" is not a code. `travelPhase` (which
card opens by itself when) lives in `flights.ts` and both cards share it.

**The train & boat routes card is the organiser's alone, and stores
nothing.** `TransitRoutesCard` sits under the trains on the schedule tab and
lists every train, MRT, BTS and boat leg in the plan, day by day, from where
to where. It is read off each activity's `transportToNext` by
`services/transitLegs.ts`, so it cannot drift from the days below it. A hop
whose mode is a Grab or a walk still shows when its note *names* a line or a
boat ("或坐 BTS…", "or the orange-flag boat…"), marked as an option rather
than the plan — that is how an alternative gets written down without a second
hop on one activity. Names only: a bare 码头 or "pier" is not a route, because
"walk to the pier" for a longtail ride would list itself. A route from the
accommodation needs an activity at the accommodation to hang its hop on (the
`出门` stops on the Bangkok trip), since the first activity of a day has no
hop leading into it. Members and viewers get nothing, by the organiser's
request: they read each leg in its own day already. A trip with no such leg
renders nothing, organiser included, which is why the card appears on
Bangkok and not on a trip with no trains.

**The day map draws straight lines, and says so.** `DayMap` (Leaflet on
OpenStreetMap tiles, lazy-loaded so most sessions never download it) sits
behind a per-day toggle in `ItineraryView` and shows the pinned stops numbered
in the day's order, joined by a dashed line, with the straight-line distance
of each hop listed under it. Road distance would need a routing service, and
the free ones either forbid production use or need a key — the same reason
location search chose Photon — so the line is labelled a straight line and
the real route is Google's job: every hop, in the connector between two
activities and in the list under the map, links to Google Maps directions
**in transit mode by default**, from pin to pin by coordinates when both ends
have one. That is deliberate and was chosen over storing station names in
the trip: which station to board, which to leave at, the next train and the
fare are live facts Google keeps current for free, and anything written into
the trip would be stale by the day it is needed. `directionsUrl` in `geo.ts`
builds the link; a written `transportToNext.mode` of taxi or walk switches
Google to driving or walking, anything else stays transit. Nothing in the app
writes `transportToNext` any more — its editor went with the demo trip — but
the display code is kept because the field is still on the type. A stop is
pinned only when its place came off the suggestion list: `ActivityModal`
stores `lat`/`lon` on pick and clears them (with the address and map link)
the moment the name is typed over, because a stale pin puts the new name in
the old spot. Activities saved before the fields existed get their pin back
in `getTrips` from the `query=lat,lon` the app wrote into `googleMapsUrl`.
Typed-by-hand locations have no pin and simply stay off the map. All the
geometry lives in `src/services/geo.ts` with tests. Two Leaflet-specific
things: the map container carries `isolate`, or Leaflet's z-indexes (up to
1000) float its zoom buttons over the bottom tabs and modals; and the
markers are `divIcon`s built from theme classes, because the default pin is an
image whose path breaks under a bundler and a number says more anyway.

**The whole-trip map is the same pins, all at once.** `TripMapCard` sits above
the day strip for everyone, collapsed, and renders nothing on a trip with no
pin. It stores nothing: `tripStops` in `geo.ts` reads the pins the days already
carry. On it a pin's number is the *day*, not the stop — a stop's place in its
day is in the popup and the list — and each day takes a tone from
`tripMapTones.ts`: brand, gilt, clay, muted, ink, the five tokens white text
clears AA on, wrapping round on a sixth day. The number is the meaning and the
tone only a second cue, which is why a wrapped tone is acceptable and a new
colour is not. Under the map, one row per day lists its stops; tapping a row
zooms to that day and fades the others, because a trip that starts in Penang
shows Bangkok as one cluster otherwise. `TripMap` is lazy like `DayMap`, and
the tones live in their own file so the card can colour its list without
pulling Leaflet into the main bundle.

**A trip id is a `crypto.randomUUID()`.** It used to be `trip-${Date.now()}`,
which two people creating a trip in the same millisecond could collide on — and
`createTripCloud` reads a duplicate primary key as "already exists", so the
loser went on to ask for a membership row on a stranger's trip. RLS refused it,
which was the right answer to the wrong question. Nothing anywhere reads the
id's shape, so trips saved under the old scheme keep working beside the new
ones and need no migration.

Adding a field that existing saved trips won't have? Add a backfill in
`src/services/storage.ts` — `getTrips()` already migrates older shapes, and
skipping this silently breaks anyone with a saved trip.
