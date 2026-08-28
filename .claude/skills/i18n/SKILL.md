---
name: i18n
description: Add or fix bilingual Chinese/English UI text in the TravelSync travel app. Use whenever adding a component, button, label, tooltip, placeholder, confirm dialog, empty state, or any user-visible string — and whenever the user reports English text leaking into the Chinese interface. Chinese is this app's default language, so a feature isn't finished until every string it introduces has a zh/en pair in the dictionary and is rendered through t().
---

# Bilingual text in TravelSync

Chinese is the **default** language of this app; English is the toggle. That
inverts the usual habit of writing English first and translating later — here,
an untranslated string is a visible defect for the primary audience, not a
nice-to-have.

The rule that keeps this working: **no user-visible string is ever written
literally inside a component.** Everything flows through the dictionary.

## How the system works

Everything lives in `src/utils/i18n.tsx`:

- `dict` — a flat object of `key: { zh: '…', en: '…' }` entries, grouped by
  area with `// ---- Section ----` comments. Keep new keys inside the section
  they belong to; the grouping is what stops this file becoming unnavigable.
- `useI18n()` — returns `{ lang, setLang, t }`.
- `t('key')` — looks up the current language.
- `t('key', { n: 5 })` — interpolates `{n}` placeholders in the string.

In a component:

```tsx
const { lang, t } = useI18n();
// ...
<button title={t('shareTrip')}>{t('shareTrip')}</button>
```

Use `lang` directly only when picking between two data fields rather than two
translations — for example `lang === 'zh' ? meta.labelZh : meta.label`.

## Two things that live outside the dictionary

**Activity category names** carry their own pair on each entry in
`src/utils/categoryHelpers.tsx` (`label` and `labelZh`), because they're data
attached to the category, not UI chrome. When you add a category, add both.

**Weekday names** arrive as English strings inside trip data (`"Monday (5th)"`),
so they're translated at render time with `translateWeekday(day.dayOfWeek, lang)`.

## The strings that get missed

Visible button text is easy to remember. These are the ones that slip through,
and each one has shipped as English-in-Chinese-UI at least once:

- `title={...}` tooltips
- `placeholder={...}` on inputs and textareas
- `window.confirm(...)` and `window.alert(...)` messages
- Empty states ("No items in this category.")
- Error and success banners
- Section headings inside modals
- **Currency symbols** — never hardcode `$`. Costs render as
  `{trip.currency}` and `{trip.homeCurrency}`, because the home currency is
  MYR here and configurable per trip.

## Making bulk edits reliably

Wiring a whole component usually means 15–25 exact string replacements. Two
hard-won lessons:

**Write the patch as a Python file, then run it.** Do not pipe Python through a
bash heredoc — the Thai, Chinese, and JSX quoting in these strings reliably
breaks heredoc parsing with `unexpected EOF while looking for matching quote`.
Write the script to the scratchpad directory and execute it by path.

**Make the script report what it couldn't find.** Collect misses instead of
failing silently, so a whitespace mismatch surfaces immediately:

```python
missing = []
for old, new in reps:
    if old not in s:
        missing.append(old[:70].replace('\n', '\\n'))
    else:
        s = s.replace(old, new, 1)
print('missing:' if missing else 'ALL OK')
```

Always write files back with `encoding='utf-8', newline='\n'`. A silent miss is
worse than a crash, because the build still passes and the English text ships.

Watch for **trailing whitespace** in source lines when matching multi-line
blocks — an import list ending in `"  Car, "` will not match `"  Car,"`. If a
replacement mysteriously fails, that's usually why.

## Finishing the job

Grep the components you touched for leftover literals — quoted English inside
JSX text nodes, `title=`, and `placeholder=`. Then build (`npm run build`) and,
if the change is visible, load the page and toggle **EN / 中文** to confirm both
directions render. The toggle is in the navbar and the choice persists per
browser, so remember to set it back to Chinese when you're done testing.
