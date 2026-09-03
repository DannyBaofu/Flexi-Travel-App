# TravelSync

TravelSync is a mobile-first trip planner for small groups travelling together. It is designed around shared itinerary planning, live budget tracking, and optional cloud sync for friends who are already on the same trip.

The app runs in browser storage by default, and it can optionally connect to Supabase for real-time collaboration and invite-based sharing.

## What this project includes

- Multi-day itinerary planning with activity cards and day-by-day structure
- Budget tracking with expense logging and shared-fund support
- Home currency / trip currency conversion with live FX refresh
- Invite-based sharing with role handling for admin, member, and viewer
- Local snapshot share support for older share links and offline fallback
- Trip settings, trip creation, and role-aware editing permissions
- Mobile-friendly layout tuned for phone screens

## Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS v4
- Supabase for optional cloud sync
- Vitest + Testing Library for tests

## Getting started

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The app runs on the default Vite port:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

### Test and lint

```bash
npm run test
npm run lint
```

## Optional cloud sync setup

The app works without any Supabase keys in local-only mode. If you want invite links, shared trip syncing, and cloud-backed trip storage, add the following env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

There is an example file in the repo:

```bash
cp .env.example .env
```

Then fill in your Supabase project values.

See [SETUP-CLOUD.md](SETUP-CLOUD.md) for the full configuration steps.

## Auth model

This app does not use email-based sign-in for friends. Instead, the flow is based on an ID and password, which the app converts internally to a travel email format so Supabase can authenticate the account.

Important:

- Email confirmation must be turned off in Supabase for this login flow to work
- The project uses a custom ID domain such as `danny@travellor.app`
- The app should never expose the raw email in the UI; it shows the mapped ID instead

## Sharing model

TravelSync supports two kinds of sharing:

1. Cloud invite links
   - Short, shareable links such as `/j/AB3F7K`
   - Live sync between signed-in users
   - Role-based access: admin, member, viewer

2. Snapshot share links
   - Older URL-based trip payloads for offline or fallback sharing
   - Still parsed for compatibility, but not the primary path for live collaborative editing

## Repo conventions

This repository expects:

- Chinese as the default UI language, with English toggle support
- Semantic theme tokens instead of raw Tailwind color names
- No user-visible strings hardcoded in components; text is handled through the i18n layer
- Mobile-first UI behavior with phone widths around 375px in mind
- Local storage persistence for trip state unless cloud sync is configured

## Notes

- Trips persist in browser local storage unless Supabase is enabled
- Cloud sync is wired in but remains dormant until the environment variables are set
- The default app is intentionally usable without billing or backend setup

## License

This project does not currently define a project license in the repository. If you plan to distribute or publish it, add a license file before shipping externally.
