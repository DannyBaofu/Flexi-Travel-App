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

**Permissions follow one rule:** additive or reversible actions belong to
`member`; destructive or structural ones belong to `admin`. So members add and
edit activities, tick checklists, and log expenses; admins own deletes,
reordering, trip settings, the expense splitter internals, and invites. `viewer`
is read-only. Every component takes a `role` prop — new UI needs a deliberate
answer for all three roles.

**No ticket references in code**, comments, or test titles. Commit messages
only. Commits end with the `Co-Authored-By: Claude Fable 5` trailer.

## Things that will confuse you once

`resize_window` silently fails below ~500px in Chrome, so a "mobile" screenshot
is really the desktop layout — use the `mobile-check` skill's iframe technique
instead.

Piping Python through a bash heredoc breaks on the Thai and Chinese strings in
this repo (`unexpected EOF`). Write patch scripts to the scratchpad directory and
run them by path.

`oxlint` reports pre-existing `react(set-state-in-effect)` and
`react(immutability)` warnings in `App.tsx` and the modals. They predate current
work and are not part of shipping. Git's `LF will be replaced by CRLF` warnings
on this Windows machine are harmless noise.

Share links come in two kinds: **cloud invites** (tiny URL + code, requires
sign-in, grants a role) and **snapshot links** (the whole trip LZ-compressed
into the URL, works offline). Snapshot URLs routinely exceed QR-code capacity —
that's why the QR only renders below a length threshold rather than always.

## Data model notes

A `Trip` holds `days[] → activities[]`, plus `expenses`, `checklist`, and
`taxiCards`. `myRole` on a Trip is local-only — it describes *this browser's*
permission and is stripped before the trip is stored or shared.

`transportToNext` on an activity describes the hop to the **next** activity that
day, so the last activity of each day has none, and a duplicated activity must
have it cleared.

Adding a field that existing saved trips won't have? Add a backfill in
`src/services/storage.ts` — `getTrips()` already migrates older shapes, and
skipping this silently breaks anyone with a saved trip.
