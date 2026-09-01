---
name: mobile-check
description: Verify TravelSync renders correctly at real iPhone width (375px) and locate horizontal-overflow bugs. Use after any change to the navbar, cards, modals, tabs, or layout, and whenever the user reports something looking cramped, stacked, cut off, or sideways-scrolling on their phone. Drives the page with the Playwright MCP browser tools, which set a genuine 375px viewport, so a desktop screenshot never stands in for the phone layout.
---

# Checking TravelSync at real phone width

Most of this app's users are on a phone, and its layout is mobile-first — base
styles target the phone and `sm:` unlocks the desktop version. So phone width is
the primary case, not an afterthought.

Everything here uses the `playwright` MCP server configured in `.mcp.json`. If
the `browser_*` tools aren't available, the session was started before that file
existed — say so rather than falling back to a desktop screenshot.

## Setting the viewport

`browser_resize` sets a real viewport through CDP, so it goes below Chrome's
minimum window width in both headed and headless mode. Verified on this project:
asking for 375, 390 and even 320 yields exactly that `window.innerWidth`, and
`matchMedia('(min-width: 640px)')` correctly reports false, so `sm:` styles
switch off exactly as they do on a device.

```
browser_resize   { "width": 375, "height": 740 }
```

There is no need for the old iframe trick, and no need to distrust the result.

**Widths worth testing.** **375** is the important one — iPhone SE and the mini
sizes, the narrowest common device. If it fits at 375, it fits everywhere. **390**
covers the iPhone 14/15 class. Anything wider is already desktop-ish.

## Getting the app into a state worth looking at

The Playwright browser runs with `--isolated`, so it starts with **empty
localStorage every time**. Since trips live in localStorage, a fresh navigate
lands on the "no trips yet" empty state — which is not the layout you're trying
to check. Seed a trip first:

```
browser_evaluate { "function": "() => { localStorage.setItem('travelsync_trips_v1', JSON.stringify([ /* one Trip object */ ])); localStorage.setItem('travelsync_sample_purged_v1','1'); return 'seeded'; }" }
```

Then `browser_navigate` again to reload with that trip present. Keep the seed
minimal — a trip with two days and three activities exercises the itinerary rows,
the day pills and the cost summary without a wall of JSON.

The **sign-in button and auth modal only render when cloud sync is configured**
(`isCloudEnabled`). To see them locally, build and serve with placeholder keys:

```
VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_ANON_KEY=dummy npm run build
npx vite preview --port 4173
```

Nothing reaches the network, but the navbar button and modal render.

## Measuring for overflow

`browser_evaluate` executes arbitrary JS, so it is deliberately **not** on the
permission allowlist in `.claude/settings.json` — expect a prompt each time.

```
browser_evaluate { "function": "() => { const d = document.documentElement; return { scrollW: d.scrollWidth, vw: window.innerWidth, overflow: d.scrollWidth > window.innerWidth + 2 }; }" }
```

If `scrollW` exceeds the viewport width, the page scrolls sideways — the symptom
users describe as "wobbling" or "buttons squashed together". The 2px tolerance
absorbs rounding.

## Finding the culprit

```
browser_evaluate { "function": "() => { const vw = window.innerWidth; return [...document.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return (r.right > vw + 2 || r.left < -2) && r.width > 50; }).filter(el => !el.closest('.overflow-x-auto')).slice(0, 8).map(el => `${el.tagName}.${String(el.className).slice(0,60)} w=${Math.round(el.getBoundingClientRect().width)} right=${Math.round(el.getBoundingClientRect().right)}`); }" }
```

Excluding `.overflow-x-auto` descendants matters: the day pills and category
filter rows are *supposed* to scroll horizontally inside their containers.
Without that filter they dominate the results and hide the real bug.

`browser_snapshot { "boxes": true }` is a lighter alternative when you want the
accessibility tree with bounding boxes and no permission prompt.

## Looking at it

`browser_take_screenshot` **requires** a `scale`. Use `"css"` — it yields an
image sized in CSS pixels, so a 375px viewport comes back 375px wide instead of
being multiplied by the device pixel ratio.

```
browser_take_screenshot { "scale": "css" }
browser_take_screenshot { "scale": "css", "fullPage": true }
```

`fullPage` is the one worth taking for a layout review: the phone layout is tall
and the interesting breakage is often below the fold. To isolate one component,
pass `element` (a human-readable description) together with `target` (a selector
or a ref from `browser_snapshot`).

## What this has actually caught

The navbar once needed 460px of horizontal space at a 375px viewport: the logo,
a 200px-wide trip selector, a "New Trip" button, and four right-side buttons
including a full-text "Share Trip". The page scrolled sideways and the buttons
appeared stacked and overlapping. Desktop screenshots showed nothing wrong.

The fixes that generally work on this app's topbar, in order of preference:
tighten padding and gaps below `sm:`, shrink `max-w-[…]` on the trip selector,
drop button labels to icon-only with `hidden sm:inline`, and hide genuinely
desktop-only controls (like Print) with `hidden sm:block`.

## Also worth a glance while you're in there

Overflow is the measurable failure, but three others need eyes:

- Text that truncates so hard it's useless (`Lunch at K…`) — prefer
  `line-clamp-2` over `truncate` for titles.
- Information hidden behind `sm:` that a phone user actually needs — the day cost
  was once `hidden sm:block`, meaning the primary audience couldn't see any
  prices at all.
- Long unbroken strings blowing out a card: snapshot share URLs, Thai addresses,
  and Google Maps links. These need `break-all` or a container that scrolls.

Check both languages. Chinese labels are usually shorter than their English
counterparts, so a row that fits in the default Chinese UI can still overflow
once someone toggles **EN**. Toggle it in the navbar, re-measure, and set it back
to Chinese when you're done.
