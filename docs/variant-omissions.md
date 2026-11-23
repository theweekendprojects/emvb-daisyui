# daisyUI variants in the EmVB catalog

Checked against the official class lists (`skills/daisyui/components/*.md` in saadeghi/daisyui,
daisyUI 5.7.50). Structural parts (`card-body`, `modal-box`, `collapse-title`, `swap-on`,
`drawer-side`, ...) are not variants and are not listed here.

Coverage at the time of writing: 428 official modifiers, 408 selectable in the editor (95.3%).

## Fixed

- `avatar` with no picture: the placeholder class is `avatar-placeholder` (daisyUI 5). It was
  `placeholder`, which the built CSS does not style.

## Deliberate omissions (the native state carries it, no class is emitted)

| Component | Official class | Why not a class |
| --- | --- | --- |
| button | `btn-disabled` | `Disabled` sets `aria-disabled="true"`, and the daisy CSS styles `[aria-disabled="true"]` with the same rule. |
| accordion, collapse | `collapse-open`, `collapse-close` | Built on `<details>`. The `Open` switch sets the native `open` attribute. |
| tabs | `tab-active` | Radio-based tabs. The checked radio is the active tab. |
| drawer | `drawer-open` | Checkbox-based drawer. The checked box is the open state. |
| swap | `swap-active` | Checkbox-based swap. The checked box is the active state. |
| link | `link-neutral` | Neutral links take the base text colour (`text-base-content`), which is what daisyUI's neutral link looks like. |

## Not exposed yet (gap)

These are selectable in daisyUI but the editor has no switch for them.

- menu: `menu-disabled`, `menu-active`, `menu-focus`, `menu-dropdown-show`, `menu-paged`
- tabs: `tab-disabled`
- dropdown: `dropdown-open`, `dropdown-close` (not yet checked against the dropdown's native state)

## Extra classes (not in the official list)

Tailwind utilities used for layout (`w-*`, `min-h-*`, `text-*` alignment, `grid-flow-row`,
`sticky`, `z-50`). Mostly sizing presets for the editor. They are allowed on purpose and are not
daisyUI modifiers.

## Not verified

The EmVB serializer in `vendor/EmVB` is an older copy than the port. It refuses `dialog`,
`table`, `kbd`, `pre`, and the `rows`, `selected`, `accept` and `inputmode` attributes, so
`modal`, `table`, `kbd`, `code-mockup`, `textarea`, `select`, `file-input` and `otp` fail the
allowlist test here. The port allows them.
