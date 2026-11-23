/**
 * TEST ONLY. Generates the three test extension packages (emvb-ext-daisy-test-a/b/c) that expose
 * every daisyUI catalog component except the three already shipped in emvb-ext-daisy (button,
 * badge, card), so each can be checked live.
 *
 * Each element returns its markup, `{ markup: VNode }`, which EmVB 1.4 plus the markup port checks
 * against the serializer allowlist (tags, attributes, values), the package class allowlist, and the
 * URL rules. Classes are written with the package prefix, so they match the allowlist exactly.
 *
 * Output per package: ext.ts (<= 32 elements, the EmVB 1.4 MAX_ELEMENTS cap), index.ts,
 * package.json (name = extension id, which extension-build.ts requires), daisy-all.css.
 *
 * CSS is built by the shared builder in packages/emvb-ext-css (Tailwind + daisyUI, pinned there),
 * one build per package, limited to the classes that package uses. See docs/theming.md.
 *
 * Run from the repo root: bun run packages/emvb-ext-daisy-test/generate.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DAISY_COMPONENT_CATALOG } from "../../src/catalog/index.ts";
import { daisyRenderer } from "../../src/renderer.ts";
import { buildDaisyCss } from "../emvb-ext-css/build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SHIPPED = new Set(["button", "badge", "card"]);
const PER_EXTENSION = 32; // EmVB 1.4 MAX_ELEMENTS per extension
const MAX_NODES = 200; // markup.ts MAX_NODES
const MAX_DEPTH = 12; // markup.ts MAX_DEPTH
const PREFIX = "daisy-";
/**
 * Components that hold user content, and where it goes: the class of the element that takes the
 * children (`""` for the markup root). Their elements are containers, with an emvb-slot marker there.
 */
const CONTAINER_SLOTS: Readonly<Record<string, string>> = {
  hero: "hero-content",
  modal: "modal-box",
  collapse: "collapse-content",
  drawer: "drawer-content",
  "browser-mockup": "",
};

type RawVNode = { tag: string; attrs: Record<string, string | undefined>; children: (RawVNode | string)[] };
type Markup = { tag: string; attrs: Record<string, string>; children: (Markup | string)[] };

/** The renderer's tree as checked markup: classes get the package prefix, absent attributes go. */
function toMarkup(node: RawVNode | string, classes: Set<string>): Markup | string {
  if (typeof node === "string") return node;
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(node.attrs)) {
    if (value === undefined) continue;
    if (name === "class") {
      const tokens = value
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => PREFIX + t);
      tokens.forEach((t) => classes.add(t));
      if (tokens.length) attrs.class = tokens.join(" ");
    } else {
      attrs[name] = String(value);
    }
  }
  return { tag: node.tag, attrs, children: node.children.map((c) => toMarkup(c, classes)) };
}

/** Put the slot marker last inside the element with this class (or at the root for ""). */
function insertSlot(tree: Markup, className: string): boolean {
  const marker: Markup = { tag: "emvb-slot", attrs: {}, children: [] };
  if (className === "") {
    tree.children.push(marker);
    return true;
  }
  const want = PREFIX + className;
  const visit = (node: Markup | string): boolean => {
    if (typeof node === "string") return false;
    if ((node.attrs.class ?? "").split(" ").includes(want)) {
      node.children.push(marker);
      return true;
    }
    return node.children.some(visit);
  };
  return visit(tree);
}

/** Node count and depth of a markup tree, to stay inside markup.ts's limits. */
function measure(node: Markup | string, depth = 0): { nodes: number; depth: number } {
  if (typeof node === "string") return { nodes: 0, depth };
  let nodes = 1;
  let deepest = depth;
  for (const child of node.children) {
    const m = measure(child, depth + 1);
    nodes += m.nodes;
    deepest = Math.max(deepest, m.depth);
  }
  return { nodes, depth: deepest };
}

const label = (id: string) => id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

// 1. Markup for every non-shipped component.
const markups = new Map<string, { tree: Markup; classes: Set<string> }>();
for (const def of DAISY_COMPONENT_CATALOG) {
  if (SHIPPED.has(def.id)) continue;
  const raw = daisyRenderer.render(daisyRenderer.createNode(def.id, "probe0001"), {}, [], { mode: "public" }) as RawVNode;
  const classes = new Set<string>();
  const tree = toMarkup(raw, classes) as Markup;
  if (def.id in CONTAINER_SLOTS) {
    const slot = CONTAINER_SLOTS[def.id] as string;
    if (!insertSlot(tree, slot)) throw new Error(`${def.id}: no element with class ${PREFIX}${slot} for the slot`);
  }
  const { nodes, depth } = measure(tree);
  if (nodes > MAX_NODES) throw new Error(`${def.id}: ${nodes} nodes exceeds ${MAX_NODES}`);
  if (depth > MAX_DEPTH) throw new Error(`${def.id}: depth ${depth} exceeds ${MAX_DEPTH}`);
  markups.set(def.id, { tree, classes });
}

// 2. Chunk into three extensions and write one package each.
const ids = [...markups.keys()];
const chunks: string[][] = [];
for (let i = 0; i < ids.length; i += PER_EXTENSION) chunks.push(ids.slice(i, i + PER_EXTENSION));
const letters = ["a", "b", "c"];
if (chunks.length > letters.length) throw new Error("more than 3 extensions; add a letter");

const everyClass = new Set<string>();
markups.forEach((m) => m.classes.forEach((c) => everyClass.add(c)));
const allow = JSON.stringify([...everyClass].sort(), null, 2);
const pkgRoot = join(here, "..");

for (const [i, chunk] of chunks.entries()) {
  const L = letters[i];
  const U = L.toUpperCase();
  const dir = join(pkgRoot, `emvb-ext-daisy-test-${L}`);
  mkdirSync(dir, { recursive: true });
  const used = new Set<string>();
  chunk.forEach((id) => markups.get(id)!.classes.forEach((c) => used.add(c)));
  const css = buildDaisyCss({ name: L, classes: [...used] });
  const elements = chunk
    .map(
      (id) => `    {
      name: "t-${id}",
      label: ${JSON.stringify(label(id))},
      group: "content",
      ${id in CONTAINER_SLOTS ? "container: true," : ""}
      schema: { type: "object", properties: {} },
      fields: [],
      defaults: () => ({}),
      render: () => ({
        markup: ${JSON.stringify(markups.get(id)!.tree, null, 2).split("\n").join("\n        ")},
      }),
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
    prefix: "${PREFIX}",
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
  console.log(`extension ${L}: ${chunk.length} elements, ${used.size} classes, stylesheet ${css.length} bytes`);
}

console.log(`components ${ids.length} (excluding ${[...SHIPPED].join(", ")}), classes ${everyClass.size}`);
