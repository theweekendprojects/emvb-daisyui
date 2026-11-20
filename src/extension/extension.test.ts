import { describe, expect, test } from "bun:test";
// The core is pinned as a submodule (vendor/EmVB). These imports check the extension against it.
import { emptyDesign } from "../../vendor/EmVB/packages/emvb/src/core/schema/design.ts";
import {
  KNOWN_ELEMENT_TYPES,
  LAYOUT_SCHEMA_VERSION,
  type Layout,
} from "../../vendor/EmVB/packages/emvb/src/core/schema/layout.ts";
import { renderPage } from "../../vendor/EmVB/packages/emvb/src/core/render/index.ts";
import { normalizeExtension } from "../../vendor/EmVB/packages/emvb/src/core/extensions/normalize.ts";
import { clearExtensions, rememberExtensions } from "../../vendor/EmVB/packages/emvb/src/core/extensions/registry.ts";
import {
  classAllowlist,
  safeMarkup,
} from "../../vendor/EmVB/packages/emvb/src/core/extensions/markup.ts";
import { EXTENSION_PLACEHOLDER_TEXT } from "../../vendor/EmVB/packages/emvb/src/core/extensions/placeholder.ts";
import { DAISY_COMPONENT_CATALOG } from "../catalog/index.ts";
import { COLUMNS } from "../catalog/layout-marketing.ts";
import { CLASSES_FOR_EXTENSION } from "./classes.ts";
import { collectClasses } from "./collect-classes.ts";
import { daisyUIExtension } from "./index.ts";

const definitions = [...DAISY_COMPONENT_CATALOG, COLUMNS];

const pageWith = (type: string, props: Record<string, unknown>): Layout => ({
  schemaVersion: LAYOUT_SCHEMA_VERSION,
  root: {
    id: "root0001",
    type: "container",
    props: {},
    children: [{ id: "ext00001", type, props }],
  },
});

const render = (type: string, props: Record<string, unknown>) => {
  clearExtensions();
  rememberExtensions([daisyUIExtension as never]);
  return renderPage(pageWith(type, props), emptyDesign(), { mode: "public" }).html;
};

describe("daisyUI extension names and registration", () => {
  test("every daisyUI component is one element, named with the daisy prefix", () => {
    // Two extra elements are list parts (menu item, carousel slide), one per part-taking root.
    expect(daisyUIExtension.elements).toHaveLength(definitions.length + 2);
    for (const element of daisyUIExtension.elements) {
      expect(element.name.startsWith("daisy-")).toBe(true);
    }
  });

  test("no element name collides with an EmVB built-in element type", () => {
    const builtIn = new Set<string>(KNOWN_ELEMENT_TYPES);
    for (const element of daisyUIExtension.elements) {
      expect(builtIn.has(element.name)).toBe(false);
    }
  });

  test("core accepts the extension and keeps its stylesheet and runtime", () => {
    const normalized = normalizeExtension(daisyUIExtension);
    expect(normalized).toBeDefined();
    expect(normalized?.live.styles).toEqual(["@perkyzz/emvb-daisyui/styles.css"]);
    expect(normalized?.live.runtime).toEqual(["@perkyzz/emvb-daisyui/runtime"]);
    expect(normalized?.live.classes?.length).toBe(CLASSES_FOR_EXTENSION.length);
  });

  test("the generated class allowlist matches the catalog (regenerate with gen:classes)", () => {
    expect(collectClasses()).toEqual([...CLASSES_FOR_EXTENSION]);
  });
});

describe("daisyUI markup on a page", () => {
  test("a daisy button renders its label inside the extension wrapper", () => {
    const html = render("ext:daisyui/daisy-button", { label: "Save" });
    expect(html).toContain("Save");
    expect(html).toContain("btn");
    expect(html).toContain('data-emvb-ext="ext:daisyui/daisy-button"');
    expect(html).not.toContain(EXTENSION_PLACEHOLDER_TEXT);
  });

  test("a container turns its content lines into paragraphs and links", () => {
    const html = render("ext:daisyui/daisy-card", {
      title: "Plan",
      content: "First line\n[Read more](https://example.com/more)",
    });
    expect(html).toContain("First line");
    expect(html).toContain('href="https://example.com/more"');
    expect(html).not.toContain(EXTENSION_PLACEHOLDER_TEXT);
  });

  test("a compound root renders its items as tab labels and bodies", () => {
    const html = render("ext:daisyui/daisy-tabs", { items: "One|Body one\nTwo|Body two" });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="One"');
    expect(html).toContain("Body two");
  });

  test("two tab sets with different items get different radio group names", () => {
    const first = render("ext:daisyui/daisy-tabs", { items: "A|a" });
    const second = render("ext:daisyui/daisy-tabs", { items: "B|b" });
    const name = (html: string) => /name="([^"]+)"/.exec(html)?.[1];
    expect(name(first)).toBeDefined();
    expect(name(first)).not.toEqual(name(second));
  });
});

describe("daisyUI markup passes core's markup check unchanged", () => {
  test("every element's default output keeps all classes and attributes", () => {
    const allowed = classAllowlist(CLASSES_FOR_EXTENSION);
    for (const element of daisyUIExtension.elements) {
      const defaults: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(element.schema.properties)) {
        if (prop.default !== undefined) defaults[key] = prop.default;
      }
      const { markup } = element.render(defaults);
      const checked = safeMarkup(markup as never, allowed);
      expect(checked).toEqual(markup as never);
    }
  });
});

describe("render mode and theme", () => {
  test("a modal draws open on the canvas and as a closed dialog on a published page", () => {
    clearExtensions();
    rememberExtensions([daisyUIExtension as never]);
    const layout = pageWith("ext:daisyui/daisy-modal", { title: "Hi", content: "Body" });
    const canvas = renderPage(layout, emptyDesign(), { mode: "editor" }).html;
    const published = renderPage(layout, emptyDesign(), { mode: "public" }).html;
    expect(canvas).toContain("modal-box");
    expect(published).toContain("<dialog");
    expect(published).not.toContain("modal-box mx-auto");
  });

  test("a theme on a block sets data-theme on its root", () => {
    const html = render("ext:daisyui/daisy-button", { label: "Go", theme: "dark" });
    expect(html).toContain('data-theme="dark"');
  });
});
