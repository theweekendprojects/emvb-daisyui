/**
 * Scope a stylesheet's global selectors to the extension's own output.
 *
 * Tailwind's base layer (preflight) and daisyUI's global rules are written against bare elements:
 * `h1`, `button`, `*`, `::backdrop`. Loaded on a page they restyle everything, including EmVB's own
 * headings and buttons. This rewrites each top-level selector that has no class to start with
 * `scope` (the wrapper every extension element renders in), so the rule only reaches elements the
 * extension drew.
 *
 * `html` and `body` (preflight's base typography and margin) apply to the wrapper itself.
 * Left alone: class selectors, nested rules (`&:hover`, relative to an already-scoped parent),
 * the page root (`:root`, `:where(:root)`, `[data-theme=...]`, which carry the theme's custom
 * properties), keyframe steps, and at-rules without selectors. `html` and `body` become `scope html`, which matches nothing, so they cannot restyle
 * the page.
 */
/**
 * `:where()` adds no specificity, so a scoped base rule keeps the specificity it had unscoped
 * (`:where(.emvb-ext) button` is (0,0,1), like `button`). A plain `.emvb-ext button` would be
 * (0,1,1) and beat the component's own class (`.daisy-btn`, (0,1,0)).
 */
export const EXTENSION_SCOPE = ":where(.emvb-ext)";

/** Split a selector list at its top-level commas (commas inside `:is(...)` or `[...]` stay). */
function splitTopLevel(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i] as string;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  out.push(list.slice(start));
  return out;
}

/** One top-level selector item, scoped if it is global. */
function scopeItem(item: string, scope: string): string {
  const t = item.trim();
  if (t === "") return item;
  // The base rules for the document (preflight's `html` and `body`) apply to the extension's own
  // wrapper instead: its font, line height and margin, without touching the page around it.
  if (/^(?:html|body)\b/.test(t) && !/[.#[:]/.test(t.replace(/^(?:html|body)/, ""))) return scope;
  if (t.startsWith(":root") || t.startsWith(":host") || t.startsWith("&")) return t;
  // The page's own root: daisyUI declares its theme variables here (`:where(:root)`, `[data-theme=light]`).
  if (/^(?::where\(:root\)|html\[|\[data-theme\b)/.test(t)) return t;
  // Any class selector makes the item the extension's own; keep it.
  if (t.includes(".")) return t;
  return `${scope} ${t}`;
}

/** Rewrite a selector list; the original spacing between items is kept as `, `. */
export function scopeSelectorList(list: string, scope: string = EXTENSION_SCOPE): string {
  return splitTopLevel(list).map((item) => scopeItem(item, scope)).join(", ");
}

/**
 * Rewrite every global top-level selector in `css`. Declarations, at-rule preludes and the
 * contents of `@keyframes` are unchanged. Comments are removed.
 */
export function scopeGlobalSelectors(css: string, scope: string = EXTENSION_SCOPE): string {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // One entry per open block: the prelude that opened it, and whether it is an at-rule.
  const blocks: { head: string; atRule: boolean }[] = [];
  let out = "";
  let pre = ""; // text since the last `{`, `}` or `;`: a selector, an at-rule prelude or a declaration
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      pre += ch;
      if (ch === "\\" && i + 1 < text.length) pre += text[++i];
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      pre += ch;
      continue;
    }
    if (ch === "{") {
      const head = pre.trim();
      const atRule = head.startsWith("@");
      const inKeyframes = blocks.some((b) => /^@(-[a-z]+-)?keyframes\b/.test(b.head));
      const nestedRule = blocks.some((b) => !b.atRule);
      const rewrite = !atRule && !inKeyframes && !nestedRule;
      out += (rewrite ? scopeSelectorList(pre, scope) : pre) + "{";
      blocks.push({ head, atRule });
      pre = "";
      continue;
    }
    if (ch === "}") {
      out += pre + "}";
      blocks.pop();
      pre = "";
      continue;
    }
    if (ch === ";") {
      out += pre + ";";
      pre = "";
      continue;
    }
    pre += ch;
  }
  return out + pre;
}
