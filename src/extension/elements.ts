/**
 * One extension element per daisyUI component (extensionApi 1.x).
 *
 * The element name is `daisy-<component>`. The prefix keeps every name clear of EmVB's built-in
 * element types (`tabs`, `accordion`, `menu`, `carousel`, ... are built in).
 * Rendering reuses the daisyUI provider's own render, so the markup is the same as before, and the
 * render mode from the core ("editor" or "public") is passed through, so an open modal shows open
 * on the canvas.
 */
import { COMPOUND_CONFIG } from "../compound/editor.ts";
import { daisyUIProvider } from "../provider.ts";
import type { DaisyComponentDefinition, DaisyFieldDefinition, DaisyVNode } from "../types.ts";
import { contentChildren, idFor, nodeFor, parseCells, parseItems, type Item } from "./content.ts";

/** Minimal structural types, so this file needs no runtime import from EmVB core. */
export type Json = string | number | boolean;
export type PropSchema =
  | { type: "string"; maxLength?: number; default?: string }
  | { type: "number"; default?: number }
  | { type: "boolean"; default?: boolean }
  | { type: "enum"; values: readonly string[]; default?: string };
export type FieldOption = { value: string | number | boolean; label: string };
export type Field = {
  key: string;
  kind: "text" | "textarea" | "number" | "int" | "select" | "boolean" | "href";
  label: string;
  options?: FieldOption[];
};
export type VNode = { tag: string; attrs: Record<string, string>; children: (VNode | string)[] };
export type RenderMode = "public" | "editor";
export type ExtensionElement = {
  name: string;
  label: string;
  group: "layout" | "content" | "form" | "dynamic";
  schema: { type: "object"; properties: Record<string, PropSchema> };
  fields: Field[];
  /** Holds child nodes in the editor (core 1.x `container`). */
  container?: boolean;
  /** Child element names this container takes (core 1.x `accepts`). */
  accepts?: readonly string[];
  /** A list part: rendered unwrapped inside its parent (core 1.x `part`). */
  part?: boolean;
  render: (
    props: Record<string, unknown>,
    ctx?: { mode: RenderMode; childCount?: number },
  ) => { markup: VNode };
};

/** Core's marker for where child nodes go. Core replaces it before the output is checked. */
export const SLOT_TAG = "emvb-slot";
const slot = (): DaisyVNode => ({ tag: SLOT_TAG, attrs: {}, children: [] });

export const ELEMENT_PREFIX = "daisy-";
/** Daisy themes a block can set. The empty value inherits the page theme. */
export const THEMES = ["", "light", "dark", "corporate", "business", "cupcake"] as const;
const MAX_TEXT_FIELD = 2000;
const MAX_LONG_FIELD = 4000;
const ITEMS_FIELD = "items";
const CONTENT_FIELD = "content";
const THEME_FIELD = "theme";
const DEFAULT_MODE: { mode: RenderMode } = { mode: "public" };

/** The provider's VNode, as the extension output type: no undefined attributes. */
export function toVNode(node: DaisyVNode): VNode {
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attrs)) {
    // An empty class attribute carries nothing; other empty attributes (alt="") can mean something.
    if (value === undefined || (key === "class" && value === "")) continue;
    attrs[key] = value;
  }
  return {
    tag: node.tag,
    attrs,
    children: node.children.map((child) => (typeof child === "string" ? child : toVNode(child))),
  };
}

/** Rows of a `table` root: each line is one row, its `|` cells are the cells. */
function tableRows(
  text: string,
  mode: RenderMode,
): { nodes: ReturnType<typeof nodeFor>[]; vnodes: DaisyVNode[] } {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 40);
  const nodes: ReturnType<typeof nodeFor>[] = [];
  const vnodes: DaisyVNode[] = [];
  for (const line of rows) {
    const cells = parseCells(line);
    const cellVNodes = cells.map((cell) =>
      daisyUIProvider.render(nodeFor("table-cell", { text: cell }), {}, [], { mode }),
    );
    nodes.push(nodeFor("table-row", {}, cells.map((cell) => nodeFor("table-cell", { text: cell }))));
    vnodes.push(daisyUIProvider.render(nodeFor("table-row", {}), {}, cellVNodes, { mode }));
  }
  return { nodes, vnodes };
}

/** The item nodes and their rendered children for one compound root. */
export function itemsFor(
  root: string,
  text: string,
  mode: RenderMode,
): { nodes: ReturnType<typeof nodeFor>[]; vnodes: DaisyVNode[] } {
  if (root === "table") return tableRows(text, mode);
  const items: Item[] = parseItems(text);
  const part = COMPOUND_CONFIG[root as keyof typeof COMPOUND_CONFIG]?.part ?? "";
  const nodes: ReturnType<typeof nodeFor>[] = [];
  const vnodes: DaisyVNode[] = [];
  items.forEach((item, index) => {
    const props: Record<string, string | number | boolean> = { label: item.label };
    if (root === "tabs") props.selected = index === 0;
    if (root === "accordion") props.defaultOpen = index === 0;
    if (root === "menu") props.href = item.body || "#";
    const bodyChildren = root === "menu" ? [] : contentChildren(item.body);
    nodes.push(nodeFor(part, props));
    vnodes.push(daisyUIProvider.render(nodeFor(part, props), {}, bodyChildren, { mode }));
  });
  return { nodes, vnodes };
}

