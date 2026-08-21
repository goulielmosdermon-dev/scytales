# Scytáles website

## The style guide is the styling brain

`styleguide/index.html` documents the system; **`shared/tokens.css` is the single
source of truth it and the site both import.** Work in that order:

1. **Change the token**, not the usage. Colour, type, spacing, radius and the
   Earth band all live in `shared/tokens.css`. One edit propagates to every page
   and to the style guide.
2. **Never hard-code a value** that already exists as a token — no raw hexes, no
   `52px` where `var(--fs-h-2)` exists. The style guide's swatches and type specs
   are rendered *from* the live tokens (`styleguide/js/token-readout.js`), so a
   hard-coded value silently desynchronises the documentation.
3. **If a new value is genuinely needed**, add it as a token and document it in
   the style guide in the same change.

### Gotcha: the Labs overwrite tokens at runtime

`scytales/js/font-lab.js` and `scytales/js/color-lab.js` write `--font-display`,
`--fw-display`, `--lh-display`, `--ls-display`, `--display-1-stroke`, the colour
families and the `--earth-*` tokens onto `:root` on every page load. **Changing a
token in `tokens.css` without matching the Lab's defaults has no visible effect**
— the Lab overwrites it milliseconds later. Always update both.

Font Lab persists to `sessionStorage`, Color Lab and Image Lab to `localStorage`.
A stale saved value beats a new default, so add a migration guard when a token
changes unit or range (see the px→em guard for `lsDisplay`).

## Conventions

- **Cache keys**: every page links `css/site.css?v=…` and versioned scripts. Bump
  the version when editing them or the browser serves the old file.
- **Grid rules**: one shared 1px line, `var(--frame-line, var(--orange-300))`.
  Side lines come from `.site-frame`; sections add `border-bottom` only.
- **Body copy is `--navy-800`.** `--navy-600` is reserved for controls.
  `--neutral-500` is the muted tier (labels, eyebrows) — not body text.
- **Corners are square.** Images and cards use `border-radius: 0`.
- `:nth-*-of-type` over `:nth-*-child` in lists that scripts inject nodes into.

## Layout notes

- `#products` (original "Browse our product line") is `hidden`; `#products-alt`
  is the live take. Swap the `hidden` attribute to switch back.
- `scytales-mobile.html` is a device-preview harness — it iframes the real pages,
  so there is no separate mobile build to keep in sync.
