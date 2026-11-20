# @perkyzz/emvb-daisyui

Generated daisyUI component provider for EmVB. Layouts store semantic component properties, never arbitrary Tailwind class strings. The provider maps those properties to allowlisted daisyUI classes and returns EmVB-compatible VNodes.

Load `@perkyzz/emvb-daisyui/styles.css` in both the EmVB editor canvas and the published Astro site to guarantee visual parity.

## Host site setup (every site that uses this provider)

The editor canvas is a sandboxed iframe. It cannot see the CSS Astro bundles into public pages, and it only loads stylesheets listed in `emvb({ canvasStyles })`. Without that, daisyUI blocks render as unstyled HTML in the editor while the published page looks fine. The host must compile Tailwind itself (needs `@tailwindcss/vite`, `tailwindcss` and `daisyui` 5.7.50), so it supplies three small pieces:

1. `src/styles/emvb-daisyui.css` (compiled by the host's Tailwind; adjust the `@source` paths to where the packages resolve):

```css
@import "tailwindcss";
@plugin "daisyui" {
  themes:
    light --default,
    dark --prefersdark;
}
@source "../../node_modules/@perkyzz/emvb-daisyui/src/**/*.{ts,tsx}";
@source "../../node_modules/@perkyzz/emvb-daisyui/generated/safelist.css";
```

2. `src/pages/styles/emvb-daisyui.css.ts`, serving the compiled CSS at a stable same-origin URL for the canvas:

```ts
import type { APIRoute } from "astro";
import css from "../../styles/emvb-daisyui.css?inline";
export const GET: APIRoute = () =>
  new Response(css, {
    headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
```

3. In `astro.config.mjs`:

```js
emvb({
  providers: ["@perkyzz/emvb-daisyui"],
  adminEntry: "/src/emvb-admin.ts", // imports "@perkyzz/emvb-daisyui", re-exports "@perkyzz/emvb/admin"
  canvasStyles: ["/styles/emvb-daisyui.css"],
});
```

Import `../../styles/emvb-daisyui.css` in the public page route (or a component rendered only on EmVB pages) so published pages get the same stylesheet. Verify: open the editor, run `document.querySelector('iframe[title="Page canvas"]').contentDocument.querySelectorAll('link')` in the console, and confirm the CSS URL is listed.

## Recipes, validation, and compatibility

WP10-WP12 add ten semantic page/section recipes, catalog-driven accessibility and property validation, and versioned layout migration plus compatibility reporting. Use the focused exports `./recipes`, `./validation`, and `./compatibility`. Detailed recovery and release instructions are in `docs/recovery/WP10-WP12-RECIPES-VALIDATION-COMPATIBILITY.md`.

## Conformance status

The provider currently contains a broad experimental catalog, but only the subset exported by `./conformance` is considered verified. The compatibility boundary is pinned to daisyUI 5.7.50 and Tailwind CSS 4.1.17. Components marked **experimental** in the EmVB palette must not be treated as production-supported until they pass compiled-selector, official-markup, axe-core, keyboard, editor/public parity, and visual-regression gates. See `docs/audits/DAISYUI-CONFORMANCE-AUDIT.md`.

## As an EmVB extension (extensionApi 1.x)

The same components are also shipped as an extension, `@perkyzz/emvb-daisyui/extension`. It needs
only the core's public extension surface, so no provider package is loaded for it.

```js
import { emvb } from "@perkyzz/emvb";
import { daisyUIExtension } from "@perkyzz/emvb-daisyui/extension";

emvb({ extensions: [daisyUIExtension] });
```

- Each component is one element named `daisy-<component>` (for example `ext:daisyui/daisy-card`).
- Containers take a `content` field, one block per line. A line `[label](https://...)` is a link.
- Compound roots (`menu`, `tabs`, `accordion`, `table`, `carousel`) take an `items` field:
  `Label|text` per line. A table takes `cell|cell` per row.
- Core lists the stylesheet and runtime only for pages that render one of these elements
  (`RenderedPage.extensionStyles` and `extensionRuntimes`). The site layout must render them.
- The class allowlist lives in `src/extension/classes.ts`, generated from the catalog. Run
  `bun run gen:classes` after changing a component. A test fails if the file is stale.

Known limits of this extension, compared with the provider:

- Extension elements cannot hold child blocks, so a card's content is text lines, not blocks.
- A `style` attribute is not allowed in markup, so the progress value of `radial-progress` is set
  by its runtime from a `data-` attribute (planned, not yet in this release).
- The extension render does not know the editor mode, so an open modal shows closed on the canvas.
- Recipes (section templates) are not part of the extension.
- Existing content stored as `provider` nodes keeps rendering through the provider entry. It is
  not converted automatically.
