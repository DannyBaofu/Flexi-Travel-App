---
name: ui-design
description: Design and review TravelSync's interface against the Daylight design system — new screens, cards, modals, forms, empty states, and the layout, colour and interaction choices inside them. Use whenever building or reshaping UI in this app, deciding where a control lives or what it should look like, and whenever the user says a screen feels cluttered, plain, confusing, cramped or off. Prefer this over styling by hand, because the failure here is silent: a component that renders fine while quietly forking the token set and the primitives every other screen shares.
---

# Designing TravelSync

## Who is on the other side of the screen

Six friends on a trip. They are not designers, not testers, and not at a desk —
they are standing outside a station on a phone, one-handed, deciding where to
eat. The interface is in **Chinese by default**, and the person holding the
phone did not plan the trip and does not want to learn an app.

That audience decides most arguments here:

- **Phone first, genuinely.** Base styles are the phone; `sm:` unlocks desktop.
  375px is the design width, not the narrow edge case.
- **One obvious action per screen.** Somebody who opens the app mid-trip should
  see what to do without reading.
- **Nothing decorative earns its keep.** Every element costs a tap of attention
  from someone who is walking.

## Three questions before any pixels

1. **What is this screen for?** Name it in one sentence, in the user's words —
   "which day am I looking at", not "the itinerary container".
2. **What is the single action?** That one gets `btnPrimary`. Everything else is
   secondary, ghost, or not a button at all.
3. **What does it look like with nothing in it?** Empty is the first state
   anyone sees. Design it first, not last.

If a proposal can't answer all three, the design isn't finished — say so rather
than shipping a screen that renders.

## The palette is a decision, not a swatch

Every colour lives in the `@theme` block of `src/index.css`. **Naming a raw
Tailwind shade is a bug**, not a shortcut — `bg-emerald-500` and
`text-slate-300` are what makes a future dark theme a rewrite instead of a
second token block.

| Token | What it means | Use it for |
|---|---|---|
| `paper` | the surface | cards, modals, the page |
| `mist` | recessed ground | page background, inputs at rest, footers |
| `hairline` | one border weight, everywhere | every border, every divider |
| `ink` | primary text | titles, values, anything read first |
| `muted` | secondary text | labels, icons, supporting lines |
| `faint` | hint / inactive | placeholders, disabled, read-only, off-tabs |
| `brand` (+`-deep` +`-tint`) | *the* action | one primary button; tint for the active tab or selected chip |
| `gilt` (+`-tint`) | confirmed, settled, paid | the "this is done" chip |
| `clay` (+`-tint`) | careful | destructive buttons and error text |
| `spine-1..4` | category timelines | the vertical rule beside an activity |

Contrast against paper is recorded in the CSS comment — ink 18.0, muted 6.3,
faint 4.9, brand 8.0, gilt 5.8, clay 6.6. All clear AA for body text. A new
colour needs that number before it needs a name.

**Nine categories do not need nine hues.** The icon carries the identity; the
spine runs tonally through the brand. Resist the instinct to give every kind of
thing its own colour — that is how a palette stops meaning anything.

**Colour never carries meaning alone.** Money owed shows a direction arrow *and*
a sentence, never just a hue or a minus sign. Every time you reach for colour to
say something, ask what a colour-blind friend in bright sun reads instead. The
answer has to be "the same thing".

## Reach for a primitive before writing a class string

`src/components/ui.tsx` is the whole kit. Import from it:

- **Buttons** — `btnPrimary`, `btnSecondary`, `btnGhost`, `btnDanger`, and the
  dense pair `btnPrimarySm` / `btnSecondarySm`. Icon-only: `iconBtn`,
  `iconBtnSolid`.
- **Surfaces** — `card` (with `shadow-lift`), `cardFlat` (hairline only). Those
  are the only two elevations that exist.
