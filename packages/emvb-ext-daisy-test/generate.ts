/**
 * TEST ONLY. Generates the package that exposes every daisyUI catalog component except the
 * three already shipped in emvb-ext-daisy (button, badge, card), so each can be checked live.
 *
 * Output: ext-a.ts, ext-b.ts, ext-c.ts (<= 32 elements each, the EmVB 1.4 MAX_ELEMENTS cap),
 * index.ts, and the classes allow list. Each element renders the daisy catalog's default sample,
 * mapped to EmVB 1.4 built-in nodes with the same generic mapper as the harness
 * (/tmp/phase0/gen-all.test.ts). Tags with no 1.4 built-in fall back to a container.
 *
 * daisy-all.css is the prefixed, flattened stylesheet for all classes (tailwind CLI with
 * `@plugin "daisyui" { prefix: daisy-; themes: light --default, dark }` and `@source inline(...)`),
 * copied from the harness. Regenerate it if the catalog classes change.
 *
 * Run from the repo root: bun run packages/emvb-ext-daisy-test/generate.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DAISY_COMPONENT_CATALOG } from "../../src/catalog/index.ts";
import { daisyRenderer } from "../../src/renderer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SHIPPED = new Set(["button", "badge", "card"]);
const PER_EXTENSION = 32; // EmVB 1.4 MAX_ELEMENTS per extension
const MAX_NODES = 32; // EmVB 1.4 node cap per element output

type VNode = { tag: string; attrs: Record<string, string | undefined>; children: (VNode | string)[] };
type ENode = { id: string; type: string; props: Record<string, unknown>; extClasses?: string[]; children?: ENode[] };

let seq = 0;
const nid = () => "t" + (++seq).toString(36).padStart(7, "0");
const pre = (c: string) => "daisy-" + c;
const classesOf = (v: VNode) => (v.attrs.class ?? "").split(/\s+/).filter(Boolean).map(pre);
const textOf = (c: (VNode | string)[]) => (c.every((x) => typeof x === "string") ? c.join("") : undefined);
const lost = new Set<string>();

// Same mapping as the harness. Keep in sync with /tmp/phase0/gen-all.test.ts if that changes.
function map(x: VNode | string): ENode[] {
  if (typeof x === "string") return x.trim() ? [{ id: nid(), type: "text", props: { text: x } }] : [];
  const t = x.tag;
  const ec = classesOf(x);
  const kids = x.children;
  const w = (n: ENode): ENode => (ec.length ? { ...n, extClasses: ec } : n);
  if (t === "form") return [w({ id: nid(), type: "container", props: {}, children: [{ id: nid(), type: "form", props: { formId: "" }, children: kids.flatMap(map) }] })];
  if (["label", "summary", "legend", "figcaption"].includes(t)) {
    const s = textOf(kids);
    if (s !== undefined) return [w({ id: nid(), type: "label", props: { text: s } })];
  }
  if (["div", "section", "article", "aside", "header", "footer", "main", "nav", "figure", "blockquote", "fieldset", "details", "label", "summary", "legend", "figcaption"].includes(t))
    return [w({ id: nid(), type: "container", props: {}, children: kids.flatMap(map) })];
  if (t === "span") {
    const s = textOf(kids);
    if (s === undefined) return [w({ id: nid(), type: "container", props: {}, children: kids.flatMap(map) })];
    return [w({ id: nid(), type: "label", props: { text: s } })];
  }
  if (t === "p") {
    const s = textOf(kids);
    return [w({ id: nid(), type: "text", props: { text: s ?? "" }, ...(s === undefined ? { children: kids.flatMap(map) } : {}) })];
  }
  if (/^h[1-6]$/.test(t)) return [w({ id: nid(), type: "heading", props: { text: textOf(kids) ?? "", level: Number(t[1]) } })];
  if (t === "a") return [w({ id: nid(), type: "link", props: { text: textOf(kids) ?? "", href: String(x.attrs.href ?? "#") } })];
  if (t === "button") return [w({ id: nid(), type: "button", props: { text: textOf(kids) ?? "" } })];
  if (t === "img") return [w({ id: nid(), type: "image", props: { src: String(x.attrs.src ?? ""), alt: String(x.attrs.alt ?? ""), decorative: false } })];
  if (t === "ul" || t === "ol") {
    const items = kids.map((li) => (typeof li !== "string" && textOf(li.children)) || undefined);
    if (items.every((i) => i !== undefined)) return [w({ id: nid(), type: "list", props: { items: items as string[] } })];
    return [w({ id: nid(), type: "container", props: {}, children: kids.flatMap(map) })];
  }
  if (t === "li") return [w({ id: nid(), type: "container", props: {}, children: kids.flatMap(map) })];
  if (t === "hr") return [w({ id: nid(), type: "divider", props: {} })];
  if (t === "input") {
    const ty = String(x.attrs.type ?? "text");
    const type = ty === "checkbox" ? "checkbox" : ty === "radio" ? "radio" : "text-input";
    return [w({ id: nid(), type, props: { field: "f", label: "" } })];
  }
  if (t === "textarea") return [w({ id: nid(), type: "textarea", props: { field: "f", label: "" } })];
  if (t === "select") return [w({ id: nid(), type: "select", props: { field: "f", label: "" } })];
  lost.add(t);
  return [w({ id: nid(), type: "container", props: {}, children: kids.flatMap(map) })];
}

const countNodes = (n: ENode): number => 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0);
const collectClasses = (n: ENode, out: Set<string>): void => {
  (n.extClasses ?? []).forEach((c) => out.add(c));
  (n.children ?? []).forEach((c) => collectClasses(c, out));
};
const label = (id: string) => id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

// Build the mapped tree for every non-shipped component.
const trees = new Map<string, ENode>();
const allClasses = new Set<string>();
for (const def of DAISY_COMPONENT_CATALOG) {
  if (SHIPPED.has(def.id)) continue;
  const vnode = daisyRenderer.render(daisyRenderer.createNode(def.id, "probe0001"), {}, [], { mode: "public" }) as VNode;
  const tree = map(vnode)[0];
  const n = countNodes(tree);
  if (n > MAX_NODES) throw new Error(`${def.id}: ${n} nodes exceeds ${MAX_NODES}`);
  collectClasses(tree, allClasses);
  trees.set(def.id, tree);
}

const ids = [...trees.keys()];
const chunks: string[][] = [];
for (let i = 0; i < ids.length; i += PER_EXTENSION) chunks.push(ids.slice(i, i + PER_EXTENSION));
const letters = ["a", "b", "c"];
if (chunks.length > letters.length) throw new Error("more than 3 extensions; add a letter");

const allow = JSON.stringify([...allClasses].sort(), null, 2);
const pkgRoot = join(here, "..");
// One package per extension. extension-build.ts requires the package name to equal the extension id,
// and it reads css from the same package as `module`.
const css = readFileSync(join(here, "daisy-all.css"));
chunks.forEach((chunk, i) => {
  const L = letters[i];
  const U = L.toUpperCase();
  const dir = join(pkgRoot, `emvb-ext-daisy-test-${L}`);
  mkdirSync(dir, { recursive: true });
  const elements = chunk
    .map(
      (id) => `    {
      name: "t-${id}",
      label: ${JSON.stringify(label(id))},
      group: "content",
      schema: { type: "object", properties: {} },
      fields: [],
      defaults: () => ({}),
      render: () => (${JSON.stringify(trees.get(id), null, 2)}),
    },`,
    )
    .join("\n");
  writeFileSync(
    join(dir, "ext.ts"),
    `// GENERATED by packages/emvb-ext-daisy-test/generate.ts. TEST ONLY. Do not edit by hand.
export const test${U} = {
  extensionApi: 1 as const,
  id: "emvb-ext-daisy-test-${L}",
  label: "daisyUI test ${U}",
  module: import.meta.url,
  classes: {
    prefix: "daisy-",
    allow: ${allow.split("\n").join("\n    ")},
  },
  css: "./daisy-all.css",
  elements: [
${elements}
  ],
};
export default test${U};
`,
  );
  writeFileSync(join(dir, "index.ts"), `// GENERATED. TEST ONLY.\nexport { test${U}, default } from "./ext.ts";\n`);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: `emvb-ext-daisy-test-${L}`, version: "0.1.0", private: true, type: "module", main: "index.ts", files: ["index.ts", "ext.ts", "daisy-all.css"] },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(dir, "daisy-all.css"), css);
});

console.log(`components ${ids.length} (excluding ${[...SHIPPED].join(", ")}), extensions ${chunks.length}, classes ${allClasses.size}`);
console.log(`fallback tags (no 1.4 built-in): ${[...lost].sort().join(", ") || "none"}`);
