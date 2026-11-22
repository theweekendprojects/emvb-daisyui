/**
 * Shared stylesheet builder for EmVB daisyUI extensions. Every extension calls this, so the theme
 * rules below apply to all of them and a new theme does not need its own CSS workaround.
 *
 * What it does:
 * 1. Runs Tailwind 4.3.5 with daisyUI 5.7.50 (pinned in ./package.json; run `bun install` here).
 * 2. Themes: light is the default. Dark is applied when the visitor's OS prefers dark and the page
 *    sets no data-theme (--prefersdark). An explicit data-theme on <html> always wins. This is the
 *    rule the site relies on: the layout sets data-theme only after the visitor picks a mode.
 * 3. Limits the output to the classes given, so each extension stays under the EmVB 256 KB cap.
 * 4. Flattens Tailwind's @layer blocks, because EmVB's base CSS is unlayered and beats @layer rules.
 * 5. Appends `extras`: hand-written rules for utilities daisyUI's prefix does not cover.
 *
 * See docs/theming.md for the reasoning and the site-side requirements.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The theme line every extension stylesheet is built with. Change it here, once. */
export const DAISY_THEMES = "light --default, dark --prefersdark";

/** Remove `@layer x, y;` statements and unwrap `@layer x { ... }` blocks. Keeps the inner rules. */
export function flattenLayers(css: string): string {
  let out = css.replace(/@layer\s+[\w\s,-]+;/g, "");
  const header = /@layer\s+[\w.-]+\s*\{/;
  for (let m = header.exec(out); m; m = header.exec(out)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = open; i < out.length; i++) {
      if (out[i] === "{") depth++;
      else if (out[i] === "}" && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) throw new Error("unbalanced @layer block");
    out = out.slice(0, m.index) + out.slice(open + 1, end) + out.slice(end + 1);
  }
  if (out.includes("@layer")) throw new Error("@layer left after flattening");
  return out;
}

export type BuildOptions = {
  /** Unique name for the temporary input/output files (letters, digits, dashes). */
  name: string;
  /** Prefixed class names the extension uses, for example "daisy-btn". */
  classes: string[];
  /** Hand-written CSS appended after the flattened build. */
  extras?: string;
};

/** Build one extension stylesheet. Returns the CSS text. */
export function buildDaisyCss({ name, classes, extras = "" }: BuildOptions): string {
  const input = `@import "tailwindcss" source(none);
@plugin "daisyui" {
  prefix: daisy-;
  themes: ${DAISY_THEMES};
  logs: false;
}
@source inline("${[...new Set(classes)].sort().join(" ")}");
`;
  const cssIn = join(here, `build-${name}-input.css`);
  const cssOut = join(here, `build-${name}-output.css`);
  writeFileSync(cssIn, input);
  try {
    const tw = spawnSync(join(here, "node_modules", ".bin", "tailwindcss"), ["-i", cssIn, "-o", cssOut], { cwd: here, encoding: "utf8" });
    if (tw.status !== 0) throw new Error("tailwind failed: " + (tw.stderr || tw.stdout));
    // The prefix rewrite also rewrites decimal keyframe stops: 89.9999% becomes 89.daisy-9999%.
    // Undo it, so text-rotate and any other keyframe with decimal stops animates correctly.
    const unmangled = readFileSync(cssOut, "utf8").replace(/(\d)\.daisy-(\d+)%/g, "$1.$2%");
    const flat = flattenLayers(unmangled);
    return extras ? `${flat}\n${extras.trim()}\n` : flat;
  } finally {
    rmSync(cssIn, { force: true });
    rmSync(cssOut, { force: true });
  }
}
