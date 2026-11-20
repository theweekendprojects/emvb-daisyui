import { describe, expect, test } from "bun:test";
// The core is pinned as a submodule (vendor/EmVB). Validation uses the same checks as the core.
import { validateExtensionProps } from "../../vendor/EmVB/packages/emvb/src/core/extensions/schema.ts";
import { daisyUIExtension } from "./index.ts";
import { convertLayout, toExtensionNode, type StoredNode } from "./migrate.ts";

const provider = (id: string, component: string, props: Record<string, unknown> = {}, extra: Partial<StoredNode> = {}): StoredNode => ({
  id,
  type: "provider",
  provider: "daisyui",
  component,
  props,
  ...extra,
});

const elementFor = (name: string) => daisyUIExtension.elements.find((element) => element.name === name);

describe("stored daisyUI nodes become extension nodes", () => {
  test("a leaf keeps its props one to one and gets the extension type", () => {
    const converted = toExtensionNode(provider("b1", "button", { label: "Save", size: "lg" }));
    expect(converted?.node.type).toBe("ext:daisyui/daisy-button");
    expect(converted?.node.props.label).toBe("Save");
    expect(converted?.node.props.size).toBe("lg");
    expect(converted?.lossy).toBe(false);
  });

  test("the theme in providerMeta becomes the theme prop", () => {
    const converted = toExtensionNode(provider("b2", "button", { label: "Go" }, { providerMeta: { theme: "dark" } }));
    expect(converted?.node.props.theme).toBe("dark");
  });

  test("a container's child blocks become one content line each", () => {
    const card = provider("c1", "card", { title: "Plan" }, {
      children: [
        { id: "t1", type: "heading", props: { text: "Hello" } },
        { id: "t2", type: "text", props: { text: "World" } },
      ],
    });
    const converted = toExtensionNode(card);
    expect(converted?.node.props.content).toBe("Hello\nWorld");
    expect(converted?.lossy).toBe(false);
  });

  test("a container with nested children reports its content as lossy", () => {
    const card = provider("c2", "card", {}, {
      children: [{ id: "g", type: "container", props: {}, children: [{ id: "h", type: "heading", props: { text: "Deep" } }] }],
    });
    expect(toExtensionNode(card)?.lossy).toBe(true);
  });

  test("tabs items become Label|text lines", () => {
    const tabs = provider("t1", "tabs", { label: "Views" }, {
      children: [
        provider("i1", "tab-item", { label: "One" }, { children: [{ id: "p1", type: "text", props: { text: "Body one" } }] }),
        provider("i2", "tab-item", { label: "Two" }, { children: [{ id: "p2", type: "text", props: { text: "Body two" } }] }),
      ],
    });
    expect(toExtensionNode(tabs)?.node.props.items).toBe("One|Body one\nTwo|Body two");
  });

  test("table rows become cell lines", () => {
    const table = provider("tb1", "table", {}, {
      children: [
        provider("r1", "table-row", {}, { children: [provider("c1", "table-cell", { text: "a" }), provider("c2", "table-cell", { text: "b" })] }),
      ],
    });
    expect(toExtensionNode(table)?.node.props.items).toBe("a|b");
  });

  test("a node that is not a daisy provider is not converted", () => {
    expect(toExtensionNode({ id: "h", type: "heading", props: { text: "x" } })).toBeUndefined();
    expect(toExtensionNode(provider("u", "not-a-component"))).toBeUndefined();
  });
});

describe("whole layouts", () => {
  test("a layout keeps its native nodes and converts the daisy ones inside them", () => {
    const layout: StoredNode = {
      id: "root",
      type: "container",
      props: {},
      children: [
        { id: "h", type: "heading", props: { text: "Welcome" } },
        provider("b", "button", { text: "Go" }),
      ],
    };
    const { node, lossy } = convertLayout(layout);
    expect(node.children?.[0]).toEqual({ id: "h", type: "heading", props: { text: "Welcome" } });
    expect(node.children?.[1]?.type).toBe("ext:daisyui/daisy-button");
    expect(lossy).toEqual([]);
  });
});

describe("converted props pass the element schema", () => {
  test("button, card and tabs props validate against their elements", () => {
    const samples: Array<[string, StoredNode]> = [
      ["daisy-button", provider("b", "button", { text: "Go" })],
      ["daisy-card", provider("c", "card", { title: "T" }, { children: [{ id: "p", type: "text", props: { text: "x" } }] })],
      ["daisy-tabs", provider("t", "tabs", { label: "L" }, { children: [provider("i", "tab-item", { label: "One" })] })],
    ];
    for (const [name, stored] of samples) {
      const element = elementFor(name);
      const converted = toExtensionNode(stored);
      expect(element).toBeDefined();
      expect(converted).toBeDefined();
      const result = validateExtensionProps(element?.schema as never, converted?.node.props ?? {});
      expect(result.ok).toBe(true);
    }
  });
});
