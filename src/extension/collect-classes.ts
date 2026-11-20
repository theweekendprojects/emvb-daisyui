/**
 * Every class token the daisyUI extension can put on markup. The generator writes the result to
 * classes.ts, and a test fails when that file is stale, so a new class cannot be missed.
 */
import { DAISY_COMPONENT_CATALOG } from "../catalog/index.ts";
import { COLUMNS } from "../catalog/layout-marketing.ts";
import { CONTENT_CLASSES } from "./content.ts";
import { daisyElements, type ExtensionElement, type VNode } from "./elements.ts";

/**
 * Props for one sample. The container `content` and compound `items` fields get sample text only
 * where their default is empty, so a real default (a dock's own item list) is never replaced.
 */
function withSamples(base: Record<string, unknown>, overrides: Record<string, unknown>) {
  const out = { ...base };
  if (!out.content) out.content = SAMPLE_CONTENT;
  if (!out.items) out.items = SAMPLE_ITEMS;
  return { ...out, ...overrides };
}

/** Defaults of an element, read from its schema the way the core fills them in. */
function defaultsOf(element: ExtensionElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(element.schema.properties)) {
    if (prop.default !== undefined) out[key] = prop.default;
  }
  return out;
}

function tokens(node: VNode | string, into: Set<string>): void {
  if (typeof node === "string") return;
  for (const token of (node.attrs.class ?? "").split(/\s+/)) if (token) into.add(token);
  for (const child of node.children) tokens(child, into);
}

const SAMPLE_CONTENT = "Plain line\n[Sample link](https://example.com)";
const SAMPLE_ITEMS = "One|Body text\nTwo|[Link](https://example.com)\nCell|Cell";

/** Sorted, unique class tokens, from defaults and from every option of every select. */
export function collectClasses(): string[] {
  const elements = daisyElements([...DAISY_COMPONENT_CATALOG, COLUMNS]);
  const found = new Set<string>(CONTENT_CLASSES);
  const definitions = [...DAISY_COMPONENT_CATALOG, COLUMNS];
  elements.forEach((element, index) => {
    const definition = definitions[index];
    const base = defaultsOf(element);
    // Empty content too: a container with no children draws its placeholder (the indicator's box).
    const samples: Record<string, unknown>[] = [
      withSamples(base, {}),
      { ...base, content: "", items: "" },
    ];
    for (const field of definition?.fields ?? []) {
      for (const value of Object.keys(field.classMap ?? {})) {
        samples.push(withSamples(base, { [field.key]: value }));
      }
      for (const option of field.options ?? []) {
        samples.push(withSamples(base, { [field.key]: option }));
      }
      // A switch turned on adds its own classes (dock-active, ...), so each boolean is also sampled as true.
      if (field.kind === "boolean") {
        samples.push(withSamples(base, { [field.key]: true }));
      }
    }
    for (const props of samples) tokens(element.render(props).markup, found);
  });
  return [...found].sort();
}
