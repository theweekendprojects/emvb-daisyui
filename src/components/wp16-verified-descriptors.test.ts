import { must } from "../test-support.ts";
import { describe, expect, test } from "bun:test";
import { daisyRenderer } from "../renderer.ts";
import { serialize } from "../../vendor/EmVB/packages/emvb/src/core/render/vnode.ts";
import { VERIFIED_PRIMITIVE_IDS } from "../verified/primitives.ts";

const implemented = new Set(["text", "textarea", "number", "select", "boolean", "href", "media"]);

describe("WP16 verified component edit descriptors", () => {
  test("all verified components expose editable fields supported by EmVB", () => {
    for (const id of VERIFIED_PRIMITIVE_IDS) {
      const descriptor = daisyRenderer.components.get(id)?.descriptor;
      expect(descriptor, id).toBeDefined();
      expect(descriptor?.fields.length, `${id} fields`).toBeGreaterThan(0);
      for (const field of descriptor?.fields ?? [])
        expect(implemented.has(field.kind), `${id}.${field.key}`).toBe(true);
    }
  });
  test("official Button classes are fixed enums, never free text", () => {
    const fields = must(daisyRenderer.components.get("button"), "button").descriptor.fields;
    expect(
      fields.find((field) => field.key === "tone")?.options?.map((option) => option.value),
    ).toContain("primary");
    expect(
      fields.find((field) => field.key === "size")?.options?.map((option) => option.value),
    ).toContain("md");
    expect(
      fields.find((field) => field.key === "variant")?.options?.map((option) => option.value),
    ).toContain("outline");
  });
  test("new nodes carry defaults that the editor can change and renderer consumes", () => {
    for (const id of VERIFIED_PRIMITIVE_IDS) {
      const generated = must(daisyRenderer.components.get(id), id);
      const node = daisyRenderer.createNode(id, `edit-${id}`);
      for (const field of generated.descriptor.fields)
        expect(node.props[field.key], `${id}.${field.key}`).toBeDefined();
      expect(serialize(daisyRenderer.render(node) as never)).toContain(
        generated.definition.rootClass,
      );
    }
  });
});
