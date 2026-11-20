/**
 * One extension element per daisyUI component (extensionApi 1.x).
 *
 * The element name is `daisy-<component>`. The prefix keeps every name clear of EmVB's built-in
 * element types (`tabs`, `accordion`, `menu`, `carousel`, ... are built in).
 * Rendering reuses the daisyUI provider's own render, so the markup is the same as before.
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
export type ExtensionElement = {
  name: string;
  label: string;
  group: "layout" | "content" | "form" | "dynamic";
  schema: { type: "object"; properties: Record<string, PropSchema> };
  fields: Field[];
  render: (props: Record<string, unknown>) => { markup: VNode };
};

export const ELEMENT_PREFIX = "daisy-";
const MAX_TEXT_FIELD = 2000;
const MAX_LONG_FIELD = 4000;
/** Compound roots read `items` instead of content; the rows and cells come from it. */
const ITEMS_FIELD = "items";
const CONTENT_FIELD = "content";
const RENDER_MODE = { mode: "public" as const };

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
function tableRows(text: string): { nodes: ReturnType<typeof nodeFor>[]; vnodes: DaisyVNode[] } {
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
      daisyUIProvider.render(nodeFor("table-cell", { text: cell }), {}, [], RENDER_MODE),
    );
    nodes.push(nodeFor("table-row", {}, cells.map((cell) => nodeFor("table-cell", { text: cell }))));
    vnodes.push(daisyUIProvider.render(nodeFor("table-row", {}), {}, cellVNodes, RENDER_MODE));
  }
  return { nodes, vnodes };
}

/** The item nodes and their rendered children for one compound root. */
export function itemsFor(root: string, text: string): { nodes: ReturnType<typeof nodeFor>[]; vnodes: DaisyVNode[] } {
  if (root === "table") return tableRows(text);
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
    vnodes.push(daisyUIProvider.render(nodeFor(part, props), {}, bodyChildren, RENDER_MODE));
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
  const kind = field.kind === "textarea" ? "textarea" : field.kind === "number" ? "number" : field.kind === "boolean" ? "boolean" : field.kind === "select" ? "select" : field.kind === "href" ? "href" : "text";
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

/** The extension element for one daisyUI definition. */
export function elementFor(definition: DaisyComponentDefinition): ExtensionElement {
  const id = definition.id;
  const isRoot = Object.hasOwn(COMPOUND_CONFIG, id);
  const extraKey = isRoot ? ITEMS_FIELD : definition.container ? CONTENT_FIELD : undefined;
  const properties: Record<string, PropSchema> = {};
  for (const field of definition.fields) properties[field.key] = schemaFor(field);
  const fields: Field[] = definition.fields.map(fieldFor);
  if (extraKey) {
    properties[extraKey] = { type: "string", maxLength: MAX_LONG_FIELD, default: "" };
    fields.push({
      key: extraKey,
      kind: "textarea",
      label: isRoot ? "Items (Label|text per line)" : "Content (one block per line)",
    });
  }
  const daisyKeys = new Set(definition.fields.map((field) => field.key));

  return {
    name: `${ELEMENT_PREFIX}${id}`,
    label: definition.label,
    group: GROUP[definition.category],
    schema: { type: "object", properties },
    fields,
    render: (props) => {
      const values: Record<string, string | number | boolean> = {};
      for (const key of daisyKeys) {
        const value = props[key];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          values[key] = value;
        }
      }
      const nodeId = idFor(props);
      if (isRoot) {
        const items = itemsFor(id, String(props[ITEMS_FIELD] ?? ""));
        const node = nodeFor(id, values, items.nodes, nodeId);
        return { markup: toVNode(daisyUIProvider.render(node, {}, items.vnodes, RENDER_MODE)) };
      }
      const children = definition.container ? contentChildren(String(props[CONTENT_FIELD] ?? "")) : [];
      return {
        markup: toVNode(
          daisyUIProvider.render(nodeFor(id, values, [], nodeId), {}, children, RENDER_MODE),
        ),
      };
    },
  };
}

/** Elements for a list of definitions, in catalog order. */
export function daisyElements(definitions: readonly DaisyComponentDefinition[]): ExtensionElement[] {
  return definitions.map(elementFor);
}
