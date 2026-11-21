/**
 * Turn the text fields of an extension element into daisyUI children.
 *
 * Extension elements cannot hold child blocks (extensionApi 1.x has no slots), so containers take
 * a `content` text field and compound roots take an `items` text field instead. Each line of
 * `content` is a paragraph, or a link when the whole line is `[label](href)`. Each line of `items`
 * is `Label|text` (for a table, `cell|cell|...` per row).
 */
import { safeHref } from "../render/href.ts";
import type { DaisyComponentNode, DaisyVNode } from "../types.ts";

/** Most lines or items read from one field. Longer text is cut, so one field cannot bloat a page. */
export const MAX_LINES = 40;
/** Most characters kept from one line or cell. */
export const MAX_TEXT = 500;

/** Classes the content helpers themselves put on markup, so the class allowlist covers them. */
// `object-cover` is on photo tags only, which the class sample never renders, so it is listed here.
export const CONTENT_CLASSES = ["link", "object-cover"] as const;

const LINK_LINE = /^\[([^\]]{1,80})\]\(([^)\s]{1,300})\)$/;

function lines(text: string, limit = MAX_LINES): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
}

/** The text of a `content` field as paragraphs and links. */
export function contentChildren(text: string): DaisyVNode[] {
  return lines(text).map((line) => {
    const link = LINK_LINE.exec(line);
    if (link) {
      return {
        tag: "a",
        attrs: { href: safeHref(link[2]), class: "link" },
        children: [(link[1] ?? "").slice(0, MAX_TEXT)],
      };
    }
    return { tag: "p", attrs: {}, children: [line.slice(0, MAX_TEXT)] };
  });
}

/** One parsed item of an `items` field: a label and the body text after the first `|`. */
export type Item = { label: string; body: string };

/** The `Label|text` lines of an `items` field. A line without `|` is a label with no body. */
export function parseItems(text: string): Item[] {
  return lines(text).map((line) => {
    const bar = line.indexOf("|");
    const label = (bar < 0 ? line : line.slice(0, bar)).trim().slice(0, MAX_TEXT);
    const body = bar < 0 ? "" : line.slice(bar + 1).trim().slice(0, MAX_TEXT);
    return { label: label || "Item", body };
  });
}

/** The cells of one `items` table line: `cell|cell|...`, each cut to MAX_TEXT. */
export function parseCells(line: string): string[] {
  return line.split("|").map((cell) => cell.trim().slice(0, MAX_TEXT));
}

/**
 * A stable id for one element's props. Extension render gets no stored node id, so two elements
 * with different props get different ids (tab and collapse groups use the id in their names).
 */
export function idFor(props: Record<string, unknown>): string {
  const text = JSON.stringify(props);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `daisy-${hash.toString(16).padStart(8, "0")}`;
}

/** A component node with the given props, ready for the daisyUI renderer. */
export function nodeFor(
  component: string,
  props: Record<string, string | number | boolean>,
  children: DaisyComponentNode[] = [],
  id = "daisy-node",
): DaisyComponentNode {
  return {
    id,
    type: "provider",
    provider: "daisyui",
    component,
    props,
    children,
  };
}
