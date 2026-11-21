import { beforeEach, describe, expect, test } from "bun:test";
// The core is pinned as a submodule (vendor/EmVB). These imports check the extension against it.
import { emptyDesign } from "../../vendor/EmVB/packages/emvb/src/core/schema/design.ts";
import {
  LAYOUT_SCHEMA_VERSION,
  type Layout,
  type LayoutNode,
} from "../../vendor/EmVB/packages/emvb/src/core/schema/layout.ts";
import { renderPage } from "../../vendor/EmVB/packages/emvb/src/core/render/index.ts";
import { clearExtensions, rememberExtensions } from "../../vendor/EmVB/packages/emvb/src/core/extensions/registry.ts";
import { COMPOUND_CONFIG } from "../compound/editor.ts";
import { daisyUIExtension } from "./index.ts";

const CARD = "ext:daisyui/daisy-card";
const BADGE = "ext:daisyui/daisy-badge";

const heading = (id: string, text: string): LayoutNode => ({
  id,
  type: "heading",
  props: { text, level: 3 },
});

const pageWith = (type: string, children: LayoutNode[]): Layout => ({
  schemaVersion: LAYOUT_SCHEMA_VERSION,
  root: {
    id: "root0001",
    type: "container",
    props: {},
    children: [{ id: "dx000001", type, props: {}, children }],
  },
});

beforeEach(() => {
  clearExtensions();
  rememberExtensions([daisyUIExtension]);
});

describe("daisyUI containers take child nodes (core container, extensionApi 1.x)", () => {
  test("non-compound containers are flagged; compound roots keep their items text", () => {
    const flagged = daisyUIExtension.elements.filter((el) => el.container === true).map((el) => el.name);
    expect(flagged).toContain("daisy-card");
    // Menu and carousel take list parts as children; the other compound roots keep their items text.
    for (const root of Object.keys(COMPOUND_CONFIG)) {
      if (root === "menu" || root === "carousel") {
        expect(flagged).toContain(`daisy-${root}`);
      } else {
        expect(flagged).not.toContain(`daisy-${root}`);
      }
    }
  });

  test("a card renders its children inside the card, in order", () => {
    const result = renderPage(
      pageWith(CARD, [heading("h0000001", "First child"), heading("h0000002", "Second child")]),
      emptyDesign(),
      { mode: "public" },
    );
    const card = result.html.indexOf('class="card');
    expect(card).toBeGreaterThan(-1);
    expect(result.html.indexOf("First child")).toBeGreaterThan(card);
    expect(result.html.indexOf("Second child")).toBeGreaterThan(result.html.indexOf("First child"));
    expect(result.html).not.toContain("emvb-slot");
  });

  test("the slot is added only when the card has content or child nodes", () => {
    const card = daisyUIExtension.elements.find((el) => el.name === "daisy-card");
    expect(card).toBeDefined();
    const empty = JSON.stringify(card?.render({}, { mode: "public", childCount: 0 }));
    const filled = JSON.stringify(card?.render({}, { mode: "public", childCount: 1 }));
    expect(empty).not.toContain("emvb-slot");
    expect(filled).toContain("emvb-slot");
  });

  test("a menu with item elements renders each as a list item, and not its items text", () => {
    const MENU = "ext:daisyui/daisy-menu";
    const ITEM = "ext:daisyui/daisy-menu-item";
    const page: Layout = {
      schemaVersion: LAYOUT_SCHEMA_VERSION,
      root: {
        id: "root0001",
        type: "container",
        props: {},
        children: [
          {
            id: "menu0001",
            type: MENU,
            props: { items: "Only text|/fallback" },
            children: [{ id: "item0001", type: ITEM, props: { label: "Home", href: "/" } }],
          },
        ],
      },
    } as Layout;
    const result = renderPage(page, emptyDesign(), { mode: "public" });
    // The item is the list's first child: directly inside the <ul>, not beside it.
    expect(result.html).toMatch(new RegExp(`<ul[^>]*><li data-emvb-ext="${ITEM}"`));
    expect(result.html).toContain("Home");
    expect(result.html).not.toContain("Only text");
  });

  test("carousel slides show their content, and two with the same label do not share an id", () => {
    const SLIDE = "ext:daisyui/daisy-carousel-item";
    const slide = (id: string, content: string): LayoutNode => ({
      id,
      type: SLIDE,
      props: { label: "Same", content },
    });
    const result = renderPage(
      pageWith("ext:daisyui/daisy-carousel", [
        slide("sld00001", "Body one"),
        slide("sld00002", "Body two"),
      ]),
      emptyDesign(),
      { mode: "public" },
    );
    expect(result.html).toContain("Body one");
    expect(result.html).toContain("Body two");
    expect(result.html.split('class="carousel-item').length - 1).toBe(2);
    expect(result.html).not.toContain("slide-daisy");
  });

  test("an empty menu or carousel shows a hint on the canvas only", () => {
    for (const [name, hint] of [
      ["daisy-menu", "Add menu items"],
      ["daisy-carousel", "Add slides"],
    ] as const) {
      const el = daisyUIExtension.elements.find((e) => e.name === name);
      const editor = JSON.stringify(el?.render({ items: "" }, { mode: "editor", childCount: 0 }));
      const publicPage = JSON.stringify(el?.render({ items: "" }, { mode: "public", childCount: 0 }));
      expect(editor).toContain(hint);
      expect(publicPage).not.toContain(hint);
    }
  });

  test("a menu with no item elements still shows its items text", () => {
    const page: Layout = {
      schemaVersion: LAYOUT_SCHEMA_VERSION,
      root: {
        id: "root0001",
        type: "container",
        props: {},
        children: [
          {
            id: "menu0001",
            type: "ext:daisyui/daisy-menu",
            props: { items: "Only text|/fallback" },
          },
        ],
      },
    } as Layout;
    const result = renderPage(page, emptyDesign(), { mode: "public" });
    expect(result.html).toContain("Only text");
  });

  test("a leaf daisy element ignores stored children", () => {
    const result = renderPage(pageWith(BADGE, [heading("h0000003", "Not for a badge")]), emptyDesign(), {
      mode: "public",
    });
    expect(result.html).not.toContain("Not for a badge");
  });
});
