import { describe, expect, test } from "bun:test";
import { daisyUIExtension } from "./index.ts";

// Official modifiers the editor can produce, checked against daisyUI's own class names.
function classesFor(name: string, props: Record<string, unknown>): string[] {
  const el = daisyUIExtension.elements.find((e) => e.name === name);
  if (!el) throw new Error(`no element ${name}`);
  const { markup } = el.render(props, { mode: "public" });
  const out: string[] = [];
  const walk = (node: { attrs: Record<string, string>; children: (object | string)[] }) => {
    out.push(...(node.attrs.class ?? "").split(/\s+/).filter(Boolean));
    for (const child of node.children) if (typeof child !== "string") walk(child as never);
  };
  walk(markup as never);
  return out;
}

describe("daisyUI variants the editor can select", () => {
  test("megamenu vertical adds the official megamenu-vertical class", () => {
    expect(classesFor("daisy-megamenu", { orientation: "vertical" })).toContain("megamenu-vertical");
  });

  test("megamenu default orientation adds no vertical class", () => {
    expect(classesFor("daisy-megamenu", {})).not.toContain("megamenu-vertical");
  });
});