- **Forms** — `input`, `inputMono`, `select`, `label`.
- **Chips** — `chipBrand`, `chipGilt`, `chipPlain`.
- **Money** — `money` (`font-mono tabular-nums`). The budget tab is a column of
  numbers people compare down the page; proportional digits fight that.
- **`Modal`** — the shell, with the focus trap, Escape, and focus return already
  in it. It takes `title`, optional `subtitle` / `icon` / `footer`, a `size` of
  `sm|md|lg|xl`, and a required `closeLabel` (which must come from `t()`). On a
  phone it rises from the bottom as a sheet; from `sm:` up it is a centred
  dialog. Never hand-roll a dialog — a nested one loses the keyboard trap, and
  keyboard users then tab straight out behind it.

**One primary button per screen.** Indigo at this saturation dominates whatever
it touches; two brand buttons means neither answers "what do I do here". If a
screen seems to need two, one of them is really secondary, or they belong on
different screens.

## Type and weight

The scale in use, by how often it actually appears — match it rather than
inventing a step:

- `text-xs` — the workhorse. Body, labels, most card content.
- `text-sm` — buttons, inputs, and the line you want read first in a row.
- `text-[11px]` — metadata: timestamps, "added by", counts.
- `text-base` — modal titles.
- `text-lg` and up — reserved for a single headline number (a day's total, a
  balance). More than one per screen and neither reads as the answer.

`font-semibold` is this app's emphasis; `font-medium` for the quieter half.
`font-bold` is rare and `text-3xl` rarer — if a new screen needs both, it is
probably competing with the screen it sits next to.

Thai shown to a stranger at arm's length uses the `thai-display` utility and is
never shrunk. That text exists to be pointed at.

## Spacing, shape, motion

Radii are `rounded-control` (10px) for anything you press or type in,
`rounded-card` (12px) for surfaces, `rounded-modal` (16px) for the dialog shell.
Full-round is only for chips and count badges.

There is exactly **one shadow**, `shadow-lift`. A thing is flat or it is lifted.
A new shadow value is a fork.

Motion is `animate-fadeIn` (0.14s) for something appearing in place and
`animate-riseIn` (0.18s) for something arriving from below — menus, toasts,
sheets. Both are short on purpose. `prefers-reduced-motion` is handled globally
in `index.css`, so nothing new needs its own guard.

## Touch

**44px is a floor.** `btnBase` and `select` carry `min-h-11`; `iconBtn` is
`w-11 h-11`. Padding still decides how large a control *looks* — the floor only
shows up on dense variants where padding alone left 34px.

Anything written with its own class string does **not** inherit that floor and
must state it: the category chips, the day strip, the traveller chips in
`ExpenseForm` and `KittyCard` all carry `min-h-11` themselves. A row of chips at
`py-1.5` measures 28px. A 44px row catches no taps — only the control does, so
the floor goes on the control.

## The two widths

Phone layout is the base; `sm:` (640px) is the desktop fork. Two consequences
worth keeping in your head while designing:

- **Tabs live at the bottom on a phone** (`BottomTabs`, fixed, z-40) and at the
  top from `sm:` up (`TopTabs`). The thumb is already at the bottom; the top of
  a phone screen is the hardest place to reach one-handed.
- **Four two-character labels is what fits 375px.** That is why `tabIdeasShort`
  is `想去` and not `想去清单`.

Because the tab bar is fixed, `<main>` carries `pb-24 sm:pb-8` and the undo
toast sits at `bottom-[calc(env(safe-area-inset-bottom)+76px)]`. Anything else
pinned to the bottom of a phone screen owes the same clearance, or it lands
under the tabs.

**The z-index map — and the trap.** 30 is a dropdown or suggestion list, 40 is
the sticky header and the bottom tabs, 50 is a modal, menu or toast. The trap:
`sticky z-40` on the header makes it a *stacking context*, so a z-50 dialog
nested inside it still paints at 40 — underneath the z-40 tabs. That is why
`TripSwitcher` is rendered outside `<header>`. Put a new dialog at the top level
of its screen, not inside a sticky ancestor.

