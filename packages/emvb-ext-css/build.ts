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

/** Escape a class name the way Tailwind escapes it inside a CSS selector (for example w-1/2 -> w-1\\/2). */
function escapeSelector(name: string): string {
  return name.replace(/[\/.:%\[\]()#,!]/g, "\\$&");
}

/** The breakpoint variants a prefixed class may start with (`sm:`, `max-sm:`), as EmVB's class rule allows. */
const VARIANT = /^((?:max-)?(?:sm|md|lg|xl|2xl)):(.+)$/;
/**
 * With a prefix, Tailwind builds a daisyUI component's responsive form variant first
 * (`max-sm:daisy-timeline-vertical`), not prefix first (`daisy-max-sm:timeline-vertical`), and
 * generates nothing for the prefix-first form. So a class written prefix first is asked for in
 * the variant-first form, and its selector is renamed back after the build.
 */
export function variantFirst(prefixedClass: string): string {
  const m = VARIANT.exec(prefixedClass.slice("daisy-".length));
  return m ? `${m[1]}:daisy-${m[2]}` : prefixedClass;
}
/**
 * Tailwind utilities (mx-auto, my-4, w-fit) come out with their plain names. The extension's
 * classes all carry the prefix, so each plain selector is renamed to its daisy- form. This is one
 * systematic pass over the generated CSS, not a per-component rule.
 */
export function prefixUtilitySelectors(css: string, rawNames: readonly string[]): string {
  let out = css;
  // Longest names first, so a short name never matches inside a longer one.
  for (const raw of [...new Set(rawNames)].sort((a, b) => b.length - a.length)) {
    const escaped = escapeSelector(raw);
    const pattern = new RegExp(`\\.${escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g");
    out = out.replace(pattern, `.daisy-${escaped}`);
  }
  return out;
}

/** Rename each variant-first selector Tailwind built back to the prefix-first name the allowlist uses. */
export function unvariantSelectors(css: string, prefixedClasses: readonly string[]): string {
  let out = css;
  for (const c of prefixedClasses) {
    const asked = variantFirst(c);
    if (asked === c) continue;
    out = out.split(escapeSelector(asked)).join(escapeSelector(c));
  }
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
  // Prefixed names generate daisyUI components; plain names generate Tailwind utilities.
  const prefixed = [...new Set(classes)].filter((c) => c.startsWith("daisy-"));
  const raw = prefixed.map((c) => c.slice("daisy-".length));
  const input = `@import "tailwindcss" source(none);
@plugin "daisyui" {
  prefix: daisy-;
  themes: ${DAISY_THEMES};
  logs: false;
}
@source inline("${[...prefixed.map(variantFirst), ...raw].sort().join(" ")}");
`;
  const cssIn = join(here, `build-${name}-input.css`);
  const cssOut = join(here, `build-${name}-output.css`);
  writeFileSync(cssIn, input);
  try {
    const tw = spawnSync(join(here, "node_modules", ".bin", "tailwindcss"), ["-i", cssIn, "-o", cssOut], { cwd: here, encoding: "utf8" });
    if (tw.status !== 0) throw new Error("tailwind failed: " + (tw.stderr || tw.stdout));
    // The prefix rewrite also rewrites decimal keyframe stops: 89.9999% becomes 89.daisy-9999%.
    // Undo it, so text-rotate and any other keyframe with decimal stops animates correctly.
    const built = readFileSync(cssOut, "utf8");
    const named = prefixUtilitySelectors(unvariantSelectors(built, prefixed), raw);
    const unmangled = named.replace(/(\d)\.daisy-(\d+)%/g, "$1.$2%");
    const flat = flattenLayers(unmangled);
    return extras ? `${flat}\n${extras.trim()}\n` : flat;
  } finally {
    rmSync(cssIn, { force: true });
    rmSync(cssOut, { force: true });
  }
}
