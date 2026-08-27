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

1. Click the **"Share Trip"** button in the top right.
2. Choose **Collaborative Edit** (if you want friends to add places) or **Viewer (Read-Only)**.
3. (Optional) Turn on **"Require PIN / Passcode"** and type a 4-digit code (e.g. `2026`).
4. Click **"Copy Link"** or let friends scan the **QR Code** directly with their smartphone cameras!