## Patterns already settled — don't redesign these

- **Destructive means undo, not confirm.** A confirm dialog interrupts everyone
  every time and gets clicked through unread: it stops the deliberate deletes
  and waves the accidental ones past. Delete immediately and show `UndoToast`
  (`role="status"`, `aria-live="polite"`, 6 seconds). `window.confirm` survives
  in exactly five places, all of them things undo cannot reach — signing out,
  switching the shared pot off, rotating an invite link that is already in a
  group chat, releasing a seat, deleting a trip. A sixth needs that argument.
- **Empty states explain, they don't apologise.** Say what goes here and offer
  the action that fills it. `EntryGate` is the model — and it shows two
  different screens, because what a stranger sees and what an organiser sees is
  the whole point of it.
- **No sample text in inputs.** Placeholders like `e.g. Bangkok` were removed
  deliberately: the label says what the field is, and a fake example is one more
  thing to read past.
- **Permission-shaped UI hides, it doesn't disable.** A control a traveller
  can't use isn't rendered. The read-only banner stays, because that one
  explains why controls are missing; there is no "you are a member" banner,
  because announcing a permission identical to everyone else's is noise.
- **Focus is the global ring.** `:focus-visible` gives a 2px brand outline at
  8:1 in the base layer — don't add per-component `focus:ring-*`. Inputs are the
  one exception: they set `focus:outline-none` and signal focus with a brand
  border instead. That is deliberate, not a bug to fix.
- **Accessibility already in use, so match it:** `aria-current` on tabs,
  `aria-pressed` on toggles, `aria-expanded` + `aria-haspopup` on menus,
  `aria-label` on every icon-only button, `aria-hidden` on decorative icons.

## Reviewing a screen

Four greps catch the drift that survives review. The first two print nothing
today; the third has two known hits and the fourth is meant to be read, not
passed.

```bash
grep -rnE "(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}" src/ --include=*.tsx | grep -v "\.test\."
```

```bash
grep -rnE "shadow-(sm|md|lg|xl|2xl|inner)" src/ --include=*.tsx
```

```bash
grep -rnE "rounded-(sm|md|lg|xl|2xl|3xl)\b" src/ --include=*.tsx
```

The two `rounded-lg` hits in `PrintItineraryView` are expected: that view is
paper, not screen. It deliberately sits outside the token set — it needs a rule
dark enough for toner (`border-[#B9BECF]`), because the on-screen hairline
prints as nothing. Anything *else* in that list is a fork.

```bash
grep -rn "onClick" src/components/*.tsx | grep -v "min-h-11\|iconBtn\|btn" | head -20
```

The last one is noisy by design — it lists tappable things not built from a
primitive, and each hit needs a human answer about its tap target.

Then look at it, which the greps cannot do. Use the **mobile-check** skill at
375px, and check both languages: Chinese labels are shorter, so a row that fits
by default can still overflow once someone toggles **EN**.

Reading the screenshot, in this order:

1. **Where does the eye land first?** It should be the answer to question 1
   above. If it lands on a border or a chip, the hierarchy is inverted.
2. **Count the brand-coloured things.** More than one action and none of them
   reads as *the* action.
3. **Read it as a stranger.** Does any label only make sense if you built it?
4. **Cover the colour.** Does everything still say what it said?

## Finishing

A design change isn't done until:

- every new string is a `zh`/`en` pair through `t()` — the **i18n** skill, and
  that includes `title`, `placeholder`, `aria-label` and confirm text;
- it has been seen at 375px in both languages — the **mobile-check** skill;
- costs render with `{trip.currency}` / `{trip.homeCurrency}`, never a hardcoded
  symbol;
- `npm test && npm run build && npm run lint` is clean against the known
  baseline, then the **ship** skill.
