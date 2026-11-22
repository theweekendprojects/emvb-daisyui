# Theming daisyUI extensions for EmVB 1.4

How the daisyUI extension stylesheets pick a theme, what the build does, and what the site must do.
Read this before adding a new theme or a new daisyUI extension, so the same problem is not solved
twice.

## The rule the build follows

- Light is the default palette.
- Dark applies when the visitor's OS prefers dark and the page sets no `data-theme`. This is daisyUI's
  `--prefersdark` flag, which emits `@media (prefers-color-scheme: dark) { :root:not([data-theme]) {...} }`.
- An explicit `data-theme` on `<html>` always wins.

The build lives in `packages/emvb-ext-css/build.ts`. Every extension calls `buildDaisyCss()`, so the
rule is set once, there. Change `DAISY_THEMES` there, not in an extension.

## Why it was needed

The landing layout sets `data-theme` on `<html>` only after a visitor picks light or dark from the
header toggle. With no cookie (the default "system" state) it removes the attribute. The first build
defined the dark palette only under `[data-theme=dark]`, so visitors whose OS prefers dark got the
light palette on a dark site. White inputs, unreadable labels.

## Build facts (measured, not assumed)

- Tailwind 4.3.5 and daisyUI 5.7.50, pinned in `packages/emvb-ext-css/package.json`. Run `bun install`
  there before building. Pins matter: the output changes between versions.
- The daisyUI prefix rewrite also rewrites decimal keyframe stops. `89.9999%` becomes
  `89.daisy-9999%`, which breaks the `text-rotate` animation. `buildDaisyCss()` undoes it. If a new
  keyframe still breaks, check the same pattern first.
- EmVB caps an extension stylesheet at 256 KB. Build one stylesheet per extension, limited to the
  classes that extension's elements use. Test set: 213 KB, 124 KB, 22 KB.
- Output is flattened (no `@layer`). EmVB's base CSS is unlayered and beats `@layer` rules, so
  daisyUI's layers would lose.
- Hand-written utilities (`mx-auto`, `my-4`, `w-fit`) are not covered by the prefix. They live in
  `packages/emvb-ext-daisy/extras.css` and are appended. Each one is a maintenance cost.

## How to add a theme or an extension

1. Put the element tree in the extension's generator. Keep the mapping to EmVB 1.4 built-ins in one
   place.
2. Call `buildDaisyCss({ name, classes, extras })` with the prefixed class names the elements use.
3. Regenerate and check: no `daisy-\d` left in keyframes, `prefers-color-scheme` present once,
   `@layer` count 0, each file under 256 KB.
4. Check the live page with the OS in dark mode, not only light.

## What the site must do (not fixable in the extension)

- The site has to provide light tokens when `data-theme="light"` is set. Right now the landing's
  active theme (`variation-1`) keeps the body dark in both modes. After the header toggle picks light,
  the daisy palette turns white on a dark page. Measured: body `rgb(15,15,26)` in both states.
- Until the site has a light palette, the site's light mode will not match daisy's. That is a landing
  theme decision, not an extension bug.

## Testing notes (what went wrong during this work)

- Preview links expire after about an hour. Mint a fresh one from the editor's Preview button, then
  load it through `/pages/<slug>?_preview=...`. `/<slug>` returns 404.
- An empty `<a href="/profile" class="emvb-link">` inside `<main>` covers the header theme buttons on
  the test page. A real pointer click cannot reach them. Click through the DOM when testing, and log
  the overlap as a separate bug.
- Screenshots: keep each image small. Use a 1024x768 viewport with `fullPage: false`. Full-page
  captures of an 8,000 px page exceed the many-image limit (3,000 px per side) and the request fails.
- The editor shows an "Edit mode" bar when logged in. Public visitors do not see it.

## Open items (not theme)

- Tabs render as a radio row ("Option A") because EmVB 1.4 has no tab built-in.
- The test page has no container, so components span the full width and the layout reads as broken.
- Table, range, toggle and carousel have no 1.4 built-in. See the per-component table in the status
  notes.