const GROUP: Record<DaisyComponentDefinition["category"], ExtensionElement["group"]> = {
  Actions: "form",
  "Data display": "content",
  Feedback: "content",
  Layout: "layout",
  Marketing: "content",
  Navigation: "content",
  Interactive: "content",
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function fieldFor(field: DaisyFieldDefinition): Field {
  const kind =
    field.kind === "textarea" ? "textarea"
    : field.kind === "number" ? "number"
    : field.kind === "boolean" ? "boolean"
    : field.kind === "select" ? "select"
    : field.kind === "href" ? "href"
    : "text";
  const options = field.options?.map((value) => ({
    value,
    label: field.optionLabels?.[value] ?? titleCase(value),
  }));
  return { key: field.key, kind, label: field.label, ...(options ? { options } : {}) };
}

function schemaFor(field: DaisyFieldDefinition): PropSchema {
  if (field.kind === "number") return { type: "number", default: Number(field.default) };
  if (field.kind === "boolean") return { type: "boolean", default: Boolean(field.default) };
  if (field.kind === "select" && field.options && field.options.length > 0) {
    const current = String(field.default);
    return {
      type: "enum",
      values: [...field.options],
      default: field.options.includes(current) ? current : field.options[0],
    };
  }
  const max = field.kind === "textarea" ? MAX_LONG_FIELD : MAX_TEXT_FIELD;
  return { type: "string", maxLength: max, default: String(field.default ?? "") };
}

const THEME_LABELS: Record<string, string> = { "": "Inherit page theme" };

/**
 * Compound roots that take list parts as child elements. Each part is one item, and the root takes
 * no other child. The root's items text stays as the fallback for a root with no part elements.
 */
const PART_FOR_ROOT: Record<
  string,
  { part: string; label: string; fields: Array<{ key: string; label: string; kind: Field["kind"]; def: string }> }
> = {
  menu: {
    part: "menu-item",
    label: "Menu item",
    fields: [
      { key: "label", label: "Label", kind: "text", def: "Item" },
      { key: "href", label: "Link", kind: "href", def: "#" },
    ],
  },
  carousel: {
    part: "carousel-item",
    label: "Slide",
    fields: [
      { key: "label", label: "Label", kind: "text", def: "Slide" },
      { key: "content", label: "Content (one block per line)", kind: "textarea", def: "" },
    ],
  },
};

const partName = (root: string) => `${ELEMENT_PREFIX}${PART_FOR_ROOT[root]!.part}`;

/** The element for one list part (a menu item or a carousel slide). */
export function partElementFor(root: string): ExtensionElement {
  const spec = PART_FOR_ROOT[root]!;
  const properties: Record<string, PropSchema> = {};
  for (const field of spec.fields) {
    properties[field.key] = { type: "string", maxLength: MAX_TEXT_FIELD, default: field.def };
  }
  return {
    name: partName(root),
    label: spec.label,
    group: "content",
    part: true,
    schema: { type: "object", properties },
    fields: spec.fields.map((field) => ({ key: field.key, kind: field.kind, label: field.label })),
    render: (props, ctx = DEFAULT_MODE) => {
      const values: Record<string, string> = {};
      for (const field of spec.fields) {
        if (field.kind !== "textarea") values[field.key] = String(props[field.key] ?? field.def);
      }
      // Content lines are the item's body. Nothing links to a part's id, so none is written: two
      // parts with the same label would otherwise share one.
      const body = spec.fields.some((f) => f.kind === "textarea")
        ? contentChildren(String(props.content ?? ""))
        : [];
      const markup = toVNode(daisyUIProvider.render(nodeFor(spec.part, values), {}, body, { mode: ctx.mode }));
      delete markup.attrs.id;
      return { markup };
    },
  };
}

/** The extension element for one daisyUI definition. */
export function elementFor(definition: DaisyComponentDefinition): ExtensionElement {
  const id = definition.id;
  const isRoot = Object.hasOwn(COMPOUND_CONFIG, id);
  // A compound root reads its text from its own textarea (items for menus, slides for carousels).
  const textKey = isRoot ? (definition.fields.find((f) => f.kind === "textarea")?.key ?? ITEMS_FIELD) : ITEMS_FIELD;
  const extraKey = isRoot ? textKey : definition.container ? CONTENT_FIELD : undefined;
  const properties: Record<string, PropSchema> = {};
  for (const field of definition.fields) properties[field.key] = schemaFor(field);
  const fields: Field[] = definition.fields.map(fieldFor);
  if (extraKey) {
    // A compound root already has its items field from the catalog, with its sample text as the
    // default. Keep that default, so a new root starts with the same items the settings panel shows.
    const own = definition.fields.find((field) => field.key === extraKey);
    const ownLabel = fields.find((field) => field.key === extraKey)?.label;
    const label = isRoot
      ? `${ownLabel ?? "Items (Label|text per line)"}${PART_FOR_ROOT[id] ? " (used when there are no item elements)" : ""}`
      : "Content (one block per line)";
    properties[extraKey] = {
      type: "string",
      maxLength: MAX_LONG_FIELD,
      default: own ? String(own.default ?? "") : "",
    };
    const entry: Field = { key: extraKey, kind: "textarea", label };
    const at = fields.findIndex((field) => field.key === extraKey);
    if (at >= 0) fields[at] = entry;
    else fields.push(entry);
  }
  properties[THEME_FIELD] = { type: "enum", values: [...THEMES], default: "" };
  fields.push({
    key: THEME_FIELD,
    kind: "select",
    label: "Theme",
    options: THEMES.map((value) => ({ value, label: THEME_LABELS[value] ?? titleCase(value) })),
  });
  const daisyKeys = new Set(definition.fields.map((field) => field.key));
  // Compound roots take their parts as items text, so only the other containers take child nodes.
  const partSpec = isRoot ? PART_FOR_ROOT[id] : undefined;
  const holdsChildren = (definition.container === true && !isRoot) || partSpec !== undefined;

  return {
    name: `${ELEMENT_PREFIX}${id}`,
    label: definition.label,
    group: GROUP[definition.category],
    schema: { type: "object", properties },
    fields,
    ...(holdsChildren ? { container: true } : {}),
    ...(partSpec ? { accepts: [partName(id)] } : {}),
    render: (props, ctx = DEFAULT_MODE) => {
      const mode = ctx.mode;
      const values: Record<string, string | number | boolean> = {};
      for (const key of daisyKeys) {
        const value = props[key];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          values[key] = value;
        }
      }
      const nodeId = idFor(props);
      let markup: DaisyVNode;
      if (isRoot) {
        // Part elements, when there are any, replace the items text. The slot is where they go.
        const withParts = partSpec !== undefined && (ctx.childCount ?? 0) > 0;
        const items = withParts ? { nodes: [], vnodes: [] } : itemsFor(id, String(props[textKey] ?? ""), mode);
        // The provider turns a root's items text into rows when it has no children, so clear it here.
        const node = nodeFor(id, withParts ? { ...values, [textKey]: "" } : values, items.nodes, nodeId);
        const rendered = daisyUIProvider.render(node, {}, items.vnodes, { mode });
        // The provider does not place child nodes, so the slot becomes the root's children: the item
        // elements then sit directly inside the list, where the rows would be.
        markup = withParts ? { ...rendered, children: [slot()] } : rendered;
        // An empty list shows a hint on the canvas only, so an editor knows where to add items.
        const empty = partSpec !== undefined && !withParts && String(props[textKey] ?? "").trim() === "";
        if (mode === "editor" && empty) markup = { ...markup, children: [emptyHint(id)] };
      } else {
        // Content lines come first, then the slot where core places the child nodes. With no
        // content and no child nodes the slot is left out, so an empty container keeps its placeholder.
        const lines = holdsChildren ? contentChildren(String(props[CONTENT_FIELD] ?? "")) : [];
        const hasChildNodes = (ctx.childCount ?? 0) > 0;
        const children =
          holdsChildren && (lines.length > 0 || hasChildNodes) ? [...lines, slot()] : lines;
        markup = daisyUIProvider.render(nodeFor(id, values, [], nodeId), {}, children, { mode });
      }
      const root = toVNode(markup);
      const theme = typeof props[THEME_FIELD] === "string" ? props[THEME_FIELD] : "";
      if (theme && (THEMES as readonly string[]).includes(theme)) {
        root.attrs["data-theme"] = theme;
      }
      return { markup: root };
    },
  };
}

/** The hint an empty menu or carousel shows in the editor: one muted row that says where to add items. */
function emptyHint(root: string): DaisyVNode {
  const text = root === "menu" ? "Add menu items from the Layers panel" : "Add slides from the Layers panel";
  const hint: DaisyVNode = { tag: "span", attrs: { class: "opacity-60 text-sm" }, children: [text] };
  return root === "menu"
    ? { tag: "li", attrs: {}, children: [hint] }
    : { tag: "div", attrs: { class: "carousel-item w-full" }, children: [hint] };
}

/** Elements for a list of definitions, in catalog order. */
export function daisyElements(definitions: readonly DaisyComponentDefinition[]): ExtensionElement[] {
  return [...definitions.map(elementFor), ...Object.keys(PART_FOR_ROOT).map(partElementFor)];
}
