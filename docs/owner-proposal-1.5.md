# What daisyUI needs from EmVB 1.5 (proposal for the owner)

Status: draft for review. Not posted. Written 2026-11-22 after testing daisyUI on EmVB 1.4 with the
extension API only, on production, with no core change.

## Where we are

Two earlier versions of this work looked professional:

- The provider API, then the first extension API on a fork of EmVB 1.3. Components rendered their own
  markup (real `dialog`, `table`, `kbd`, `input type=range`, aria attributes), had containers that take
  children, list parts (menu rows, tabs, accordion rows, carousel slides), a render mode (modal open in
  the editor, carousel stacked), per-block theme, a "daisyUI" group in the Add panel, and readable names in
  Layers. The fork's core delta, measured between `extensions-clean` and `extensions-ux` in
  `packages/emvb/src`: 34 files, +1,401 and -66 lines.
- EmVB 1.4 with the released extension API. Only three components are production quality (button, badge,
  card). A test build of the other 66 renders all of them, but the result is much weaker. Measured on the
  public page: about 30 read as the daisyUI component, 19 are partial, 6 are wrong (toggle, range, tabs,
  table and two more). Those verdicts are visual, at 1024 px, and come from `per-component-2026-11-22.md`.

The gap is not styling. 1.4 elements can only return built-in nodes, and that loses things CSS cannot bring back.

## What 1.4 cannot do (measured from source and on the live page)

- Tags the built-ins never produce: `dialog`, the `table` family, `kbd`, `pre`, `code`, `strong`, `time`,
  `article`, `aside`, `header`, `footer`, `caption`.
- Attributes the built-ins cannot carry: `role` and most `aria-*`, `placeholder`, `checked`, `open`, `rows`,
  `selected`, `accept`, `inputmode`, `scope`, `for`, `data-*`. Range has no built-in at all: it becomes a text
  input. Tabs lose their names: the test tabs all read "Option A".
- The daisy class lands on EmVB's wrapper `div`, not on the `<input>`, so daisyUI's checkbox, radio and toggle
  styling cannot reach the control. Our workaround resets the wrapper, and the toggle becomes a plain checkbox.
- Limits that forced workarounds: 32 elements per extension (we ship three packages for 66 elements), 256 KB
  stylesheet (a full daisyUI build is about 285 KB), 512 class names (ours is about 640).
- EmVB's base CSS is unlayered, so it beats daisyUI's `@layer` CSS. We flatten the layers at build time.
- No per-block theme, and the Add panel and Layers show the extension id ("ext:emvb-ext-daisy-test-a/t-alert")
  and an "Extensions" heading, not the element and extension labels.
- Our test elements have no editable fields. They are static samples, so text, variants and images cannot be
  edited. That alone makes them feel unfinished.

## What we propose for 1.5, in order of value

All additive, all behind the sanitizers you already have.

1. **Markup output.** An element may return `{ markup: VNode }`. Tags and attributes come from the serializer
   allowlist, classes from the extension allowlist, unsafe `href` and `src` and `on*` are dropped, and `style`
   is dropped. This one change unlocks `dialog`, `table`, `kbd`, `pre`, `code`, range and aria. We have the
   check written (`markup.ts`, 88 lines, with tests on the 1.3 base). On top of 1.4.0 only the types and the
   check exist. The render path is not wired yet.
2. **Containers with children.** An element can declare a slot, so a card, hero or drawer holds nodes the user
   drops in.
3. **List parts.** Rows that sit inside a parent: menu items, tabs, accordion rows, carousel slides.
4. **Render mode.** Pass `editor` or `public` to `render()`, so a modal can show open in the editor and a
   carousel can stack.
5. **Labels.** Use the element's `label` in Layers and the extension's `label` as the Add panel group heading.
6. **Cascade.** Put EmVB's base element CSS in a low layer, so extension CSS in `@layer` works without being
   flattened.
7. **Limits.** Raise the per-extension element cap (our fork used 128), and either raise the CSS and class caps
   or load CSS per element.
8. **Theme.** Allow `data-theme` on a block, or say how extensions should follow the site's mode. Today the site
   sets `data-theme` only after a visitor picks a mode, and daisy follows it.

## Correction before this goes to the owner

The draft #24 comment says "We have a working branch on top of 1.4 for 1, 2, 3 and 4, with tests." That is
not true yet. The working code is on the 1.3 base (`extensions-clean` to `extensions-ux`). On 1.4 it is the
markup check only. Either port it first, or change the sentence to say the branch is on 1.3.

## If the owner declines

EmVB is MIT, so we can carry the fork. The cost: each upstream release needs a rebase of 34 files, and we
carry the test suite ourselves. The production site ran this way before (`15cde19d`).
