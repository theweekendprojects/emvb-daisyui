/**
 * Convert stored `provider` nodes (provider "daisyui") to extension nodes (`ext:daisyui/daisy-*`).
 *
 * Leaves convert with no loss: each prop keeps its name and value, and the theme in providerMeta
 * becomes the `theme` prop. A container's child blocks become `content` lines, one line per child,
 * taken from its text. A compound root's children become `items` lines (`Label|text`, or cells for
 * a table). Nested layouts inside a container are flattened to their text, so that part is lossy
 * and the converter reports it in `lossy`.
 *
 * Nodes that are not daisy providers pass through, and their children are converted in place.
 */
import { DAISY_COMPONENT_CATALOG } from "../catalog/index.ts";
import { COLUMNS } from "../catalog/layout-marketing.ts";
import { COMPOUND_CONFIG } from "../compound/editor.ts";
import { ELEMENT_PREFIX, THEMES } from "./elements.ts";

/** A stored layout node, as far as the converter reads it. */
export type StoredNode = {
  id: string;
  type: string;
  provider?: string;
  component?: string;
  props?: Record<string, unknown>;
  providerMeta?: Record<string, unknown>;
  children?: StoredNode[];
  [key: string]: unknown;
};

const definitions = new Map(
  [...DAISY_COMPONENT_CATALOG, COLUMNS].map((definition) => [definition.id, definition]),
);

/** Plain text of a node and its descendants, for flattening. */
export function textOf(node: StoredNode): string {
  const props = node.props ?? {};
  const own = ["text", "label", "title", "headline"]
    .map((key) => props[key])
    .find((value): value is string => typeof value === "string" && value.length > 0);
  const kids = (node.children ?? []).map(textOf).filter((text) => text.length > 0);
  return [own ?? "", ...kids].filter((text) => text.length > 0).join(" ");
}

function itemLines(node: StoredNode, component: string): string {
  const children = node.children ?? [];
  if (component === "table") {
    return children
      .map((row) => (row.children ?? []).map((cell) => textOf(cell)).join("|"))
      .filter((line) => line.replace(/\|/g, "").trim().length > 0)
      .join("\n");
  }
  return children
    .map((item) => {
      const label = String(item.props?.label ?? textOf(item)) || "Item";
      const body =
        component === "menu" ? String(item.props?.href ?? "") : (item.children ?? []).map(textOf).join(" ");
      return body ? `${label}|${body}` : label;
    })
    .join("\n");
}

/** Result of converting one daisy node: the new node and whether it flattened nested content. */
export type Conversion = { node: StoredNode; lossy: boolean };

/** Convert one stored daisy provider node. Returns undefined for anything that is not one. */
export function toExtensionNode(node: StoredNode): Conversion | undefined {
  if (node.type !== "provider" || node.provider !== "daisyui" || !node.component) return undefined;
  const definition = definitions.get(node.component);
  if (!definition) return undefined;
  const props: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (node.props && field.key in node.props) props[field.key] = node.props[field.key];
  }
  const theme = node.providerMeta?.theme;
  if (typeof theme === "string" && (THEMES as readonly string[]).includes(theme)) {
    props.theme = theme;
  }
  const isRoot = Object.hasOwn(COMPOUND_CONFIG, node.component);
  const children = node.children ?? [];
  let lossy = false;
  if (isRoot) {
    props.items = itemLines(node, node.component);
    lossy = children.some((child) => (child.children ?? []).some((grand) => (grand.children ?? []).length > 0));
  } else if (definition.container) {
    props.content = children.map(textOf).filter((line) => line.length > 0).join("\n");
    lossy = children.some((child) => (child.children ?? []).length > 0);
  }
  return {
    node: {
      id: node.id,
      type: `ext:daisyui/${ELEMENT_PREFIX}${node.component}`,
      props,
    },
    lossy,
  };
}

/**
 * Convert a whole layout tree. `lossy` lists the ids of nodes whose nested content was flattened.
 */
export function convertLayout(node: StoredNode): { node: StoredNode; lossy: string[] } {
  const converted = toExtensionNode(node);
  if (converted) return { node: converted.node, lossy: converted.lossy ? [node.id] : [] };
  if (!node.children) return { node, lossy: [] };
  const lossy: string[] = [];
  const children = node.children.map((child) => {
    const result = convertLayout(child);
    lossy.push(...result.lossy);
    return result.node;
  });
  return { node: { ...node, children }, lossy };
}
