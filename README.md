# TravelSync - Customizable Travel Schedule & Online Sharing Web App

A travel schedule and itinerary web application designed for group trips, travel buddies, and solo adventurers. It features day-by-day scheduling, budget tracking with group expense splitting, packing checklists, offline mobile support, and **safe online sharing via compressed links, PIN protection, and QR codes**.

Pre-loaded with a curated **Bangkok 6-Day Explorer (5th - 10th)** itinerary with authentic recommendations, Thai taxi cards, maps, and timings.

---

## 🌟 Key Features

- 📅 **Day-by-Day Timeline Planner**:
  - Time slots, categories (Flight, Hotel, Food, Sightseeing, Shopping, Transport, Nightlife, Relax), Google Maps links, Thai local addresses for taxi drivers, cost estimations, and booking status.
  - Reordering, duplicating, editing, and single-day vs all-days overview.

- 🇹🇭 **Bangkok (5th - 10th) Curated Itinerary Included**:
  - **Day 1 (5th)**: BKK Airport arrival, Sukhumvit check-in, Chao Phraya river boat, sunset Wat Arun, Tichuca 46th-floor rooftop bar.
  - **Day 2 (6th)**: Grand Palace & Emerald Buddha, Wat Pho reclining Buddha & traditional massage, Michelin Krua Apsorn lunch, Ari cafe hopping, Yaowarat Chinatown street food crawl.
  - **Day 3 (7th)**: Platinum Fashion wholesale mall, CentralWorld, Go-Ang Pratunam chicken rice, Siam Square youth street, Jodd Fairs night market (Volcano ribs).
  - **Day 4 (8th)**: Wat Paknam 69m giant golden Buddha, ICONSIAM & SOOKSIAM indoor floating market, river park, Chao Phraya Princess luxury dinner cruise.
  - **Day 5 (9th)**: Maeklong Railway market (train passing through stalls), Damnoen Saduak floating market paddleboat, 2-hour Thai herbal aroma spa, Supanniga Eating Room riverside farewell dinner.
  - **Day 6 (10th)**: Big C Supercenter souvenir shopping (ChaTraMue tea, dried mango, Thai snacks), Som Tam Nua lunch, airport departure.

- 🚗 **"Show Driver" Thai Taxi Cards**:
  - Large Thai script flashcards with addresses and nearest BTS/MRT stations to easily show Bangkok taxi, Grab, Bolt, or Tuk-tuk drivers.
  - Useful Thai phrases with phonetic pronunciations (e.g. *Please turn on meter*, *Stop here*).

- 🔒 **Safe Online Sharing & Collaboration**:
  - **Zero-Backend Instant Share Link**: Trip state is compressed into the URL hash using LZ-String. Anyone opening the link gets the full itinerary instantly.
  - **PIN / Passcode Protection**: Restrict viewing or editing with a custom 4-digit security PIN.
  - **Viewer (Read-Only) vs Collaborative Edit Mode**: Control whether friends can edit activities or only browse.
  - **Mobile QR Code**: Friends can scan the QR code with their phone camera to load the trip on mobile.
  - **Export & Import JSON**: 1-click full trip backup and restore.

- 💰 **Budget & Group Expense Splitter**:
  - Multi-currency support (THB, USD, SGD, MYR, EUR, JPY, GBP, etc.) with real-time conversion rates.
  - Expense ledger with category breakdown charts.
  - Smart debt settlement algorithm (*Who Owes Who*) with net balances.

- 🎒 **Packing & Document Checklist**:
  - Pre-trip passport validity, e-SIM, Grab/Bolt apps, temple attire, medications, and power bank reminders with celebration confetti!

- 🖨️ **Print & PDF Export**:
  - Clean, high-contrast physical print / PDF layout for offline emergency backup.

---

## 🚀 Getting Started

### 1. Start Development Server
```bash
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 2. Build for Production
```bash
npm run build
```
The output will be in the `dist/` directory, ready to be deployed to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

---

## 📱 How to Share with Friends

**With cloud sync on (recommended):** Sign in → **Share Trip** → pick Admin /
Member / Viewer → **Create Invite Link**. You get a ~35-character link like
`/j/AB3F7K` that fits in a QR code, and everything stays in sync afterwards.

**Without cloud sync:** the **Snapshot Share** box packs the whole trip into the
URL. It needs no login and works offline, but the link runs to thousands of
characters (too long for a QR code and for some messaging apps) and it sends a
frozen copy — your friend's later edits never come back to you.

The optional **PIN / Passcode** on snapshot links is a convenience lock, not real
security: the check happens in the browser and the link carries everything needed
to open it. Use cloud invites for anything you actually want restricted.

## Cloud Sync (Supabase)

Optional realtime backend: friends sign in, open a tiny invite link, and every
edit appears on everyone's phone instantly. **Without keys the app runs in
local-only mode** — each browser keeps its own private copy, nothing is saved to
a server, and sharing falls back to the long snapshot links.

**Full walkthrough: [SETUP-CLOUD.md](SETUP-CLOUD.md).** The short version:

1. Create a free project at https://supabase.com (no credit card).
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Authentication → Email → turn **Confirm email OFF** (required, see below).
4. Project Settings → API: copy the Project URL and the `anon` public key.
5. Add both as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in Vercel →
   Project Settings → Environment Variables, then **redeploy**. Copy
   `.env.example` to `.env` with the same values for local dev.

### Login: ID and password

Friends do not use email. The organiser hands out a short ID and a password
(`danny` / `bkk2026`), and the app maps that onto an internal address
`danny@travellor.app` so Supabase has something to identify. No mail is ever
sent there, which is why **Confirm email must be off** — otherwise accounts are
created but can never be confirmed. First-time users register themselves on the
"First Time" tab with the exact credentials they were given; after everyone has
registered, close signups in Supabase.

### Roles and invites

Whoever creates a trip is its admin. Admins create invite links (admin / member /
viewer) from the Share dialog — `https://travellor.vercel.app/j/AB3F7K`, about 35
characters. Friends open the link, sign in, and are joined with that role. Row
Level Security enforces membership and write permissions server-side, so an
invite code is the only way into a trip.
