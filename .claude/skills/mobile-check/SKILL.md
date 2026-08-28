---
name: mobile-check
description: Verify TravelSync renders correctly at real iPhone width (375px) and locate horizontal-overflow bugs. Use after any change to the navbar, cards, modals, tabs, or layout, and whenever the user reports something looking cramped, stacked, cut off, or sideways-scrolling on their phone. Browser window resizing does not work below roughly 500px in Chrome, so reach for this skill's iframe technique rather than trusting resize_window or a desktop screenshot.
---

# Checking TravelSync at real phone width

Most of this app's users are on a phone, and its layout is mobile-first —
base styles target the phone and `sm:` unlocks the desktop version. So phone
width is the primary case, not an afterthought.

## Why the obvious approach fails

`resize_window` reports success and changes nothing below roughly 500px —
Chrome enforces a minimum window width. The screenshot still comes back
1536px wide, so the page renders its **desktop** layout and everything looks
fine. This is worse than no check at all, because it produces false confidence.

The reliable workaround is to inject an iframe at phone width into the page
that's already loaded. The iframe gets a genuine 375px viewport, so media
queries and `sm:` breakpoints behave exactly as they do on a real device.

## The technique

Load the app in a tab first. If you're testing a local build, navigate the tab
itself to `http://localhost:<port>` — an HTTPS page cannot embed an HTTP iframe
(mixed content silently blocks it, and the iframe comes back empty).

**1. Inject the frame**

```js
document.getElementById('mviewf')?.remove();
const f = document.createElement('iframe');
f.id = 'mviewf';
f.src = '/';
f.style.cssText = 'position:fixed;top:0;left:0;width:375px;height:740px;' +
  'z-index:999999;border:3px solid red;background:#111;';
document.body.appendChild(f);
```

Give it ~4 seconds to load before measuring. The red border makes the frame
edge obvious in screenshots so you can see what's clipped.

**2. Measure for overflow**

```js
const f = document.getElementById('mviewf');
const d = f.contentDocument;
({
  scrollW: d.documentElement.scrollWidth,
  vw: f.contentWindow.innerWidth,
  overflow: d.documentElement.scrollWidth > f.contentWindow.innerWidth + 2
})
```

If `scrollW` exceeds the viewport width, the page scrolls sideways — the
symptom users describe as "wobbling" or "buttons squashed together". The 2px
tolerance absorbs rounding.

**3. Find the culprit**

```js
const f = document.getElementById('mviewf');
const d = f.contentDocument;
const vw = f.contentWindow.innerWidth;
[...d.querySelectorAll('*')]
  .filter(el => {
    const r = el.getBoundingClientRect();
    return (r.right > vw + 2 || r.left < -2) && r.width > 50;
  })
  .filter(el => !el.closest('.overflow-x-auto'))   // intentional scrollers
  .slice(0, 8)
  .map(el => `${el.tagName}.${String(el.className).slice(0, 60)} ` +
             `w=${Math.round(el.getBoundingClientRect().width)} ` +
             `right=${Math.round(el.getBoundingClientRect().right)}`)
  .join('\n')
```

Excluding `.overflow-x-auto` descendants matters: the day pills and category
filter rows are *supposed* to scroll horizontally inside their containers.
Without that filter they dominate the results and hide the real bug.

**4. Look at it**

Zoom to the frame region rather than taking a full screenshot — the phone
layout is a small slice of a wide window:

```
computer zoom, region: [0, 0, 381, 200]   // topbar
computer zoom, region: [0, 0, 381, 745]   // full frame
```

**5. Clean up**

```js
document.getElementById('mviewf')?.remove();
```

Leaving the frame in place will confuse the next screenshot you take.

## Widths worth testing

**375px** is the important one — iPhone SE and the mini sizes, and the
narrowest common device. If it fits at 375, it fits everywhere. **390px**
covers the iPhone 14/15 class. Anything wider is already desktop-ish.

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

Overflow is the measurable failure, but two others need eyes: text that
truncates so hard it's useless (`Lunch at K…` — prefer `line-clamp-2` over
`truncate` for titles), and information hidden behind `sm:` that a phone user
actually needs — the day cost was once `hidden sm:block`, meaning the primary
audience couldn't see any prices at all.
