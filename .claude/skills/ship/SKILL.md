---
name: ship
description: Build, test, lint, commit, push, and confirm a TravelSync change is actually live on Vercel. Use this whenever a code change in the Travel app is finished and ready to deploy — including when the user says "ship it", "deploy", "push this", "make it live", or simply approves work you just did. Prefer this over running git push by hand, because it catches regressions before they reach production and verifies the deploy actually landed rather than assuming it did.
---

# Ship a TravelSync change

This app auto-deploys: any push to `main` on GitHub triggers a Vercel build that
goes live at **https://travellor.vercel.app**. That convenience is also the risk —
a broken push is a broken production site, and nobody is watching a CI dashboard.
So the job here is to fail *before* pushing, and to prove the deploy landed after.

## The sequence

Run these from the project root (`C:\Users\poh-hock.lee\Desktop\Travel`).

```bash
npm test && npm run build && npm run lint
```

Chaining them means the first failure stops the line, which is what you want —
there's no value in linting code that doesn't compile.

**`npm test`** runs the vitest suite. Treat a failure as a hard stop. This suite
has already earned its keep: it caught a regression where a timezone fix silently
broke the invalid-date fallback in `createNewTrip`. If a test fails, fix the code
or fix the test deliberately — never delete it to get green.

**`npm run build`** is `tsc -b && vite build`. TypeScript errors here are real
errors. A common one after adding an icon is `Cannot find name 'X'` — the icon
was used in JSX but not added to the `lucide-react` import.

**`npm run lint`** is oxlint. It reports several **pre-existing warnings** in
`App.tsx`, `ShareModal.tsx`, `ActivityModal.tsx`, and `TripSettingsModal.tsx` —
`react(set-state-in-effect)` and `react(immutability)`. These are stylistic and
predate the current work. Don't chase them as part of shipping; only new errors
matter. If the user asks for a cleanup pass, that's separate work.

## Commit

House style for this repo:

- **No ticket references** anywhere in code, comments, or test titles — commit
  messages only.
- A short imperative subject line, then a blank line, then bullets explaining
  *what changed and why*. Group bullets by theme when a commit spans areas
  (e.g. "Bug fixes:" / "Improvements:").
- End with the co-author trailer:

```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

Git on this Windows machine prints `LF will be replaced by CRLF` warnings for
nearly every file. That is normal line-ending noise, not a problem — don't
investigate it or try to "fix" it.

```bash
git add -A && git commit -m "..." && git push origin main
```

The remote is `DannyBaofu/Flexi-Travel-App` over HTTPS with cached credentials,
so the push needs no interaction.

## Verify it actually went live

This is the step that's tempting to skip and shouldn't be. A successful `git push`
only proves GitHub received the commit — it says nothing about whether Vercel
built it successfully or whether the change works in production.

Vercel typically takes **30–60 seconds**. Wait, then load
`https://travellor.vercel.app` and check for a marker that only exists in the new
build. Checking for a specific string or element is faster and far more reliable
than eyeballing a screenshot:

```js
// example: confirm a newly added Chinese tab label shipped
({ hasNewFeature: document.body.textContent.includes('泰语速查') })
```

Pick the marker from whatever you just changed — a new label, a removed element
that should now be absent, a renamed button. Report the result plainly. If the
marker is missing, the deploy either hasn't finished or failed; wait once more,
then check the Vercel dashboard rather than pushing again.

## When the browser tab misbehaves

A Chrome extension in this environment occasionally wedges a tab — screenshots
and script injection start timing out even though the page is fine and the server
returns 200. Don't debug the app for this. Open a fresh tab and continue; the
symptom follows the tab, not the site.

## What to report back

State what shipped, the commit hash, and that you confirmed it live — plainly,
without hedging. If tests failed and you fixed something along the way, say so;
a silent fix hides information the user needs.
